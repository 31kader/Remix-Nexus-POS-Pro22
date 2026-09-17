import { supabase, isSupabaseConfigured } from '../supabase';
import { OnlineOrder, Customer, Employee, CompanySettings, Transaction } from '../types';
import { generateUniqueId } from '../lib/utils';
import { localDb } from '../services/LocalDatabase';
import { enqueueSync } from '../services/SyncService';
import { useTransactionStore } from '../store/useTransactionStore';
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

  const updateOrderStatus = async (order: OnlineOrder, newStatus: OnlineOrder['status']) => {
    const orderId = order.id;
    const dbId = toSupabaseId(orderId);

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

        // When delivered, create local completed transaction for POS sales history
        if (newStatus === 'delivered' && order.status !== 'delivered') {
          const tid = generateUniqueId();
          const transaction: Transaction = {
            id: tid,
            userId: user?.id || user?.uid || 'online_system',
            items: (order.items || []) as any,
            total: order.total || 0,
            timestamp: new Date().toISOString(),
            paymentMethod: (order.paymentMethod as any) || 'cash',
            status: 'completed',
            employeeName: 'Commande en Ligne',
            customerName: order.customerName || 'Client en Ligne',
            customerId: order.customerId,
            notes: `Commande en Ligne #${order.externalOrderId || String(order.id || "").slice(0, 8)}`
          };

          await localDb.insert(`transactions/${tid}`, transaction);
          useTransactionStore.getState().setTransactions(prev => [transaction, ...(Array.isArray(prev) ? prev : [])]);
        }

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

        if (newStatus === 'delivered' && order.status !== 'delivered') {
          const tid = generateUniqueId();
          const transaction: Transaction = {
            id: tid,
            userId: user?.id || user?.uid || 'online_system',
            items: (order.items || []) as any,
            total: order.total || 0,
            timestamp: new Date().toISOString(),
            paymentMethod: (order.paymentMethod as any) || 'cash',
            status: 'completed',
            employeeName: 'Commande en Ligne',
            customerName: order.customerName || 'Client en Ligne',
            customerId: order.customerId,
            notes: `Commande en Ligne #${order.externalOrderId || String(order.id || "").slice(0, 8)}`
          };
          await localDb.insert(`transactions/${tid}`, transaction);
          useTransactionStore.getState().setTransactions(prev => [transaction, ...(Array.isArray(prev) ? prev : [])]);
        }

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
