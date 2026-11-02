import { supabase, isSupabaseConfigured } from '../../supabase';
import { Transaction, UserProfile } from '../../types';
import { convertKeysToCamel } from '../../lib/db-converters';
import { startOfDay, endOfDay, subDays, parseISO } from 'date-fns';

export interface NetworkFilterOptions {
  dateFilter: string;
  paymentMethod: string;
  deliveryMethod: string;
  customRange: { start: string; end: string };
  customerName: string;
  amount: string;
}

export async function fetchFilteredTransactionsFromNetwork(
  filters: NetworkFilterOptions,
  profile?: UserProfile
): Promise<Transaction[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('transactions')
    .select('id, total, payment_method, delivery_method, timestamp, user_id, customer_id, customer_name, status, employee_id, employee_name, promotion_id, points_earned, discount_amount, points_discount, balance_used, voucher_discount, is_wholesale, online_order_id, items, audit_status');

  // Date filters
  const now = new Date();
  if (filters.dateFilter === 'today') {
    query = query.gte('timestamp', startOfDay(now).toISOString()).lte('timestamp', endOfDay(now).toISOString());
  } else if (filters.dateFilter === 'yesterday') {
    const yesterday = subDays(now, 1);
    query = query.gte('timestamp', startOfDay(yesterday).toISOString()).lte('timestamp', endOfDay(yesterday).toISOString());
  } else if (filters.dateFilter === 'last7days') {
    query = query.gte('timestamp', startOfDay(subDays(now, 7)).toISOString()).lte('timestamp', endOfDay(now).toISOString());
  } else if (filters.dateFilter === 'last30days') {
    query = query.gte('timestamp', startOfDay(subDays(now, 30)).toISOString()).lte('timestamp', endOfDay(now).toISOString());
  } else if (filters.dateFilter === 'custom' && filters.customRange.start && filters.customRange.end) {
    query = query.gte('timestamp', startOfDay(parseISO(filters.customRange.start)).toISOString()).lte('timestamp', endOfDay(parseISO(filters.customRange.end)).toISOString());
  }

  // Payment method
  if (filters.paymentMethod !== 'all') {
    query = query.eq('payment_method', filters.paymentMethod);
  }

  // Delivery method
  if (filters.deliveryMethod !== 'all') {
    if (filters.deliveryMethod === 'online') {
      query = query.not('online_order_id', 'is', null);
    } else if (filters.deliveryMethod === 'pickup') {
      query = query.in('delivery_method', ['pickup', 'retrait', 'takeaway']);
    } else if (filters.deliveryMethod === 'in_store') {
      query = query.in('delivery_method', ['in_store', 'direct']);
    } else {
      query = query.eq('delivery_method', filters.deliveryMethod);
    }
  }

  // Customer name search
  if (filters.customerName) {
    query = query.ilike('customer_name', `%${filters.customerName}%`);
  }

  // Amount search
  if (filters.amount) {
    const amt = parseFloat(filters.amount);
    if (!isNaN(amt)) {
      query = query.eq('total', amt);
    }
  }

  // Cashier role restriction
  if (profile?.role === 'cashier') {
    query = query.eq('user_id', profile.uid);
  }

  const { data, error } = await query.order('timestamp', { ascending: false }).limit(100);

  if (error) throw error;

  if (data) {
    return data.map((item: any) => {
      const camel = convertKeysToCamel(item);
      if (typeof camel.items === 'string') {
        try { camel.items = JSON.parse(camel.items); } catch (e) { camel.items = []; }
      } else if (!camel.items) {
        camel.items = [];
      }
      return camel as Transaction;
    });
  }

  return [];
}

export async function fetchOlderTransactionsFromNetwork(
  oldestTs: string
): Promise<Transaction[]> {
  if (!isSupabaseConfigured) return [];

  let result = await supabase
    .from('transactions')
    .select('id, total, payment_method, delivery_method, timestamp, user_id, customer_id, customer_name, status, employee_id, employee_name, promotion_id, points_earned, discount_amount, points_discount, balance_used, voucher_discount, is_wholesale, online_order_id, items, audit_status, audited_by, audited_at, audit_duration, audit_note')
    .lt('timestamp', oldestTs)
    .order('timestamp', { ascending: false })
    .limit(31);

  if (result.error) {
    console.warn("Retrying historical fetch with basic columns due to missing columns on Supabase:", result.error);
    result = await supabase
      .from('transactions')
      .select('id, total, payment_method, delivery_method, timestamp, user_id, customer_id, customer_name, status, employee_id, employee_name, promotion_id, points_earned, discount_amount, points_discount, balance_used, voucher_discount, is_wholesale, online_order_id, items, audit_status')
      .lt('timestamp', oldestTs)
      .order('timestamp', { ascending: false })
      .limit(31);
  }

  const { data, error } = result;
  if (error) throw error;

  if (data && data.length > 0) {
    return data.map((item: any) => {
      const camel = convertKeysToCamel(item);
      if (typeof camel.items === 'string') {
        try {
          camel.items = JSON.parse(camel.items);
        } catch (e) {
          camel.items = [];
        }
      } else if (!camel.items) {
        camel.items = [];
      }
      return camel as Transaction;
    });
  }

  return [];
}
