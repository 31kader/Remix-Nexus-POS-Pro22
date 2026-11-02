import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { enqueueStockAdjustment, enqueueSync } from '../../services/SyncService';
import { localDb, markRecordDeleted } from '../../services/LocalDatabase';
import { useTransactionStore } from '../../store/useTransactionStore';
import { restockOrder } from '../../services/orderStockService';
import { set as idbSet } from 'idb-keyval';
import { OnlineOrder, Product } from '../../types';
import { convertKeysToCamel } from '../../lib/db-converters';
import { generateUniqueId } from '../../lib/utils';
import { toSupabaseId } from './ordersTypes';

interface UseOrdersStockOperationsProps {
  products: Product[];
  customers: any[];
  rawOrders: OnlineOrder[];
  orderToDelete: string | null;
  setOrderToDelete: (id: string | null) => void;
  setSelectedOrderIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsEditingItems: (v: boolean) => void;
  setSelectedOrderId: (id: string | null) => void;
}

export function useOrdersStockOperations({
  products,
  customers,
  rawOrders,
  orderToDelete,
  setOrderToDelete,
  setSelectedOrderIds,
  setIsEditingItems,
  setSelectedOrderId
}: UseOrdersStockOperationsProps) {

  const updateDeliveryMethod = async (order: OnlineOrder, newMethod: 'delivery' | 'pickup') => {
    const orderId = order.id;

    // 1. Mise à jour locale immédiate (Offline-First)
    useTransactionStore.getState().setOnlineOrders(prev => 
      (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(orderId) ? { ...o, deliveryMethod: newMethod } : o)
    );
    await localDb.update(`onlineOrders/${orderId}`, { deliveryMethod: newMethod });
    const currentList = useTransactionStore.getState().onlineOrders;
    idbSet('nexus_online_orders_cache', currentList).catch(() => {});

    // 2. Synchronisation Supabase
    if (isSupabaseConfigured && navigator.onLine) {
      try {
        const dbId = toSupabaseId(orderId);
        const { error } = await supabase
          .from('online_orders')
          .update({ delivery_method: newMethod })
          .eq('id', dbId);
        if (error) throw error;
        toast.success('Méthode de livraison mise à jour sur Supabase.');
      } catch (e: any) {
        console.warn('[updateDeliveryMethod] Offline queued:', e);
        enqueueSync('online_orders', String(orderId), 'UPSERT', { id: toSupabaseId(orderId), delivery_method: newMethod });
        toast.info('Méthode de livraison mise à jour en local (synchronisation différée).');
      }
    } else {
      enqueueSync('online_orders', String(orderId), 'UPSERT', { id: toSupabaseId(orderId), delivery_method: newMethod });
      toast.info('Méthode de livraison mise à jour en local.');
    }
  };

  const saveOrderItems = async (order: OnlineOrder, newItems: OnlineOrder['items']) => {
    const orderId = order.id;
    try {
      const newTotal = (newItems || []).reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

      // Si la commande avait déjà été déstockée (syncedToPos === true), ajuster les stocks par delta
      if (order.syncedToPos && order.status !== 'cancelled') {
        const oldQtyMap = new Map<string, number>();
        for (const item of (order.items || [])) {
          const pid = String((item as any).productId || (item as any).id || '');
          if (pid) oldQtyMap.set(pid, (oldQtyMap.get(pid) || 0) + (Number(item.quantity) || 0));
        }

        const newQtyMap = new Map<string, number>();
        for (const item of (newItems || [])) {
          const pid = String((item as any).productId || (item as any).id || '');
          if (pid) newQtyMap.set(pid, (newQtyMap.get(pid) || 0) + (Number(item.quantity) || 0));
        }

        const allPids = new Set<string>([...oldQtyMap.keys(), ...newQtyMap.keys()]);
        const { useCoreStore } = await import('../../store/useCoreStore');
        const currentProds = useCoreStore.getState().products || products || [];
        const nowIso = new Date().toISOString();

        for (const pid of allPids) {
          const oldQ = oldQtyMap.get(pid) || 0;
          const newQ = newQtyMap.get(pid) || 0;
          const stockDelta = oldQ - newQ;
          if (stockDelta === 0) continue;

          const prod = currentProds.find(p => String(p.id) === pid);
          if (prod) {
            if (prod.isBundle && prod.bundleItems && prod.bundleItems.length > 0) {
              for (const bItem of prod.bundleItems) {
                const comp = currentProds.find(p => String(p.id) === String(bItem.productId));
                if (comp) {
                  const compDelta = stockDelta * Number(bItem.quantity || 1);
                  const updatedCompStock = (Number(comp.stock) || 0) + compDelta;
                  enqueueStockAdjustment(comp.id, compDelta);
                  await localDb.updateLocalOnly(`products/${comp.id}`, { stock: updatedCompStock, updatedAt: nowIso });
                  useCoreStore.getState().setProducts(prev =>
                    (prev || []).map(p => String(p.id) === String(comp.id) ? { ...p, stock: updatedCompStock, updatedAt: nowIso } : p)
                  );
                }
              }
            } else {
              const updatedStock = (Number(prod.stock) || 0) + stockDelta;
              enqueueStockAdjustment(prod.id, stockDelta);
              await localDb.updateLocalOnly(`products/${prod.id}`, { stock: updatedStock, updatedAt: nowIso });
              useCoreStore.getState().setProducts(prev =>
                (prev || []).map(p => String(p.id) === pid ? { ...p, stock: updatedStock, updatedAt: nowIso } : p)
              );
            }
          }
        }

        // Réajuster points et chiffre d'affaires client si la commande était déjà liée
        const oldTotal = Number(order.total || 0);
        const diffTotal = newTotal - oldTotal;
        const currentSettings = useCoreStore.getState().settings || {};
        const loyaltyRatio = Number((currentSettings as any)?.loyaltyPointsPerCurrencyUnit) || 1;
        const deltaPoints = Math.floor(newTotal * loyaltyRatio) - Math.floor(oldTotal * loyaltyRatio);

        if (order.customerId && (diffTotal !== 0 || deltaPoints !== 0)) {
          const { usePeopleStore } = await import('../../store/usePeopleStore');
          const cust = (usePeopleStore.getState().customers || []).find(c => String(c.id) === String(order.customerId));
          if (cust) {
            const updatedCustomer = {
              ...cust,
              totalSpent: Math.max(0, (Number(cust.totalSpent) || 0) + diffTotal),
              loyaltyPoints: Math.max(0, (Number(cust.loyaltyPoints) || 0) + deltaPoints),
              deltaSpent: diffTotal,
              deltaPoints: deltaPoints,
            };
            await localDb.update(`customers/${cust.id}`, updatedCustomer);
            usePeopleStore.getState().setCustomers(prev =>
              (prev || []).map(c => (String(c.id) === String(cust.id) ? { ...c, ...updatedCustomer } : c))
            );
          }
        }

        // Mettre à jour la transaction POS associée si elle existe
        const allTxs = useTransactionStore.getState().transactions || [];
        const linkedTx = allTxs.find(t => String(t.onlineOrderId) === String(orderId) && t.status !== 'cancelled');
        if (linkedTx) {
          const updatedTx = {
            ...linkedTx,
            items: (newItems || []).map((it: any) => ({
              ...it,
              id: it.productId || it.id,
              productId: it.productId || it.id,
            })),
            total: newTotal,
            updatedAt: nowIso,
            isEdited: true,
            editedAt: nowIso
          };
          await localDb.update(`transactions/${linkedTx.id}`, updatedTx);
          useTransactionStore.getState().setTransactions(prev =>
            (prev || []).map(t => t.id === linkedTx.id ? updatedTx : t)
          );
        }
      }

      useTransactionStore.getState().setOnlineOrders(prev => 
        (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(orderId) ? { ...o, items: newItems, total: newTotal } : o)
      );

      await localDb.update(`onlineOrders/${orderId}`, { items: newItems, total: newTotal });
      const currentList = useTransactionStore.getState().onlineOrders;
      idbSet('nexus_online_orders_cache', currentList).catch(() => {});

      setIsEditingItems(false);
      setSelectedOrderId(null);
      toast.success('Articles et total enregistrés avec succès.');
    } catch (error: any) {
      console.error('Error saving order items:', error);
      toast.error('Erreur lors de la sauvegarde des articles.');
    }
  };

  const confirmDeleteOrder = async (orderIdToDelete?: string) => {
    const targetId = orderIdToDelete || orderToDelete;
    if (!targetId) return;
    
    const currentOrders = useTransactionStore.getState().onlineOrders || [];
    const targetOrder = currentOrders.find(o => String(o.id) === String(targetId));
    const extId = targetOrder?.externalOrderId;

    if (targetOrder && targetOrder.syncedToPos && targetOrder.status !== 'cancelled') {
      let proceedRestock = true;
      if (targetOrder.status === 'delivered') {
        proceedRestock = window.confirm(
          `Cette commande #${targetOrder.externalOrderId || targetId} a été marquée livrée et intégrée en caisse.\n\n` +
          `Voulez-vous réintégrer son stock et annuler sa vente ?\n` +
          `(OK = Réintégrer le stock et annuler la vente, Annuler = Supprimer sans modifier le stock)`
        );
      }
      if (proceedRestock) {
        try {
          await restockOrder(targetOrder, { customers });
        } catch (rErr) {
          console.warn('[confirmDeleteOrder] Erreur restockOrder:', rErr);
        }
      }
    }

    const updatedList = (Array.isArray(currentOrders) ? currentOrders : [])
      .filter(o => String(o.id) !== String(targetId));
    useTransactionStore.getState().setOnlineOrders(updatedList);

    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      next.delete(String(targetId));
      return next;
    });

    setOrderToDelete(null);

    markRecordDeleted('online_orders', String(targetId));
    if (extId) {
      markRecordDeleted('online_orders', String(extId));
    }

    await idbSet('nexus_online_orders_cache', updatedList).catch(() => {});
    await localDb.delete(`onlineOrders/${targetId}`);

    const dbId = toSupabaseId(targetId);
    if (isSupabaseConfigured && navigator.onLine) {
      try {
        const { error } = await supabase
          .from('online_orders')
          .delete()
          .eq('id', dbId);

        if (extId) {
          try {
            await supabase.from('online_orders').delete().eq('external_order_id', extId);
          } catch (_) {}
        }

        if (error) {
          console.warn('[confirmDeleteOrder] Supabase delete warning, queued offline:', error);
          enqueueSync('online_orders', String(targetId), 'DELETE', null);
          toast.info("Commande supprimée en local (synchronisation en attente de reconnexion).");
        } else {
          toast.success("Commande supprimée avec succès.");
        }
      } catch (e: any) {
        console.warn('[confirmDeleteOrder] Network/reset error during delete, queued offline:', e);
        enqueueSync('online_orders', String(targetId), 'DELETE', null);
        toast.info("Commande supprimée en local (synchronisation différée).");
      }
    } else {
      enqueueSync('online_orders', String(targetId), 'DELETE', null);
      toast.info("Commande supprimée en local (sera synchronisée au retour d'Internet).");
    }
  };

  const createTestOrder = async () => {
    try {
      const randomExtId = Math.floor(100000 + Math.random() * 900000);
      const sampleItem = products.length > 0 ? {
        productId: products[0].id,
        name: products[0].name,
        price: products[0].price || 1500,
        quantity: 1
      } : {
        productId: 'PROD-001',
        name: 'Article Démo',
        price: 2500,
        quantity: 1
      };

      const newOrderPayload = {
        external_order_id: String(randomExtId),
        source: 'Site Web',
        customer_name: 'Client Démo ' + (rawOrders.length + 1),
        customer_phone: '0550123456',
        shipping_address: '12 Rue Didouche Mourad, Alger',
        items: [sampleItem],
        total: sampleItem.price * sampleItem.quantity,
        status: 'pending',
        payment_status: 'unpaid',
        payment_method: 'cash',
        delivery_method: 'delivery',
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('online_orders')
          .insert(newOrderPayload)
          .select('*');

        if (error) {
          toast.error(`Erreur Supabase lors de la création: ${error.message}`);
          return;
        }

        if (data && data[0]) {
          const camel = convertKeysToCamel(data[0]) as OnlineOrder;
          useTransactionStore.getState().setOnlineOrders(prev => [camel, ...(Array.isArray(prev) ? prev : [])]);
          await localDb.insert(`onlineOrders/${camel.id}`, camel);
          const currentList = useTransactionStore.getState().onlineOrders;
          idbSet('nexus_online_orders_cache', currentList).catch(() => {});
          toast.success(`Nouvelle commande créée sur Supabase (#${camel.externalOrderId || camel.id})`);
          return;
        }
      }

      const localId = generateUniqueId();
      const localOrder: OnlineOrder = {
        ...convertKeysToCamel(newOrderPayload) as OnlineOrder,
        id: localId
      };
      useTransactionStore.getState().setOnlineOrders(prev => [localOrder, ...(Array.isArray(prev) ? prev : [])]);
      await localDb.insert(`onlineOrders/${localId}`, localOrder);
      toast.success(`Nouvelle commande locale créée (#${randomExtId})`);
    } catch (e: any) {
      console.error('Failed to create test order:', e);
      toast.error('Erreur lors de la création de la commande');
    }
  };

  return {
    updateDeliveryMethod,
    saveOrderItems,
    confirmDeleteOrder,
    createTestOrder
  };
}
