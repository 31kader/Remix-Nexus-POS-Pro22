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
    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/95 dark:bg-zinc-900/90 p-2.5 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl flex-shrink-0 shadow-2xs select-none backdrop-blur-md">
      {/* 1. Navigation Principale : Segmented Tabs Reposants */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setCustomerViewMode('directory')}
          className={cn(
            "btn-touch-action px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer",
            customerViewMode === 'directory'
              ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/30"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
          )}
        >
          <Users size={14} className={customerViewMode === 'directory' ? "text-white" : "text-indigo-400"} />
          <span>Répertoire</span>
          <span className={cn(
            "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
            customerViewMode === 'directory' ? "bg-white/20 text-white" : "bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
          )}>
            {customersCount}
          </span>
        </button>

        {customerViewMode === 'directory' && (
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-zinc-950/80 p-0.5 rounded-xl border border-slate-200 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setDirectoryLayout('split')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                directoryLayout === 'split'
                  ? "bg-white dark:bg-zinc-850 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
              )}
              title="Vue Fiche Dossier (Scindée)"
            >
              <LayoutGrid size={12} />
              <span>Fiche</span>
            </button>
            <button
              type="button"
              onClick={() => setDirectoryLayout('table')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                directoryLayout === 'table'
                  ? "bg-white dark:bg-zinc-850 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
              )}
              title="Vue Grand Tableau"
            >
              <TableIcon size={12} />
              <span>Tableau</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCustomerViewMode('journal')}
          className={cn(
            "btn-touch-action px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
            customerViewMode === 'journal'
              ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/30"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
          )}
        >
          <History size={14} className={customerViewMode === 'journal' ? "text-white" : "text-slate-400"} />
          <span>Grand Journal</span>
        </button>

        <button
          type="button"
          onClick={() => setCustomerViewMode('general')}
          className={cn(
            "btn-touch-action px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
            customerViewMode === 'general'
              ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/30"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
          )}
        >
          <UserCheck size={14} className={customerViewMode === 'general' ? "text-white" : "text-slate-400"} />
          <span>Règlements & Mémos</span>
        </button>

        <button
          type="button"
          onClick={() => setCustomerViewMode('debts')}
          className={cn(
            "btn-touch-action px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
            customerViewMode === 'debts'
              ? "bg-rose-600 text-white shadow-xs shadow-rose-600/30"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
          )}
        >
          <CardIcon size={14} className={customerViewMode === 'debts' ? "text-white" : "text-rose-400"} />
          <span>Dettes</span>
          {debtorCount > 0 && (
            <span className={cn(
              "px-1.5 py-0.2 font-mono font-bold text-[10px] rounded-full border",
              customerViewMode === 'debts' 
                ? "bg-white/20 text-white border-white/30" 
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            )}>
              {debtorCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCustomerViewMode('analytics')}
          className={cn(
            "btn-touch-action px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
            customerViewMode === 'analytics'
              ? "bg-purple-600 text-white shadow-xs shadow-purple-600/30"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
          )}
        >
          <TrendingUp size={14} className={customerViewMode === 'analytics' ? "text-white" : "text-purple-400"} />
          <span>Stats & CRM</span>
        </button>
      </div>

      {/* 2. Indicateurs Financiers DZD & Outils Import/Export + Nouveau */}
      <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-financial">
        {kpiStats.totalDebt > 0 && (
          <div 
            onClick={() => setCustomerViewMode('debts')}
            className="btn-touch-action px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer hover:bg-rose-500/20 transition-all"
            title="Cliquer pour afficher le grand livre des dettes"
          >
            <span className="text-[9px] uppercase font-sans font-semibold text-rose-500">Dettes :</span>
            <span className="tabular-nums font-black text-xs">{kpiStats.totalDebt.toFixed(0)}</span>
            <span className="text-[9px] font-sans opacity-80">{settings.currency || 'DA'}</span>
          </div>
        )}

        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5 shadow-2xs">
          <span className="text-[9px] uppercase font-sans font-semibold text-amber-500">Points :</span>
          <span className="tabular-nums font-black text-xs">{kpiStats.totalPoints.toLocaleString()}</span>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 shadow-2xs">
          <span className="text-[9px] uppercase font-sans font-semibold text-emerald-500">CA :</span>
          <span className="tabular-nums font-black text-xs">{kpiStats.totalSpentAll.toFixed(0)}</span>
          <span className="text-[9px] font-sans opacity-80">{settings.currency || 'DA'}</span>
        </div>

        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-white/[0.08]">
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
            className="btn-touch-action p-2 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
            title="Importer clients (Excel/CSV)"
          >
            <Upload size={14} />
          </button>
          <button
            type="button"
            onClick={exportCustomersToExcel}
            className="btn-touch-action p-2 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
            title="Exporter clients (Excel)"
          >
            <Download size={14} />
          </button>
          <Button
            onClick={onNewCustomer}
            size="sm"
            className="btn-touch-action px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs shadow-indigo-600/30 transition-all flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nouveau Client</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
