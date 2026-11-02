import React from 'react';
import { Users, Award, Crown, TrendingUp, Tag, Gift } from 'lucide-react';
import { Card } from '../../ui';
import { FidelityMarketingData } from './fidelityTypes';

interface FidelityKpisCardsProps {
  marketingData: FidelityMarketingData;
  currency: string;
}

export const FidelityKpisCards: React.FC<FidelityKpisCardsProps> = ({
  marketingData,
  currency,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <Card id="card-fidelity-clients" className="p-5 border-l-4 border-l-indigo-500 bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
            <Users size={14} /> Clients Fidélisés
          </p>
          <Award size={18} className="text-indigo-400" />
        </div>
        <h4 className="text-2xl font-black text-white">
          {marketingData.enrichedCustomers.length} <span className="text-xs text-zinc-400 font-bold">Clients</span>
        </h4>
        <p className="text-[11px] text-zinc-400 mt-1">
          CA cumulé : <strong className="text-indigo-300">{marketingData.totalCustomerRevenue.toLocaleString()} {currency}</strong>
        </p>
      </Card>

      <Card id="card-fidelity-points" className="p-5 border-l-4 border-l-amber-500 bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <Crown size={14} /> Total Points Fidélité
          </p>
          <TrendingUp size={18} className="text-amber-400" />
        </div>
        <h4 className="text-2xl font-black text-amber-400">
          {marketingData.totalActivePoints.toLocaleString()} <span className="text-xs text-zinc-400 font-bold">Pts</span>
        </h4>
        <p className="text-[11px] text-zinc-400 mt-1">
          Points utilisés en caisse : <strong className="text-white">{marketingData.totalPointsDiscount.toFixed(2)} {currency}</strong>
        </p>
      </Card>

      <Card id="card-fidelity-discounts" className="p-5 border-l-4 border-l-rose-500 bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Remises Accordées</p>
          <Tag size={18} className="text-rose-400" />
        </div>
        <h4 className="text-2xl font-black text-rose-400">
          {marketingData.totalDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
        </h4>
        <p className="text-[11px] text-zinc-400 mt-1">
          Sur {marketingData.transactions.length} vente(s) avec remise
        </p>
      </Card>

      <Card id="card-fidelity-saved" className="p-5 border-l-4 border-l-emerald-500 bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
            <Gift size={14} /> Total Avantages Clients
          </p>
        </div>
        <h4 className="text-2xl font-black text-emerald-400">
          {marketingData.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
        </h4>
        <p className="text-[11px] text-zinc-400 mt-1">
          Bons d&apos;achat utilisés : <strong className="text-emerald-300">{marketingData.totalVouchers.toFixed(2)} {currency}</strong>
        </p>
      </Card>
    </div>
  );
};
