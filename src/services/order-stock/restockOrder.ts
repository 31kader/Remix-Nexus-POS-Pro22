import { OnlineOrder, Customer, Product } from '../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { localDb } from '../LocalDatabase';
import { enqueueSync, enqueueStockAdjustment, enqueueCustomerBalanceAdjustment } from '../SyncService';
import { useCoreStore } from '../../store/useCoreStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { usePeopleStore } from '../../store/usePeopleStore';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';
import { activeOrdersLock, OrderItemLike, isTransactionMatchingOrder, toSupabaseOrderId } from './orderStockCommon';

/**
 * 🔄 RÉINTÉGRATION ATOMIQUE DU STOCK ET ROLLBACK LORS D'UNE ANNULATION (Option 1)
 */
export async function restockOrder(
  order: OnlineOrder,
  options?: {
    customers?: Customer[];
  }
): Promise<{ success: boolean; reason?: string }> {
  if (!order || !order.id) return { success: false, reason: 'invalid_order' };
  const orderIdStr = String(order.id);

  if (activeOrdersLock.has(orderIdStr)) {
    console.log(`[orderStockService] Réintégration commande #${orderIdStr} déjà en cours, verrou ignoré.`);
    return { success: false, reason: 'in_progress' };
  }

  activeOrdersLock.add(orderIdStr);

  try {
    const freshOrders = useTransactionStore.getState().onlineOrders || [];
    const freshOrder = freshOrders.find(o => String(o.id) === orderIdStr) || order;

    const allTx = useTransactionStore.getState().transactions || [];
    const matchingTxs = allTx.filter(t => isTransactionMatchingOrder(t, freshOrder));
    const activeTxs = matchingTxs.filter(t => t.status !== 'cancelled');

    // 🛡️ GARDE P0-2 & P0-3 : Si la commande n'a jamais été déstockée et aucune transaction active
    if (!freshOrder.syncedToPos && activeTxs.length === 0) {
      console.log(`[orderStockService] Commande #${orderIdStr} n'était pas déstockée (syncedToPos=false, 0 tx active). Aucun restock requis.`);
      return { success: true, reason: 'not_destocked' };
    }

    const allCustomers = options?.customers || usePeopleStore.getState().customers || [];

    // 1. Annulation des transactions liées et retrait des points
    for (const t of activeTxs) {
      if (isSupabaseConfigured && navigator.onLine) {
        try {
          const res = await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', t.id);
          if (res?.error) {
            await localDb.update(`transactions/${t.id}`, { status: 'cancelled' });
          } else {
            await localDb.updateLocalOnly(`transactions/${t.id}`, { status: 'cancelled' });
          }
        } catch (_) {
          await localDb.update(`transactions/${t.id}`, { status: 'cancelled' });
        }
      } else {
        await localDb.update(`transactions/${t.id}`, { status: 'cancelled' });
      }

      // Retrait des points fidélité (UNIQUEMENT par delta négatif)
      if (t.pointsEarned && t.customerId) {
        const cust = allCustomers.find(c => String(c.id) === String(t.customerId));
        if (cust) {
          const newPoints = Math.max(0, (cust.loyaltyPoints || 0) - t.pointsEarned);
          const newSpent = Math.max(0, (cust.totalSpent || 0) - Number(t.total || 0));
          const newPurchases = Math.max(0, (cust.purchaseCount || 1) - 1);

          usePeopleStore.getState().setCustomers(prev =>
            (Array.isArray(prev) ? prev : []).map(c => String(c.id) === String(t.customerId) ? {
              ...c,
              loyaltyPoints: newPoints,
              totalSpent: newSpent,
              purchaseCount: newPurchases
            } : c)
          );

          await localDb.updateLocalOnly(`customers/${t.customerId}`, {
            loyaltyPoints: newPoints,
            totalSpent: newSpent,
            purchaseCount: newPurchases
          });

          enqueueCustomerBalanceAdjustment(t.customerId, 0, -Number(t.total || 0), -t.pointsEarned);
        }
      }
    }

    // Mettre à jour l'état Zustand des transactions
    if (activeTxs.length > 0) {
      const activeIds = new Set(activeTxs.map(t => t.id));
      useTransactionStore.getState().setTransactions(prev =>
        (Array.isArray(prev) ? prev : []).map(tx => activeIds.has(tx.id) ? { ...tx, status: 'cancelled' } : tx)
      );
    }

    // 2. Réintégration physique du stock
    let parsedFreshItems: any[] = [];
    if (Array.isArray(freshOrder.items)) {
      parsedFreshItems = freshOrder.items;
    } else if (typeof freshOrder.items === 'string') {
      try {
        const p = JSON.parse(freshOrder.items);
        if (Array.isArray(p)) parsedFreshItems = p;
      } catch (_) {}
    }

    const rawItems = (parsedFreshItems.length > 0)
      ? parsedFreshItems
      : (matchingTxs.length > 0 && Array.isArray(matchingTxs[0].items) ? matchingTxs[0].items : []);
    const items: OrderItemLike[] = rawItems as OrderItemLike[];

    if (items.length > 0) {
      const currentProducts = useCoreStore.getState().products || [];
      const productMap = new Map(currentProducts.map(p => [p.id, p]));
      const adjustmentsToEnqueue: { productId: string; delta: number }[] = [];

      for (const item of items) {
        const prodId = item.productId || item.id;
        const qty = Number(item.quantity || 1);
        if (isNaN(qty) || qty <= 0) continue;

        let prod = prodId ? productMap.get(prodId) : undefined;
        if (!prod && item.barcode) {
          prod = currentProducts.find(p => p.barcode === item.barcode);
        }
        if (!prod && item.name) {
          prod = currentProducts.find(p => p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim());
        }
        if (!prod) continue;

        if (prod.isBundle && prod.bundleItems && prod.bundleItems.length > 0) {
          // Réintégration des composants du bundle
          for (const bItem of prod.bundleItems) {
            const compProd = productMap.get(bItem.productId) || currentProducts.find(p => p.id === bItem.productId);
            if (compProd) {
              const bundleDelta = (bItem.quantity * qty);
              const newCompStock = (Number(compProd.stock) || 0) + bundleDelta;
              const updated = { ...compProd, stock: newCompStock, updatedAt: new Date().toISOString() };
              productMap.set(compProd.id, updated);
              adjustmentsToEnqueue.push({ productId: compProd.id, delta: bundleDelta });
              await localDb.updateLocalOnly(`products/${compProd.id}`, { stock: newCompStock, updatedAt: updated.updatedAt });
              window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updated }));
            }
          }
        } else {
          // Produit unitaire
          const newStock = (Number(prod.stock) || 0) + qty;
          const updatedProd = { ...prod, stock: newStock, updatedAt: new Date().toISOString() };
          productMap.set(prod.id, updatedProd);
          adjustmentsToEnqueue.push({ productId: prod.id, delta: qty });
          await localDb.updateLocalOnly(`products/${prod.id}`, { stock: newStock, updatedAt: updatedProd.updatedAt });
          window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProd }));
        }
      }

      // Sauvegarde Zustand et IDB des produits
      const allProductsArray = Array.from(productMap.values());
      useCoreStore.getState().setProducts(allProductsArray);
      if (typeof indexedDB !== 'undefined') {
        idbSet('nexus_products_cache', allProductsArray).catch(() => {});
      }

      // 🛡️ P1-SYNC-11 : Consolidation préalable par productId (Règle Anti-Écrasement GEMINI.md)
      const consolidatedRestockDeltas = new Map<string, number>();
      for (const adj of adjustmentsToEnqueue) {
        if (adj.productId && adj.delta !== 0) {
          consolidatedRestockDeltas.set(adj.productId, (consolidatedRestockDeltas.get(adj.productId) || 0) + adj.delta);
        }
      }
      for (const [pId, totalDelta] of consolidatedRestockDeltas.entries()) {
        if (totalDelta !== 0) {
          enqueueStockAdjustment(pId, totalDelta);
        }
      }
    }

    // 3. Réinitialisation de syncedToPos: false sur la commande
    freshOrder.syncedToPos = false;
    await localDb.updateLocalOnly(`onlineOrders/${orderIdStr}`, { syncedToPos: false });

    useTransactionStore.getState().setOnlineOrders(prev =>
      (Array.isArray(prev) ? prev : []).map(o => String(o.id) === orderIdStr ? { ...o, syncedToPos: false } : o)
    );

    const updatedOnlineOrders = useTransactionStore.getState().onlineOrders;
    if (typeof indexedDB !== 'undefined') {
      idbSet('nexus_online_orders_cache', updatedOnlineOrders).catch(() => {});
    }

    const dbId = toSupabaseOrderId(orderIdStr);
    if (isSupabaseConfigured && navigator.onLine) {
      try {
        const res = await supabase.from('online_orders').update({ synced_to_pos: false }).eq('id', dbId);
        if (res?.error) {
          console.warn('[orderStockService] Erreur PostgREST mise à jour online_orders (restock), repli vers file de synchro:', res.error);
          enqueueSync('online_orders', orderIdStr, 'UPSERT', { id: dbId, synced_to_pos: false });
        }
      } catch (_) {
        enqueueSync('online_orders', orderIdStr, 'UPSERT', { id: dbId, synced_to_pos: false });
      }
    } else {
      enqueueSync('online_orders', orderIdStr, 'UPSERT', { id: dbId, synced_to_pos: false });
    }

    toast.info(`Commande #${freshOrder.externalOrderId || orderIdStr} annulée : stock réintégré.`);
    return { success: true };
  } catch (err: any) {
    console.error('[orderStockService] Erreur lors du restockage de la commande:', err);
    return { success: false, reason: err?.message || 'unknown_error' };
  } finally {
    activeOrdersLock.delete(orderIdStr);
  }
}
