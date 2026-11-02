import React from 'react';
import { Calendar, Search } from 'lucide-react';
import { Card } from '../ui';
import { cn, formatPrice } from '../../lib/utils';
import { CompanySettings } from '../../types';
import { EXPENSE_CATEGORIES } from './expensesTypes';

export interface ExpensesFilterBarProps {
  dateRangeFilter: 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  setDateRangeFilter: (d: any) => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  search: string;
  setSearch: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  paymentMethodFilter: 'all' | 'cash' | 'card' | 'transfer';
  setPaymentMethodFilter: (p: any) => void;
  filteredExpensesCount: number;
  currentSelectionTotal: number;
  settings: CompanySettings;
}

export const ExpensesFilterBar: React.FC<ExpensesFilterBarProps> = ({
  dateRangeFilter,
  setDateRangeFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  filteredExpensesCount,
  currentSelectionTotal,
  settings
}) => {
  return (
    <Card className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
      {/* Ligne 1 : Filtres de Période Rapides */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Calendar size={13} /> Période :
          </span>
          {[
            { id: 'all', label: 'Toutes les dates' },
            { id: 'today', label: "Aujourd'hui" },
            { id: 'yesterday', label: 'Hier' },
            { id: 'week', label: '7 derniers jours' },
            { id: 'month', label: 'Ce Mois' },
            { id: 'custom', label: 'Dates personnalisées' },
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDateRangeFilter(p.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer border",
                dateRangeFilter === p.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Total de la sélection filtrée actuelle */}
        <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
          Sélection affichée ({filteredExpensesCount}) : -{formatPrice(currentSelectionTotal)} {settings.currency || 'DA'}
        </div>
      </div>

      {dateRangeFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Du :</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Au :</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Ligne 2 : Recherche + Catégorie + Mode de Paiement */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Rechercher une dépense par description ou motif..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white text-xs font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select 
          className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 dark:text-slate-200"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Toutes les catégories</option>
          {EXPENSE_CATEGORIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select 
          className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 dark:text-slate-200"
          value={paymentMethodFilter}
          onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
        >
          <option value="all">Tous modes de paiement</option>
          <option value="cash">💵 Espèces (Caisse)</option>
          <option value="card">💳 Carte / TPE</option>
          <option value="transfer">🏦 Virement / Chèque</option>
        </select>
      </div>
    </Card>
  );
};
