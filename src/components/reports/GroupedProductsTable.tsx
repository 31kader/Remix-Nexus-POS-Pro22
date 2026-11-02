import React from 'react';
import { formatPrice } from '../../lib/utils';
import { CompanySettings } from '../../types';

export interface GroupedProductsTableProps {
  pagedList: any[];
  settings: CompanySettings;
}

export const GroupedProductsTable: React.FC<GroupedProductsTableProps> = ({
  pagedList,
  settings
}) => {
  return (
    <table className="w-full text-left border-collapse min-w-[850px]">
      <thead>
        <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <th className="p-4">Désignation du Produit</th>
          <th className="p-4">Catégorie</th>
          <th className="p-4 text-center">Quantité Totale Vendue</th>
          <th className="p-4 text-right">Prix Moyen</th>
          <th className="p-4 text-right">CA Réalisé</th>
          <th className="p-4 text-right">Bénéfice Net</th>
          <th className="p-4 text-right">Marge %</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/60 text-xs">
        {pagedList.map((item: any) => (
          <tr key={item.productId} className="hover:bg-white/5 transition-colors">
            <td className="p-4">
              <p className="font-bold text-white text-sm">{item.productName}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {item.sku} • {item.transactionCount} transactions</p>
            </td>
            <td className="p-4">
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                {item.categoryName}
              </span>
            </td>
            <td className="p-4 text-center">
              <span className="inline-block px-3 py-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-xl font-black font-mono text-sm">
                {item.totalQuantity} unités
              </span>
            </td>
            <td className="p-4 text-right font-mono text-slate-300 font-bold">
              {formatPrice(item.averagePrice)} {settings.currency}
            </td>
            <td className="p-4 text-right font-mono font-black text-blue-400">
              {formatPrice(item.totalRevenue)} {settings.currency}
            </td>
            <td className="p-4 text-right font-mono font-black text-emerald-400">
              +{formatPrice(item.totalProfit)} {settings.currency}
            </td>
            <td className="p-4 text-right">
              <span className={`px-2.5 py-1 rounded-lg font-black font-mono text-xs border ${
                item.marginPercent >= 25 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : item.marginPercent >= 10 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {item.marginPercent.toFixed(1)}%
              </span>
            </td>
          </tr>
        ))}
        {pagedList.length === 0 && (
          <tr>
            <td colSpan={7} className="p-6 text-center text-slate-500 font-mono">
              AUCUN PRODUIT VENDU SUR CETTE PÉRIODE
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};
