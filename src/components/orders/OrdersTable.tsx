import React from 'react';
import { Eye, Printer, Trash2, MessageCircle, RefreshCw, Check } from 'lucide-react';
import { OnlineOrder, CompanySettings } from '../../types';
import { Card } from '../ui';
import { formatSafe, cn } from '../../lib/utils';

interface OrdersTableProps {
  orders: OnlineOrder[];
  filteredOrders: OnlineOrder[];
  settings: CompanySettings;
  isSyncing: string | null;
  getStatusColor: (status: string) => string;
  updateOrderStatus: (order: OnlineOrder, status: any) => void;
  assignPickerToOrder: (order: OnlineOrder, pickerId: string) => void;
  assignOrderToEmployee: (order: OnlineOrder, employeeId: string) => void;
  handleYassirRequest: (order: OnlineOrder) => void;
  updateOrderPaymentStatus: (order: OnlineOrder, status: any) => void;
  handleManualSync: (order: OnlineOrder) => void;
  handlePrintOrder: (order: OnlineOrder) => void;
  setSelectedOrderId: (id: string) => void;
  setOrderToDelete: (id: string) => void;
  resolveCustomerInfo: (order: OnlineOrder) => { name: string; phone: string };
  employees: any[];
}

export function OrdersTable({
  orders,
  filteredOrders,
  settings,
  isSyncing,
  getStatusColor,
  updateOrderStatus,
  assignPickerToOrder,
  assignOrderToEmployee,
  handleYassirRequest,
  updateOrderPaymentStatus,
  handleManualSync,
  handlePrintOrder,
  setSelectedOrderId,
  setOrderToDelete,
  resolveCustomerInfo,
  employees
}: OrdersTableProps) {
  return (
    <Card className="overflow-x-auto bg-white/5 backdrop-blur-md border-white/10 shadow-2xl rounded-2xl">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="border-b border-white/10">
            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Date</th>
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
          {filteredOrders.map((o: OnlineOrder) => {
            const customerInfo = resolveCustomerInfo(o);
            return (
              <tr key={o.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-white/80 font-mono tracking-tight">{formatSafe(o.timestamp, 'dd/MM/yyyy HH:mm')}</span>
                    {o.syncedToPos && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                        <Check size={8} strokeWidth={3} /> Synchro
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{customerInfo.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-white/40 font-mono">{customerInfo.phone}</p>
                    {customerInfo.phone && (
                      <a 
                        href={`https://wa.me/${customerInfo.phone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                        title="Contacter sur WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit shadow-lg",
                      o.deliveryMethod === 'delivery' ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20" : "bg-amber-500/20 text-amber-300 border border-amber-500/20"
                    )}>
                      {o.deliveryMethod === 'delivery' ? 'Livraison' : 'Retrait'}
                    </span>
                    {o.deliveryMethod === 'pickup' && o.pickupTime && (
                      <span className="text-[9px] font-black text-white/40 uppercase">Heure: {o.pickupTime}</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm font-black text-white font-mono tracking-tight">{(o.total || 0).toFixed(2)}</span>
                  <span className="text-[10px] text-white/40 ml-1 font-bold">{settings.currency}</span>
                </td>
                <td className="p-4 text-xs">
                  <select 
                    value={o.status}
                    onChange={(e) => updateOrderStatus(o, e.target.value as any)}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest rounded-lg px-2.5 py-1.5 outline-none border border-white/5 cursor-pointer transition-all shadow-sm",
                      getStatusColor(o.status).replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-')
                    )}
                  >
                    <option value="pending" className="bg-[#0a0a0f]">En attente</option>
                    <option value="confirmed" className="bg-[#0a0a0f]">Confirmé</option>
                    <option value="processing" className="bg-[#0a0a0f]">En préparation</option>
                    <option value="shipped" className="bg-[#0a0a0f]">Expédié</option>
                    <option value="delivered" className="bg-[#0a0a0f]">Livré</option>
                    <option value="cancelled" className="bg-[#0a0a0f]">Annulé</option>
                  </select>
                </td>
                <td className="p-4">
                  <select
                    value={o.assignedPickerId || ''}
                    onChange={(e) => assignPickerToOrder(o, e.target.value)}
                    className="text-[10px] bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 w-full max-w-[120px] transition-all font-bold"
                  >
                    <option value="" className="bg-[#0a0a0f]">Auto-Assigné</option>
                    {employees.filter(e => e.role === 'picker').map(e => (
                      <option key={e.id} value={e.id} className="bg-[#0a0a0f]">{e.name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <select
                    value={o.assignedEmployeeId || ''}
                    onChange={(e) => {
                      if (e.target.value === 'YASSIR_EXT') {
                        handleYassirRequest(o);
                      } else {
                        assignOrderToEmployee(o, e.target.value);
                      }
                    }}
                    className={cn(
                      "text-[10px] bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 w-full max-w-[120px] transition-all font-bold",
                      o.assignedEmployeeId === 'YASSIR_EXT' ? "bg-[#f2ec24]/20 text-[#f2ec24] border-[#f2ec24]/50" : ""
                    )}
                    disabled={o.deliveryMethod !== 'delivery'}
                  >
                    <option value="" className="bg-[#0a0a0f]">{o.deliveryMethod === 'delivery' ? 'Choisir Livreur' : 'Pas de livraison'}</option>
                    <option value="YASSIR_EXT" className="bg-[#0a0a0f] text-[#f2ec24] font-black">🚕 Yassir Express</option>
                    {employees.filter(e => e.role === 'delivery').map(e => (
                      <option key={e.id} value={e.id} className="bg-[#0a0a0f]">{e.name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <select 
                    value={o.paymentStatus || 'unpaid'}
                    onChange={(e) => updateOrderPaymentStatus(o, e.target.value as any)}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest rounded-lg px-2.5 py-1.5 outline-none border border-white/5 cursor-pointer appearance-none transition-all shadow-sm",
                      o.paymentStatus === 'paid' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    )}
                  >
                    <option className="bg-[#0a0a0f] text-emerald-400" value="paid">Payé</option>
                    <option className="bg-[#0a0a0f] text-rose-400" value="unpaid">Non payé</option>
                  </select>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!o.syncedToPos && ['confirmed', 'shipped', 'delivered'].includes(o.status) && (
                      <button 
                        onClick={() => handleManualSync(o)}
                        disabled={isSyncing === o.id}
                        className="p-2 text-indigo-400 hover:bg-white/5 rounded-xl transition-all shadow-sm"
                        title="Synchroniser avec la caisse"
                      >
                        {isSyncing === o.id ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                      </button>
                    )}
                    <button 
                      onClick={() => handlePrintOrder(o)}
                      className="p-2 text-white/40 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
                      title="Imprimer le ticket de commande"
                    >
                      <Printer size={18} />
                    </button>
                    <button 
                      onClick={() => setSelectedOrderId(o.id)}
                      className="p-2 text-white/40 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
                      title="Voir les détails"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => setOrderToDelete(o.id)}
                      className="p-2 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Supprimer la commande"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {filteredOrders.length === 0 && (
            <tr>
              <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                {orders.length === 0 ? "Aucune commande reçue depuis Supabase" : "Aucune commande ne correspond aux filtres de statut ou de livraison"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
