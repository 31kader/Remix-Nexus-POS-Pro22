import React from 'react';
import { TrendingDown, AlertCircle, Package, FileText } from 'lucide-react';
import { Card } from '../../ui';

interface LossReportAnalyticsProps {
  stats: {
    totalValue: number;
    totalCost: number;
    count: number;
    itemsCount: number;
  };
}

export function LossReportAnalytics({ stats }: LossReportAnalyticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-6 bg-rose-500/10 border-rose-500/20">
        <div className="flex items-center justify-between mb-2">
          <TrendingDown className="text-rose-500" size={24} />
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full">Pertes PV</span>
        </div>
        <p className="text-2xl font-black text-white">{stats.totalValue.toLocaleString()} CFA</p>
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Valeur de vente perdue</p>
      </Card>

      <Card className="p-6 bg-slate-500/10 border-slate-500/20">
        <div className="flex items-center justify-between mb-2">
          <AlertCircle className="text-slate-400" size={24} />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-500/10 px-2 py-0.5 rounded-full">Pertes Coût</span>
        </div>
        <p className="text-2xl font-black text-white">{stats.totalCost.toLocaleString()} CFA</p>
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Coût d'achat perdu</p>
      </Card>

      <Card className="p-6 bg-indigo-500/10 border-indigo-500/20">
        <div className="flex items-center justify-between mb-2">
          <Package className="text-indigo-500" size={24} />
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full">Unités</span>
        </div>
        <p className="text-2xl font-black text-white">{stats.itemsCount}</p>
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Articles retirés</p>
      </Card>

      <Card className="p-6 bg-amber-500/10 border-amber-500/20">
        <div className="flex items-center justify-between mb-2">
          <FileText className="text-amber-500" size={24} />
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full">Saisies</span>
        </div>
        <p className="text-2xl font-black text-white">{stats.count}</p>
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Nombre de rapports</p>
      </Card>
    </div>
  );
}
