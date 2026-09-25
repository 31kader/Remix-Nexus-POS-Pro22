import React from 'react';
import { RefreshCw, Search, Calendar, Filter, Truck, ShoppingBag, X, Plus } from 'lucide-react';
import { Card, Button } from './ui';
import { useOrdersLogic, OrdersProps } from './useOrdersLogic';
import { OrderDetailModal } from './orders/OrderDetailModal';
import { OrdersTable } from './orders/OrdersTable';
import { cn } from '../lib/utils';

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
    handleBulkConfirm = () => {}
  } = logic || {};

  const products = props.products || [];
  const settings = props.settings || {};
  const customers = props.customers || [];
  const employees = props.employees || [];
  const autoSync = props.autoSync || false;
  const setAutoSync = props.setAutoSync || (() => {});

  const statusTabItems = [
    { key: 'all', label: 'Toutes', count: statusCounts.all, color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    { key: 'pending', label: 'En attente', count: statusCounts.pending, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { key: 'confirmed', label: 'Confirmées', count: statusCounts.confirmed, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { key: 'processing', label: 'En préparation', count: statusCounts.processing, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    { key: 'shipped', label: 'Expédiées', count: statusCounts.shipped, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { key: 'delivered', label: 'Livrées', count: statusCounts.delivered, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { key: 'cancelled', label: 'Annulées', count: statusCounts.cancelled, color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  ];
  
  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-3">
            Commandes en Ligne 
            <span className={cn(
              "text-xs px-3 py-1 rounded-full border transition-all",
              statusCounts.pending > 0 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}>
              {statusCounts.pending} en attente
            </span>
          </h3>
          <p className="text-white/40 text-sm mt-1">
            {Array.isArray(filteredOrders) ? filteredOrders.length : 0} commandes affichées sur {Array.isArray(orders) ? orders.length : 0} au total (Synchro Supabase Directe)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => refreshFromSupabase(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-700 transition-all"
            title="Synchroniser immédiatement avec Supabase"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-indigo-400" : "text-slate-400"} />
            {isRefreshing ? "Synchronisation..." : "Actualiser Supabase"}
          </Button>

          <Button
            onClick={createTestOrder}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20"
          >
            <Plus size={16} /> + Nouvelle Commande
          </Button>

          <div className="flex items-center gap-4 bg-white/5  p-3 rounded-xl border border-white/10 shadow-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${autoSync ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/20'}`} />
              <span className="text-xs font-black uppercase tracking-widest text-white/60">Synchro Auto</span>
            </div>
            <button 
              type="button"
              onClick={() => (typeof setAutoSync === 'function' ? setAutoSync(!autoSync) : null)}
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

      {/* Status Filter Tabs (Mode Dashboard Moderne) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {statusTabItems.map(tab => {
          const isActive = (statusFilter || 'all').toLowerCase() === tab.key.toLowerCase();
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => (typeof setStatusFilter === 'function' ? setStatusFilter(tab.key) : null)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer",
                isActive 
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/25 scale-[1.02]" 
                  : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800/80"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border transition-all",
                isActive 
                  ? "bg-white/20 text-white border-white/30" 
                  : tab.color
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Advanced Filter Bar */}
      <Card className="p-4 bg-slate-900/60 border border-slate-800/80  space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Rechercher par client, tél, ou N° de commande..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={searchFilter || ''}
              onChange={e => (typeof setSearchFilter === 'function' ? setSearchFilter(e.target.value) : null)}
            />
            {searchFilter && (
              <button 
                type="button"
                onClick={() => (typeof setSearchFilter === 'function' ? setSearchFilter('') : null)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Delivery Type */}
          <select 
            value={deliveryFilter || 'all'}
            onChange={(e) => (typeof setDeliveryFilter === 'function' ? setDeliveryFilter(e.target.value) : null)}
            className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
          >
            <option value="all">Tous les types</option>
            <option value="delivery">Livraison</option>
            <option value="pickup">Retrait Magasin</option>
          </select>

          {/* Payment Status */}
          <select 
            value={paymentFilter || 'all'}
            onChange={(e) => (typeof setPaymentFilter === 'function' ? setPaymentFilter(e.target.value) : null)}
            className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
          >
            <option value="all">Tous les paiements</option>
            <option value="paid">Payé</option>
            <option value="unpaid">Non Payé</option>
          </select>

          {/* Date Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => (typeof setDateFilter === 'function' ? setDateFilter('all') : null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${dateFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Tout
            </button>
            <button
              type="button"
              onClick={() => (typeof setDateFilter === 'function' ? setDateFilter('today') : null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${dateFilter === 'today' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => (typeof setDateFilter === 'function' ? setDateFilter('last7days') : null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${dateFilter === 'last7days' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              7J
            </button>
            <button
              type="button"
              onClick={() => (typeof setDateFilter === 'function' ? setDateFilter('last30days') : null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${dateFilter === 'last30days' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              30J
            </button>
          </div>
        </div>
      </Card>

      {/* Floating Bulk Action Bar */}
      {selectedOrderIds && selectedOrderIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-indigo-950/80 border border-indigo-500/40 rounded-2xl  shadow-2xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-sm font-black text-white">
              {selectedOrderIds.size} commande(s) sélectionnée(s)
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-indigo-300 hover:text-white underline cursor-pointer font-bold ml-2"
            >
              Tout désélectionner
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBulkConfirm}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20"
            >
              ✓ Confirmer la sélection
            </Button>
            <Button
              onClick={handleBulkCancel}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-rose-600/20"
            >
              ✕ Annuler la sélection
            </Button>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 ">
          <Card className="max-w-md w-full p-6 bg-slate-900 border-slate-800 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Confirmer la suppression</h3>
            <p className="text-slate-400 mb-6">
              Êtes-vous sûr de vouloir supprimer cette commande sur Supabase ? Cette action est irréversible.
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
