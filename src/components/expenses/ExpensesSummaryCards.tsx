import React from 'react';
import { Briefcase, RotateCcw, Layers } from 'lucide-react';
import { cn, formatPrice } from '../../lib/utils';
import { CompanySettings } from '../../types';

export interface ExpensesSummaryCardsProps {
  isolationMode: 'daily' | 'returns' | 'all';
  setIsolationMode: (mode: 'daily' | 'returns' | 'all') => void;
  summaryStats: {
    dailyTotal: number;
    dailyCount: number;
    returnsTotal: number;
    returnsCount: number;
    combinedTotal: number;
    combinedCount: number;
  };
  settings: CompanySettings;
}

export const ExpensesSummaryCards: React.FC<ExpensesSummaryCardsProps> = ({
  isolationMode,
  setIsolationMode,
  summaryStats,
  settings
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Carte 1 : Dépenses Quotidiennes (Hors Retours) */}
      <div
        onClick={() => setIsolationMode('daily')}
        className={cn(
          "p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
          isolationMode === 'daily'
            ? "bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/30"
            : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40"
        )}
      >
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5",
            isolationMode === 'daily' ? "text-white/90" : "text-indigo-600 dark:text-indigo-400"
          )}>
            <Briefcase size={15} /> Dépenses Quotidiennes (Hors Retours)
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded-md text-[10px] font-mono font-black",
            isolationMode === 'daily' ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          )}>
            {summaryStats.dailyCount} opér.
          </span>
        </div>
        <h4 className={cn(
          "text-2xl font-black mt-2 font-mono tabular-nums",
          isolationMode === 'daily' ? "text-white" : "text-slate-900 dark:text-white"
        )}>
          {formatPrice(summaryStats.dailyTotal)} {settings.currency || 'DA'}
        </h4>
        <p className={cn(
          "text-[10px] font-bold mt-1",
          isolationMode === 'daily' ? "text-white/80" : "text-slate-500 dark:text-slate-400"
        )}>
          ✓ Exclut automatiquement tous les retours clients
        </p>
      </div>

      {/* Carte 2 : Retours & Remboursements Isolés */}
      <div
        onClick={() => setIsolationMode('returns')}
        className={cn(
          "p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
          isolationMode === 'returns'
            ? "bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30"
            : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-amber-500/40"
        )}
      >
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5",
            isolationMode === 'returns' ? "text-white/90" : "text-amber-600 dark:text-amber-400"
          )}>
            <RotateCcw size={15} /> Retours & Remboursements Isolés
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded-md text-[10px] font-mono font-black",
            isolationMode === 'returns' ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          )}>
            {summaryStats.returnsCount} retour(s)
          </span>
        </div>
        <h4 className={cn(
          "text-2xl font-black mt-2 font-mono tabular-nums",
          isolationMode === 'returns' ? "text-white" : "text-amber-600 dark:text-amber-400"
        )}>
          {formatPrice(summaryStats.returnsTotal)} {settings.currency || 'DA'}
        </h4>
        <p className={cn(
          "text-[10px] font-bold mt-1",
          isolationMode === 'returns' ? "text-white/80" : "text-slate-500 dark:text-slate-400"
        )}>
          ↩️ Uniquement les sorties liées aux retours marchandises
        </p>
      </div>

      {/* Carte 3 : Toutes les Sorties (Global) */}
      <div
        onClick={() => setIsolationMode('all')}
        className={cn(
          "p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
          isolationMode === 'all'
            ? "bg-slate-800 text-white border-slate-700 shadow-md ring-2 ring-slate-500/30"
            : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-500/40"
        )}
      >
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5",
            isolationMode === 'all' ? "text-white/90" : "text-slate-600 dark:text-slate-300"
          )}>
            <Layers size={15} /> Total Sorties (Dépenses + Retours)
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded-md text-[10px] font-mono font-black",
            isolationMode === 'all' ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          )}>
            {summaryStats.combinedCount} total
          </span>
        </div>
        <h4 className={cn(
          "text-2xl font-black mt-2 font-mono tabular-nums",
          isolationMode === 'all' ? "text-white" : "text-slate-900 dark:text-white"
        )}>
          {formatPrice(summaryStats.combinedTotal)} {settings.currency || 'DA'}
        </h4>
        <p className={cn(
          "text-[10px] font-bold mt-1",
          isolationMode === 'all' ? "text-white/80" : "text-slate-500 dark:text-slate-400"
        )}>
          📊 Vue consolidée de toutes les sorties de caisse
        </p>
      </div>
    </div>
  );
};
