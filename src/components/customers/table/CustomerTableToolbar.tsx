import React from 'react';
import { Search, X, Table as TableIcon, Smartphone, Award, ArrowUpDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface CustomerTableToolbarProps {
  search: string;
  setSearch: (s: string) => void;
  filterStatus: string;
  setFilterStatus: (s: any) => void;
  sortBy: string;
  setSortBy: (s: any) => void;
  kpiStats: {
    totalCustomers: number;
    debtorCount?: number;
    debtCount?: number;
    creditCount: number;
    appUserCount: number;
    [key: string]: any;
  };
}

export function CustomerTableToolbar({
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  kpiStats
}: CustomerTableToolbarProps) {
  return (
    <>
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
            <TableIcon className="text-indigo-600 dark:text-indigo-400" size={22} /> Grand Tableau des Clients
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
            Vue panoramique complète avec gestion de solde, dettes, points et actions rapides
          </p>
        </div>

        {/* Search Input in Table view */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="Rechercher client, tél, email..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table Filter Tabs & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-2.5 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer",
              filterStatus === 'all'
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30"
                : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800"
            )}
          >
            Tous ({kpiStats.totalCustomers})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('debt')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              filterStatus === 'debt'
                ? "bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-600/30"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100"
            )}
          >
            Dettes ({kpiStats.debtorCount ?? kpiStats.debtCount ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('credit')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              filterStatus === 'credit'
                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/30"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100"
            )}
          >
            Avoirs ({kpiStats.creditCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('app_users')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              filterStatus === 'app_users'
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30"
                : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800"
            )}
          >
            <Smartphone size={13} /> App ({kpiStats.appUserCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('vip')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              filterStatus === 'vip'
                ? "bg-amber-600 text-white border-amber-500 shadow-sm shadow-amber-600/30"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100"
            )}
          >
            <Award size={13} /> VIP
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('inactive')}
            className={cn(
              "px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer",
              filterStatus === 'inactive'
                ? "bg-slate-700 text-white border-slate-600 shadow-sm"
                : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800"
            )}
          >
            Inactifs
          </button>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300 font-bold uppercase">
          <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
            <ArrowUpDown size={13} className="text-indigo-500" /> Trier :
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl px-3 py-1.5 outline-none text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            <option value="name_asc">Nom (A → Z)</option>
            <option value="name_desc">Nom (Z → A)</option>
            <option value="debt_desc">Dette la plus forte</option>
            <option value="spent_desc">Volume d'achat (CA)</option>
            <option value="points_desc">Points de fidélité</option>
            <option value="recent_visit">Dernière visite</option>
          </select>
        </div>
      </div>
    </>
  );
}
