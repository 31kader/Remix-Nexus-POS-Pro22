import React, { useState, useMemo } from 'react';
import { Eye, Printer, Trash2, MessageCircle, RefreshCw, Check, ChevronLeft, ChevronRight, Truck, ShoppingBag, User, Clock, CreditCard } from 'lucide-react';
import { OnlineOrder, CompanySettings } from '../../types';
import { Card } from '../ui';
import { formatSafe, cn } from '../../lib/utils';

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
      {/* ============================================================== */}
      {/* 1. VUE MOBILE : Cartes Tactiles 100% Adaptées au Smartphone     */}
      {/* ============================================================== */}
      <div className="block lg:hidden space-y-3">
        {/* Barre de sélection globale mobile */}
        {safeFilteredOrders.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-zinc-400">
            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input 
                type="checkbox"
                checked={allFilteredSelected}
                onChange={() => toggleSelectAll(safeFilteredOrders)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <span>Tout sélectionner ({safeFilteredOrders.length})</span>
            </label>
            <span className="text-[11px] font-mono text-zinc-500">
              {selectedOrderIds.size} cochée{selectedOrderIds.size > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {paginatedOrders.map((o: OnlineOrder, idx: number) => {
          const customerInfo = resolveCustomerInfo(o);
          const orderIdStr = String(o?.id || `order-${idx}`);
          const statusStr = o?.status || 'pending';
          const paymentStr = o?.paymentStatus || 'unpaid';
          const isSelected = selectedOrderIds.has(orderIdStr);
          const itemsCount = Array.isArray(o?.items) ? o.items.length : 0;

          return (
            <div 
              key={`mobile-order-${orderIdStr}`}
              className={cn(
                "p-4 rounded-2xl bg-zinc-900/80 border transition-all space-y-3 text-left shadow-sm",
                isSelected ? "border-indigo-500 bg-indigo-950/20" : "border-zinc-800 hover:border-zinc-700"
              )}
            >
              {/* Ligne 1 : Sélection, Numéro, Date et Statut */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectOrder(orderIdStr)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                        #{o?.externalOrderId || orderIdStr.slice(0, 8)}
                      </span>
                      {o?.syncedToPos && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <Check size={9} strokeWidth={3} /> Synchro
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {formatSafe(o?.timestamp || (o as any)?.createdAt || (o as any)?.created_at || new Date(), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>

                {/* Sélecteur de statut tactile */}
                <select 
                  value={statusStr}
                  onChange={(e) => updateOrderStatus(o, e.target.value as any)}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider rounded-xl px-2.5 py-1.5 outline-none border cursor-pointer shadow-xs",
                    statusStr === 'pending' && "bg-amber-500/20 text-amber-300 border-amber-500/30",
                    statusStr === 'confirmed' && "bg-blue-500/20 text-blue-300 border-blue-500/30",
                    statusStr === 'processing' && "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
                    statusStr === 'shipped' && "bg-purple-500/20 text-purple-300 border-purple-500/30",
                    statusStr === 'delivered' && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                    statusStr === 'cancelled' && "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  )}
                >
                  <option value="pending" className="bg-[#0a0a0f] text-amber-300">En attente</option>
                  <option value="confirmed" className="bg-[#0a0a0f] text-blue-300">Confirmé</option>
                  <option value="processing" className="bg-[#0a0a0f] text-indigo-300">En préparation</option>
                  <option value="shipped" className="bg-[#0a0a0f] text-purple-300">Expédié</option>
                  <option value="delivered" className="bg-[#0a0a0f] text-emerald-300">Livré</option>
                  <option value="cancelled" className="bg-[#0a0a0f] text-rose-300">Annulé</option>
                </select>
              </div>

              {/* Ligne 2 : Client, Contact rapide & Mode de livraison */}
              <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{customerInfo.name}</p>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{customerInfo.phone || 'Pas de tél'}</p>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  {customerInfo.phone && (
                    <a 
                      href={`https://wa.me/${customerInfo.phone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 active:scale-95 transition-all"
                      title="Contacter sur WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </a>
                  )}
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1",
                    o?.deliveryMethod === 'delivery' 
                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" 
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  )}>
                    {o?.deliveryMethod === 'delivery' ? <Truck size={12} /> : <ShoppingBag size={12} />}
                    {o?.deliveryMethod === 'delivery' ? 'Livraison' : 'Retrait'}
                  </span>
                </div>
              </div>

              {/* Ligne 3 : Total & Statut de paiement */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs text-zinc-400 mr-1.5 font-medium">{itemsCount} article{itemsCount > 1 ? 's' : ''} ·</span>
                  <span className="text-base font-black text-white font-mono">
                    {(o?.total || 0).toFixed(2)}
                  </span>
                  <span className="text-xs text-indigo-400 ml-1 font-bold">{settings?.currency || 'DA'}</span>
                </div>

                <select 
                  value={paymentStr}
                  onChange={(e) => updateOrderPaymentStatus(o, e.target.value as any)}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-1 outline-none border cursor-pointer shadow-xs",
                    paymentStr === 'paid' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                  )}
                >
                  <option className="bg-[#0a0a0f] text-emerald-400" value="paid">✓ Payé</option>
                  <option className="bg-[#0a0a0f] text-rose-400" value="unpaid">✗ Non payé</option>
                </select>
              </div>

              {/* Ligne 4 : Assignations Préparateur & Livreur */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Préparateur</span>
                  <select
                    value={o?.assignedPickerId || ''}
                    onChange={(e) => assignPickerToOrder(o, e.target.value)}
                    className="text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 w-full font-medium"
                  >
                    <option value="" className="bg-[#0a0a0f]">Auto-Assigné</option>
                    {pickers.map(e => (
                      <option key={e.id} value={e.id} className="bg-[#0a0a0f]">{e.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Livreur</span>
                  <select
                    value={o?.assignedEmployeeId || ''}
                    onChange={(e) => {
                      if (e.target.value === 'YASSIR_EXT') {
                        handleYassirRequest(o);
                      } else {
                        assignOrderToEmployee(o, e.target.value);
                      }
                    }}
                    className={cn(
                      "text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 w-full font-medium",
                      o?.assignedEmployeeId === 'YASSIR_EXT' ? "bg-[#f2ec24]/20 text-[#f2ec24] border-[#f2ec24]/50 font-bold" : ""
                    )}
                    disabled={o?.deliveryMethod !== 'delivery'}
                  >
                    <option value="" className="bg-[#0a0a0f]">{o?.deliveryMethod === 'delivery' ? 'Choisir Livreur' : 'Non requis'}</option>
                    <option value="YASSIR_EXT" className="bg-[#0a0a0f] text-[#f2ec24] font-bold">🚕 Yassir</option>
                    {deliveryEmployees.map(e => (
                      <option key={e.id} value={e.id} className="bg-[#0a0a0f]">{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ligne 5 : Actions Tactiles Mobiles */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(orderIdStr)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Eye size={15} /> Voir Détails & Préparer
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintOrder(o)}
                  className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 active:scale-95 transition-all cursor-pointer"
                  title="Imprimer Ticket"
                  aria-label="Imprimer Ticket"
                >
                  <Printer size={16} />
                </button>

                {!o?.syncedToPos && ['confirmed', 'shipped', 'delivered'].includes(statusStr) && (
                  <button 
                    type="button"
                    onClick={() => handleManualSync(o)}
                    disabled={isSyncing === o?.id}
                    className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 active:scale-95 transition-all cursor-pointer"
                    title="Synchroniser avec la caisse"
                    aria-label="Synchroniser"
                  >
                    <RefreshCw size={16} className={isSyncing === o?.id ? "animate-spin" : ""} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOrderToDelete(orderIdStr)}
                  className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 active:scale-95 transition-all cursor-pointer"
                  title="Supprimer la commande"
                  aria-label="Supprimer la commande"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {safeFilteredOrders.length === 0 && (
          <div className="p-8 text-center bg-zinc-900/60 rounded-2xl border border-zinc-800 text-zinc-400 font-medium">
            {orders.length === 0 ? "Aucune commande reçue" : "Aucune commande ne correspond aux filtres"}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. VUE DESKTOP : Grand Tableau Dense pour Écrans d'Ordinateur    */}
      {/* ============================================================== */}
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
            {paginatedOrders.map((o: OnlineOrder, idx: number) => {
              const customerInfo = resolveCustomerInfo(o);
              const orderIdStr = String(o?.id || `order-${idx}`);
              const statusStr = o?.status || 'pending';
              const paymentStr = o?.paymentStatus || 'unpaid';
              const isSelected = selectedOrderIds.has(orderIdStr);

              return (
                <tr key={orderIdStr} className={cn("hover:bg-white/[0.02] transition-colors group", isSelected && "bg-indigo-600/10")}>
                  <td className="p-4 w-10 text-center">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOrder(orderIdStr)}
                      className="w-4 h-4 rounded border-white/20 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-white/80 font-mono tracking-tight">
                        {formatSafe(o?.timestamp || (o as any)?.createdAt || (o as any)?.created_at || new Date(), 'dd/MM/yyyy HH:mm')}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {o?.externalOrderId && (
                          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                            #{o.externalOrderId}
                          </span>
                        )}
                        {o?.syncedToPos && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                            <Check size={8} strokeWidth={3} /> Synchro
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {customerInfo.name}
                    </p>
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit shadow-lg",
                          o?.deliveryMethod === 'delivery' 
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20" 
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/20"
                        )}>
                          {o?.deliveryMethod === 'delivery' ? 'Livraison' : 'Retrait'}
                        </span>
                        {o?.deliveryMethod === 'delivery' && (o.latitude || o.mapsUrl) && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[8px] font-black uppercase tracking-wider" title="Position GPS disponible">
                            GPS
                          </span>
                        )}
                      </div>
                      {o?.deliveryMethod === 'pickup' && o?.pickupTime && (
                        <span className="text-[9px] font-black text-white/40 uppercase">Heure: {o.pickupTime}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-black text-white font-mono tracking-tight">{(o?.total || 0).toFixed(2)}</span>
                    <span className="text-[10px] text-white/40 ml-1 font-bold">{settings?.currency || 'DA'}</span>
                  </td>
                  <td className="p-4 text-xs">
                    <select 
                      value={statusStr}
                      onChange={(e) => updateOrderStatus(o, e.target.value as any)}
                      className={cn(
                        "text-[9px] font-black uppercase tracking-widest rounded-lg px-2.5 py-1.5 outline-none border border-white/5 cursor-pointer transition-all shadow-sm",
                        getStatusColor(statusStr).replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-')
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
                      value={o?.assignedPickerId || ''}
                      onChange={(e) => assignPickerToOrder(o, e.target.value)}
                      className="text-[10px] bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 w-full max-w-[120px] transition-all font-bold"
                    >
                      <option value="" className="bg-[#0a0a0f]">Auto-Assigné</option>
                      {pickers.map(e => (
                        <option key={e.id} value={e.id} className="bg-[#0a0a0f]">{e.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <select
                      value={o?.assignedEmployeeId || ''}
                      onChange={(e) => {
                        if (e.target.value === 'YASSIR_EXT') {
                          handleYassirRequest(o);
                        } else {
                          assignOrderToEmployee(o, e.target.value);
                        }
                      }}
                      className={cn(
                        "text-[10px] bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 w-full max-w-[120px] transition-all font-bold",
                        o?.assignedEmployeeId === 'YASSIR_EXT' ? "bg-[#f2ec24]/20 text-[#f2ec24] border-[#f2ec24]/50" : ""
                      )}
                      disabled={o?.deliveryMethod !== 'delivery'}
                    >
                      <option value="" className="bg-[#0a0a0f]">{o?.deliveryMethod === 'delivery' ? 'Choisir Livreur' : 'Pas de livraison'}</option>
                      <option value="YASSIR_EXT" className="bg-[#0a0a0f] text-[#f2ec24] font-black">🚕 Yassir Express</option>
                      {deliveryEmployees.map(e => (
                        <option key={e.id} value={e.id} className="bg-[#0a0a0f]">{e.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <select 
                      value={paymentStr}
                      onChange={(e) => updateOrderPaymentStatus(o, e.target.value as any)}
                      className={cn(
                        "text-[9px] font-black uppercase tracking-widest rounded-lg px-2.5 py-1.5 outline-none border border-white/5 cursor-pointer appearance-none transition-all shadow-sm",
                        paymentStr === 'paid' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      )}
                    >
                      <option className="bg-[#0a0a0f] text-emerald-400" value="paid">Payé</option>
                      <option className="bg-[#0a0a0f] text-rose-400" value="unpaid">Non payé</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!o?.syncedToPos && ['confirmed', 'shipped', 'delivered'].includes(statusStr) && (
                        <button 
                          type="button"
                          onClick={() => handleManualSync(o)}
                          disabled={isSyncing === o?.id}
                          className="p-2 text-indigo-400 hover:bg-white/5 rounded-xl transition-all shadow-sm"
                          title="Synchroniser avec la caisse"
                        >
                          {isSyncing === o?.id ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={() => handlePrintOrder(o)}
                        className="p-2 text-white/40 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
                        title="Imprimer le ticket de commande"
                      >
                        <Printer size={18} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSelectedOrderId(orderIdStr)}
                        className="p-2 text-white/40 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
                        title="Voir les détails"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setOrderToDelete(orderIdStr)}
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

      {/* Pagination (Responsive) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border border-zinc-800 rounded-xl bg-zinc-900/60">
          <span className="text-xs text-zinc-400">
            Page {currentPage} sur {totalPages} ({safeFilteredOrders.length} cde{safeFilteredOrders.length > 1 ? 's' : ''})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Page précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono font-bold text-white px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Page suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersTable;
