import React from 'react';
import { Store, Smartphone, TrendingUp } from 'lucide-react';
import { CompanySettings } from '../../../types';
import { formatPrice } from '../../../lib/utils';

export interface CustomerPurchaseStatsCardProps {
  historyStats: {
    storeTotal: number;
    storeCount: number;
    onlineTotal: number;
    onlineCount: number;
    netTotal: number;
    returnsCount: number;
  };
  settings?: CompanySettings;
}

export function CustomerPurchaseStatsCard({
  historyStats,
  settings
}: CustomerPurchaseStatsCardProps) {
  const currency = settings?.currency || 'DA';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 select-none font-financial">
      {/* 1. Achats en Magasin */}
      <div className="bg-white/85 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4 shadow-2xs backdrop-blur-md flex items-center justify-between group hover:border-blue-500/30 transition-all">
        <div>
          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-sans">
            <Store size={13} />
            <span>Achats en Magasin</span>
          </p>
          <p className="text-xl font-black text-slate-900 dark:text-zinc-100 mt-1 tabular-nums">
            {formatPrice(historyStats.storeTotal)} <span className="text-xs font-bold text-slate-500 font-sans">{currency}</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium font-sans">
            {historyStats.storeCount} passage{historyStats.storeCount > 1 ? 's' : ''} en caisse physique
          </p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-105 transition-transform">
          <Store size={20} />
        </div>
      </div>

      {/* 2. Sur l'Application Mobile / Web */}
      <div className="bg-white/85 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4 shadow-2xs backdrop-blur-md flex items-center justify-between group hover:border-purple-500/30 transition-all">
        <div>
          <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 font-sans">
            <Smartphone size={13} />
            <span>Commandes en Ligne</span>
          </p>
          <p className="text-xl font-black text-slate-900 dark:text-zinc-100 mt-1 tabular-nums">
            {formatPrice(historyStats.onlineTotal)} <span className="text-xs font-bold text-slate-500 font-sans">{currency}</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium font-sans">
            {historyStats.onlineCount} commande{historyStats.onlineCount > 1 ? 's' : ''} mobile / web
          </p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0 group-hover:scale-105 transition-transform">
          <Smartphone size={20} />
        </div>
      </div>

      {/* 3. Total Net Dépensé */}
      <div className="bg-white/85 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4 shadow-2xs backdrop-blur-md flex items-center justify-between group hover:border-emerald-500/30 transition-all">
        <div>
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-sans">
            <TrendingUp size={13} />
            <span>Volume Net Cumulé</span>
          </p>
          <p className="text-xl font-black text-slate-900 dark:text-zinc-100 mt-1 tabular-nums">
            {formatPrice(historyStats.netTotal)} <span className="text-xs font-bold text-slate-500 font-sans">{currency}</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium font-sans">
            {historyStats.returnsCount > 0 ? `${historyStats.returnsCount} retour(s) déduit(s)` : 'Tous canaux confondus'}
          </p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-105 transition-transform">
          <TrendingUp size={20} />
        </div>
      </div>
    </div>
  );
}
