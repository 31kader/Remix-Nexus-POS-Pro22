import React, { useMemo } from 'react';
import { Search, X, Table as TableIcon, Smartphone, Award, ArrowUpDown, Users } from 'lucide-react';
import { List } from 'react-window';
import { Customer } from '../../../types';
import { cn } from '../../../lib/utils';
import { CustomerRowItem } from './CustomerRowItem';

interface CustomerListPanelProps {
  customers: Customer[];
  filteredCustomers: Customer[];
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  search: string;
  setSearch: (s: string) => void;
  filterStatus: string;
  setFilterStatus: (f: any) => void;
  sortBy: string;
  setSortBy: (s: any) => void;
  debtorCount: number;
  kpiStats: {
    appUserCount: number;
    [key: string]: any;
  };
  setDirectoryLayout: (l: 'split' | 'table') => void;
}

export function CustomerListPanel({
  customers,
  filteredCustomers,
  selectedCustomerId,
  setSelectedCustomerId,
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  debtorCount,
  kpiStats,
  setDirectoryLayout
}: CustomerListPanelProps) {
  const CustomerRow = useMemo(() => {
    return function CustomerRowInner({ index, style }: any) {
      const customer = filteredCustomers[index];
      if (!customer) return null;
      return (
        <CustomerRowItem
          customer={customer}
          isSelected={selectedCustomerId === customer.id}
          onSelect={setSelectedCustomerId}
          style={style}
        />
      );
    };
  }, [filteredCustomers, selectedCustomerId, setSelectedCustomerId]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-white tracking-tight uppercase">Répertoire</h3>
          <p className="text-xs text-slate-400 font-black uppercase tracking-wider">
            {filteredCustomers.length} affiché(s) / {customers.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDirectoryLayout('table')}
          className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          title="Passer en vue Grand Tableau"
        >
          <TableIcon size={14} /> Grand Tableau
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
        <input 
          type="text"
          placeholder="Rechercher nom, tél, email, carte..."
          className="w-full pl-10 pr-9 py-3 bg-slate-900/60 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white placeholder:text-slate-600 shadow-inner"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Quick Filter Badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px] font-black uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={cn(
            "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer",
            filterStatus === 'all'
              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
              : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-white"
          )}
        >
          Tous ({customers.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('debtors')}
          className={cn(
            "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer",
            filterStatus === 'debtors'
              ? "bg-rose-600 text-white border-rose-500 shadow-sm"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
          )}
        >
          Dettes ({debtorCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('credits')}
          className={cn(
            "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer",
            filterStatus === 'credits'
              ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
          )}
        >
          Avoirs
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('app_users')}
          className={cn(
            "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer",
            filterStatus === 'app_users'
              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
              : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
          )}
        >
          <Smartphone size={11} /> App ({kpiStats.appUserCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('vip')}
          className={cn(
            "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer",
            filterStatus === 'vip'
              ? "bg-amber-600 text-white border-amber-500 shadow-sm"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
          )}
        >
          <Award size={11} /> VIP
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('inactive')}
          className={cn(
            "px-2.5 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer",
            filterStatus === 'inactive'
              ? "bg-slate-700 text-white border-slate-600 shadow-sm"
              : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-white"
          )}
        >
          Inactifs
        </button>
      </div>

      {/* Sorting Row */}
      <div className="flex items-center justify-between gap-2 px-1 text-[10px] text-slate-400 font-bold uppercase">
        <span className="flex items-center gap-1">
          <ArrowUpDown size={12} className="text-indigo-400" /> Trier :
        </span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-slate-900/80 border border-white/10 text-slate-200 rounded-lg px-2 py-1 outline-none text-[10px] font-black uppercase tracking-wider cursor-pointer"
        >
          <option value="name_asc">Nom (A → Z)</option>
          <option value="name_desc">Nom (Z → A)</option>
          <option value="debt_desc">Dette la plus forte</option>
          <option value="spent_desc">Volume d'achat (CA)</option>
          <option value="points_desc">Points de fidélité</option>
          <option value="recent_visit">Dernière visite</option>
        </select>
      </div>

      <div className="flex-1 overflow-hidden pr-1 -mr-1 h-full min-h-[300px]">
        {filteredCustomers.length > 0 ? (
          <List
            rowCount={filteredCustomers.length}
            rowHeight={82}
            rowComponent={CustomerRow}
            rowProps={{}}
          />
        ) : (
          <div className="text-center py-5 text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun client trouvé</p>
          </div>
        )}
      </div>
    </>
  );
}
