import React from 'react';
import { 
  AlertTriangle, 
  FileSpreadsheet, 
  Database, 
  Calendar, 
  Search, 
  Filter, 
  X 
} from 'lucide-react';
import { Card, Button } from '../../ui';
import { cn } from '../../../lib/utils';
import { DateFilterPreset } from './lossesTypes';

interface LossesFilterBarProps {
  dateFilter: DateFilterPreset;
  setDateFilter: (filter: DateFilterPreset) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  reasonFilter: string;
  setReasonFilter: (reason: string) => void;
  hasLosses: boolean;
  onExportExcel: () => void;
  onExportCSV: () => void;
}

const PRESETS: Array<{ id: DateFilterPreset; label: string }> = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'yesterday', label: 'Hier' },
  { id: '7days', label: '7 jours' },
  { id: '30days', label: '30 jours' },
  { id: 'this_month', label: 'Ce mois' },
  { id: 'last_month', label: 'Mois dernier' },
  { id: 'all', label: 'Toutes les dates' },
  { id: 'custom', label: 'Personnalisée' },
];

export const LossesFilterBar: React.FC<LossesFilterBarProps> = ({
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  searchTerm,
  setSearchTerm,
  reasonFilter,
  setReasonFilter,
  hasLosses,
  onExportExcel,
  onExportCSV,
}) => {
  return (
    <Card className="p-4 sm:p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="text-rose-500" size={20} />
            Rapport & Analyse des Pertes de Stock
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Suivi précis des articles avariés, détruits, cassés ou périmés avec valorisation financière.
          </p>
        </div>

        {/* Boutons Export */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={onExportExcel}
            disabled={!hasLosses}
            className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50"
            title="Exporter les pertes filtrées sous Excel avec code-barres et désignation"
          >
            <FileSpreadsheet size={16} />
            <span>Excel</span>
          </Button>
          <Button
            variant="secondary"
            onClick={onExportCSV}
            disabled={!hasLosses}
            className="flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-50"
            title="Exporter les pertes filtrées sous format CSV"
          >
            <Database size={16} />
            <span>CSV</span>
          </Button>
        </div>
      </div>

      {/* Boutons Sélecteurs de Période (Filtres Rapides) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 mr-2 flex items-center gap-1">
          <Calendar size={14} /> Période :
        </span>
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setDateFilter(preset.id)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs",
              dateFilter === preset.id
                ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700/60"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Sélecteur de dates personnalisé */}
      {dateFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200 dark:border-zinc-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">Du :</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-rose-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">Au :</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-rose-500"
            />
          </div>
        </div>
      )}

      {/* Barre de recherche & Filtre par Motif */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Rechercher par nom d'article, code-barres, motif ou opérateur..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-rose-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-slate-400 shrink-0" />
          <select
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-rose-500"
          >
            <option value="all">Tous les motifs</option>
            <option value="casse">Casse / Endommagé</option>
            <option value="perime">Périmé / DLC dépassée</option>
            <option value="avarie">Avarie / Défaut</option>
            <option value="vol">Vol / Écart d'inventaire</option>
          </select>
        </div>
      </div>
    </Card>
  );
};
