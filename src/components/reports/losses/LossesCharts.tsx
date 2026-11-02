import React from 'react';
import { LayoutGrid, RotateCcw, AlertTriangle, Package } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card } from '../../ui';
import { LossesStats, LOSS_COLORS } from './lossesTypes';

interface LossesChartsProps {
  stats: LossesStats;
  currency: string;
  isMounted: boolean;
}

export const LossesCharts: React.FC<LossesChartsProps> = ({
  stats,
  currency,
  isMounted,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card id="card-loss-reason-chart" className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase flex items-center gap-2">
          <LayoutGrid size={16} className="text-rose-500" /> Répartition par Motif
        </h4>
        <div className="h-[260px]">
          {isMounted && stats.byReason.length > 0 ? (
            <ResponsiveContainer width="100%" height={260} minWidth={0} debounce={50}>
              <PieChart>
                <Pie
                  data={stats.byReason}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats.byReason.map((_, index) => (
                    <Cell key={`cell-loss-reason-${index}`} fill={LOSS_COLORS[index % LOSS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${Number(value || 0).toLocaleString('fr-DZ')} ${currency}`, 'Valeur']}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 dark:text-zinc-500 gap-2">
              <AlertTriangle size={24} className="opacity-30" />
              <span>Aucune donnée de perte sur cette période.</span>
            </div>
          )}
        </div>
      </Card>

      <Card id="card-loss-category-chart" className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase flex items-center gap-2">
          <RotateCcw size={16} className="text-indigo-500" /> Répartition par Catégorie
        </h4>
        <div className="space-y-4 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
          {stats.byCategory.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-slate-400 dark:text-zinc-500 gap-2">
              <Package size={24} className="opacity-30" />
              <span>Aucune catégorie touchée sur cette période.</span>
            </div>
          ) : (
            stats.byCategory.map((cat, idx) => {
              const percent = stats.totalValue > 0 ? (cat.value / stats.totalValue) * 100 : 0;
              return (
                <div key={`cat-loss-rep-${idx}`}>
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600 dark:text-zinc-300">{cat.name}</span>
                    <span className="text-slate-900 dark:text-white font-black font-mono">
                      {cat.value.toLocaleString('fr-DZ')} {currency} ({percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
