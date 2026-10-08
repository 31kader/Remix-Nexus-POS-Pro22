import { supabase, isSupabaseConfigured } from '../supabase';
import { OnlineOrder, Customer, Product, Transaction, CartItem, CompanySettings } from '../types';
import { generateUniqueId } from '../lib/utils';
import { localDb } from './LocalDatabase';
import { enqueueSync, enqueueStockAdjustment, enqueueCustomerBalanceAdjustment, sanitizePayloadForSupabase } from './SyncService';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';

// Verrou mémoire atomique pour empêcher le traitement simultané d'une même commande
const activeOrdersLock = new Set<string>();

/**
 * Normalise l'ID d'une commande en ligne pour Supabase (int8 ou text)
 */
export function toSupabaseOrderId(id: any): number | string {
  const n = Number(id);
  return (!isNaN(n) && n > 0) ? n : id;
}

/**
 * Échappe une chaîne pour utilisation dans une RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Vérifie de façon stricte si une transaction correspond à une commande en ligne.
 * Empêche le bug P1-3 où `#2` matchait `#201` par substring.
 */
export function isTransactionMatchingOrder(t: Transaction, order: OnlineOrder): boolean {
  if (!t || !order) return false;
  const orderIdStr = String(order.id);
  const extIdStr = order.externalOrderId ? String(order.externalOrderId) : '';

  // 1. Correspondance exacte sur onlineOrderId
  if (t.onlineOrderId) {
    const tOnlineId = String(t.onlineOrderId);
    if (tOnlineId === orderIdStr) return true;
    if (extIdStr && tOnlineId === extIdStr) return true;
  }

  // 2. Correspondance stricte dans les notes avec bornes de mot
  if (t.notes) {
    const regexOrderId = new RegExp(`(^|[^0-9a-zA-Z])#?${escapeRegex(orderIdStr)}([^0-9a-zA-Z]|$)`);
    if (regexOrderId.test(t.notes)) return true;

    if (extIdStr) {
      const regexExtId = new RegExp(`(^|[^0-9a-zA-Z])#?${escapeRegex(extIdStr)}([^0-9a-zA-Z]|$)`);
      if (regexExtId.test(t.notes)) return true;
    }
  }

  return false;
}

/**
 * 📦 DÉSTOCKAGE ATOMIQUE ET UNIFIÉ D'UNE COMMANDE EN LIGNE (Option 1)
 * 
 * Règles strictes :
 * - Zéro double comptage : mise à jour de l'état local via localDb.updateLocalOnly
 *   et envoi d'uniquement le DELTA relatif via enqueueStockAdjustment (RPC Supabase).
 * - Aucun supabase.from('products').update({stock}) direct !
 * - Aucun supabase.from('customers').update(...) direct !
 * - Gestion complète des bundles et de l'auto-déballage (autoUnpack).
 * - Idempotent : garde stricte sur syncedToPos et lock mémoire.
 */
