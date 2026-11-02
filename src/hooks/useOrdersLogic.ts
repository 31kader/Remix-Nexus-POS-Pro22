import { useState, useMemo } from 'react';
import { OnlineOrder, Employee, Product } from '../types';
import { getDeletedRecordIds } from '../services/LocalDatabase';
import { useTranslation } from '../translations';
import { useOrderActions } from './useOrderActions';
import { useTransactionStore } from '../store/useTransactionStore';
import {
  OrdersProps,
  useOrdersFilters,
  useOrdersBulkActions,
  useOrdersStockOperations,
  useOrdersPrintAndSync
} from './orders';

export { type OrdersProps } from './orders';

export function useOrdersLogic(props: OrdersProps) {
  const storeOnlineOrders = useTransactionStore(s => s.onlineOrders);
  
  // Prioritize global store first, fallback to props
  const sourceOrders = (storeOnlineOrders && storeOnlineOrders.length > 0)
    ? storeOnlineOrders
    : (Array.isArray(props.orders) && props.orders.length > 0 ? props.orders : []);

  // 🛡️ Déduplication stricte par externalOrderId (ou id) & Exclusion des commandes supprimées
  const rawOrders = useMemo(() => {
    const deletedOrderIds = getDeletedRecordIds('online_orders');
    const map = new Map<string, OnlineOrder>();
    for (const order of sourceOrders) {
      if (!order || !order.id) continue;
      if (deletedOrderIds.has(String(order.id))) continue;
      if (order.externalOrderId && deletedOrderIds.has(String(order.externalOrderId))) continue;
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

  // Navigation & interaction states
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(
    () => rawOrders.find(o => String(o?.id) === String(selectedOrderId)) || null,
    [rawOrders, selectedOrderId]
  );
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Sous-hook 1 : Filtres & Recherche
  const {
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
  } = useOrdersFilters({ rawOrders, customers });

  // Order actions existantes (Supabase status / assignment)
  const {
    updateOrderPaymentStatus,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    assignOrderToEmployee,
    assignPickerToOrder
  } = useOrderActions({ 
    orders: rawOrders, 
    customers, 
    employees, 
    profile, 
    user, 
    settings 
  });

  // Sous-hook 2 : Sélection multiple & Actions groupées
  const {
    selectedOrderIds,
    setSelectedOrderIds,
    toggleSelectOrder,
    toggleSelectAll,
    clearSelection,
    handleBulkCancel,
    handleBulkConfirm,
    handleBulkDelete
  } = useOrdersBulkActions({
    rawOrders,
    customers,
    bulkUpdateOrderStatus
  });

  // Sous-hook 3 : Opérations Stock, Édition & Suppression
  const {
    updateDeliveryMethod,
    saveOrderItems,
    confirmDeleteOrder,
    createTestOrder
  } = useOrdersStockOperations({
    products,
    customers,
    rawOrders,
    orderToDelete,
    setOrderToDelete,
    setSelectedOrderIds,
    setIsEditingItems,
    setSelectedOrderId
  });

  // Sous-hook 4 : Impression & Synchronisation
  const {
    isSyncing,
    setIsSyncing,
    isRefreshing,
    setIsRefreshing,
    refreshFromSupabase,
    handleManualSync,
    handleYassirRequest,
    handlePrintOrder
  } = useOrdersPrintAndSync({
    settings,
    syncOrder,
    t
  });

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
    handleBulkConfirm,
    handleBulkDelete,
    updateDeliveryMethod
  };
}
