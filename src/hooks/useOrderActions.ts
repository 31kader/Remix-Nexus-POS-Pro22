import { supabase, isSupabaseConfigured } from '../supabase';
import { OnlineOrder, Customer, Employee, CompanySettings } from '../types';
import { localDb } from '../services/LocalDatabase';
import { enqueueSync } from '../services/SyncService';
import { destockOrder, restockOrder } from '../services/orderStockService';
import { useTransactionStore } from '../store/useTransactionStore';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';
import { executeAssignOrderToEmployee, executeAssignPickerToOrder } from './orders/orderStaffAssignment';
import { executeBulkUpdateOrderStatus } from './orders/orderBulkOperations';

interface UseOrderActionsParams {
  orders: OnlineOrder[];
  customers: Customer[];
  employees: Employee[];
  profile: any;
  user: any;
  settings: CompanySettings;
}

// Helper: Supabase online_orders uses BIGSERIAL (int8) for ID
function toSupabaseId(id: any): number | string {
  const n = Number(id);
  return (!isNaN(n) && n > 0) ? n : id;
}

// Helper universel de comparaison de commandes (Anti-Désynchronisation ID / externalOrderId)
function matchesOrder(o: OnlineOrder, target: OnlineOrder | string | number): boolean {
  if (!o) return false;
  const targetId = typeof target === 'object' ? String(target.id || '') : String(target);
  const targetExt = typeof target === 'object' ? String(target.externalOrderId || '') : '';
  const oId = String(o.id || '');
  const oExt = String(o.externalOrderId || '');

  return (
    (targetId !== '' && oId === targetId) ||
    (targetExt !== '' && oExt !== '' && oExt === targetExt) ||
    (targetExt !== '' && oId === targetExt) ||
    (targetId !== '' && oExt === targetId)
  );
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
    const updates: Partial<OnlineOrder> = { paymentStatus: newPaymentStatus };
    
    // 1. OFFLINE-FIRST OPTIMISTIC UPDATE : Mise à jour immédiate de l'état local et cache
    useTransactionStore.getState().setOnlineOrders(prev => 
      (Array.isArray(prev) ? prev : []).map(o => matchesOrder(o, order) ? { ...o, ...updates } : o)
    );
    await localDb.update(`onlineOrders/${orderId}`, updates);
    const currentList = useTransactionStore.getState().onlineOrders;
    idbSet('nexus_online_orders_cache', currentList).catch(() => {});
    toast.success(newPaymentStatus === 'paid' ? 'Paiement Payé validé ✅' : 'Paiement Non Payé enregistré');

    // 2. SYNCHRONISATION SUPABASE (Fond de tâche)
    if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        const numericId = typeof order.id === 'number' ? order.id : (!isNaN(Number(order.id)) ? Number(order.id) : null);
        let supaQuery = supabase.from('online_orders').update({ payment_status: newPaymentStatus });
        if (order.externalOrderId) {
          supaQuery = supaQuery.or(`external_order_id.eq.${order.externalOrderId}${numericId ? `,id.eq.${numericId}` : ''}`);
        } else if (numericId) {
          supaQuery = supaQuery.eq('id', numericId);
        } else {
          supaQuery = supaQuery.eq('id', dbId);
        }

        const { error } = await supaQuery;
        if (error) {
          console.warn('[Supabase Payment Sync Warning - Fallback Queue]', error);
          enqueueSync('online_orders', String(dbId), 'UPSERT', { id: dbId, payment_status: newPaymentStatus });
        }
      } catch (e: any) {
        console.warn('[Supabase Payment Catch - Queued Offline]', e);
        enqueueSync('online_orders', String(dbId), 'UPSERT', { id: dbId, payment_status: newPaymentStatus });
      }
    } else {
      enqueueSync('online_orders', String(dbId), 'UPSERT', { id: dbId, payment_status: newPaymentStatus });
    }
  };

  // 🛡️ SYNCHRONISATION / ROLLBACK : Si une commande est annulée, annuler sa transaction de caisse et réintégrer le stock
  const rollbackCancelledOrderTransactions = async (order: OnlineOrder) => {
    return await restockOrder(order, { customers });
  };

  // 📦 OPTION 1 : Déstockage immédiat dès la Confirmation (ou statut actif >= confirmed)
  const decrementStockForOrder = async (order: OnlineOrder) => {
    return await destockOrder(order, { user, settings, customers });
  };

  const updateOrderStatus = async (order: OnlineOrder, newStatus: OnlineOrder['status']) => {
    const orderId = order.id;
    const dbId = toSupabaseId(orderId);

    // Si la commande est annulée, déclencher le rollback de sa recette et du stock
    if (newStatus === 'cancelled') {
      await rollbackCancelledOrderTransactions(order);
    }

    // 📦 Déstockage dès confirmation ou statut actif
    const activeDestockStatuses = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];
    let didDestock = false;
    if (activeDestockStatuses.includes(newStatus) && !order.syncedToPos) {
      const res = await decrementStockForOrder(order);
      if (res && res.success) {
        didDestock = true;
      }
    }

    const isSyncedToPos = Boolean(order.syncedToPos || didDestock);
    const orderUpdates: Partial<OnlineOrder> = {
      status: newStatus,
      ...(isSyncedToPos ? { syncedToPos: true } : {})
    };

    // 1. OFFLINE-FIRST OPTIMISTIC UPDATE IMMÉDIAT (Zéro latence perçue par le caissier)
    useTransactionStore.getState().setOnlineOrders(prev => 
      (Array.isArray(prev) ? prev : []).map(o => matchesOrder(o, order) ? { ...o, ...orderUpdates } : o)
    );
    await localDb.update(`onlineOrders/${orderId}`, orderUpdates);
    const currentList = useTransactionStore.getState().onlineOrders;
    idbSet('nexus_online_orders_cache', currentList).catch(() => {});
    toast.success(`Statut mis à jour : ${statusLabels[newStatus] || newStatus} ✅`);

    // 2. SYNCHRONISATION SUPABASE EN TÂCHE DE FOND
    const supaPayload: Record<string, any> = {
      status: newStatus,
      ...(isSyncedToPos ? { synced_to_pos: true } : {})
    };

    if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        const numericId = typeof order.id === 'number' ? order.id : (!isNaN(Number(order.id)) ? Number(order.id) : null);
        let supaQuery = supabase.from('online_orders').update(supaPayload);
        if (order.externalOrderId) {
          supaQuery = supaQuery.or(`external_order_id.eq.${order.externalOrderId}${numericId ? `,id.eq.${numericId}` : ''}`);
        } else if (numericId) {
          supaQuery = supaQuery.eq('id', numericId);
        } else {
          supaQuery = supaQuery.eq('id', dbId);
        }

        const { error } = await supaQuery;
        if (error) {
          console.warn('[Supabase Order Status Sync Warning - Fallback Queue]', error);
          enqueueSync('online_orders', String(dbId), 'UPSERT', {
            id: dbId,
            ...supaPayload,
            ...(order.externalOrderId ? { external_order_id: order.externalOrderId } : {})
          });
        }
      } catch (e: any) {
        console.warn('[Supabase Status Catch - Queued Offline]', e);
        enqueueSync('online_orders', String(dbId), 'UPSERT', {
          id: dbId,
          ...supaPayload,
          ...(order.externalOrderId ? { external_order_id: order.externalOrderId } : {})
        });
      }
    } else {
      enqueueSync('online_orders', String(dbId), 'UPSERT', {
        id: dbId,
        ...supaPayload,
        ...(order.externalOrderId ? { external_order_id: order.externalOrderId } : {})
      });
    }
  };

  const bulkUpdateOrderStatus = async (targetOrders: OnlineOrder[], newStatus: OnlineOrder['status']) => {
    return await executeBulkUpdateOrderStatus(
      targetOrders,
      newStatus,
      statusLabels,
      rollbackCancelledOrderTransactions,
      decrementStockForOrder
    );
  };

  const assignOrderToEmployee = async (order: OnlineOrder, employeeId: string) => {
    return await executeAssignOrderToEmployee(order, employeeId, employees);
  };

  const assignPickerToOrder = async (order: OnlineOrder, pickerId: string) => {
    return await executeAssignPickerToOrder(order, pickerId, employees);
  };

  return {
    updateOrderPaymentStatus,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    assignOrderToEmployee,
    assignPickerToOrder,
    rollbackCancelledOrderTransactions,
    decrementStockForOrder
  };
}
