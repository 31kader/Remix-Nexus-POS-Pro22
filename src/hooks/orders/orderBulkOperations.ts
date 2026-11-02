import { supabase, isSupabaseConfigured } from '../../supabase';
import { OnlineOrder, Customer, Employee, CompanySettings } from '../../types';
import { localDb } from '../../services/LocalDatabase';
import { enqueueSync } from '../../services/SyncService';
import { useTransactionStore } from '../../store/useTransactionStore';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';

function toSupabaseId(id: any): number | string {
  const n = Number(id);
  return (!isNaN(n) && n > 0) ? n : id;
}

export async function executeBulkUpdateOrderStatus(
  targetOrders: OnlineOrder[],
  newStatus: OnlineOrder['status'],
  statusLabels: Record<string, string>,
  rollbackCancelledOrderTransactions: (order: OnlineOrder) => Promise<any>,
  decrementStockForOrder: (order: OnlineOrder) => Promise<any>
) {
  if (!targetOrders || targetOrders.length === 0) return;
  
  // Si les commandes sont annulées en lot, déclencher le rollback de leurs recettes et du stock
  if (newStatus === 'cancelled') {
    for (const o of targetOrders) {
      await rollbackCancelledOrderTransactions(o);
    }
  }

  // 📦 OPTION 1 : Si les commandes passent en confirmé/actif en lot, décrémenter le stock immédiatement
  const activeDestockStatuses = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];
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
}
