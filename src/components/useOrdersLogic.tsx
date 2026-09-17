import { DEFAULT_PERMISSIONS } from '../constants';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { OnlineOrder, Employee, Customer, CartItem, CompanySettings, Product } from '../types';
import { isLocked, generateUniqueId } from '../lib/utils';
import { convertKeysToCamel } from '../lib/db-converters';
import { format, isToday, subDays } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from '../translations';
import { useOrderActions } from '../hooks/useOrderActions';
import { useTransactionStore } from '../store/useTransactionStore';
import { set as idbSet } from 'idb-keyval';

export interface OrdersProps {
  orders?: OnlineOrder[];
  products?: Product[];
  categories?: any[];
  transactions?: any[];
  settings?: any;
  stockAdjustments?: any[];
  customers?: any[];
  user?: any;
  employees?: Employee[];
  profile?: any;
  syncOrder?: any;
  autoSync?: any;
  setAutoSync?: any;
}

export function useOrdersLogic(props: OrdersProps) {
  const storeOnlineOrders = useTransactionStore(s => s.onlineOrders);
  
  // Prioritize global store first, fallback to props
  const sourceOrders = (storeOnlineOrders && storeOnlineOrders.length > 0)
    ? storeOnlineOrders
    : (Array.isArray(props.orders) && props.orders.length > 0 ? props.orders : []);

  // 🛡️ Déduplication stricte par externalOrderId (ou id) : conserver la plus récente
  const rawOrders = useMemo(() => {
    const map = new Map<string, OnlineOrder>();
    for (const order of sourceOrders) {
      if (!order) continue;
      const key = order.externalOrderId ? `ext_${order.externalOrderId}` : `id_${order.id}`;
      if (!map.has(key)) {
        map.set(key, order);
      }
    }
    return Array.from(map.values());
  }, [sourceOrders]);

  const {
    products = [],
    categories = [],
    transactions = [],
    settings = {},
    stockAdjustments = [],
    customers = [],
    user = null,
    employees = [],
    profile = {},
    syncOrder = () => {}
  } = props;

  const { t } = useTranslation();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(() => rawOrders.find(o => String(o?.id) === String(selectedOrderId)) || null, [rawOrders, selectedOrderId]);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // 🛡️ Sélection multiple & Actions groupées
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

  // Compteurs dynamiques par statut pour les onglets
  const statusCounts = useMemo(() => {
    const counts = {
      all: rawOrders.length,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of rawOrders) {
      const s = String(o?.status || 'pending').toLowerCase();
      if (s in counts) {
        (counts as any)[s]++;
      }
    }
    return counts;
  }, [rawOrders]);

  // SUPABASE-FIRST: Fetch on mount
  const refreshFromSupabase = async (showNotification = false) => {
    if (!isSupabaseConfigured) {
      if (showNotification) toast.error("Supabase n'est pas configuré. Vérifiez vos variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
      return;
    }

    // Check if we're online first
    if (!navigator.onLine) {
      if (showNotification) {
        toast.error("Vous êtes hors-ligne. La synchronisation nécessite une connexion Internet.", { icon: '📡', duration: 5000 });
      }
      return;
    }

    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('online_orders')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      if (data && Array.isArray(data)) {
        const parsed = data.map((item: any) => convertKeysToCamel(item) as OnlineOrder);
        useTransactionStore.getState().setOnlineOrders(parsed);
        await idbSet('nexus_online_orders_cache', parsed);
        parsed.forEach(o => {
          if (o && o.id) localDb.update(`onlineOrders/${o.id}`, o);
        });
        if (showNotification) {
          toast.success(`${parsed.length} commandes synchronisées depuis Supabase.`, { icon: '✅' });
        }
      }
    } catch (e: any) {
      console.error('[Supabase Orders Refresh Failed]', e);
      const errMsg = e?.message || 'Erreur inconnue';
      const isNetworkError = errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('ENOTFOUND') || errMsg.includes('ERR_NETWORK') || !navigator.onLine;

      if (showNotification) {
        if (isNetworkError) {
          toast.error("Connexion Internet indisponible. Les commandes seront synchronisées automatiquement quand la connexion reviendra.", { icon: '📡', duration: 6000 });
        } else {
          toast.error(`Erreur Supabase: ${errMsg}`, { duration: 5000 });
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshFromSupabase(false);
  }, []);

  const resolveCustomerInfo = (order: OnlineOrder) => {
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
      phone: phone || ''
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

  const { updateOrderPaymentStatus, updateOrderStatus, bulkUpdateOrderStatus, assignOrderToEmployee, assignPickerToOrder } = useOrderActions({ 
    orders: rawOrders, 
    customers, 
    employees, 
    profile, 
    user, 
    settings 
  });

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

  const updateDeliveryMethod = async (order: OnlineOrder, newMethod: 'delivery' | 'pickup') => {
    const orderId = order.id;

    // SUPABASE-FIRST
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('online_orders')
          .update({ delivery_method: newMethod })
          .eq('id', orderId);
        if (error) {
          toast.error(`Erreur Supabase: ${error.message}`);
          return;
        }
      } catch (e: any) {
        toast.error(`Erreur Supabase: ${e?.message}`);
        return;
      }
    }

    useTransactionStore.getState().setOnlineOrders(prev => 
      (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(orderId) ? { ...o, deliveryMethod: newMethod } : o)
    );
    await localDb.update(`onlineOrders/${orderId}`, { deliveryMethod: newMethod });
    toast.success('Méthode de livraison mise à jour sur Supabase.');
  };

  const saveOrderItems = async (order: OnlineOrder, newItems: OnlineOrder['items']) => {
    const orderId = order.id;
    try {
      const oldItems = Array.isArray(order.items) ? order.items : [];
      const newTotal = (newItems || []).reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

      // 1. SUPABASE-FIRST: Update Supabase
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('online_orders')
          .update({ 
              items: newItems,
              total: newTotal
          })
          .eq('id', orderId);
          
        if (error) {
          toast.error(`Erreur Supabase lors de la modification: ${error.message}`);
          return;
        }
      }

      // 2. SYNC LOCAL
      useTransactionStore.getState().setOnlineOrders(prev => 
        (Array.isArray(prev) ? prev : []).map(o => String(o.id) === String(orderId) ? { ...o, items: newItems, total: newTotal } : o)
      );

      await localDb.update(`onlineOrders/${orderId}`, { items: newItems, total: newTotal });
      const currentList = useTransactionStore.getState().onlineOrders;
      idbSet('nexus_online_orders_cache', currentList).catch(() => {});

      setIsEditingItems(false);
      setSelectedOrderId(null);
      toast.success('Articles et total enregistrés sur Supabase.');
    } catch (error: any) {
      console.error('Error saving order items:', error);
      toast.error('Erreur lors de la sauvegarde des articles.');
    }
  };

  const confirmDeleteOrder = async (orderIdToDelete?: string) => {
    const targetId = orderIdToDelete || orderToDelete;
    if (!targetId) return;
    
    // 1. SUPABASE-FIRST
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('online_orders')
          .delete()
          .eq('id', targetId);
        if (error) {
          toast.error(`Erreur Supabase lors de la suppression: ${error.message}`);
          return;
        }
      } catch (e: any) {
        toast.error(`Erreur Supabase: ${e?.message}`);
        return;
      }
    }

    // 2. SYNC LOCAL
    useTransactionStore.getState().setOnlineOrders(prev => 
      (Array.isArray(prev) ? prev : []).filter(o => String(o.id) !== String(targetId))
    );
    await localDb.delete(`onlineOrders/${targetId}`);
    
    const currentList = useTransactionStore.getState().onlineOrders;
    idbSet('nexus_online_orders_cache', currentList).catch(() => {});

    setOrderToDelete(null);
    toast.success("Commande supprimée sur Supabase et en local.");
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

      // 1. SUPABASE-FIRST: Insert to Supabase
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

      // Standalone
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

  const handleManualSync = async (order: OnlineOrder) => {
    setIsSyncing(order.id);
    await syncOrder(order);
    setIsSyncing(null);
  };

  const handleYassirRequest = async (order: OnlineOrder) => {
    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('online_orders')
          .update({ 
              assigned_employee_id: 'YASSIR_EXT',
              assigned_employee_name: 'Yassir Express'
          })
          .eq('id', order.id);
      }

      useTransactionStore.getState().setOnlineOrders(prev => 
        (Array.isArray(prev) ? prev : []).map(o => o.id === order.id ? { 
          ...o, 
          assignedEmployeeId: 'YASSIR_EXT', 
          assignedEmployeeName: 'Yassir Express' 
        } : o)
      );

      await localDb.update(`onlineOrders/${order.id}`, {
        assignedEmployeeId: 'YASSIR_EXT',
        assignedEmployeeName: 'Yassir Express'
      });

      toast.success(t("Commande assignée à Yassir Express sur Supabase."));
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'assignation");
    }
  };

  const handlePrintOrder = (order: OnlineOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 8px 0;">${item.name} x${item.quantity}</td>
        <td style="padding: 8px 0; text-align: right;">${(item.price || 0).toFixed(2)} ${settings.currency || 'DA'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Commande #${order.externalOrderId || String(order.id || '').slice(0, 8)}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { max-width: 100px; margin-bottom: 10px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            .total { font-weight: bold; font-size: 1.2em; }
            .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="logo" />` : ''}
            <h2>${settings.name || 'NEXUS POS'}</h2>
            <p>COMMANDE EN LIGNE</p>
            <p>#${order.externalOrderId || String(order.id || '').slice(0, 8)}</p>
            <p>Type: ${order.deliveryMethod === 'delivery' ? 'LIVRAISON' : 'RETRAIT'}</p>
            <p>${format(new Date(order.timestamp || Date.now()), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <div class="divider"></div>
          <div style="font-size: 0.9em; margin-bottom: 10px;">
            <p><strong>Client:</strong> ${order.customerName || 'N/A'}</p>
            <p><strong>Tél:</strong> ${order.customerPhone || 'N/A'}</p>
            <p><strong>Adresse:</strong> ${order.shippingAddress || 'N/A'}</p>
          </div>
          <div class="divider"></div>
          <table>
            ${itemsHtml}
          </table>
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between;" class="total">
            <span>TOTAL</span>
            <span>${(order.total || 0).toFixed(2)} ${settings.currency || 'DA'}</span>
          </div>
          <div class="footer">
            <p>${settings.footerText || 'Merci de votre confiance !'}</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return { 
    orders: rawOrders,
    selectedOrderId,
    setSelectedOrderId,
    orderToDelete,
    setOrderToDelete,
    isEditingItems,
    setIsEditingItems,
    isSyncing,
    setIsSyncing,
    isRefreshing,
    refreshFromSupabase,
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
    enlargedImage,
    setEnlargedImage,
    t,
    updateOrderStatus,
    getStatusColor,
    selectedOrder,
    filteredOrders,
    handleYassirRequest,
    handlePrintOrder,
    handleManualSync,
    assignPickerToOrder,
    assignOrderToEmployee,
    updateOrderPaymentStatus,
    resolveCustomerInfo,
    saveOrderItems,
    confirmDeleteOrder,
    createTestOrder,
    statusCounts,
    selectedOrderIds,
    toggleSelectOrder,
    toggleSelectAll,
    clearSelection,
    handleBulkCancel,
    handleBulkConfirm
  };
}
