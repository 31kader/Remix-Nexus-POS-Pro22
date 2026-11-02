import React, { useState, useMemo } from 'react';
import { OnlineOrder, CompanySettings } from '../../types';
import { Card } from '../ui';
import {
  OrdersTableMobileCards,
  OrdersTableDesktopRow,
  OrdersTablePagination
} from './table';

interface OrdersTableProps {
  orders: OnlineOrder[];
  filteredOrders: OnlineOrder[];
  settings: CompanySettings;
  isSyncing: string | null;
  getStatusColor?: (status: string) => string;
  updateOrderStatus?: (order: OnlineOrder, status: any) => void;
  assignPickerToOrder?: (order: OnlineOrder, pickerId: string) => void;
  assignOrderToEmployee?: (order: OnlineOrder, employeeId: string) => void;
  handleYassirRequest?: (order: OnlineOrder) => void;
  updateOrderPaymentStatus?: (order: OnlineOrder, status: any) => void;
  handleManualSync?: (order: OnlineOrder) => void;
  handlePrintOrder?: (order: OnlineOrder) => void;
  setSelectedOrderId?: (id: string) => void;
  setOrderToDelete?: (id: string) => void;
  resolveCustomerInfo?: (order: OnlineOrder) => { name: string; phone: string };
  employees?: any[];
  selectedOrderIds?: Set<string>;
  toggleSelectOrder?: (orderId: string) => void;
  toggleSelectAll?: (orders: OnlineOrder[]) => void;
}

export function OrdersTable({
  orders = [],
  filteredOrders = [],
  settings = {} as any,
  isSyncing = null,
  getStatusColor = () => 'bg-slate-100 text-slate-700',
  updateOrderStatus = () => {},
  assignPickerToOrder = () => {},
  assignOrderToEmployee = () => {},
  handleYassirRequest = () => {},
  updateOrderPaymentStatus = () => {},
  handleManualSync = () => {},
  handlePrintOrder = () => {},
  setSelectedOrderId = () => {},
  setOrderToDelete = () => {},
  resolveCustomerInfo = (o: any) => ({ name: o?.customerName || 'Client Inconnu', phone: o?.customerPhone || '' }),
  employees = [],
  selectedOrderIds = new Set(),
  toggleSelectOrder = () => {},
  toggleSelectAll = () => {}
}: OrdersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const safeFilteredOrders = useMemo(() => Array.isArray(filteredOrders) ? filteredOrders.filter(Boolean) : [], [filteredOrders]);
  const totalPages = Math.max(1, Math.ceil(safeFilteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return safeFilteredOrders.slice(start, start + pageSize);
  }, [safeFilteredOrders, currentPage]);

  const allFilteredSelected = safeFilteredOrders.length > 0 && safeFilteredOrders.every(o => selectedOrderIds.has(String(o.id)));

  const pickers = useMemo(() => (employees || []).filter(e => e.role === 'picker'), [employees]);
  const deliveryEmployees = useMemo(() => (employees || []).filter(e => e.role === 'delivery'), [employees]);

  return (
    <div className="space-y-3">
      {/* 1. Vue Mobile (Cartes tactiles) */}
      <OrdersTableMobileCards
        orders={orders}
        safeFilteredOrders={safeFilteredOrders}
        paginatedOrders={paginatedOrders}
        settings={settings}
        selectedOrderIds={selectedOrderIds}
        allFilteredSelected={allFilteredSelected}
        toggleSelectAll={toggleSelectAll}
        toggleSelectOrder={toggleSelectOrder}
        updateOrderStatus={updateOrderStatus}
        updateOrderPaymentStatus={updateOrderPaymentStatus}
        assignPickerToOrder={assignPickerToOrder}
        assignOrderToEmployee={assignOrderToEmployee}
        handleYassirRequest={handleYassirRequest}
        handlePrintOrder={handlePrintOrder}
        handleManualSync={handleManualSync}
        isSyncing={isSyncing}
        setSelectedOrderId={setSelectedOrderId}
        setOrderToDelete={setOrderToDelete}
        resolveCustomerInfo={resolveCustomerInfo}
        pickers={pickers}
        deliveryEmployees={deliveryEmployees}
      />

      {/* 2. Vue Desktop (Grand Tableau) */}
      <Card className="hidden lg:block overflow-x-auto bg-white/5 border-white/10 shadow-md rounded-xl">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-4 w-10 text-center">
                <input 
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={() => toggleSelectAll(safeFilteredOrders)}
                  className="w-4 h-4 rounded border-white/20 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  title="Tout sélectionner / désélectionner"
                />
              </th>
              <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Date / N°</th>
              <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Client</th>
              <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Type</th>
              <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Total</th>
              <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Statut</th>
              <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Préparateur</th>
              <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Livreur</th>
              <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Paiement</th>
              <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedOrders.map((o: OnlineOrder, idx: number) => (
              <OrdersTableDesktopRow
                key={String(o?.id || `order-${idx}`)}
                order={o}
                idx={idx}
                settings={settings}
                selectedOrderIds={selectedOrderIds}
                toggleSelectOrder={toggleSelectOrder}
                updateOrderStatus={updateOrderStatus}
                updateOrderPaymentStatus={updateOrderPaymentStatus}
                assignPickerToOrder={assignPickerToOrder}
                assignOrderToEmployee={assignOrderToEmployee}
                handleYassirRequest={handleYassirRequest}
                handlePrintOrder={handlePrintOrder}
                handleManualSync={handleManualSync}
                isSyncing={isSyncing}
                setSelectedOrderId={setSelectedOrderId}
                setOrderToDelete={setOrderToDelete}
                resolveCustomerInfo={resolveCustomerInfo}
                getStatusColor={getStatusColor}
                pickers={pickers}
                deliveryEmployees={deliveryEmployees}
              />
            ))}
            {safeFilteredOrders.length === 0 && (
              <tr>
                <td colSpan={10} className="p-5 text-center text-slate-400 font-medium">
                  {orders.length === 0 ? "Aucune commande reçue" : "Aucune commande ne correspond aux filtres"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* 3. Pagination */}
      <OrdersTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalFilteredCount={safeFilteredOrders.length}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}

export default OrdersTable;
