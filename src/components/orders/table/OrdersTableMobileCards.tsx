import React from 'react';
import { Check, MessageCircle, Truck, ShoppingBag, Eye, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { OnlineOrder, CompanySettings } from '../../../types';
import { formatSafe, cn } from '../../../lib/utils';

interface OrdersTableMobileCardsProps {
  orders: OnlineOrder[];
  safeFilteredOrders: OnlineOrder[];
  paginatedOrders: OnlineOrder[];
  settings: CompanySettings;
  selectedOrderIds: Set<string>;
  allFilteredSelected: boolean;
  toggleSelectAll: (orders: OnlineOrder[]) => void;
  toggleSelectOrder: (orderId: string) => void;
  updateOrderStatus: (order: OnlineOrder, status: any) => void;
  updateOrderPaymentStatus: (order: OnlineOrder, status: any) => void;
  assignPickerToOrder: (order: OnlineOrder, pickerId: string) => void;
  assignOrderToEmployee: (order: OnlineOrder, employeeId: string) => void;
  handleYassirRequest: (order: OnlineOrder) => void;
  handlePrintOrder: (order: OnlineOrder) => void;
  handleManualSync: (order: OnlineOrder) => void;
  isSyncing: string | null;
  setSelectedOrderId: (id: string) => void;
  setOrderToDelete: (id: string) => void;
  resolveCustomerInfo: (order: OnlineOrder) => { name: string; phone: string };
  pickers: any[];
  deliveryEmployees: any[];
}

export function OrdersTableMobileCards({
  orders,
  safeFilteredOrders,
  paginatedOrders,
  settings,
  selectedOrderIds,
  allFilteredSelected,
  toggleSelectAll,
  toggleSelectOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
  assignPickerToOrder,
  assignOrderToEmployee,
  handleYassirRequest,
  handlePrintOrder,
  handleManualSync,
  isSyncing,
  setSelectedOrderId,
  setOrderToDelete,
  resolveCustomerInfo,
  pickers,
  deliveryEmployees
}: OrdersTableMobileCardsProps) {
  return (
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
                    className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 active:scale-95 transition-all cursor-pointer"
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
                  className="text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 w-full font-medium cursor-pointer"
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
                    "text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 w-full font-medium cursor-pointer",
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
  );
}
