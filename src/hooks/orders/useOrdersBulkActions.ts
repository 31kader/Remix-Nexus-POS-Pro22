import { useState } from 'react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { enqueueSync } from '../../services/SyncService';
import { localDb, markRecordDeleted } from '../../services/LocalDatabase';
import { useTransactionStore } from '../../store/useTransactionStore';
import { restockOrder } from '../../services/orderStockService';
import { set as idbSet } from 'idb-keyval';
import { OnlineOrder } from '../../types';

interface UseOrdersBulkActionsProps {
  rawOrders: OnlineOrder[];
  customers: any[];
  bulkUpdateOrderStatus: (orders: OnlineOrder[], newStatus: any) => Promise<any>;
}

export function useOrdersBulkActions({
  rawOrders,
  customers,
  bulkUpdateOrderStatus
}: UseOrdersBulkActionsProps) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      const strId = String(orderId);
      if (next.has(strId)) next.delete(strId);
      else next.add(strId);
      return next;
    });
  };

  const toggleSelectAll = (orderList: OnlineOrder[]) => {
    setSelectedOrderIds(prev => {
      const currentFilteredIds = orderList.map(o => String(o.id));
      const allSelected = currentFilteredIds.length > 0 && currentFilteredIds.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        currentFilteredIds.forEach(id => next.delete(id));
        return next;
      } else {
        const next = new Set(prev);
        currentFilteredIds.forEach(id => next.add(id));
        return next;
      }
    });
  };

  const clearSelection = () => {
    setSelectedOrderIds(new Set());
  };

  const handleBulkCancel = async () => {
    const targets = rawOrders.filter(o => selectedOrderIds.has(String(o.id)));
    if (targets.length === 0) return;
    if (!window.confirm(`Êtes-vous sûr de vouloir annuler ces ${targets.length} commande(s) sélectionnée(s) ?`)) return;
    await bulkUpdateOrderStatus(targets, 'cancelled');
    clearSelection();
  };

  const handleBulkConfirm = async () => {
    const targets = rawOrders.filter(o => selectedOrderIds.has(String(o.id)));
    if (targets.length === 0) return;
    if (!window.confirm(`Confirmer ces ${targets.length} commande(s) sélectionnée(s) ?`)) return;
    await bulkUpdateOrderStatus(targets, 'confirmed');
    clearSelection();
  };

  const handleBulkDelete = async () => {
    if (selectedOrderIds.size === 0) return;
    const idsToDelete = Array.from(selectedOrderIds);
    const count = idsToDelete.length;
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement ces ${count} commande(s) ?`)) return;

    // 1. SUPPRESSION LOCALE OPTIMISTE IMMÉDIATE
    const currentOrders = useTransactionStore.getState().onlineOrders || [];
    const targetOrders = currentOrders.filter(o => selectedOrderIds.has(String(o.id)));
    const extIds = targetOrders.map(o => o.externalOrderId).filter(Boolean) as string[];

    // 🛡️ Réintégration préalable du stock pour les commandes en cours déstockées
    for (const o of targetOrders) {
      if (o.syncedToPos && o.status !== 'cancelled' && o.status !== 'delivered') {
        try {
          await restockOrder(o, { customers });
        } catch (rErr) {
          console.warn('[handleBulkDelete] Erreur restockOrder:', rErr);
        }
      }
    }

    const updatedList = (Array.isArray(currentOrders) ? currentOrders : [])
      .filter(o => !selectedOrderIds.has(String(o.id)));
    useTransactionStore.getState().setOnlineOrders(updatedList);
    clearSelection();

    await idbSet('nexus_online_orders_cache', updatedList).catch(() => {});
    for (const id of idsToDelete) {
      markRecordDeleted('online_orders', String(id));
      await localDb.delete(`onlineOrders/${id}`);
    }
    if (extIds.length > 0) {
      extIds.forEach(eid => markRecordDeleted('online_orders', String(eid)));
    }

    // 2. SYNCHRONISATION SUPABASE EN ARRIÈRE-PLAN
    if (isSupabaseConfigured && navigator.onLine) {
      try {
        const numIds = idsToDelete.map(id => Number(id)).filter(n => !isNaN(n) && n > 0);
        const strIds = idsToDelete.filter(id => isNaN(Number(id)) || Number(id) <= 0);

        if (numIds.length > 0) {
          await supabase.from('online_orders').delete().in('id', numIds);
        }
        if (strIds.length > 0) {
          await supabase.from('online_orders').delete().in('id', strIds);
        }
        if (extIds.length > 0) {
          try {
            await supabase.from('online_orders').delete().in('external_order_id', extIds);
          } catch (_) {}
        }
        toast.success(`${count} commande(s) supprimée(s) avec succès.`);
      } catch (err) {
        console.warn('[handleBulkDelete] Supabase delete failed, queued offline:', err);
        idsToDelete.forEach(id => enqueueSync('online_orders', id, 'DELETE', null));
        toast.info(`${count} commande(s) supprimée(s) en local (synchro différée).`);
      }
    } else {
      idsToDelete.forEach(id => enqueueSync('online_orders', id, 'DELETE', null));
      toast.info(`${count} commande(s) supprimée(s) en local (synchro différée).`);
    }
  };

  return {
    selectedOrderIds,
    setSelectedOrderIds,
    toggleSelectOrder,
    toggleSelectAll,
    clearSelection,
    handleBulkCancel,
    handleBulkConfirm,
    handleBulkDelete
  };
}
