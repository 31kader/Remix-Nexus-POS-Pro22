import React from 'react';
import { Search } from 'lucide-react';
import { Card } from '../ui';
import { Category } from '../../types';

export interface GroupedSalesFilterBarProps {
  activeSubTab: 'grouped_products' | 'basket_profits';
  dateFilter: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'this_month' | 'all' | 'custom';
  setDateFilter: (f: any) => void;
  customRange: { start: string; end: string };
  setCustomRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  categories: Category[];
  sortBy: 'qty' | 'revenue' | 'profit';
  setSortBy: (s: 'qty' | 'revenue' | 'profit') => void;
  sortDirection: 'desc' | 'asc';
  setSortDirection: React.Dispatch<React.SetStateAction<'desc' | 'asc'>>;
  setCurrentPage: (p: number) => void;
}

export const GroupedSalesFilterBar: React.FC<GroupedSalesFilterBarProps> = ({
  activeSubTab,
  dateFilter,
  setDateFilter,
  customRange,
  setCustomRange,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  categories,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection,
  setCurrentPage
}) => {
  return (
    <Card className="p-4 bg-slate-900/60 border border-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Quick Date Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'today', label: "Aujourd'hui" },
            { id: 'yesterday', label: 'Hier' },
            { id: 'last7days', label: '7 jours' },
            { id: 'last30days', label: '30 jours' },
            { id: 'this_month', label: 'Ce mois' },
            { id: 'all', label: 'Tout' },
            { id: 'custom', label: 'Période...' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setDateFilter(f.id as any); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder={activeSubTab === 'grouped_products' ? "Rechercher un produit, SKU..." : "Rechercher un ticket, client..."}
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
      </div>

      {/* Custom Range Picker */}
      {dateFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Du :</label>
            <input
              type="date"
              value={customRange.start}
              onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
              className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Au :</label>
            <input
              type="date"
              value={customRange.end}
              onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
              className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Sub-Filters & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/60">
        {activeSubTab === 'grouped_products' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Catégorie :</span>
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-bold"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-400">Trier par :</span>
          <button
            onClick={() => {
              if (sortBy === 'qty') setSortDirection(d => d === 'desc' ? 'asc' : 'desc');
              else { setSortBy('qty'); setSortDirection('desc'); }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              sortBy === 'qty' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Quantité {sortBy === 'qty' && (sortDirection === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => {
              if (sortBy === 'revenue') setSortDirection(d => d === 'desc' ? 'asc' : 'desc');
              else { setSortBy('revenue'); setSortDirection('desc'); }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              sortBy === 'revenue' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Chiffre d'Affaires {sortBy === 'revenue' && (sortDirection === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => {
              if (sortBy === 'profit') setSortDirection(d => d === 'desc' ? 'asc' : 'desc');
              else { setSortBy('profit'); setSortDirection('desc'); }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              sortBy === 'profit' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Bénéfice Net {sortBy === 'profit' && (sortDirection === 'desc' ? '↓' : '↑')}
          </button>
        </div>
      </div>
    </Card>
  );
};