export async function destockOrder(
  order: OnlineOrder,
  options?: {
    user?: any;
    settings?: CompanySettings;
    customers?: Customer[];
  }
): Promise<{ success: boolean; reason?: string }> {
  if (!order || !order.id) return { success: false, reason: 'invalid_order' };
  const orderIdStr = String(order.id);

  if (activeOrdersLock.has(orderIdStr)) {
    console.log(`[orderStockService] Déstockage commande #${orderIdStr} déjà en cours, verrou ignoré.`);
    return { success: false, reason: 'in_progress' };
  }

  activeOrdersLock.add(orderIdStr);

  try {
    // Relire la commande la plus fraîche depuis le store Zustand
    const freshOrders = useTransactionStore.getState().onlineOrders || [];
    const freshOrder = freshOrders.find(o => String(o.id) === orderIdStr) || order;

    // Garde 1 : déjà déstockée
    if (freshOrder.syncedToPos) {
      console.log(`[orderStockService] Commande #${orderIdStr} déjà marquée comme déstockée (syncedToPos=true).`);
      return { success: true, reason: 'already_synced' };
    }

    const items = Array.isArray(freshOrder.items) ? freshOrder.items : [];
    if (items.length === 0) {
      return { success: false, reason: 'no_items' };
    }

    const currentProducts = useCoreStore.getState().products || [];
    const productMap = new Map(currentProducts.map(p => [p.id, p]));
    const settings = options?.settings || useCoreStore.getState().settings || ({} as CompanySettings);
    const allowNegative = settings.allowNegativeStock !== false;

    // Vérification préventive si le stock négatif est explicitement interdit
    if (!allowNegative) {
      const issues: string[] = [];
      for (const item of items) {
        const prod = productMap.get((item as any).productId || (item as any).id) ||
                     currentProducts.find(p => p.barcode === (item as any).barcode || p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim());
        if (prod && (prod.stock || 0) < Number(item.quantity || 1)) {
          issues.push(`${prod.name} (Requis: ${item.quantity}, Dispo: ${prod.stock})`);
        }
      }
      if (issues.length > 0) {
        toast.error(`Rupture de stock : ${issues.join(', ')}`);
        return { success: false, reason: 'stock_shortage' };
      }
    }

    // 1. Calcul et application des variations de stock (bundles + autoUnpack)
    const stockAdjustmentsToEnqueue: { productId: string; delta: number }[] = [];

    for (const item of items) {
      const prodId = (item as any).productId || (item as any).id;
      const qty = Number(item.quantity || 1);
      if (isNaN(qty) || qty <= 0) continue;

      let prod = prodId ? productMap.get(prodId) : undefined;
      if (!prod && (item as any).barcode) {
        prod = currentProducts.find(p => p.barcode === (item as any).barcode);
      }
      if (!prod && item.name) {
        prod = currentProducts.find(p => p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim());
      }
      if (!prod) continue;

      if (prod.isBundle && prod.bundleItems && prod.bundleItems.length > 0) {
        // Déstockage des composants du bundle
        for (const bItem of prod.bundleItems) {
          const compProd = productMap.get(bItem.productId) || currentProducts.find(p => p.id === bItem.productId);
          if (compProd) {
            const bundleDelta = -(bItem.quantity * qty);
            const newCompStock = (Number(compProd.stock) || 0) + bundleDelta;
            const updated = { ...compProd, stock: newCompStock, updatedAt: new Date().toISOString() };
            productMap.set(compProd.id, updated);
            stockAdjustmentsToEnqueue.push({ productId: compProd.id, delta: bundleDelta });
            await localDb.updateLocalOnly(`products/${compProd.id}`, { stock: newCompStock, updatedAt: updated.updatedAt });
            window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updated }));
          }
        }
      } else {
        // Produit unitaire avec auto-déballage si besoin
        let change = -qty;
        if ((Number(prod.stock) || 0) < qty && prod.autoUnpack && prod.parentId && prod.unitsPerParent) {
          const parentProd = productMap.get(prod.parentId) || currentProducts.find(p => p.id === prod.parentId);
          if (parentProd) {
            const shortfall = qty - (Number(prod.stock) || 0);
            const parentsNeeded = Math.ceil(shortfall / prod.unitsPerParent);
            const newParentStock = (Number(parentProd.stock) || 0) - parentsNeeded;
            const updatedParent = { ...parentProd, stock: newParentStock, updatedAt: new Date().toISOString() };
            productMap.set(parentProd.id, updatedParent);
            stockAdjustmentsToEnqueue.push({ productId: parentProd.id, delta: -parentsNeeded });
            await localDb.updateLocalOnly(`products/${parentProd.id}`, { stock: newParentStock, updatedAt: updatedParent.updatedAt });
            window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedParent }));
            change += (parentsNeeded * prod.unitsPerParent);
          }
        }

        const newStock = (Number(prod.stock) || 0) + change;
        const updatedProd = { ...prod, stock: newStock, updatedAt: new Date().toISOString() };
        productMap.set(prod.id, updatedProd);
        stockAdjustmentsToEnqueue.push({ productId: prod.id, delta: change });
        await localDb.updateLocalOnly(`products/${prod.id}`, { stock: newStock, updatedAt: updatedProd.updatedAt });
        window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProd }));
      }
    }

    // Sauvegarde synchrone Zustand et IDB des produits
    const allProductsArray = Array.from(productMap.values());
    useCoreStore.getState().setProducts(allProductsArray);
    if (typeof indexedDB !== 'undefined') {
      idbSet('nexus_products_cache', allProductsArray).catch(() => {});
    }

    // Envoi des variations relatives à Supabase (SyncService utilise adjust_product_stock atomique)
    for (const adj of stockAdjustmentsToEnqueue) {
      enqueueStockAdjustment(adj.productId, adj.delta);
    }

    // 2. Recherche ou association du client
    const allCustomers = options?.customers || usePeopleStore.getState().customers || [];
    let finalCustomerId = freshOrder.customerId;
    if (!finalCustomerId) {
      const found = allCustomers.find(c => 
        (freshOrder.customerPhone && c.phone && c.phone.replace(/\D/g, '') === freshOrder.customerPhone.replace(/\D/g, '')) || 
        (c.name && freshOrder.customerName && c.name.toLowerCase() === freshOrder.customerName.toLowerCase())
      );
      if (found) {
        finalCustomerId = found.id;
      }
    }

    // 3. Création ou association de la transaction de caisse
    const allTxs = useTransactionStore.getState().transactions || [];
    const existingTx = allTxs.find(t => isTransactionMatchingOrder(t, freshOrder));

    const loyaltyRatio = settings?.loyaltyPointsPerCurrencyUnit || 1;
    const pointsEarned = finalCustomerId ? Math.floor(Number(freshOrder.total || 0) * loyaltyRatio) : 0;

    if (!existingTx) {
      const tid = generateUniqueId();
      const transactionItems: CartItem[] = items.map((item, idx) => {
        const prod = productMap.get((item as any).productId || (item as any).id);
        return {
          ...prod,
          cartItemId: generateUniqueId(),
          id: (item as any).productId || prod?.id || `prod-${idx}`,
          name: item.name || prod?.name || 'Article',
          price: Number(item.price || 0),
          quantity: Math.max(1, Number(item.quantity || 1)),
          costPrice: prod?.costPrice || 0,
          taxRate: prod?.taxRate || settings.taxRate || 19,
          stock: prod?.stock ?? 0,
          minStock: prod?.minStock || 5,
          categoryId: prod?.categoryId || 'Online',
          supplier: prod?.supplier || '',
          unit: prod?.unit || 'unité',
          sku: prod?.sku || '',
          status: prod?.status || 'active',
          updatedAt: new Date().toISOString()
        } as CartItem;
      });

      const transaction: Transaction = {
        id: tid,
        userId: options?.user?.uid || options?.user?.id || 'online_system',
        items: transactionItems,
        total: Number(freshOrder.total || 0),
        paymentMethod: (freshOrder.paymentMethod as any) || 'cash',
        deliveryMethod: (freshOrder.deliveryMethod as any) || 'delivery',
        timestamp: freshOrder.timestamp || new Date().toISOString(),
        status: 'completed',
        employeeId: 'online_sync',
        employeeName: 'Commande en Ligne',
        customerName: freshOrder.customerName || 'Client en Ligne',
        customerId: finalCustomerId || null,
        onlineOrderId: orderIdStr,
        pointsEarned: pointsEarned,
        notes: `Commande en Ligne #${freshOrder.externalOrderId || orderIdStr.slice(0, 8)} (Confirmée)`
      };

      await localDb.insert(`transactions/${tid}`, transaction);
      useTransactionStore.getState().setTransactions(prev => [transaction, ...(Array.isArray(prev) ? prev : [])]);

      if (isSupabaseConfigured && navigator.onLine) {
        try {
          await supabase.from('transactions').insert(sanitizePayloadForSupabase('transactions', transaction));
        } catch (_) {
          enqueueSync('transactions', tid, 'UPSERT', transaction);
        }
      } else {
        enqueueSync('transactions', tid, 'UPSERT', transaction);
      }
    }

    // 4. Attribution des points de fidélité (UNIQUEMENT par delta pour éviter tout double comptage)
    if (finalCustomerId && pointsEarned > 0) {
      const cust = allCustomers.find(c => String(c.id) === String(finalCustomerId));
      if (cust) {
        const newPoints = (cust.loyaltyPoints || 0) + pointsEarned;
        const newSpent = Number(((cust.totalSpent || 0) + Number(freshOrder.total || 0)).toFixed(2));
        const newPurchases = (cust.purchaseCount || 0) + 1;

        usePeopleStore.getState().setCustomers(prev =>
          (Array.isArray(prev) ? prev : []).map(c => String(c.id) === String(finalCustomerId) ? {
            ...c,
            loyaltyPoints: newPoints,
            totalSpent: newSpent,
            purchaseCount: newPurchases
          } : c)
        );

        // Mise à jour locale SANS envoyer d'upsert complet à Supabase
        await localDb.updateLocalOnly(`customers/${finalCustomerId}`, {
          loyaltyPoints: newPoints,
          totalSpent: newSpent,
          purchaseCount: newPurchases
        });

        // Delta atomique Supabase (adjust_customer_balance)
        enqueueCustomerBalanceAdjustment(finalCustomerId, 0, Number(freshOrder.total || 0), pointsEarned);
      }
    }

    // 5. Verrouillage syncedToPos: true sur la commande
    freshOrder.syncedToPos = true;
    if (finalCustomerId) freshOrder.customerId = finalCustomerId;

    await localDb.update(`onlineOrders/${orderIdStr}`, {
      syncedToPos: true,
      ...(finalCustomerId ? { customerId: finalCustomerId } : {})
    });

    useTransactionStore.getState().setOnlineOrders(prev =>
      (Array.isArray(prev) ? prev : []).map(o => String(o.id) === orderIdStr ? {
        ...o,
        syncedToPos: true,
        ...(finalCustomerId ? { customerId: finalCustomerId } : {})
      } : o)
    );

    const updatedOnlineOrders = useTransactionStore.getState().onlineOrders;
    if (typeof indexedDB !== 'undefined') {
      idbSet('nexus_online_orders_cache', updatedOnlineOrders).catch(() => {});
    }

    const dbId = toSupabaseOrderId(orderIdStr);
    if (isSupabaseConfigured && navigator.onLine) {
      try {
        await supabase.from('online_orders').update({
          synced_to_pos: true,
          ...(finalCustomerId ? { customer_id: finalCustomerId } : {})
        }).eq('id', dbId);
      } catch (_) {
        enqueueSync('online_orders', orderIdStr, 'UPSERT', {
          id: dbId,
          synced_to_pos: true,
          ...(finalCustomerId ? { customer_id: finalCustomerId } : {})
        });
      }
    } else {
      enqueueSync('online_orders', orderIdStr, 'UPSERT', {
        id: dbId,
        synced_to_pos: true,
        ...(finalCustomerId ? { customer_id: finalCustomerId } : {})
      });
    }

    toast.info(`Stock déduit pour la commande #${freshOrder.externalOrderId || orderIdStr} 📦`);
    return { success: true };
  } catch (err: any) {
    console.error('[orderStockService] Erreur lors du déstockage de la commande:', err);
    return { success: false, reason: err?.message || 'unknown_error' };
  } finally {
    activeOrdersLock.delete(orderIdStr);
  }
}

