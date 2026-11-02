import React from 'react';
import { RefreshCw, Search, Plus, X } from 'lucide-react';
import { Card, Button } from '../ui';
import { cn } from '../../lib/utils';

interface OrdersListHeaderProps {
  statusCounts: { all: number; pending: number; confirmed: number; processing: number; shipped: number; delivered: number; cancelled: number };
  filteredOrdersLength: number;
  totalOrdersLength: number;
  isRefreshing: boolean;
  refreshFromSupabase: (force?: boolean) => void;
  createTestOrder: () => void;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  searchFilter: string;
  setSearchFilter: (search: string) => void;
  deliveryFilter: string;
  setDeliveryFilter: (filter: string) => void;
  paymentFilter: string;
  setPaymentFilter: (filter: string) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
}

export const OrdersListHeader: React.FC<OrdersListHeaderProps> = ({
  statusCounts,
  filteredOrdersLength,
  totalOrdersLength,
  isRefreshing,
  refreshFromSupabase,
  createTestOrder,
  autoSync,
  setAutoSync,
  statusFilter,
  setStatusFilter,
  searchFilter,
  setSearchFilter,
  deliveryFilter,
  setDeliveryFilter,
  paymentFilter,
  setPaymentFilter,
  dateFilter,
  setDateFilter
}) => {
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
    <>
      {/* Header Titre & Actions Principales */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            Commandes en Ligne 
            <span className={cn(
              "text-[11px] px-2.5 py-0.5 rounded-full border transition-all",
              statusCounts.pending > 0 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse font-bold" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium"
            )}>
              {statusCounts.pending} en attente
            </span>
          </h3>
          <p className="text-white/40 text-xs sm:text-sm mt-0.5">
            {filteredOrdersLength} affichées sur {totalOrdersLength} au total (Synchro Directe)
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => refreshFromSupabase(true)}
            disabled={isRefreshing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer active:scale-95"
            title="Synchroniser immédiatement avec Supabase"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-indigo-400" : "text-slate-400"} />
            <span className="hidden sm:inline">{isRefreshing ? "Synchronisation..." : "Actualiser Supabase"}</span>
            <span className="sm:hidden">{isRefreshing ? "Synchro..." : "Actualiser"}</span>
          </Button>

          <Button
            onClick={createTestOrder}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-500/20 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={15} /> <span>+ Commande</span>
          </Button>

          <div className="flex items-center gap-2 bg-zinc-800/80 px-2.5 py-2 rounded-xl border border-zinc-700 shadow-xs shrink-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${autoSync ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/20'}`} />
            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider text-white/70">Auto-Sync</span>
            <button 
              type="button"
              onClick={() => (typeof setAutoSync === 'function' ? setAutoSync(!autoSync) : null)}
              className={cn(
                "relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none cursor-pointer",
                autoSync ? "bg-indigo-500" : "bg-white/10"
              )}
              title={autoSync ? "Désactiver la synchro automatique" : "Activer la synchro automatique"}
            >
              <span className={cn(
                "inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-xs",
                autoSync ? "translate-x-4" : "translate-x-0.5"
              )} />
            </button>
          </div>
        </div>
      </div>

      {/* Bandeau d'onglets de statut avec défilement tactile fluide */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scroll-smooth custom-scrollbar">
        {statusTabItems.map(tab => {
          const isActive = (statusFilter || 'all').toLowerCase() === tab.key.toLowerCase();
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => (typeof setStatusFilter === 'function' ? setStatusFilter(tab.key) : null)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer active:scale-95",
                isActive 
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25" 
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-all",
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

      {/* Barre de Filtres Responsive */}
      <Card className="p-3 bg-zinc-900/80 border border-zinc-800 shadow-sm space-y-2.5">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {/* Recherche (Pleine largeur sur mobile) */}
          <div className="relative col-span-2 sm:flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
            <input 
              type="text"
              placeholder="Rechercher par client, tél, N°..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={searchFilter || ''}
              onChange={e => (typeof setSearchFilter === 'function' ? setSearchFilter(e.target.value) : null)}
            />
            {searchFilter && (
              <button 
                type="button"
                onClick={() => (typeof setSearchFilter === 'function' ? setSearchFilter('') : null)} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtre Type (Livraison / Retrait) */}
          <select 
            value={deliveryFilter || 'all'}
            onChange={(e) => (typeof setDeliveryFilter === 'function' ? setDeliveryFilter(e.target.value) : null)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer w-full sm:w-auto"
          >
            <option value="all">Tous les types</option>
            <option value="delivery">Livraison</option>
            <option value="pickup">Retrait Magasin</option>
          </select>

          {/* Filtre Paiement */}
          <select 
            value={paymentFilter || 'all'}
            onChange={(e) => (typeof setPaymentFilter === 'function' ? setPaymentFilter(e.target.value) : null)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer w-full sm:w-auto"
          >
            <option value="all">Tous paiements</option>
            <option value="paid">Payé</option>
            <option value="unpaid">Non Payé</option>
          </select>

          {/* Filtres Temporels */}
          <div className="col-span-2 sm:col-span-auto flex items-center justify-between sm:justify-start gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => (typeof setDateFilter === 'function' ? setDateFilter('all') : null)}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Tout
            </button>
            <button
              type="button"
              onClick={() => (typeof setDateFilter === 'function' ? setDateFilter('today') : null)}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'today' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => (typeof setDateFilter === 'function' ? setDateFilter('last7days') : null)}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'last7days' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              7J
            </button>
            <button
              type="button"
              onClick={() => (typeof setDateFilter === 'function' ? setDateFilter('last30days') : null)}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'last30days' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              30J
            </button>
          </div>
        </div>
      </Card>
    </>
  );
};
