import React from 'react';
import { Product } from '../../../types';

interface AccountingMarginSimulationPreviewProps {
  targetedProducts: Product[];
  computeNewPrices: (p: Product) => { cost: number; currentRetail: number; nextRetail: number; nextWholesale: number; nextOnline: number };
  applyToRetail: boolean;
  applyToWholesale: boolean;
  applyToOnline: boolean;
}

export const AccountingMarginSimulationPreview: React.FC<AccountingMarginSimulationPreviewProps> = ({
  targetedProducts,
  computeNewPrices,
  applyToRetail,
  applyToWholesale,
  applyToOnline
}) => {
  if (!targetedProducts || targetedProducts.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-[10px] font-black uppercase text-slate-500 flex items-center justify-between">
        <span>Aperçu avant exécution (4 premiers articles sur {targetedProducts.length})</span>
        <span className="text-indigo-500">Simulation en direct</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
        {targetedProducts.slice(0, 4).map(p => {
          const sim = computeNewPrices(p);
          return (
            <div key={p.id} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[220px]">
                {p.name}
                <span className="ml-2 text-[10px] text-slate-400 font-mono">
                  (Achat: {sim.cost} DA | Actuel: {sim.currentRetail} DA)
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                {applyToRetail && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                    Détail: {sim.nextRetail} DA
                  </span>
                )}
                {applyToWholesale && (
                  <span className="text-amber-600 dark:text-amber-400 font-black">
                    Gros: {sim.nextWholesale} DA
                  </span>
                )}
                {applyToOnline && (
                  <span className="text-blue-600 dark:text-blue-400 font-black">
                    En Ligne: {sim.nextOnline} DA
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
