import React from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type SupplierSortBy = 'name' | 'debt_desc' | 'rating_desc';
export type SupplierQuickFilter = 'all' | 'debt' | 'settled' | 'today' | 'top_rated';
export type SupplierViewMode = 'grid' | 'table';

interface SupplierFilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  sortBy: SupplierSortBy;
  onSortChange: (val: SupplierSortBy) => void;
  viewMode: SupplierViewMode;
  onViewModeChange: (val: SupplierViewMode) => void;
  quickFilter: SupplierQuickFilter;
  onQuickFilterChange: (val: SupplierQuickFilter) => void;
  counts: { all: number; debt: number; settled: number; today: number; topRated: number };
  currency: string;
}

export const SupplierFilterBar: React.FC<SupplierFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  quickFilter,
  onQuickFilterChange,
  counts,
  currency
}) => {
  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher un fournisseur (Nom, Contact, Téléphone, Email, Wilaya)..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SupplierSortBy)}
            className="px-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none cursor-pointer"
          >
            <option value="name">Trier par : Nom (A-Z)</option>
            <option value="debt_desc">Trier par : Dette la plus élevée</option>
            <option value="rating_desc">Trier par : Meilleure Note</option>
          </select>

          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={cn(
                "btn-touch-action px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all",
                viewMode === 'grid' ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-zinc-400 hover:text-zinc-200"
              )}
              title="Affichage en cartes"
            >
              <LayoutGrid size={14} /> Cartes
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={cn(
                "btn-touch-action px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all",
                viewMode === 'table' ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-zinc-400 hover:text-zinc-200"
              )}
              title="Affichage en tableau"
            >
              <List size={14} /> Tableau
            </button>
          </div>
        </div>
      </div>

      {/* Boutons Filtres Rapides */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {[
          { id: 'all' as const, label: `Tous (${counts.all})`, activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-xs' },
          { id: 'debt' as const, label: `Avec Dette (${counts.debt})`, activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs' },
          { id: 'settled' as const, label: `Soldés (${counts.settled})`, activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs' },
          { id: 'today' as const, label: `Passage Aujourd'hui (${counts.today})`, activeClass: 'bg-amber-600 text-white border-amber-600 shadow-xs' },
          { id: 'top_rated' as const, label: `Top Note ≥ 4/5 (${counts.topRated})`, activeClass: 'bg-purple-600 text-white border-purple-600 shadow-xs' },
        ].map(f => {
          const isActive = quickFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onQuickFilterChange(f.id)}
              className={cn(
                "btn-touch-action px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                isActive
                  ? f.activeClass
                  : "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700/60"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
