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
    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-2 border border-slate-800 rounded-xl flex-shrink-0 shadow-sm">
      {/* Navigation par Grands Onglets */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setCustomerViewMode('directory')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
            customerViewMode === 'directory'
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          )}
        >
          <Users size={14} />
          Répertoire ({customersCount})
        </button>

        {customerViewMode === 'directory' && (
          <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setDirectoryLayout('split')}
              className={cn(
                "px-2 py-1 rounded-md text-[11px] font-bold uppercase flex items-center gap-1 transition-all",
                directoryLayout === 'split'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title="Vue Fiche (2 colonnes)"
            >
              <LayoutGrid size={12} /> Fiche
            </button>
            <button
              type="button"
              onClick={() => setDirectoryLayout('table')}
              className={cn(
                "px-2 py-1 rounded-md text-[11px] font-bold uppercase flex items-center gap-1 transition-all",
                directoryLayout === 'table'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title="Vue Grand Tableau"
            >
              <TableIcon size={12} /> Grand Tableau
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCustomerViewMode('journal')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
            customerViewMode === 'journal'
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          )}
        >
          <History size={14} />
          Grand Journal
        </button>

        <button
          type="button"
          onClick={() => setCustomerViewMode('general')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
            customerViewMode === 'general'
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          )}
        >
          <UserCheck size={14} />
          Règlements & Mémos
        </button>

        <button
          type="button"
          onClick={() => setCustomerViewMode('debts')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 relative",
            customerViewMode === 'debts'
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          )}
        >
          <CardIcon size={14} />
          Dettes
          {debtorCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white font-mono font-bold text-[9px] rounded-full border border-rose-400/30">
              {debtorCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCustomerViewMode('analytics')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
            customerViewMode === 'analytics'
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          )}
        >
          <TrendingUp size={14} />
          Stats & CRM
        </button>
      </div>

      {/* KPIs Inline Compacts + Actions */}
      <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
        {kpiStats.totalDebt > 0 && (
          <div className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold flex items-center gap-1">
            <span className="text-[9px] uppercase font-sans font-black text-rose-400/80">Dette:</span>
            <span>{kpiStats.totalDebt.toFixed(0)} {settings.currency || 'DA'}</span>
          </div>
        )}
        <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-bold flex items-center gap-1">
          <span className="text-[9px] uppercase font-sans font-black text-slate-400">Pts:</span>
          <span className="text-amber-400">{kpiStats.totalPoints.toLocaleString()}</span>
        </div>
        <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-bold flex items-center gap-1">
          <span className="text-[9px] uppercase font-sans font-black text-slate-400">CA:</span>
          <span className="text-emerald-400">{kpiStats.totalSpentAll.toFixed(0)} {settings.currency || 'DA'}</span>
        </div>

        <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
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
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            title="Importer clients (Excel/CSV)"
          >
            <Upload size={13} />
          </button>
          <button
            type="button"
            onClick={exportCustomersToExcel}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            title="Exporter clients (Excel)"
          >
            <Download size={13} />
          </button>
          <Button
            onClick={onNewCustomer}
            size="sm"
            className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
          >
            <Plus size={13} /> <span className="hidden sm:inline">Nouveau</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
