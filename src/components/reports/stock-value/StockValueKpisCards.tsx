import React from 'react';
import { Boxes, Wallet, TrendingUp, Package } from 'lucide-react';
import { Card } from '../../ui';
import { StockSummary } from './stockValueTypes';

interface StockValueKpisCardsProps {
  stockSummary: StockSummary;
  currency: string;
}

export const StockValueKpisCards: React.FC<StockValueKpisCardsProps> = ({
  stockSummary,
  currency,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <Card id="card-stock-total-sale-val" className="p-5 border-l-4 border-l-indigo-500 bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Valeur de Vente Totale</p>
          <Boxes size={18} className="text-indigo-400" />
        </div>
        <h4 className="text-2xl font-black text-white">
          {stockSummary.totalSaleVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          <span className="text-xs text-indigo-400">{currency}</span>
        </h4>
        <p className="text-[11px] text-zinc-400 mt-1">
          Chiffre d&apos;affaires potentiel TTC en rayon
        </p>
      </Card>

      <Card id="card-stock-total-cost-val" className="p-5 border-l-4 border-l-amber-500 bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Valeur d&apos;Achat (Coût)</p>
          <Wallet size={18} className="text-amber-400" />
        </div>
        <h4 className="text-2xl font-black text-amber-300">
          {stockSummary.totalCostVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          <span className="text-xs text-zinc-400">{currency}</span>
        </h4>
        <p className="text-[11px] text-zinc-400 mt-1">
          Capital financier immobilisé en stock
        </p>
      </Card>

      <Card id="card-stock-total-profit-val" className="p-5 border-l-4 border-l-emerald-500 bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Marge Brute Potentielle</p>
          <TrendingUp size={18} className="text-emerald-400" />
        </div>
        <h4 className="text-2xl font-black text-emerald-400">
          +{stockSummary.totalProfitVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          <span className="text-xs text-emerald-300">{currency}</span>
        </h4>
        <p className="text-[11px] text-zinc-400 mt-1">
          Taux de marge moyen : <strong className="text-emerald-300">{stockSummary.marginPercent.toFixed(1)}%</strong>
        </p>
      </Card>

      <Card className="p-5 border-l-4 border-l-violet-500 bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Volume Physique</p>
          <Package size={18} className="text-violet-400" />
        </div>
        <h4 className="text-2xl font-black text-white">
          {stockSummary.totalQty.toLocaleString()} <span className="text-xs text-zinc-400">Unités</span>
        </h4>
        <p className="text-[11px] text-zinc-400 mt-1">
          <span className="text-emerald-400 font-bold">{stockSummary.inStockCount} en stock</span> •{' '}
          <span className="text-rose-400 font-bold">{stockSummary.outOfStockCount} ruptures</span>
        </p>
      </Card>
    </div>
  );
};
