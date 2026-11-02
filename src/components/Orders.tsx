import React from 'react';
import { Card } from './ui';
import { useOrdersLogic, OrdersProps } from '../hooks/useOrdersLogic';
import { OrderDetailModal } from './orders/OrderDetailModal';
import { OrdersTable } from './orders/OrdersTable';
import { OrdersListHeader } from './orders/OrdersListHeader';
import { OrdersBulkActionBar } from './orders/OrdersBulkActionBar';

export const Orders = React.memo(function Orders(props: OrdersProps) {
  const logic = useOrdersLogic(props);

  const {
    orders = [],
    selectedOrderId,
    setSelectedOrderId = () => {},
    orderToDelete,
    setOrderToDelete = () => {},
    isEditingItems,
    setIsEditingItems = () => {},
    isSyncing,
    isRefreshing = false,
    refreshFromSupabase = () => {},
    statusFilter = 'all',
    setStatusFilter = () => {},
    deliveryFilter = 'all',
    setDeliveryFilter = () => {},
    searchFilter = '',
    setSearchFilter = () => {},
    dateFilter = 'today',
    setDateFilter = () => {},
    paymentFilter = 'all',
    setPaymentFilter = () => {},
    enlargedImage,
    setEnlargedImage = () => {},
    updateOrderStatus = () => {},
    getStatusColor = () => 'bg-slate-100 text-slate-700',
    selectedOrder = null,
    filteredOrders = [],
    handleYassirRequest = () => {},
    handlePrintOrder = () => {},
    handleManualSync = () => {},
    assignPickerToOrder = () => {},
    assignOrderToEmployee = () => {},
    updateOrderPaymentStatus = () => {},
    resolveCustomerInfo = (o: any) => ({ name: o?.customerName || 'Client Inconnu', phone: o?.customerPhone || '' }),
    saveOrderItems = () => {},
    confirmDeleteOrder = () => {},
    createTestOrder = () => {},
    statusCounts = { all: 0, pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
    selectedOrderIds = new Set<string>(),
    toggleSelectOrder = () => {},
    toggleSelectAll = () => {},
    clearSelection = () => {},
    handleBulkCancel = () => {},
    handleBulkConfirm = () => {},
    handleBulkDelete = () => {}
  } = logic || {};

  const products = props.products || [];
  const settings = props.settings || {};
  const employees = props.employees || [];
  const autoSync = props.autoSync || false;
  const setAutoSync = props.setAutoSync || (() => {});

  return (
    <div className="space-y-4">
      <OrdersListHeader
        statusCounts={statusCounts}
        filteredOrdersLength={Array.isArray(filteredOrders) ? filteredOrders.length : 0}
        totalOrdersLength={Array.isArray(orders) ? orders.length : 0}
        isRefreshing={isRefreshing}
        refreshFromSupabase={refreshFromSupabase}
        createTestOrder={createTestOrder}
        autoSync={autoSync}
        setAutoSync={setAutoSync}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        deliveryFilter={deliveryFilter}
        setDeliveryFilter={setDeliveryFilter}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
      />

      {/* Floating Bulk Action Bar */}
      <OrdersBulkActionBar
        selectedOrderIds={selectedOrderIds}
        clearSelection={clearSelection}
        handleBulkConfirm={handleBulkConfirm}
        handleBulkCancel={handleBulkCancel}
        handleBulkDelete={handleBulkDelete}
      />

      <OrdersTable
        orders={orders}
        filteredOrders={filteredOrders}
        settings={settings}
        isSyncing={isSyncing}
        getStatusColor={getStatusColor}
        updateOrderStatus={updateOrderStatus}
        assignPickerToOrder={assignPickerToOrder}
        assignOrderToEmployee={assignOrderToEmployee}
        handleYassirRequest={handleYassirRequest}
        updateOrderPaymentStatus={updateOrderPaymentStatus}
        handleManualSync={handleManualSync}
        handlePrintOrder={handlePrintOrder}
        setSelectedOrderId={setSelectedOrderId}
        setOrderToDelete={setOrderToDelete}
        resolveCustomerInfo={resolveCustomerInfo}
        employees={employees}
        selectedOrderIds={selectedOrderIds}
        toggleSelectOrder={toggleSelectOrder}
        toggleSelectAll={toggleSelectAll}
      />

      {/* Détail d'une commande */}
      {selectedOrder && (
        <OrderDetailModal
          isOpen={!!selectedOrder}
          selectedOrder={selectedOrder}
          products={products}
          onClose={() => {
            if (typeof setSelectedOrderId === 'function') setSelectedOrderId(null);
            if (typeof setIsEditingItems === 'function') setIsEditingItems(false);
          }}
          settings={settings}
          isEditingItems={isEditingItems}
          setIsEditingItems={setIsEditingItems}
          saveOrderItems={saveOrderItems}
          setEnlargedImage={setEnlargedImage}
          handlePrintOrder={handlePrintOrder}
          updateOrderStatus={updateOrderStatus}
          handleYassirRequest={handleYassirRequest}
          t={(k) => k}
        />
      )}

      {/* Confirmation de suppression */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card className="max-w-md w-full p-6 bg-slate-900 border-slate-800 shadow-md">
            <h3 className="text-xl font-bold text-white mb-4">Confirmer la suppression</h3>
            <p className="text-slate-400 mb-6">
              Êtes-vous sûr de vouloir supprimer la commande <span className="text-white font-bold">#{orderToDelete}</span> ? Cette action retirera la commande du système.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => (typeof setOrderToDelete === 'function' ? setOrderToDelete(null) : null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => (typeof confirmDeleteOrder === 'function' ? confirmDeleteOrder(orderToDelete) : null)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all"
              >
                Supprimer
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
});
