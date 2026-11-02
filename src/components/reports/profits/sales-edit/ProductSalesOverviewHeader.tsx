import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { ProductSalesSummary } from './salesEditTypes';

interface ProductSalesOverviewHeaderProps {
  product: any;
  currency: string;
  summary: ProductSalesSummary;
}

export const ProductSalesOverviewHeader: React.FC<ProductSalesOverviewHeaderProps> = ({
  product,
  currency,
  summary,
}) => {
  const { totalQtySold, totalDiscount, totalRevenue, totalProfit } = summary;

  return (
    <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black">
          <ShoppingCart size={24} />
        </div>
        <div>
          <h4 className="text-base font-black text-white uppercase tracking-tight">{product.name}</h4>
          <p className="text-xs text-slate-400 font-mono">
            SKU: <span className="text-white font-bold">{product.sku || product.id}</span> • Prix actuel fiche: <span className="text-emerald-400 font-bold font-mono">{Number(product.price || 0).toFixed(2)} {currency}</span> • Achat fiche: <span className="text-amber-400 font-bold font-mono">{Number(product.costPrice || 0).toFixed(2)} {currency}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-black/40 px-4 py-2.5 rounded-xl border border-white/5 font-mono text-xs flex-wrap">
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-sans block">Qté Vendue</span>
          <span className="text-sm font-black text-white">{totalQtySold}</span>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div>
          <span className="text-[9px] text-rose-400 uppercase font-sans block">Remises Caisse</span>
          <span className="text-sm font-black text-rose-400">-{Number(totalDiscount || 0).toFixed(2)}</span>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-sans block">CA Net</span>
          <span className="text-sm font-black text-white">{Number(totalRevenue || 0).toFixed(2)}</span>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-sans block">Bénéfice Net</span>
          <span className={`text-sm font-black ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalProfit >= 0 ? '+' : ''}{Number(totalProfit || 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
