import { useState, useMemo } from 'react';
import { format, isToday, subDays } from 'date-fns';
import { OnlineOrder } from '../../types';
import { StatusCounts, ResolvedCustomerInfo } from './ordersTypes';

interface UseOrdersFiltersProps {
  rawOrders: OnlineOrder[];
  customers: any[];
}

export function useOrdersFilters({ rawOrders, customers = [] }: UseOrdersFiltersProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Compteurs dynamiques par statut pour les onglets
  const statusCounts = useMemo<StatusCounts>(() => {
    const counts: StatusCounts = {
      all: rawOrders.length,
      pending: 0,
      confirmed: 0,
      processing: 0,
      preparing: 0,
      shipped: 0,
      delivering: 0,
      delivered: 0,
      cancelled: 0,
      pickup: 0,
      delivery: 0
    };

    for (const o of rawOrders) {
      const s = String(o?.status || 'pending').toLowerCase();
      if (s === 'pending') counts.pending++;
      else if (s === 'confirmed') counts.confirmed++;
      else if (s === 'processing' || s === 'preparing') {
        counts.processing++;
        counts.preparing!++;
      } else if (s === 'shipped' || s === 'delivering') {
        counts.shipped++;
        counts.delivering!++;
      } else if (s === 'delivered') counts.delivered++;
      else if (s === 'cancelled') counts.cancelled++;

      const del = String(o?.deliveryMethod || '').toLowerCase();
      if (del === 'pickup') counts.pickup!++;
      else if (del === 'delivery') counts.delivery!++;
    }

    return counts;
  }, [rawOrders]);

  const resolveCustomerInfo = (order: OnlineOrder): ResolvedCustomerInfo => {
    if (!order) return { name: 'Client Inconnu', phone: '' };
    const customer = order.customerId ? customers.find(c => String(c.id) === String(order.customerId)) : null;
    const phone = order.customerPhone || customer?.phone || '';
    let name = order.customerName || customer?.name;

    if (!name && order.shippingAddress) {
      const match = String(order.shippingAddress).match(/Client\s*:\s*([^,\n]+)/i);
      if (match) name = match[1].trim();
    }
    if (!name && order.externalOrderId) {
      name = `Client (${order.externalOrderId})`;
    } else if (!name && order.id) {
      name = `Client (#${String(order.id)})`;
    }

    return { 
      name: name || 'Client En Ligne',
      phone: phone || '',
      loyaltyPoints: customer?.loyaltyPoints || customer?.points,
      tier: customer?.tier,
      address: order.shippingAddress || customer?.address,
      customer
    };
  };

  const filteredOrders = useMemo(() => {
    return rawOrders.filter(o => {
      if (!o || !o.id) return false;
      
      const oStatus = o.status || 'pending';
      const matchesStatus = statusFilter === 'all' || String(oStatus).toLowerCase() === statusFilter.toLowerCase();
      if (!matchesStatus) return false;

      const oDelivery = o.deliveryMethod || 'delivery';
      const matchesDelivery = deliveryFilter === 'all' || String(oDelivery).toLowerCase() === deliveryFilter.toLowerCase();
      if (!matchesDelivery) return false;

      const oPayment = o.paymentStatus || 'unpaid';
      const matchesPayment = paymentFilter === 'all' || String(oPayment).toLowerCase() === paymentFilter.toLowerCase();
      if (!matchesPayment) return false;

      const orderTimestamp = o.timestamp || (o as any).createdAt || (o as any).created_at;
      if (dateFilter !== 'all' && orderTimestamp) {
        try {
          const d = new Date(orderTimestamp);
          if (!isNaN(d.getTime())) {
            if (dateFilter === 'today') {
              if (!isToday(d)) return false;
            } else if (dateFilter === 'last7days') {
              const cutoff = subDays(new Date(), 7);
              if (d < cutoff) return false;
            } else if (dateFilter === 'last30days') {
              const cutoff = subDays(new Date(), 30);
              if (d < cutoff) return false;
            }
          }
        } catch (_) {}
      }

      if (searchFilter && searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const custInfo = resolveCustomerInfo(o);
        const nameMatch = custInfo.name?.toLowerCase().includes(q);
        const phoneMatch = custInfo.phone?.toLowerCase().includes(q);
        const idMatch = String(o.id || '').toLowerCase().includes(q) || (o.externalOrderId && String(o.externalOrderId).toLowerCase().includes(q));
        if (!nameMatch && !phoneMatch && !idMatch) return false;
      }

      return true;
    });
  }, [rawOrders, statusFilter, deliveryFilter, paymentFilter, dateFilter, searchFilter, customers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'processing': return 'bg-indigo-100 text-indigo-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return {
    statusFilter,
    setStatusFilter,
    deliveryFilter,
    setDeliveryFilter,
    searchFilter,
    setSearchFilter,
    dateFilter,
    setDateFilter,
    paymentFilter,
    setPaymentFilter,
    statusCounts,
    resolveCustomerInfo,
    filteredOrders,
    getStatusColor
  };
}
