import React from 'react';
import { Package, ShoppingCart, TrendingUp, DollarSign, Percent, Award } from 'lucide-react';
import { Card } from '../ui';
import { formatPrice } from '../../lib/utils';
import { CompanySettings } from '../../types';

export interface GroupedSalesKpisProps {
  activeSubTab: 'grouped_products' | 'basket_profits';
  groupedTotals: {
    totalQty: number;
    totalRev: number;
    totalProf: number;
    avgMargin: number;
    uniqueProducts: number;
  };
  basketTotals: {
    totalBaskets: number;
    totalRev: number;
    totalProf: number;
    avgBasketRevenue: number;
    avgBasketProfit: number;
    avgMargin: number;
    maxProfitBasket: number;
  };
  settings: CompanySettings;
}

export const GroupedSalesKpis: React.FC<GroupedSalesKpisProps> = ({
  activeSubTab,
  groupedTotals,
  basketTotals,
  settings
}) => {
  if (activeSubTab === 'grouped_products') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Articles Cumulés</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Package size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-2 font-mono">{groupedTotals.totalQty}</p>
          <p className="text-[10px] text-slate-500 mt-1">sur {groupedTotals.uniqueProducts} références uniques</p>
        </Card>

        <Card className="p-5 bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chiffre d'Affaires</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-400 mt-2 font-mono">{formatPrice(groupedTotals.totalRev)} <span className="text-sm font-sans">{settings.currency}</span></p>
          <p className="text-[10px] text-slate-500 mt-1">Total des ventes consolidées</p>
        </Card>

        <Card className="p-5 bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bénéfice Net Produit</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2 font-mono">+{formatPrice(groupedTotals.totalProf)} <span className="text-sm font-sans">{settings.currency}</span></p>
          <p className="text-[10px] text-slate-500 mt-1">Marge brute dégagée</p>
        </Card>

        <Card className="p-5 bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Taux de Marge Moyen</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Percent size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400 mt-2 font-mono">{groupedTotals.avgMargin.toFixed(1)}%</p>
          <p className="text-[10px] text-slate-500 mt-1">Rentabilité globale des articles</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-5 bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Panier Moyen (CA)</span>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShoppingCart size={16} />
          </div>
        </div>
        <p className="text-3xl font-black text-white mt-2 font-mono">{formatPrice(basketTotals.avgBasketRevenue)} <span className="text-sm font-sans">{settings.currency}</span></p>
        <p className="text-[10px] text-slate-500 mt-1">sur {basketTotals.totalBaskets} paniers validés</p>
      </Card>

      <Card className="p-5 bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bénéfice Moyen / Panier</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp size={16} />
          </div>
        </div>
        <p className="text-3xl font-black text-emerald-400 mt-2 font-mono">+{formatPrice(basketTotals.avgBasketProfit)} <span className="text-sm font-sans">{settings.currency}</span></p>
        <p className="text-[10px] text-slate-500 mt-1">Profit net moyen par client</p>
      </Card>

      <Card className="p-5 bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Marge Moyenne Panier</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Percent size={16} />
          </div>
        </div>
        <p className="text-3xl font-black text-amber-400 mt-2 font-mono">{basketTotals.avgMargin.toFixed(1)}%</p>
        <p className="text-[10px] text-slate-500 mt-1">Taux de rentabilité par ticket</p>
      </Card>

      <Card className="p-5 bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Panier Record Profit</span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Award size={16} />
          </div>
        </div>
        <p className="text-3xl font-black text-purple-400 mt-2 font-mono">+{formatPrice(basketTotals.maxProfitBasket)} <span className="text-sm font-sans">{settings.currency}</span></p>
        <p className="text-[10px] text-slate-500 mt-1">Gain max sur une seule commande</p>
      </Card>
    </div>
  );
};
