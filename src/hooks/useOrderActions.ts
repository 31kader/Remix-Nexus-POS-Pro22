import { useState } from 'react';
import { supabase } from '../supabase';
import { OnlineOrder, Customer, Employee, CompanySettings } from '../types';
import { generateUniqueId } from '../lib/utils';
import { toast } from 'sonner';

interface UseOrderActionsParams {
  orders: OnlineOrder[];
  customers: Customer[];
  employees: Employee[];
  profile: any;
  user: any;
  settings: CompanySettings;
}

export function useOrderActions({
  orders,
  customers,
  employees,
  profile,
  user,
  settings
}: UseOrderActionsParams) {

  const updateOrderPaymentStatus = async (order: OnlineOrder, newPaymentStatus: OnlineOrder['paymentStatus']) => {
    try {
      const { error } = await supabase
        .from('online_orders')
        .update({ payment_status: newPaymentStatus })
        .eq('id', order.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Erreur lors de la mise à jour du paiement.');
    }
  };

  const updateOrderStatus = async (order: OnlineOrder, newStatus: OnlineOrder['status']) => {
    try {
      const { error } = await supabase
        .from('online_orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;
      
      let finalCustomerId = order.customerId;
      if (!finalCustomerId) {
        const found = customers.find((c: Customer) => 
          (order.customerPhone && c.phone && c.phone.replace(/\D/g, '') === order.customerPhone.replace(/\D/g, '')) || 
          (c.name.toLowerCase() === order.customerName?.toLowerCase())
        );
        
        if (found) {
          finalCustomerId = found.id;
          await supabase
            .from('online_orders')
            .update({ customer_id: finalCustomerId })
            .eq('id', order.id);
        }
      }

      if (newStatus === 'delivered' && order.status !== 'delivered') {
        if (!order.syncedToPos) {
          // Verify if user_id exists in the public users database table to prevent transactions_user_id_fkey foreign key violations
          let verifiedUserId: string | null = null;
          const originalUserId = profile?.id || user?.uid;
          if (originalUserId) {
            const { data: userRecord } = await supabase
              .from('users')
              .select('id')
              .eq('id', originalUserId)
              .maybeSingle();
            if (userRecord) {
              verifiedUserId = originalUserId;
            }
          }

          const { data: transaction, error: transError } = await supabase
            .from('transactions')
            .insert({
              id: generateUniqueId(),
              items: order.items,
              total: order.total,
              timestamp: order.timestamp || new Date().toISOString(),
              payment_method: (order.paymentMethod as 'cash' | 'card') || 'cash',
              status: 'completed',
              employee_name: 'Commande en ligne',
              user_id: verifiedUserId,
              online_order_id: order.id,
              customer_id: finalCustomerId || null,
              customer_name: order.customerName || null,
              points_earned: finalCustomerId ? Math.floor(order.total * (settings.loyaltyPointsPerCurrencyUnit || 1)) : 0
            })
            .select()
            .maybeSingle();
            
          if (transError) throw transError;
          
          await supabase
            .from('online_orders')
            .update({ synced_to_pos: true })
            .eq('id', order.id);
        }
        
        if (finalCustomerId) {
          const { data: customer } = await supabase
            .from('customers')
            .select('loyalty_points, total_spent')
            .eq('id', finalCustomerId)
            .maybeSingle();
          
          if (customer) {
            const pointsEarned = Math.floor(order.total * (settings.loyaltyPointsPerCurrencyUnit || 1));
            await supabase
              .from('customers')
              .update({ 
                loyalty_points: (customer.loyalty_points || 0) + pointsEarned,
                total_spent: (customer.total_spent || 0) + order.total,
                last_visit: new Date().toISOString()
              })
              .eq('id', finalCustomerId);
          }
        }
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erreur lors de la mise à jour de la commande.');
    }
  };

  const assignOrderToEmployee = async (order: OnlineOrder, employeeId: string) => {
    try {
      const employee = employees.find(e => e.id === employeeId);
      const { error } = await supabase
        .from('online_orders')
        .update({ 
          assigned_employee_id: employeeId,
          assigned_employee_name: employee?.name || 'Inconnu'
        })
        .eq('id', order.id);
      if (error) throw error;
    } catch (error) {
      console.error('Error assigning order:', error);
      toast.error('Erreur lors de l\'assignation de la commande.');
    }
  };

  const assignPickerToOrder = async (order: OnlineOrder, pickerId: string) => {
    try {
      const picker = employees.find(e => e.id === pickerId);
      const { error } = await supabase
        .from('online_orders')
        .update({ 
          assigned_picker_id: pickerId,
          assigned_picker_name: picker?.name || 'Inconnu'
        })
        .eq('id', order.id);
      if (error) throw error;
    } catch (error) {
      console.error('Error assigning picker:', error);
      toast.error('Erreur lors de l\'assignation du préparateur.');
    }
  };

  return {
    updateOrderPaymentStatus,
    updateOrderStatus,
    assignOrderToEmployee,
    assignPickerToOrder
  };
}
