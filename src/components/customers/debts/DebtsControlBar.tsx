import React from 'react';
import { CreditCard, Users, Search, Plus } from 'lucide-react';
import { CompanySettings } from '../../../types';
import { AgingCounts } from './debtsTypes';

export interface DebtsControlBarProps {
  tabView: 'debtors' | 'all';
  setTabView: (v: 'debtors' | 'all') => void;
  debtorCustomersCount: number;
  allCustomersCount: number;
  filterType: 'all' | 'high';
  setFilterType: React.Dispatch<React.SetStateAction<'all' | 'high'>>;
  agingFilter: 'all' | 'recent' | 'warning' | 'overdue';
  setAgingFilter: (v: 'all' | 'recent' | 'warning' | 'overdue') => void;
  agingCounts: AgingCounts;
  search: string;
  setSearch: (v: string) => void;
  setIsAddDebtModalOpen: (v: boolean) => void;
  settings: CompanySettings;
}

export function DebtsControlBar({
  tabView,
  setTabView,
  debtorCustomersCount,
  allCustomersCount,
  filterType,
  setFilterType,
  agingFilter,
  setAgingFilter,
  agingCounts,
  search,
  setSearch,
  setIsAddDebtModalOpen,
  settings
}: DebtsControlBarProps) {
  const currency = settings.currency || 'DA';

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 border border-slate-800 rounded-xl shadow-xl">
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        {/* Sub-view Switcher */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTabView('debtors')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              tabView === 'debtors' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard size={14} />
            Débiteurs Uniquement ({debtorCustomersCount})
          </button>
          <button
            type="button"
            onClick={() => setTabView('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              tabView === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            Tous les Clients ({allCustomersCount})
          </button>
        </div>

        {/* High Debt Filter & Aging filters */}
        {tabView === 'debtors' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterType(prev => prev === 'all' ? 'high' : 'all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                filterType === 'high' 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              &gt; 10 000 {currency}
            </button>

            {/* Aging Filter Buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setAgingFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-black uppercase transition-all ${
                  agingFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setAgingFilter('recent')}
                className={`px-2.5 py-1 rounded-lg font-black uppercase transition-all flex items-center gap-1 ${
                  agingFilter === 'recent' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-emerald-500/60 hover:text-emerald-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                &lt;15j ({agingCounts.recent})
              </button>
              <button
                type="button"
                onClick={() => setAgingFilter('warning')}
                className={`px-2.5 py-1 rounded-lg font-black uppercase transition-all flex items-center gap-1 ${
                  agingFilter === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-amber-500/60 hover:text-amber-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                15-30j ({agingCounts.warning})
              </button>
              <button
                type="button"
                onClick={() => setAgingFilter('overdue')}
                className={`px-2.5 py-1 rounded-lg font-black uppercase transition-all flex items-center gap-1 ${
                  agingFilter === 'overdue' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'text-rose-500/60 hover:text-rose-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                &gt;30j ({agingCounts.overdue})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search and Action Buttons */}
      <div className="flex items-center gap-3 w-full lg:w-auto">
        <div className="relative flex-1 sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou tél..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsAddDebtModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-rose-600/20 flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          Ajouter une Dette
        </button>
      </div>
    </div>
  );
}
