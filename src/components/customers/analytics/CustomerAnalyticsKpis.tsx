import React from 'react';
import { TrendingUp, ShoppingBag, UserX, Award } from 'lucide-react';

export interface GlobalCustomerKPIs {
  totalRevenue: number;
  totalCustomers: number;
  avgBasketGlobal: number;
  totalLoyaltyPoints: number;
  totalDebts: number;
}

export interface CustomerAnalyticsKpisProps {
  globalKPIs: GlobalCustomerKPIs;
  customersCount: number;
  inactiveCount: number;
  inactivityDaysThreshold: number;
  currency: string;
}

export const CustomerAnalyticsKpis: React.FC<CustomerAnalyticsKpisProps> = ({
  globalKPIs,
  customersCount,
  inactiveCount,
  inactivityDaysThreshold,
  currency
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Client Revenue */}
      <div className="p-5 bg-gradient-to-br from-indigo-500/20 via-indigo-500/5 to-slate-900 border border-indigo-500/30 rounded-xl shadow-xl">
        <div className="flex items-center justify-between text-xs font-black uppercase text-indigo-400 tracking-wider">
          <span>CA Cumulé Clients</span>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>
        <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
          {globalKPIs.totalRevenue.toFixed(0)} <span className="text-sm font-sans text-indigo-400 font-bold">{currency}</span>
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-1">Généré par {customersCount} clients enregistrés</p>
      </div>

      {/* Average Basket */}
      <div className="p-5 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-slate-900 border border-emerald-500/30 rounded-xl shadow-xl">
        <div className="flex items-center justify-between text-xs font-black uppercase text-emerald-400 tracking-wider">
          <span>Panier Moyen Client</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShoppingBag size={18} />
          </div>
        </div>
        <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
          {globalKPIs.avgBasketGlobal.toFixed(0)} <span className="text-sm font-sans text-emerald-400 font-bold">{currency}</span>
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-1">Dépense moyenne par passage en caisse</p>
      </div>

      {/* Inactive Customers Alert */}
      <div className="p-5 bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-slate-900 border border-amber-500/30 rounded-xl shadow-xl">
        <div className="flex items-center justify-between text-xs font-black uppercase text-amber-400 tracking-wider">
          <span>Clients Inactifs ({inactivityDaysThreshold}j+)</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <UserX size={18} />
          </div>
        </div>
        <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
          {inactiveCount} <span className="text-sm font-sans text-amber-400 font-bold">à relancer</span>
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-1">Opportunité de réactivation immédiate</p>
      </div>

      {/* Loyalty Points Total */}
      <div className="p-5 bg-gradient-to-br from-purple-500/20 via-purple-500/5 to-slate-900 border border-purple-500/30 rounded-xl shadow-xl">
        <div className="flex items-center justify-between text-xs font-black uppercase text-purple-400 tracking-wider">
          <span>Points Fidélité Actifs</span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Award size={18} />
          </div>
        </div>
        <p className="text-3xl font-black font-mono text-white mt-3 tracking-tight">
          {globalKPIs.totalLoyaltyPoints} <span className="text-sm font-sans text-purple-400 font-bold">pts</span>
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-1">Capital fidélité en circulation</p>
      </div>
    </div>
  );
};
