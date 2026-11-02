import React from 'react';
import { Package, CheckCircle2, AlertOctagon, AlertTriangle, RefreshCw, Percent, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InventoryStockStatsHeaderProps {
  totalCount: number;
  inStockCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  stockLevelFilter: string;
  setStockLevelFilter?: (filter: string) => void;
  isForceSyncing: boolean;
  onForceSyncFromCloud: () => void;
  onOpenPricingStudio: () => void;
  onOpenResetStockModal: () => void;
}

export const InventoryStockStatsHeader: React.FC<InventoryStockStatsHeaderProps> = ({
  totalCount,
  inStockCount,
  outOfStockCount,
  lowStockCount,
  stockLevelFilter,
  setStockLevelFilter,
  isForceSyncing,
  onForceSyncFromCloud,
  onOpenPricingStudio,
  onOpenResetStockModal,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-xs">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setStockLevelFilter && setStockLevelFilter('all')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer shrink-0 active:scale-95",
            stockLevelFilter === 'all'
              ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
          )}
        >
          <Package size={13} />
          <span>Tous</span>
          <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-mono", stockLevelFilter === 'all' ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300")}>
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStockLevelFilter && setStockLevelFilter(stockLevelFilter === 'in' ? 'all' : 'in')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer shrink-0 active:scale-95",
            stockLevelFilter === 'in'
              ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
          )}
        >
          <CheckCircle2 size={13} />
          <span>En Stock</span>
          <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-mono", stockLevelFilter === 'in' ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300")}>
            {inStockCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStockLevelFilter && setStockLevelFilter(stockLevelFilter === 'out' ? 'all' : 'out')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer shrink-0 active:scale-95",
            stockLevelFilter === 'out'
              ? "bg-rose-600 text-white border-rose-500 shadow-xs"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25 hover:bg-rose-500/20"
          )}
        >
          <AlertOctagon size={13} />
          <span>En Rupture</span>
          <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-mono", stockLevelFilter === 'out' ? "bg-white/20 text-white" : "bg-rose-500/20 text-rose-700 dark:text-rose-300")}>
            {outOfStockCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStockLevelFilter && setStockLevelFilter(stockLevelFilter === 'low' ? 'all' : 'low')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer shrink-0 active:scale-95",
            stockLevelFilter === 'low'
              ? "bg-amber-600 text-white border-amber-500 shadow-xs"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
          )}
        >
          <AlertTriangle size={13} />
          <span>Stock Faible</span>
          <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-mono", stockLevelFilter === 'low' ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-700 dark:text-amber-300")}>
            {lowStockCount}
          </span>
        </button>
      </div>

      {/* Boutons d'actions globales */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto justify-start sm:justify-end">
        <button
          type="button"
          onClick={onForceSyncFromCloud}
          disabled={isForceSyncing}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
          title="Recharger et synchroniser tous les produits et stocks réels depuis Supabase"
        >
          <RefreshCw size={12} className={cn(isForceSyncing && "animate-spin")} />
          <span>{isForceSyncing ? "Synchro..." : "Synchro Cloud"}</span>
        </button>

        <button
          type="button"
          onClick={onOpenPricingStudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Percent size={13} />
          <span>Prix Gros & En Ligne (%)</span>
        </button>

        <button
          type="button"
          onClick={onOpenResetStockModal}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
          title="Remettre la quantité (stock) de tous les articles à 0"
        >
          <RotateCcw size={12} />
          <span>Stock = 0</span>
        </button>
      </div>
    </div>
  );
};
