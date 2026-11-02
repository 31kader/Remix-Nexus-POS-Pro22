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

        await localDb.updateLocalOnly(`onlineOrders/${orderId}`, { paymentStatus: newPaymentStatus });
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

    // Si la commande est annulée, déclencher le rollback de sa recette et du stock (garde stricte et idempotente dans restockOrder)
    if (newStatus === 'cancelled') {
      await rollbackCancelledOrderTransactions(order);
    }

    // 📦 OPTION 1 : Dès confirmation (ou tout statut actif >= confirmed), déstocker immédiatement
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

    // 1. SUPABASE-FIRST: Update Supabase directly with only valid columns
    if (isSupabaseConfigured) {
      try {
        console.log('[updateOrderStatus] Supabase update:', { status: newStatus, id: dbId, originalId: orderId, typeOfId: typeof orderId });

        const supaPayload: Record<string, any> = {
          status: newStatus,
          ...(isSyncedToPos ? { synced_to_pos: true } : {})
        };

        // Step 1: Update without .select() to avoid RLS issues on SELECT after UPDATE
        const { error, status } = await supabase
          .from('online_orders')
          .update(supaPayload)
          .eq('id', dbId);

        // Also update any row sharing the same external_order_id to prevent phantom duplicates
        if (order.externalOrderId) {
          await supabase
            .from('online_orders')
            .update(supaPayload)
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
            return (matchesId || matchesExt) ? { ...o, ...orderUpdates } : o;
          })
        );

        await localDb.updateLocalOnly(`onlineOrders/${orderId}`, orderUpdates);
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
            return (matchesId || matchesExt) ? { ...o, ...orderUpdates } : o;
          })
        );
        await localDb.update(`onlineOrders/${orderId}`, orderUpdates);
        enqueueSync('online_orders', String(dbId), 'UPSERT', {
          id: dbId,
          ...orderUpdates,
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
