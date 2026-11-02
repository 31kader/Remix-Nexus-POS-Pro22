import React from 'react';
import { cn } from '../../../lib/utils';

interface InventoryAuditKpisProps {
  globalKpis: {
    totalSessions: number;
    totalRefs: number;
    totalDisc: number;
    totalImpact: number;
  };
  currency: string;
}

export const InventoryAuditKpis: React.FC<InventoryAuditKpisProps> = ({ globalKpis, currency }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-zinc-400">Sessions d'Inventaire</span>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{globalKpis.totalSessions}</p>
      </div>
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Références Contrôlées</span>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{globalKpis.totalRefs}</p>
      </div>
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Écarts Détectés</span>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{globalKpis.totalDisc}</p>
      </div>
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Impact Financier Net</span>
        <p
          className={cn(
            'text-2xl font-black mt-1',
            globalKpis.totalImpact < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {globalKpis.totalImpact >= 0 ? '+' : ''}
          {globalKpis.totalImpact.toFixed(0)} {currency}
        </p>
      </div>
    </div>
  );
};
