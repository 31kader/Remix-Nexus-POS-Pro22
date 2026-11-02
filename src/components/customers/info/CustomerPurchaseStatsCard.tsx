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
  settings: CompanySettings;
}

export function CustomerPurchaseStatsCard({
  historyStats,
  settings
}: CustomerPurchaseStatsCardProps) {
  const currency = settings.currency || 'DA';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Achats en Magasin */}
      <div className="bg-slate-900/95 border border-blue-500/20 rounded-xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
            <Store size={13} /> Achats en Magasin
          </p>
          <p className="text-lg font-black text-white mt-1">
            {formatPrice(historyStats.storeTotal)} <span className="text-xs font-bold text-slate-400">{currency}</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
            {historyStats.storeCount} vente{historyStats.storeCount > 1 ? 's' : ''} en caisse physique
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
          <Store size={20} />
        </div>
      </div>

      {/* Sur l'Application */}
      <div className="bg-slate-900/95 border border-violet-500/20 rounded-xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-violet-400 tracking-wider flex items-center gap-1.5">
            <Smartphone size={13} /> Sur l'Application
          </p>
          <p className="text-lg font-black text-white mt-1">
            {formatPrice(historyStats.onlineTotal)} <span className="text-xs font-bold text-slate-400">{currency}</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
            {historyStats.onlineCount} commande{historyStats.onlineCount > 1 ? 's' : ''} mobile / web
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
          <Smartphone size={20} />
        </div>
      </div>

      {/* Total Net Dépensé */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
            <TrendingUp size={13} /> Total Net Dépensé
          </p>
          <p className="text-lg font-black text-white mt-1">
            {formatPrice(historyStats.netTotal)} <span className="text-xs font-bold text-slate-400">{currency}</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
            {historyStats.returnsCount > 0 ? `${historyStats.returnsCount} retour(s) déduit(s)` : 'Tous canaux confondus'}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
          <TrendingUp size={20} />
        </div>
      </div>
    </div>
  );
}
