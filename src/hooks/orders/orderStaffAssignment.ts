import { supabase, isSupabaseConfigured } from '../../supabase';
import { OnlineOrder, Employee } from '../../types';
import { localDb } from '../../services/LocalDatabase';
import { useTransactionStore } from '../../store/useTransactionStore';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';

function toSupabaseId(id: any): number | string {
  const n = Number(id);
  return (!isNaN(n) && n > 0) ? n : id;
}

export async function executeAssignOrderToEmployee(
  order: OnlineOrder,
  employeeId: string,
  employees: Employee[]
) {
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
}

export async function executeAssignPickerToOrder(
  order: OnlineOrder,
  pickerId: string,
  employees: Employee[]
) {
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
}
