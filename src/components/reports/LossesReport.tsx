import React, { useMemo, useState, useEffect } from 'react';
import { Trash2, AlertTriangle, LayoutGrid, RotateCcw, History, Clock } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { motion } from 'motion/react';
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
  const lossData = useMemo(() => {
    const losses = stockAdjustments.filter(adj => adj.adjustment < 0 && adj.isLoss === true);
    
    let totalLossValue = 0;
    const lossByCategory: Record<string, number> = {};
    const lossByReason: Record<string, number> = {};
    
    const formattedLosses = losses.map(adj => {
      const product = products.find(p => p.id === adj.productId);
      const costPrice = product?.costPrice || 0;
      const lossValue = Math.abs(adj.adjustment) * costPrice;
      
      totalLossValue += lossValue;
      
      const category = categories.find(c => c.id === product?.categoryId)?.name || 'Non classé';
      lossByCategory[category] = (lossByCategory[category] || 0) + lossValue;
      
      const reason = adj.reason || 'Autre';
      lossByReason[reason] = (lossByReason[reason] || 0) + lossValue;
      
      return {
        ...adj,
        product,
        lossValue
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      totalLossValue,
      lossByCategory: Object.entries(lossByCategory).map(([name, value]) => ({ name, value })),
      lossByReason: Object.entries(lossByReason).map(([name, value]) => ({ name, value })),
      formattedLosses
    };
  }, [stockAdjustments, products, categories]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card id="card-loss-total" className="p-8 border-l-4 border-rose-500 bg-rose-500/5 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Trash2 size={120} />
          </div>
          <p className="text-[10px] font-black text-rose-500/60 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
            <AlertTriangle size={14} /> Valeur Totale des Pertes
          </p>
          <h4 className="text-4xl font-black text-rose-500 tracking-tighter">
            {lossData.totalLossValue.toLocaleString()} <span className="text-lg opacity-40">{settings.currency}</span>
          </h4>
          <p className="text-[10px] text-white/30 mt-4 uppercase font-black tracking-widest">Basé sur le prix d'achat initial</p>
        </Card>

        <Card id="card-loss-margin" className="p-8 border-l-4 border-amber-500 bg-white/5 relative overflow-hidden">
           <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.2em] mb-2">Impact sur la marge</p>
           <h4 className="text-3xl font-black text-white">-{((lossData.totalLossValue / (totalRevenue || 1)) * 100).toFixed(2)}%</h4>
           <p className="text-[10px] text-white/30 mt-4 uppercase font-black tracking-widest">du chiffre d'affaires total</p>
        </Card>

        <Card id="card-loss-adjustments" className="p-8 border-l-4 border-indigo-500 bg-white/5 relative overflow-hidden">
           <p className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.2em] mb-2">Nombre d'ajustements</p>
           <h4 className="text-3xl font-black text-white">{lossData.formattedLosses.length}</h4>
           <p className="text-[10px] text-white/30 mt-4 uppercase font-black tracking-widest">Opérations de retrait de stock</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card id="card-loss-reason-chart" className="p-8 bg-white/5 border-white/10">
          <h4 className="text-sm font-black text-white/60 mb-8 uppercase tracking-widest flex items-center gap-3">
            <LayoutGrid size={18} className="text-rose-500" /> Répartition par Raison
          </h4>
          <div className="h-[300px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <PieChart>
                  <Pie
                    data={lossData.lossByReason}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {lossData.lossByReason.map((entry, index) => (
                      <Cell key={`cell-loss-reason-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`${Number(value || 0).toLocaleString()} ${settings.currency}`, 'Valeur']}
                  />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{value}</span>}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card id="card-loss-category-chart" className="p-8 bg-white/5 border-white/10">
          <h4 className="text-sm font-black text-white/60 mb-8 uppercase tracking-widest flex items-center gap-3">
            <RotateCcw size={18} className="text-indigo-500" /> Répartition par Catégorie
          </h4>
          <div className="space-y-6 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
            {lossData.lossByCategory.sort((a,b) => b.value - a.value).map((cat, idx) => {
              const percent = (cat.value / lossData.totalLossValue) * 100;
              return (
                <div key={`cat-loss-rep-${idx}`}>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest mb-2">
                    <span className="text-white/40">{cat.name}</span>
                    <span className="text-white">{cat.value.toLocaleString()} {settings.currency} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      className="h-full bg-rose-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card id="card-loss-history" className="overflow-hidden border-white/10 bg-white/5">
        <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <History size={16} className="text-rose-500" /> Historique des Pertes
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                <th className="p-4">Date</th>
                <th className="p-4">Produit</th>
                <th className="p-4 text-center">Quantité</th>
                <th className="p-4 text-right">Valeur Perte</th>
                <th className="p-4">Raison</th>
                <th className="p-4">Par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lossData.formattedLosses.map((adj, idx) => (
                <tr key={`loss-item-${idx}`} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-white/60 text-xs">
                      <Clock size={12} />
                      {formatSafe(adj.timestamp, 'dd/MM/yyyy HH:mm')}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-black text-white uppercase text-xs tracking-tight">{adj.productName}</p>
                    <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">#{adj.productId.slice(0,8)}</p>
                  </td>
                  <td className="p-4 text-center font-black text-rose-400">
                    {adj.adjustment} {adj.product?.unit}
                  </td>
                  <td className="p-4 text-right font-black text-white font-mono">
                    {adj.lossValue.toLocaleString()} {settings.currency}
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                      {adj.reason}
                    </span>
                  </td>
                  <td className="p-4 text-white/40 text-[10px] font-black uppercase tracking-widest italic text-right">
                    {adj.userName || 'Inconnu'}
                  </td>
                </tr>
              ))}
              {lossData.formattedLosses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-white/20">
                    <Trash2 size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black uppercase tracking-widest">Aucune perte enregistrée</p>
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