/**
 * 🔄 RÉINTÉGRATION ATOMIQUE DU STOCK ET ROLLBACK LORS D'UNE ANNULATION (Option 1)
 * 
 * Règles strictes :
 * - Garde stricte : si la commande n'a jamais été déstockée (syncedToPos !== true)
 *   ET qu'aucune transaction active n'existe, RIEN n'est réintégré (+0).
 * - Idempotent : annuler 2 fois ne réintègre pas 2 fois.
 * - Correspondance stricte de la transaction liée (isTransactionMatchingOrder).
 * - Zéro double comptage : deltas positifs uniquement via enqueueStockAdjustment.
 * - Aucun supabase.from('products').update({stock}) direct !
 * - Aucun supabase.from('customers').update(...) direct !
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
      await localDb.update(`transactions/${t.id}`, { status: 'cancelled' });

      if (isSupabaseConfigured && navigator.onLine) {
        try {
          await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', t.id);
        } catch (_) {}
      }
      enqueueSync('transactions', t.id, 'UPSERT', { id: t.id, status: 'cancelled' });

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
    const items = (Array.isArray(freshOrder.items) && freshOrder.items.length > 0)
      ? freshOrder.items
      : (matchingTxs.length > 0 && Array.isArray(matchingTxs[0].items) ? matchingTxs[0].items : []);

    if (items.length > 0) {
      const currentProducts = useCoreStore.getState().products || [];
      const productMap = new Map(currentProducts.map(p => [p.id, p]));
      const adjustmentsToEnqueue: { productId: string; delta: number }[] = [];

      for (const item of items) {
        const prodId = (item as any).productId || (item as any).id;
        const qty = Number(item.quantity || 1);
        if (isNaN(qty) || qty <= 0) continue;

        let prod = prodId ? productMap.get(prodId) : undefined;
        if (!prod && (item as any).barcode) {
          prod = currentProducts.find(p => p.barcode === (item as any).barcode);
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

      // Envoi des deltas positifs relatifs à Supabase
      for (const adj of adjustmentsToEnqueue) {
        enqueueStockAdjustment(adj.productId, adj.delta);
      }
    }

    // 3. Réinitialisation de syncedToPos: false sur la commande
    freshOrder.syncedToPos = false;
    await localDb.update(`onlineOrders/${orderIdStr}`, { syncedToPos: false });

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
        await supabase.from('online_orders').update({ synced_to_pos: false }).eq('id', dbId);
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
