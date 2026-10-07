import { supabase, isSupabaseConfigured } from '../supabase';
import { OnlineOrder, Customer, Employee, CompanySettings, Transaction } from '../types';
import { generateUniqueId } from '../lib/utils';
import { localDb } from '../services/LocalDatabase';
import { enqueueSync, enqueueStockAdjustment, enqueueCustomerBalanceAdjustment, sanitizePayloadForSupabase } from '../services/SyncService';
import { useTransactionStore } from '../store/useTransactionStore';
import { useCoreStore } from '../store/useCoreStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { convertKeysToCamel } from '../lib/db-converters';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';

interface UseOrderActionsParams {
  orders: OnlineOrder[];
  customers: Customer[];
  employees: Employee[];
  profile: any;
  user: any;
  settings: CompanySettings;
}

// Helper: Supabase online_orders uses BIGSERIAL (int8) for ID
// Ensure we pass the correct type for .eq('id', ...)
function toSupabaseId(id: any): number | string {
  const n = Number(id);
  return (!isNaN(n) && n > 0) ? n : id;
}

export function useOrderActions({
  orders,
  customers,
  employees,
  profile,
  user,
  settings
}: UseOrderActionsParams) {

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    processing: 'En préparation',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée'
  };

  const updateOrderPaymentStatus = async (order: OnlineOrder, newPaymentStatus: OnlineOrder['paymentStatus']) => {
    const orderId = order.id;
    const dbId = toSupabaseId(orderId);
    
    // 1. SUPABASE-FIRST: Update Supabase directly
    if (isSupabaseConfigured) {
      try {
        console.log('[updateOrderPaymentStatus] Supabase update:', { payment_status: newPaymentStatus, id: dbId });

        const { error, status } = await supabase
          .from('online_orders')
          .update({ payment_status: newPaymentStatus })
          .eq('id', dbId);

        console.log('[updateOrderPaymentStatus] Response:', { error, status });

        if (error) {
          console.error('[Supabase Payment Update Failed]', JSON.stringify(error));
          toast.error(`Erreur Supabase: ${error.message || 'Échec de mise à jour'}`);
          return;
        }

        // 2. SUCCESS ON SUPABASE -> SYNC TO LOCAL STORE & LOCAL DB
        useTransactionStore.getState().setOnlineOrders(prev => 
          (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(orderId) ? { ...o, paymentStatus: newPaymentStatus } : o)
        );

        await localDb.update(`onlineOrders/${orderId}`, { paymentStatus: newPaymentStatus });
        const currentList = useTransactionStore.getState().onlineOrders;
        idbSet('nexus_online_orders_cache', currentList).catch(() => {});

        toast.success(newPaymentStatus === 'paid' ? 'Paiement Payé validé sur Supabase ✅' : 'Paiement Non Payé enregistré sur Supabase');
        return;
      } catch (e: any) {
        console.warn('[Supabase Payment Catch - Queued Offline]', e);
        useTransactionStore.getState().setOnlineOrders(prev => 
          (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(orderId) ? { ...o, paymentStatus: newPaymentStatus } : o)
        );
        await localDb.update(`onlineOrders/${orderId}`, { paymentStatus: newPaymentStatus });
        enqueueSync('online_orders', String(dbId), 'UPSERT', { id: dbId, payment_status: newPaymentStatus });
        toast.info('Paiement mis à jour hors-ligne (synchronisation différée).');
        return;
      }
    }

    // Standalone fallback if no Supabase configured
    useTransactionStore.getState().setOnlineOrders(prev => 
      (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(orderId) ? { ...o, paymentStatus: newPaymentStatus } : o)
    );
    await localDb.update(`onlineOrders/${orderId}`, { paymentStatus: newPaymentStatus });
    toast.success('Paiement mis à jour en local.');
  };

  // 🛡️ SYNCHRONISATION / ROLLBACK : Si une commande confirmée/livrée est annulée, annuler sa transaction de caisse et réintégrer le stock
  const rollbackCancelledOrderTransactions = async (order: OnlineOrder) => {
    try {
      const orderIdStr = String(order.id);
      const extIdStr = order.externalOrderId ? String(order.externalOrderId) : '';
      const allTx = useTransactionStore.getState().transactions || [];

      // Trouver toutes les transactions de vente associées à cette commande
      const matchingTxs = allTx.filter((t: Transaction) => {
        const matchesOnlineId = t.onlineOrderId && String(t.onlineOrderId) === orderIdStr;
        const matchesNotesExt = extIdStr && t.notes && t.notes.includes(extIdStr);
        const matchesNotesId = t.notes && t.notes.includes(orderIdStr);
        return matchesOnlineId || matchesNotesExt || matchesNotesId;
      });

      console.log(`[Order Rollback] ${matchingTxs.length} transaction(s) trouvée(s) pour la commande #${orderIdStr}. Annulation en cours...`);

      const matchingIds = new Set(matchingTxs.map(t => t.id));

      for (const t of matchingTxs) {
        // 1. Marquer la transaction comme annulée en local
        await localDb.update(`transactions/${t.id}`, { status: 'cancelled' });
        
        // 2. Synchroniser vers Supabase
        if (isSupabaseConfigured) {
          try {
            await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', t.id);
          } catch (err) {
            console.warn('[Order Rollback] Échec update direct Supabase transaction, mise en file d\'attente:', err);
          }
        }
        enqueueSync('transactions', t.id, 'UPSERT', { id: t.id, status: 'cancelled' });

        // 4. Annuler les points de fidélité accordés le cas échéant
        if (t.pointsEarned && t.customerId) {
          const cust = (customers || []).find(c => String(c.id) === String(t.customerId));
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

            await localDb.update(`customers/${t.customerId}`, { loyaltyPoints: newPoints, totalSpent: newSpent, purchaseCount: newPurchases });
            if (isSupabaseConfigured) {
              await supabase.from('customers').update({ loyalty_points: newPoints, total_spent: newSpent, purchase_count: newPurchases }).eq('id', t.customerId);
            }
            enqueueCustomerBalanceAdjustment(t.customerId, 0, -Number(t.total || 0), -t.pointsEarned);
          }
        }
      }

      // 3. Réintégration physique des stocks dans useCoreStore, localDb et Supabase
      const items = Array.isArray(order.items) && order.items.length > 0 
        ? order.items 
        : (matchingTxs.length > 0 && Array.isArray(matchingTxs[0].items) ? matchingTxs[0].items : []);

      if (items.length > 0) {
        const currentProducts = useCoreStore.getState().products || [];
        const productMap = new Map(currentProducts.map(p => [p.id, p]));

        for (const item of items) {
          const prodId = (item as any).productId || (item as any).id;
          const qty = Number(item.quantity || 1);
          if (prodId && qty > 0) {
            let prod = productMap.get(prodId);
            if (!prod && (item as any).barcode) {
              prod = currentProducts.find(p => p.barcode === (item as any).barcode);
            }
            if (!prod && item.name) {
              prod = currentProducts.find(p => p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim());
            }

            const effectiveProdId = prod ? prod.id : prodId;
            const oldStock = prod ? (Number(prod.stock) || 0) : 0;
            const newStock = oldStock + qty;

            if (prod) {
              productMap.set(effectiveProdId, { ...prod, stock: newStock, updatedAt: new Date().toISOString() });
            }

            enqueueStockAdjustment(effectiveProdId, qty);
            await localDb.update(`products/${effectiveProdId}`, { stock: newStock, updatedAt: new Date().toISOString() });

            window.dispatchEvent(new CustomEvent('product-cache-update', {
              detail: prod ? { ...prod, stock: newStock } : { id: effectiveProdId, stock: newStock }
            }));

            if (isSupabaseConfigured) {
              supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', effectiveProdId).catch(() => {});
            }
          }
        }
        useCoreStore.getState().setProducts(Array.from(productMap.values()));
      }

      // 5. Mettre à jour l'état Zustand des transactions en mémoire
      if (matchingIds.size > 0) {
        useTransactionStore.getState().setTransactions(prev => 
          (Array.isArray(prev) ? prev : []).map(tx => matchingIds.has(tx.id) ? { ...tx, status: 'cancelled' } : tx)
        );
      }

      // 6. Réinitialiser syncedToPos sur la commande
      order.syncedToPos = false;
      await localDb.update(`onlineOrders/${order.id}`, { syncedToPos: false });
      useTransactionStore.getState().setOnlineOrders(prev =>
        (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(order.id) ? { ...o, syncedToPos: false } : o)
      );
      if (isSupabaseConfigured) {
        await supabase.from('online_orders').update({ synced_to_pos: false }).eq('id', toSupabaseId(order.id));
      }
      enqueueSync('online_orders', String(order.id), 'UPSERT', { id: toSupabaseId(order.id), synced_to_pos: false });

      toast.info(`Commande #${orderIdStr} annulée : stock réintégré et transaction annulée.`);
    } catch (rollbackError) {
      console.error('[Order Rollback Error]', rollbackError);
    }
  };

  // 📦 OPTION 1 : Déstockage immédiat dès la Confirmation (ou statut actif >= confirmed)
  const decrementStockForOrder = async (order: OnlineOrder) => {
    // Si déjà déstocké / synchronisé au POS, ne rien faire pour éviter un double déstockage
    if (order.syncedToPos) {
      console.log(`[decrementStockForOrder] Commande #${order.id} déjà déstockée / synchronisée.`);
      return;
    }

    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) return;

    const currentProducts = useCoreStore.getState().products || [];
    const productMap = new Map(currentProducts.map(p => [p.id, p]));

    // 1. Décrémentation physique du stock dans useCoreStore, localDb et Supabase
    for (const item of items) {
      const prodId = (item as any).productId || (item as any).id;
      const qty = Number(item.quantity || 1);
      if (!prodId || isNaN(qty) || qty <= 0) continue;

      let prod = productMap.get(prodId);
      if (!prod && (item as any).barcode) {
        prod = currentProducts.find(p => p.barcode === (item as any).barcode);
      }
      if (!prod && item.name) {
        prod = currentProducts.find(p => p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim());
      }

      const effectiveProdId = prod ? prod.id : prodId;
      const oldStock = prod ? (Number(prod.stock) || 0) : 0;
      const newStock = Math.max(0, oldStock - qty);

      if (prod) {
        productMap.set(effectiveProdId, { ...prod, stock: newStock, updatedAt: new Date().toISOString() });
      }

      // Sauvegarde dans la base locale IndexedDB
      await localDb.update(`products/${effectiveProdId}`, { stock: newStock, updatedAt: new Date().toISOString() });

      // Signal aux vues/modals
      window.dispatchEvent(new CustomEvent('product-cache-update', {
        detail: prod ? { ...prod, stock: newStock } : { id: effectiveProdId, stock: newStock }
      }));

      // File de synchronisation hors-ligne
      enqueueStockAdjustment(effectiveProdId, -qty);

      // Direct Supabase si connecté
      if (isSupabaseConfigured) {
        supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', effectiveProdId).catch(() => {});
      }
    }

    // Mise à jour synchrone du store React pour affichage instantané dans le POS et le catalogue
    useCoreStore.getState().setProducts(Array.from(productMap.values()));

    // 2. Création de la transaction de caisse associée
    const tid = generateUniqueId();
    const loyaltyRatio = settings?.loyaltyPointsPerCurrencyUnit || 1;
    const pointsEarned = order.customerId ? Math.floor(Number(order.total || 0) * loyaltyRatio) : 0;

    const transaction: Transaction = {
      id: tid,
      userId: user?.id || user?.uid || 'online_system',
      items: items as any,
      total: order.total || 0,
      timestamp: new Date().toISOString(),
      paymentMethod: (order.paymentMethod as any) || 'cash',
      status: 'completed',
      employeeName: 'Commande en Ligne',
      customerName: order.customerName || 'Client en Ligne',
      customerId: order.customerId,
      onlineOrderId: String(order.id),
      pointsEarned: pointsEarned,
      notes: `Commande en Ligne #${order.externalOrderId || String(order.id || "").slice(0, 8)} (Confirmée)`
    };

    await localDb.insert(`transactions/${tid}`, transaction);
    useTransactionStore.getState().setTransactions(prev => [transaction, ...(Array.isArray(prev) ? prev : [])]);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('transactions').insert(sanitizePayloadForSupabase('transactions', transaction));
      } catch (_) {
        enqueueSync('transactions', tid, 'UPSERT', transaction);
      }
    } else {
      enqueueSync('transactions', tid, 'UPSERT', transaction);
    }

    // 3. Attribution des points de fidélité au client
    if (order.customerId && pointsEarned > 0) {
      const cust = (customers || []).find(c => String(c.id) === String(order.customerId));
      if (cust) {
        const newPoints = (cust.loyaltyPoints || 0) + pointsEarned;
        const newSpent = Number(((cust.totalSpent || 0) + Number(order.total || 0)).toFixed(2));
        const newPurchases = (cust.purchaseCount || 0) + 1;

        usePeopleStore.getState().setCustomers(prev =>
          (Array.isArray(prev) ? prev : []).map(c => String(c.id) === String(order.customerId) ? {
            ...c,
            loyaltyPoints: newPoints,
            totalSpent: newSpent,
            purchaseCount: newPurchases
          } : c)
        );

        await localDb.update(`customers/${order.customerId}`, {
          loyaltyPoints: newPoints,
          totalSpent: newSpent,
          purchaseCount: newPurchases
        });

        if (isSupabaseConfigured) {
          supabase.from('customers').update({
            loyalty_points: newPoints,
            total_spent: newSpent,
            purchase_count: newPurchases
          }).eq('id', order.customerId).catch(() => {});
        }
        enqueueCustomerBalanceAdjustment(order.customerId, 0, Number(order.total || 0), pointsEarned);
      }
    }

    // 4. Verrouiller la commande comme déstockée (syncedToPos: true)
    order.syncedToPos = true;
    await localDb.update(`onlineOrders/${order.id}`, { syncedToPos: true });
    useTransactionStore.getState().setOnlineOrders(prev =>
      (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(order.id) ? { ...o, syncedToPos: true } : o)
    );

    if (isSupabaseConfigured) {
      supabase.from('online_orders').update({ synced_to_pos: true }).eq('id', toSupabaseId(order.id)).catch(() => {});
    }
    enqueueSync('online_orders', String(order.id), 'UPSERT', { id: toSupabaseId(order.id), synced_to_pos: true });

    toast.info(`Stock déstocké pour la commande #${order.externalOrderId || order.id} 📦`);
  };

  const updateOrderStatus = async (order: OnlineOrder, newStatus: OnlineOrder['status']) => {
    const orderId = order.id;
    const dbId = toSupabaseId(orderId);

    // Si la commande est annulée, déclencher le rollback de sa recette et du stock
    if (newStatus === 'cancelled') {
      await rollbackCancelledOrderTransactions(order);
    }

    // 📦 OPTION 1 : Dès confirmation (ou tout statut actif >= confirmed), déstocker immédiatement
    const activeDestockStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];
    if (activeDestockStatuses.includes(newStatus) && !order.syncedToPos) {
      await decrementStockForOrder(order);
    }

    // 1. SUPABASE-FIRST: Update Supabase directly with only valid columns
    if (isSupabaseConfigured) {
      try {
        console.log('[updateOrderStatus] Supabase update:', { status: newStatus, id: dbId, originalId: orderId, typeOfId: typeof orderId });

        // Step 1: Update without .select() to avoid RLS issues on SELECT after UPDATE
        const { error, status } = await supabase
          .from('online_orders')
          .update({ status: newStatus })
          .eq('id', dbId);

        // Also update any row sharing the same external_order_id to prevent phantom duplicates
        if (order.externalOrderId) {
          await supabase
            .from('online_orders')
            .update({ status: newStatus })
            .eq('external_order_id', order.externalOrderId);
        }

        console.log('[updateOrderStatus] Supabase response:', { error, status });

        if (error) {
          console.error('[Supabase Status Update Error]', JSON.stringify(error));
          toast.error(`Erreur Supabase (${error.code || status}): ${error.message || 'Impossible de mettre à jour le statut'}`);
          return;
        }

        // 2. SUCCESS ON SUPABASE -> SYNC TO LOCAL STORE & LOCAL DB
        useTransactionStore.getState().setOnlineOrders(prev => 
          (Array.isArray(prev) ? prev : []).map(o => {
            const matchesId = String(o.id) === String(orderId);
            const matchesExt = order.externalOrderId && o.externalOrderId === order.externalOrderId;
            return (matchesId || matchesExt) ? { ...o, status: newStatus } : o;
          })
        );

        await localDb.update(`onlineOrders/${orderId}`, { status: newStatus });
        const currentList = useTransactionStore.getState().onlineOrders;
        idbSet('nexus_online_orders_cache', currentList).catch(() => {});

        toast.success(`Statut synchronisé sur Supabase ✅ : ${statusLabels[newStatus] || newStatus}`);
        return;
      } catch (e: any) {
        console.warn('[Supabase Status Catch - Queued Offline]', e);
        useTransactionStore.getState().setOnlineOrders(prev => 
          (Array.isArray(prev) ? prev : []).map(o => {
            const matchesId = String(o.id) === String(orderId);
            const matchesExt = order.externalOrderId && o.externalOrderId === order.externalOrderId;
            return (matchesId || matchesExt) ? { ...o, status: newStatus } : o;
          })
        );
        await localDb.update(`onlineOrders/${orderId}`, { status: newStatus });
        enqueueSync('online_orders', String(dbId), 'UPSERT', {
          id: dbId,
          status: newStatus,
          ...(order.externalOrderId ? { external_order_id: order.externalOrderId } : {})
        });

        toast.info(`Statut enregistré hors-ligne : ${statusLabels[newStatus] || newStatus} (synchronisation automatique dès reconnexion).`);
        return;
      }
    }

    // Standalone fallback if Supabase is not configured
    useTransactionStore.getState().setOnlineOrders(prev => 
      (Array.isArray(prev) ? prev : []).map(o => {
        const matchesId = String(o.id) === String(orderId);
        const matchesExt = order.externalOrderId && o.externalOrderId === order.externalOrderId;
        return (matchesId || matchesExt) ? { ...o, status: newStatus } : o;
      })
    );
    await localDb.update(`onlineOrders/${orderId}`, { status: newStatus });

    toast.success(`Statut local mis à jour : ${statusLabels[newStatus] || newStatus}`);
  };

  const bulkUpdateOrderStatus = async (targetOrders: OnlineOrder[], newStatus: OnlineOrder['status']) => {
    if (!targetOrders || targetOrders.length === 0) return;
    
    // Si les commandes sont annulées en lot, déclencher le rollback de leurs recettes et du stock
    if (newStatus === 'cancelled') {
      for (const o of targetOrders) {
        await rollbackCancelledOrderTransactions(o);
      }
    }

    // 📦 OPTION 1 : Si les commandes passent en confirmé/actif en lot, décrémenter le stock immédiatement
    const activeDestockStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];
    if (activeDestockStatuses.includes(newStatus)) {
      for (const o of targetOrders) {
        if (!o.syncedToPos) {
          await decrementStockForOrder(o);
        }
      }
    }

    const dbIds = targetOrders.map(o => toSupabaseId(o.id));
    const targetExtIds = targetOrders.map(o => o.externalOrderId).filter(Boolean) as string[];
    const targetIdsSet = new Set(targetOrders.map(o => String(o.id)));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('online_orders')
          .update({ status: newStatus })
          .in('id', dbIds);

        if (targetExtIds.length > 0) {
          await supabase
            .from('online_orders')
            .update({ status: newStatus })
            .in('external_order_id', targetExtIds);
        }

        if (error) {
          toast.error(`Erreur Supabase lot: ${error.message}`);
          return;
        }
      } catch (e: any) {
        console.warn('[Bulk Order Status Catch - Queued Offline]', e);
        targetOrders.forEach(o => {
          enqueueSync('online_orders', String(o.id), 'UPSERT', {
            id: toSupabaseId(o.id),
            status: newStatus,
            ...(o.externalOrderId ? { external_order_id: o.externalOrderId } : {})
          });
        });
        toast.info(`Lot mis à jour hors-ligne (${targetOrders.length} commandes en attente de synchro).`);
      }
    }

    // Mettre à jour Zustand et IndexedDB
    useTransactionStore.getState().setOnlineOrders(prev => 
      (Array.isArray(prev) ? prev : []).map(o => {
        const matchesId = targetIdsSet.has(String(o.id));
        const matchesExt = o.externalOrderId && targetExtIds.includes(o.externalOrderId);
        return (matchesId || matchesExt) ? { ...o, status: newStatus } : o;
      })
    );

    for (const o of targetOrders) {
      await localDb.update(`onlineOrders/${o.id}`, { status: newStatus });
    }

    const currentList = useTransactionStore.getState().onlineOrders;
    idbSet('nexus_online_orders_cache', currentList).catch(() => {});
    toast.success(`${targetOrders.length} commande(s) passée(s) en « ${statusLabels[newStatus] || newStatus} » ✅`);
  };

  const assignOrderToEmployee = async (order: OnlineOrder, employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    const empName = employee?.name || 'Inconnu';
    const orderId = order.id;
    const dbId = toSupabaseId(orderId);

    // 1. SUPABASE-FIRST: Update Supabase
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('online_orders')
          .update({ 
            assigned_employee_id: employeeId,
            assigned_employee_name: empName
          })
          .eq('id', dbId);

        if (error) {
          console.error('[Supabase Assign Delivery Error]', error);
          toast.error(`Erreur Supabase: ${error.message}`);
          return;
        }
      } catch (e: any) {
        toast.error(`Erreur Supabase: ${e?.message}`);
        return;
      }
    }

    // 2. SYNC LOCAL
    useTransactionStore.getState().setOnlineOrders(prev => 
      (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(orderId) ? { 
        ...o, 
        assignedEmployeeId: employeeId, 
        assignedEmployeeName: empName 
      } : o)
    );

    await localDb.update(`onlineOrders/${orderId}`, {
      assignedEmployeeId: employeeId,
      assignedEmployeeName: empName
    });

    const currentList = useTransactionStore.getState().onlineOrders;
    idbSet('nexus_online_orders_cache', currentList).catch(() => {});

    toast.success(`Livreur assigné sur Supabase ✅ : ${empName}`);
  };

  const assignPickerToOrder = async (order: OnlineOrder, pickerId: string) => {
    const picker = employees.find(e => e.id === pickerId);
    const pickerName = picker?.name || 'Inconnu';
    const orderId = order.id;
    const dbId = toSupabaseId(orderId);

    // 1. SUPABASE-FIRST: Update Supabase
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('online_orders')
          .update({ 
            assigned_picker_id: pickerId,
            assigned_picker_name: pickerName
          })
          .eq('id', dbId);

        if (error) {
          console.error('[Supabase Assign Picker Error]', error);
          toast.error(`Erreur Supabase: ${error.message}`);
          return;
        }
      } catch (e: any) {
        toast.error(`Erreur Supabase: ${e?.message}`);
        return;
      }
    }

    // 2. SYNC LOCAL
    useTransactionStore.getState().setOnlineOrders(prev => 
      (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(orderId) ? { 
        ...o, 
        assignedPickerId: pickerId, 
        assignedPickerName: pickerName 
      } : o)
    );

    await localDb.update(`onlineOrders/${orderId}`, {
      assignedPickerId: pickerId,
      assignedPickerName: pickerName
    });

    const currentList = useTransactionStore.getState().onlineOrders;
    idbSet('nexus_online_orders_cache', currentList).catch(() => {});

    toast.success(`Préparateur assigné sur Supabase ✅ : ${pickerName}`);
  };

  return {
    updateOrderPaymentStatus,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    assignOrderToEmployee,
    assignPickerToOrder
  };
}
