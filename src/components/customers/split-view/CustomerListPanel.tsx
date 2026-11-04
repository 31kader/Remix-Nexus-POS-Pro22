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
    <div className="flex flex-col h-full gap-3 select-none">
      {/* 1. En-tête : Titre & Bascule Grand Tableau */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <span>Fichier Clients</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono font-bold">
              {filteredCustomers.length}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            {filteredCustomers.length < customers.length 
              ? `${filteredCustomers.length} affiché(s) sur ${customers.length} au total`
              : `${customers.length} client(s) répertorié(s)`
            }
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDirectoryLayout('table')}
          className="btn-touch-action px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/[0.06] rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title="Afficher la vue Grand Tableau"
        >
          <TableIcon size={14} className="text-indigo-400" />
          <span className="hidden sm:inline">Grand Tableau</span>
        </button>
      </div>

      {/* 2. Barre de Recherche Filtrée */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" size={16} />
        <input 
          type="text"
          placeholder="Rechercher nom, tél, email, carte..."
          className="w-full pl-10 pr-9 py-2.5 bg-slate-100/80 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 outline-none transition-all text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-inner"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer p-1"
            aria-label="Effacer la recherche"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 3. Filtres Rapides Doux & Reposants */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-medium">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={cn(
            "btn-touch-action px-3 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer text-xs",
            filterStatus === 'all'
              ? "bg-indigo-600 text-white font-bold shadow-2xs shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-zinc-850/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
          )}
        >
          Tous ({customers.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('debtors')}
          className={cn(
            "btn-touch-action px-3 py-1 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs",
            filterStatus === 'debtors'
              ? "bg-rose-600 text-white font-bold shadow-2xs shadow-rose-600/20"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>Dettes ({debtorCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('credits')}
          className={cn(
            "btn-touch-action px-3 py-1 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs",
            filterStatus === 'credits'
              ? "bg-emerald-600 text-white font-bold shadow-2xs shadow-emerald-600/20"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Avoirs</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('app_users')}
          className={cn(
            "btn-touch-action px-3 py-1 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs",
            filterStatus === 'app_users'
              ? "bg-indigo-600 text-white font-bold shadow-2xs shadow-indigo-600/20"
              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20"
          )}
        >
          <Smartphone size={12} />
          <span>App ({kpiStats.appUserCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('vip')}
          className={cn(
            "btn-touch-action px-3 py-1 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs",
            filterStatus === 'vip'
              ? "bg-amber-600 text-white font-bold shadow-2xs shadow-amber-600/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
          )}
        >
          <Award size={12} />
          <span>VIP</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('inactive')}
          className={cn(
            "btn-touch-action px-3 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer text-xs",
            filterStatus === 'inactive'
              ? "bg-slate-700 text-white font-bold shadow-2xs"
              : "bg-slate-100 dark:bg-zinc-850/80 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
          )}
        >
          Inactifs
        </button>
      </div>

      {/* 4. Barre de Tri */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-zinc-400 font-medium">
        <span className="flex items-center gap-1.5">
          <ArrowUpDown size={12} className="text-indigo-400" />
          <span>Trier par :</span>
        </span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-slate-100 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-zinc-200 rounded-xl px-2.5 py-1 outline-none text-xs font-semibold cursor-pointer"
        >
          <option value="name_asc">Nom (A → Z)</option>
          <option value="name_desc">Nom (Z → A)</option>
          <option value="debt_desc">Dette la plus forte</option>
          <option value="spent_desc">Volume d'achats (CA)</option>
          <option value="points_desc">Points de fidélité</option>
          <option value="recent_visit">Dernière visite</option>
        </select>
      </div>

      {/* 5. Liste Virtualisée Haute Fluidité */}
      <div className="flex-1 overflow-hidden pr-1 -mr-1 h-full min-h-[300px]">
        {filteredCustomers.length > 0 ? (
          <List
            rowCount={filteredCustomers.length}
            rowHeight={82}
            rowComponent={CustomerRow}
            rowProps={{}}
          />
        ) : (
          <div className="text-center py-12 text-slate-400 dark:text-zinc-500">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">Aucun client correspondant trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
