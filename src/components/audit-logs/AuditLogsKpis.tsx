import React from 'react';
import { ShieldAlert, AlertTriangle, Clock, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AuditActionCategory, AuditShiftHourFilter } from '../../hooks/useAuditLogsLogic';

interface AuditStats {
  total: number;
  criticalCount: number;
  deletionsAndPriceCount: number;
  nightOpsCount: number;
  cancelledCount: number;
}

interface AuditLogsKpisProps {
  stats: AuditStats;
  hasActiveFilters: boolean;
  severityFilter: string;
  actionCategoryFilter: AuditActionCategory;
  shiftHourFilter: AuditShiftHourFilter;
  statusFilter: 'all' | 'active' | 'cancelled';
  resetAllFilters: () => void;
  setSeverityFilter: (sev: string) => void;
  setActionCategoryFilter: (cat: AuditActionCategory) => void;
  setShiftHourFilter: (shift: AuditShiftHourFilter) => void;
  setStatusFilter: (status: 'all' | 'active' | 'cancelled') => void;
}

export const AuditLogsKpis: React.FC<AuditLogsKpisProps> = ({
  stats,
  hasActiveFilters,
  severityFilter,
  actionCategoryFilter,
  shiftHourFilter,
  statusFilter,
  resetAllFilters,
  setSeverityFilter,
  setActionCategoryFilter,
  setShiftHourFilter,
  setStatusFilter,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <button
        type="button"
        onClick={resetAllFilters}
        className={cn(
          "p-4 rounded-2xl border text-left transition-all cursor-pointer",
          !hasActiveFilters
            ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-indigo-500/40"
        )}
      >
        <p className={cn("text-[10px] font-black uppercase tracking-wider", !hasActiveFilters ? "text-indigo-100" : "text-slate-500 dark:text-zinc-400")}>
          Total Journalisé
        </p>
        <p className={cn("text-2xl font-black mt-1", !hasActiveFilters ? "text-white" : "text-slate-900 dark:text-white")}>
          {stats.total}
        </p>
        <p className={cn("text-[10px] mt-1 font-bold", !hasActiveFilters ? "text-indigo-200" : "text-indigo-600 dark:text-indigo-400")}>
          Voir tout l'historique
        </p>
      </button>

      <button
        type="button"
        onClick={() => {
          resetAllFilters();
          setSeverityFilter('critical');
        }}
        className={cn(
          "p-4 rounded-2xl border text-left transition-all cursor-pointer",
          severityFilter === 'critical'
            ? "bg-rose-600 text-white border-rose-500 shadow-md"
            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-rose-500/40"
        )}
      >
        <div className="flex items-center justify-between">
          <p className={cn("text-[10px] font-black uppercase tracking-wider", severityFilter === 'critical' ? "text-rose-100" : "text-rose-600 dark:text-rose-400")}>
            Critiques & Sensibles
          </p>
          <ShieldAlert size={15} className={severityFilter === 'critical' ? "text-white" : "text-rose-500"} />
        </div>
        <p className={cn("text-2xl font-black mt-1", severityFilter === 'critical' ? "text-white" : "text-slate-900 dark:text-white")}>
          {stats.criticalCount}
        </p>
        <p className={cn("text-[10px] mt-1 font-bold", severityFilter === 'critical' ? "text-rose-100" : "text-slate-500 dark:text-zinc-400")}>
          Isoler les alertes critiques
        </p>
      </button>

      <button
        type="button"
        onClick={() => {
          resetAllFilters();
          setActionCategoryFilter('price_discount');
        }}
        className={cn(
          "p-4 rounded-2xl border text-left transition-all cursor-pointer",
          actionCategoryFilter === 'price_discount' || actionCategoryFilter === 'deletions'
            ? "bg-amber-600 text-white border-amber-500 shadow-md"
            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-amber-500/40"
        )}
      >
        <div className="flex items-center justify-between">
          <p className={cn("text-[10px] font-black uppercase tracking-wider", actionCategoryFilter === 'price_discount' ? "text-amber-100" : "text-amber-600 dark:text-amber-400")}>
            Prix, Remises & Suppr.
          </p>
          <AlertTriangle size={15} className={actionCategoryFilter === 'price_discount' ? "text-white" : "text-amber-500"} />
        </div>
        <p className={cn("text-2xl font-black mt-1", actionCategoryFilter === 'price_discount' ? "text-white" : "text-slate-900 dark:text-white")}>
          {stats.deletionsAndPriceCount}
        </p>
        <p className={cn("text-[10px] mt-1 font-bold", actionCategoryFilter === 'price_discount' ? "text-amber-100" : "text-slate-500 dark:text-zinc-400")}>
          Modifications de tarifs
        </p>
      </button>

      <button
        type="button"
        onClick={() => {
          resetAllFilters();
          setShiftHourFilter('night');
        }}
        className={cn(
          "p-4 rounded-2xl border text-left transition-all cursor-pointer",
          shiftHourFilter === 'night'
            ? "bg-purple-600 text-white border-purple-500 shadow-md"
            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-purple-500/40"
        )}
      >
        <div className="flex items-center justify-between">
          <p className={cn("text-[10px] font-black uppercase tracking-wider", shiftHourFilter === 'night' ? "text-purple-100" : "text-purple-600 dark:text-purple-400")}>
            Horaires Tardifs (22h-06h)
          </p>
          <Clock size={15} className={shiftHourFilter === 'night' ? "text-white" : "text-purple-500"} />
        </div>
        <p className={cn("text-2xl font-black mt-1", shiftHourFilter === 'night' ? "text-white" : "text-slate-900 dark:text-white")}>
          {stats.nightOpsCount}
        </p>
        <p className={cn("text-[10px] mt-1 font-bold", shiftHourFilter === 'night' ? "text-purple-100" : "text-slate-500 dark:text-zinc-400")}>
          Activités hors ouverture
        </p>
      </button>

      <button
        type="button"
        onClick={() => {
          resetAllFilters();
          setStatusFilter('cancelled');
        }}
        className={cn(
          "p-4 rounded-2xl border text-left transition-all cursor-pointer col-span-2 lg:col-span-1",
          statusFilter === 'cancelled'
            ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-emerald-500/40"
        )}
      >
        <div className="flex items-center justify-between">
          <p className={cn("text-[10px] font-black uppercase tracking-wider", statusFilter === 'cancelled' ? "text-emerald-100" : "text-emerald-600 dark:text-emerald-400")}>
            Actions Annulées (Rollback)
          </p>
          <RotateCcw size={15} className={statusFilter === 'cancelled' ? "text-white" : "text-emerald-500"} />
        </div>
        <p className={cn("text-2xl font-black mt-1", statusFilter === 'cancelled' ? "text-white" : "text-slate-900 dark:text-white")}>
          {stats.cancelledCount}
        </p>
        <p className={cn("text-[10px] mt-1 font-bold", statusFilter === 'cancelled' ? "text-emerald-100" : "text-slate-500 dark:text-zinc-400")}>
          Opérations inversées
        </p>
      </button>
    </div>
  );
};
