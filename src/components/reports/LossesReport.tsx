import React, { useMemo, useState, useEffect } from 'react';
import { Trash2, AlertTriangle, LayoutGrid, RotateCcw, History, Clock } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatSafe } from '../../lib/utils';
import { Card } from '../ui';
import { StockAdjustment, Product, Category, CompanySettings } from '../../types';

interface LossesReportProps {
  stockAdjustments: StockAdjustment[];
  products: Product[];
  categories: Category[];
  settings: CompanySettings;
  totalRevenue: number;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const LossesReport = React.memo(function LossesReport({
  stockAdjustments,
  products,
  categories,
  settings,
  totalRevenue,
}: LossesReportProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currency = settings.currency || 'DA';

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    (products || []).forEach(p => { if (p?.id) map.set(p.id, p); });
    return map;
  }, [products]);

  const categoriesById = useMemo(() => {
    const map = new Map<string, string>();
    (categories || []).forEach(c => { if (c?.id) map.set(c.id, c.name); });
    return map;
  }, [categories]);

  const lossData = useMemo(() => {
    const losses = (stockAdjustments || []).filter(
      adj =>
        adj.adjustment < 0 &&
        (adj.isLoss === true ||
          (adj.reason && /perte|périmé|perime|casse|dlc|jeter|expire|détruit|avarie/i.test(adj.reason)))
    );

    let totalLossValue = 0;
    const lossByCategory: Record<string, number> = {};
    const lossByReason: Record<string, number> = {};

    const formattedLosses = losses
      .map(adj => {
        const product = productsById.get(adj.productId);
        const costPrice = Number(product?.costPrice ?? 0);
        const lossValue = Math.abs(Number(adj.adjustment || 0)) * costPrice;

        totalLossValue += lossValue;

        const category = (product?.categoryId ? categoriesById.get(product.categoryId) : null) || 'Non classé';
        lossByCategory[category] = (lossByCategory[category] || 0) + lossValue;

        const reason = adj.reason || 'Autre perte';
        lossByReason[reason] = (lossByReason[reason] || 0) + lossValue;

        return {
          ...adj,
          product,
          lossValue
        };
      })
      .sort((a, b) => (new Date(b.timestamp).getTime() || 0) - (new Date(a.timestamp).getTime() || 0));

    return {
      totalLossValue,
      lossByCategory: Object.entries(lossByCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      lossByReason: Object.entries(lossByReason).map(([name, value]) => ({ name, value })),
      formattedLosses
    };
  }, [stockAdjustments, productsById, categoriesById]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.max(1, Math.ceil(lossData.formattedLosses.length / ITEMS_PER_PAGE));
  const paginatedLosses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return lossData.formattedLosses.slice(start, start + ITEMS_PER_PAGE);
  }, [lossData.formattedLosses, currentPage]);

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card id="card-loss-total" className="p-5 border-l-4 border-rose-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
          <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase mb-1 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Valeur Totale des Pertes
          </p>
          <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {lossData.totalLossValue.toLocaleString('fr-DZ')} <span className="text-sm">{currency}</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Valorisée au coût d'achat (PAMP)</p>
        </Card>

        <Card id="card-loss-margin" className="p-5 border-l-4 border-amber-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
          <p className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase mb-1">Impact sur le CA</p>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white">
            {totalRevenue > 0 ? `-${((lossData.totalLossValue / totalRevenue) * 100).toFixed(2)}%` : '0.00%'}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Part du chiffre d'affaires total</p>
        </Card>

        <Card id="card-loss-adjustments" className="p-5 border-l-4 border-indigo-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase mb-1">Déclarations de Perte</p>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white">{lossData.formattedLosses.length}</h4>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Retraits pour casse, avarie ou péremption</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card id="card-loss-reason-chart" className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
          <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase flex items-center gap-2">
            <LayoutGrid size={16} className="text-rose-500" /> Répartition par Motif
          </h4>
          <div className="h-[260px]">
            {isMounted && lossData.lossByReason.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} minWidth={0} debounce={50}>
                <PieChart>
                  <Pie
                    data={lossData.lossByReason}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {lossData.lossByReason.map((_, index) => (
                      <Cell key={`cell-loss-reason-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${Number(value || 0).toLocaleString('fr-DZ')} ${currency}`, 'Valeur']}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Aucune donnée de perte à afficher.</div>
            )}
          </div>
        </Card>

        <Card id="card-loss-category-chart" className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
          <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase flex items-center gap-2">
            <RotateCcw size={16} className="text-indigo-500" /> Répartition par Catégorie
          </h4>
          <div className="space-y-4 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
            {lossData.lossByCategory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Aucune catégorie touchée.</div>
            ) : lossData.lossByCategory.map((cat, idx) => {
              const percent = lossData.totalLossValue > 0 ? (cat.value / lossData.totalLossValue) * 100 : 0;
              return (
                <div key={`cat-loss-rep-${idx}`}>
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600 dark:text-zinc-300">{cat.name}</span>
                    <span className="text-slate-900 dark:text-white font-black">
                      {cat.value.toLocaleString('fr-DZ')} {currency} ({percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card id="card-loss-history" className="overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
        <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
            <History size={16} className="text-rose-500" /> Historique des Pertes ({lossData.formattedLosses.length})
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/80 text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Produit</th>
                <th className="p-3.5 text-center">Quantité</th>
                <th className="p-3.5 text-right">Valeur Perte</th>
                <th className="p-3.5">Motif</th>
                <th className="p-3.5 text-right">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {paginatedLosses.map((adj, idx) => (
                <tr key={`loss-item-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {formatSafe(adj.timestamp, 'dd/MM/yyyy HH:mm')}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{adj.productName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">#{String(adj.productId || '').slice(0, 8)}</p>
                  </td>
                  <td className="p-3.5 text-center font-black text-rose-600 dark:text-rose-400 text-xs">
                    {adj.adjustment} {adj.product?.unit || 'u'}
                  </td>
                  <td className="p-3.5 text-right font-black text-slate-900 dark:text-white font-mono text-xs">
                    {adj.lossValue.toLocaleString('fr-DZ')} {currency}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-black uppercase border border-rose-500/20">
                      {adj.reason}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500 dark:text-zinc-400 text-xs font-semibold text-right">
                    {(adj as any).userName || 'Système'}
                  </td>
                </tr>
              ))}
              {lossData.formattedLosses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 dark:text-zinc-500 text-xs">
                    Aucune perte ou casse enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
});
