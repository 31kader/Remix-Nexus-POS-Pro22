import React from 'react';
import { AlertTriangle, Clock, TrendingDown, History } from 'lucide-react';

interface ExpiryStatsProps {
  stats: {
    expiredCount: number;
    criticalCount: number;
    valueAtRisk: number;
    costAtRisk: number;
  };
}

export function ExpiryStats({ stats }: ExpiryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-3xl">
        <div className="flex items-center justify-between mb-2">
          <AlertTriangle className="text-rose-500" size={24} />
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full">Urgent</span>
        </div>
        <p className="text-2xl font-black text-white">{stats.expiredCount}</p>
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Produits expirés</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl">
        <div className="flex items-center justify-between mb-2">
          <Clock className="text-amber-500" size={24} />
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full">Semaine</span>
        </div>
        <p className="text-2xl font-black text-white">{stats.criticalCount}</p>
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Expire sous 7 jours</p>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-3xl">
        <div className="flex items-center justify-between mb-2">
          <TrendingDown className="text-indigo-500" size={24} />
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full">PV à risque</span>
        </div>
        <p className="text-2xl font-black text-white">{stats.valueAtRisk.toLocaleString()} CFA</p>
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Valeur (PV) à risque</p>
      </div>

      <div className="bg-slate-500/10 border border-slate-500/20 p-5 rounded-3xl">
        <div className="flex items-center justify-between mb-2">
          <History className="text-slate-400" size={24} />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-500/10 px-2 py-0.5 rounded-full">Coût</span>
        </div>
        <p className="text-2xl font-black text-white">{stats.costAtRisk.toLocaleString()} CFA</p>
        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Coût d'achat à risque</p>
      </div>
    </div>
  );
}
