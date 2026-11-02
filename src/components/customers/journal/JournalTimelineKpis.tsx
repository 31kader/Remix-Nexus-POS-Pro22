import React from 'react';
import { ShoppingBag, RotateCcw, TrendingUp } from 'lucide-react';
import { CompanySettings } from '../../../types';
import { cn } from '../../../lib/utils';

export interface JournalTimelineKpisProps {
  stats: {
    totalOps: number;
    salesCount: number;
    salesTotal: number;
    returnsCount: number;
    refundTotal: number;
    netTotal: number;
  };
  settings: CompanySettings;
}

export function JournalTimelineKpis({
  stats,
  settings
}: JournalTimelineKpisProps) {
  const currency = settings.currency || 'DA';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Opérations</p>
          <p className="text-base font-black text-white font-mono mt-0.5">{stats.totalOps}</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-xs">
          #
        </div>
      </div>

      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Ventes ({stats.salesCount})</p>
          <p className="text-base font-black text-emerald-400 font-mono mt-0.5">
            +{stats.salesTotal.toFixed(2)} <span className="text-[10px] text-emerald-400/70">{currency}</span>
          </p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <ShoppingBag size={14} />
        </div>
      </div>

      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Retours ({stats.returnsCount})</p>
          <p className="text-base font-black text-rose-400 font-mono mt-0.5">
            -{stats.refundTotal.toFixed(2)} <span className="text-[10px] text-rose-400/70">{currency}</span>
          </p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
          <RotateCcw size={14} />
        </div>
      </div>

      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">Chiffre Net</p>
          <p className={cn(
            "text-base font-black font-mono mt-0.5",
            stats.netTotal >= 0 ? "text-indigo-400" : "text-rose-400"
          )}>
            {stats.netTotal.toFixed(2)} <span className="text-[10px] text-slate-400">{currency}</span>
          </p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <TrendingUp size={14} />
        </div>
      </div>
    </div>
  );
}
