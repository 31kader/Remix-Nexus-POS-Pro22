import { OnlineOrder, Customer, Product, Transaction, CartItem, CompanySettings } from '../../types';
import { generateUniqueId } from '../../lib/utils';
import { localDb } from '../LocalDatabase';
import { enqueueStockAdjustment, enqueueCustomerBalanceAdjustment } from '../SyncService';
import { useCoreStore } from '../../store/useCoreStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { usePeopleStore } from '../../store/usePeopleStore';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';
import { activeOrdersLock, OrderItemLike, isTransactionMatchingOrder } from './orderStockCommon';

/**
 * 📦 DÉSTOCKAGE ATOMIQUE ET UNIFIÉ D'UNE COMMANDE EN LIGNE (Option 1)
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

    const items: OrderItemLike[] = Array.isArray(freshOrder.items) ? (freshOrder.items as OrderItemLike[]) : [];
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
        const prod = productMap.get(item.productId || item.id || '') ||
                     currentProducts.find(p => p.barcode === item.barcode || p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim());
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

    // 🛡️ P1-SYNC-11 : Consolidation préalable par productId (Règle Anti-Écrasement GEMINI.md)
    const consolidatedStockDeltas = new Map<string, number>();
    for (const adj of stockAdjustmentsToEnqueue) {
      if (adj.productId && adj.delta !== 0) {
        consolidatedStockDeltas.set(adj.productId, (consolidatedStockDeltas.get(adj.productId) || 0) + adj.delta);
      }
    }
    for (const [pId, totalDelta] of consolidatedStockDeltas.entries()) {
      if (totalDelta !== 0) {
        enqueueStockAdjustment(pId, totalDelta);
      }
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
        const prod = productMap.get(item.productId || item.id || '');
        return {
          ...prod,
          cartItemId: generateUniqueId(),
          id: item.productId || prod?.id || `prod-${idx}`,
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
        paymentMethod: (freshOrder.paymentMethod as Transaction['paymentMethod']) || 'cash',
        deliveryMethod: (freshOrder.deliveryMethod as Transaction['deliveryMethod']) || 'delivery',
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

    toast.info(`Stock déduit pour la commande #${freshOrder.externalOrderId || orderIdStr} 📦`);
    return { success: true };
  } catch (err: any) {
    console.error('[orderStockService] Erreur lors du déstockage de la commande:', err);
    return { success: false, reason: err?.message || 'unknown_error' };
  } finally {
    activeOrdersLock.delete(orderIdStr);
  }
}
