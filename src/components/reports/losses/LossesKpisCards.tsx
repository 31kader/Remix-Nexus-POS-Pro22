import React from 'react';
import { AlertTriangle, Package, History } from 'lucide-react';
import { Card } from '../../ui';
import { LossesStats } from './lossesTypes';

interface LossesKpisCardsProps {
  stats: LossesStats;
  currency: string;
  totalRevenue: number;
  filteredLossesCount: number;
}

export const LossesKpisCards: React.FC<LossesKpisCardsProps> = ({
  stats,
  currency,
  totalRevenue,
  filteredLossesCount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
      <Card id="card-loss-total" className="p-5 border-l-4 border-rose-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase mb-1 flex items-center gap-1.5">
          <AlertTriangle size={14} /> Valeur Totale des Pertes
        </p>
        <h4 className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
          {stats.totalValue.toLocaleString('fr-DZ')} <span className="text-sm font-sans">{currency}</span>
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
          Valorisée au prix de revient (coût d'achat)
        </p>
      </Card>

      <Card id="card-loss-margin" className="p-5 border-l-4 border-amber-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <p className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase mb-1 flex items-center gap-1.5">
          <Package size={14} /> Quantité Totale Retirée
        </p>
        <h4 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
          {stats.totalQuantity.toLocaleString('fr-DZ')} <span className="text-sm font-sans">unités</span>
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
          {totalRevenue > 0 ? `Impact CA : -${((stats.totalValue / totalRevenue) * 100).toFixed(2)}%` : 'Volume total sorti du stock'}
        </p>
      </Card>

      <Card id="card-loss-adjustments" className="p-5 border-l-4 border-indigo-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase mb-1 flex items-center gap-1.5">
          <History size={14} /> Déclarations Enregistrées
        </p>
        <h4 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
          {stats.count}
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
          Sur la période filtrée ({filteredLossesCount} lignes)
        </p>
      </Card>
    </div>
  );
};
