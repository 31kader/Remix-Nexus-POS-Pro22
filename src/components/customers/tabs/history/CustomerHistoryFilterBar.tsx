import React from 'react';
import { Store, Smartphone, RotateCcw, Search, X } from 'lucide-react';
import { cn, formatPrice } from '../../../../lib/utils';

export interface CustomerHistoryFilterBarProps {
  historyFilter: 'all' | 'in_store' | 'online' | 'returns';
  setHistoryFilter: (filter: 'all' | 'in_store' | 'online' | 'returns') => void;
  totalTimelineCount: number;
  historyStats: {
    storeCount: number;
    storeTotal: number;
    onlineCount: number;
    onlineTotal: number;
    returnsCount: number;
    refundTotal: number;
    netTotal: number;
  };
  currency: string;
  historySearch: string;
  setHistorySearch: (search: string) => void;
  onFilterChange: () => void;
}

export const CustomerHistoryFilterBar: React.FC<CustomerHistoryFilterBarProps> = ({
  historyFilter,
  setHistoryFilter,
  totalTimelineCount,
  historyStats,
  currency,
  historySearch,
  setHistorySearch,
  onFilterChange
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1 text-[11px] font-black uppercase tracking-wider">
        <button
          type="button"
          onClick={() => { setHistoryFilter('all'); onFilterChange(); }}
          className={cn(
            "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px]",
            historyFilter === 'all'
              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
          )}
        >
          Toutes ({totalTimelineCount})
        </button>
        <button
          type="button"
          onClick={() => { setHistoryFilter('in_store'); onFilterChange(); }}
          className={cn(
            "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px] flex items-center gap-1",
            historyFilter === 'in_store'
              ? "bg-blue-600 text-white border-blue-500 shadow-sm"
              : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
          )}
        >
          <Store size={12} />
          En Magasin ({historyStats.storeCount}) <span className="font-mono text-[10px] opacity-85">+{formatPrice(historyStats.storeTotal)}</span>
        </button>
        <button
          type="button"
          onClick={() => { setHistoryFilter('online'); onFilterChange(); }}
          className={cn(
            "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px] flex items-center gap-1",
            historyFilter === 'online'
              ? "bg-violet-600 text-white border-violet-500 shadow-sm"
              : "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
          )}
        >
          <Smartphone size={12} />
          Sur l'Application ({historyStats.onlineCount}) <span className="font-mono text-[10px] opacity-85">+{formatPrice(historyStats.onlineTotal)}</span>
        </button>
        <button
          type="button"
          onClick={() => { setHistoryFilter('returns'); onFilterChange(); }}
          className={cn(
            "px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap text-[11px] flex items-center gap-1",
            historyFilter === 'returns'
              ? "bg-rose-600 text-white border-rose-500 shadow-sm"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
          )}
        >
          <RotateCcw size={12} />
          Retours ({historyStats.returnsCount}) <span className="font-mono text-[10px] opacity-85">-{formatPrice(historyStats.refundTotal)}</span>
        </button>

        {/* Net Badge */}
        <div className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] flex items-center gap-1">
          <span className="text-[9px] uppercase text-slate-500 font-bold">Net:</span>
          <span className="font-black text-white">{formatPrice(historyStats.netTotal)} {currency}</span>
        </div>
      </div>

      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
        <input
          type="text"
          placeholder="Rechercher ticket #, article..."
          value={historySearch}
          onChange={(e) => { setHistorySearch(e.target.value); onFilterChange(); }}
          className="w-full pl-8 pr-6 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
        />
        {historySearch && (
          <button
            type="button"
            onClick={() => { setHistorySearch(''); onFilterChange(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
