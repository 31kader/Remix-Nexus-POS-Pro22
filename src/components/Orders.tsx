import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from './ui';
import { useOrdersLogic, OrdersProps } from './useOrdersLogic';
import { OrderDetailModal } from './orders/OrderDetailModal';
import { OrdersTable } from './orders/OrdersTable';
import { cn } from '../lib/utils';

export const Orders = React.memo(function Orders(props: OrdersProps) {
  const {
    orders = [], products = [], settings = {}, customers = [], employees = []
  } = props;

  const {
    selectedOrderId,
    setSelectedOrderId,
    orderToDelete,
    setOrderToDelete,
    isEditingItems,
    setIsEditingItems,
    isSyncing,
    statusFilter,
    setStatusFilter,
    deliveryFilter,
    setDeliveryFilter,
    enlargedImage,
    setEnlargedImage,
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
    confirmDeleteOrder
  } = useOrdersLogic(props);
  
  const autoSync = props.autoSync || false;
  const setAutoSync = props.setAutoSync || (() => {});
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-3">
            Commandes en Ligne 
            <span className="bg-indigo-500/20 text-indigo-400 text-xs px-3 py-1 rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              {orders.filter(o => o.status === 'pending').length} en attente
            </span>
          </h3>
          <p className="text-white/40 text-sm mt-1">Gestion et suivi des expéditions</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
          >
            <option value="all" className="bg-[#0a0a0f]">Tous les statuts</option>
            <option value="pending" className="bg-[#0a0a0f]">En attente</option>
            <option value="confirmed" className="bg-[#0a0a0f]">Confirmé</option>
            <option value="processing" className="bg-[#0a0a0f]">En préparation</option>
            <option value="shipped" className="bg-[#0a0a0f]">Expédié</option>
            <option value="delivered" className="bg-[#0a0a0f]">Livré</option>
            <option value="cancelled" className="bg-[#0a0a0f]">Annulé</option>
          </select>
          <select 
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
          >
            <option value="all" className="bg-[#0a0a0f]">Tous les types</option>
            <option value="delivery" className="bg-[#0a0a0f]">Livraison</option>
            <option value="pickup" className="bg-[#0a0a0f]">Retrait Magasin</option>
          </select>
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${autoSync ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/20'}`} />
              <span className="text-xs font-black uppercase tracking-widest text-white/60">Synchro Auto</span>
            </div>
            <button 
              onClick={() => setAutoSync(!autoSync)}
              className={cn(
                "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none",
                autoSync ? "bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)]" : "bg-white/10"
              )}
            >
              <span className={cn(
                "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm",
                autoSync ? "translate-x-6" : "translate-x-0.5"
              )} />
            </button>
          </div>
        </div>
      </div>

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
      />

      {/* Détail d'une commande (Modal existante) */}
      {selectedOrder && (
        <OrderDetailModal
          isOpen={!!selectedOrder}
          selectedOrder={selectedOrder}
          products={products}
          onClose={() => {
            setSelectedOrderId(null);
            setIsEditingItems(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="max-w-md w-full p-6 bg-slate-900 border-slate-800 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Confirmer la suppression</h3>
            <p className="text-slate-400 mb-6">
              Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDeleteOrder}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-bold"
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
