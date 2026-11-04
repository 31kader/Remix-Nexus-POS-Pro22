import React from 'react';
import { 
  Plus, Users, CreditCard as CardIcon, TrendingUp,
  Download, Upload, LayoutGrid, Table as TableIcon, 
  History, UserCheck 
} from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';
import { CompanySettings } from '../../types';

export interface CustomersTopBarProps {
  customerViewMode: 'directory' | 'journal' | 'general' | 'debts' | 'analytics';
  setCustomerViewMode: (m: 'directory' | 'journal' | 'general' | 'debts' | 'analytics') => void;
  directoryLayout: 'split' | 'table';
  setDirectoryLayout: (l: 'split' | 'table') => void;
  customersCount: number;
  debtorCount: number;
  kpiStats: {
    totalDebt: number;
    totalPoints: number;
    totalSpentAll: number;
  };
  settings: CompanySettings;
  excelInputRef: React.RefObject<HTMLInputElement | null>;
  importCustomersFromExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportCustomersToExcel: () => void;
  onNewCustomer: () => void;
}

export const CustomersTopBar: React.FC<CustomersTopBarProps> = ({
  customerViewMode,
  setCustomerViewMode,
  directoryLayout,
  setDirectoryLayout,
  customersCount,
  debtorCount,
  kpiStats,
  settings,
  excelInputRef,
  importCustomersFromExcel,
  exportCustomersToExcel,
  onNewCustomer
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/95 dark:bg-zinc-900/90 p-2.5 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl flex-shrink-0 shadow-2xs select-none">
      {/* 1. Navigation Principale : 5 Onglets Spécialisés */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setCustomerViewMode('directory')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
            customerViewMode === 'directory'
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
          )}
        >
          <Users size={14} className={customerViewMode === 'directory' ? "text-white" : "text-indigo-500"} />
          <span>Répertoire</span>
          <span className="text-[10px] font-mono opacity-80">({customersCount})</span>
        </button>

        {customerViewMode === 'directory' && (
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-zinc-950/80 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setDirectoryLayout('split')}
              className={cn(
                "px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer",
                directoryLayout === 'split'
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
              )}
              title="Vue Fiche Dossier (Scindée)"
            >
              <LayoutGrid size={12} /> Fiche
            </button>
            <button
              type="button"
              onClick={() => setDirectoryLayout('table')}
              className={cn(
                "px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer",
                directoryLayout === 'table'
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
              )}
              title="Vue Grand Tableau"
            >
              <TableIcon size={12} /> Tableau
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCustomerViewMode('journal')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
            customerViewMode === 'journal'
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
          )}
        >
          <History size={14} className={customerViewMode === 'journal' ? "text-white" : "text-slate-400"} />
          Grand Journal
        </button>

        <button
          type="button"
          onClick={() => setCustomerViewMode('general')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
            customerViewMode === 'general'
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
          )}
        >
          <UserCheck size={14} className={customerViewMode === 'general' ? "text-white" : "text-slate-400"} />
          Règlements & Mémos
        </button>

        <button
          type="button"
          onClick={() => setCustomerViewMode('debts')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative cursor-pointer",
            customerViewMode === 'debts'
              ? "bg-rose-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
          )}
        >
          <CardIcon size={14} className={customerViewMode === 'debts' ? "text-white" : "text-rose-500"} />
          <span>Dettes</span>
          {debtorCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-mono font-bold text-[9px] rounded-full">
              {debtorCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCustomerViewMode('analytics')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
            customerViewMode === 'analytics'
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
          )}
        >
          <TrendingUp size={14} className={customerViewMode === 'analytics' ? "text-white" : "text-purple-500"} />
          Stats & CRM
        </button>
      </div>

      {/* 2. Indicateurs Financiers DZD & Outils Import/Export + Nouveau */}
      <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-financial">
        {kpiStats.totalDebt > 0 && (
          <div className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 shadow-2xs">
            <span className="text-[9px] uppercase font-sans font-semibold text-rose-500">Dettes :</span>
            <span className="tabular-nums font-black">{kpiStats.totalDebt.toFixed(0)}</span>
            <span className="text-[9px] font-sans">{settings.currency || 'DA'}</span>
          </div>
        )}

        <div className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 shadow-2xs">
          <span className="text-[9px] uppercase font-sans font-semibold text-amber-600 dark:text-amber-500">Points :</span>
          <span className="tabular-nums font-black">{kpiStats.totalPoints.toLocaleString()}</span>
        </div>

        <div className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 shadow-2xs">
          <span className="text-[9px] uppercase font-sans font-semibold text-emerald-600 dark:text-emerald-500">CA :</span>
          <span className="tabular-nums font-black">{kpiStats.totalSpentAll.toFixed(0)}</span>
          <span className="text-[9px] font-sans">{settings.currency || 'DA'}</span>
        </div>

        <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200 dark:border-zinc-800">
          <input
            type="file"
            ref={excelInputRef}
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={importCustomersFromExcel}
          />
          <button
            type="button"
            onClick={() => excelInputRef.current?.click()}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            title="Importer clients (Excel/CSV)"
          >
            <Upload size={14} />
          </button>
          <button
            type="button"
            onClick={exportCustomersToExcel}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            title="Exporter clients (Excel)"
          >
            <Download size={14} />
          </button>
          <Button
            onClick={onNewCustomer}
            size="sm"
            className="btn-touch-action px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nouveau Client</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
