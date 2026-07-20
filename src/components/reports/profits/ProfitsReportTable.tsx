import React from 'react';
import { ShoppingBag, ArrowUpDown, ChevronUp, ChevronDown, Package } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SafeImage } from '../../ui';
import { Category } from '../../../types';

interface ProfitsReportTableProps {
  productProfitData: any[];
  categories: Category[];
  handleProfitSort: (key: 'revenue' | 'profit' | 'margin' | 'qty') => void;
  profitSortFormat: string;
}

export function ProfitsReportTable({
  productProfitData,
  categories,
  handleProfitSort,
  profitSortFormat
}: ProfitsReportTableProps) {

  const SortIcon = ({ column }: { column: string }) => {
    const isCurrent = profitSortFormat.startsWith(column);
    const isAsc = profitSortFormat.endsWith('asc');
    
    if (!isCurrent) return <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />;
    return isAsc 
      ? <ChevronUp size={12} className="text-indigo-400" /> 
      : <ChevronDown size={12} className="text-indigo-400" />;
  };

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-white/5 border-b border-white/10">
            <th className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest">Produit</th>
            <th className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest">Catégorie</th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('qty')}
            >
              <div className="flex items-center justify-end gap-1">Qté <SortIcon column="qty" /></div>
            </th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('revenue')}
            >
              <div className="flex items-center justify-end gap-1">Chiffre Aff. <SortIcon column="revenue" /></div>
            </th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('profit')}
            >
              <div className="flex items-center justify-end gap-1">Bénéfice <SortIcon column="profit" /></div>
            </th>
            <th 
              className="p-4 font-black uppercase text-[10px] text-white/20 tracking-widest text-right cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => handleProfitSort('margin')}
            >
              <div className="flex items-center justify-end gap-1">Marge % <SortIcon column="margin" /></div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {productProfitData.map(p => {
            return (
              <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {p.imageUrl ? (
                        <SafeImage 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-full h-full object-cover" 
                          fallback={<Package size={18} className="text-slate-500/20" />}
                        />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-white/20" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-white text-sm max-w-[200px] truncate uppercase tracking-tight">{p.name}</span>
                      <span className="text-[10px] text-white/40 font-black font-mono tracking-widest">#{p.sku || p.id.slice(0,6)}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-white/5 text-white/60 rounded-md text-[10px] font-black uppercase tracking-widest border border-white/5">
                    {categories?.find(c => c.id === p.categoryId)?.name || 'N/A'}
                  </span>
                </td>
                <td className="p-4 text-right font-black text-white/80 bg-white/5 text-xs font-mono">
                  {p.stats.qty}
                </td>
                <td className="p-4 text-right font-black text-white text-xs font-mono">
                  {p.stats.revenue.toFixed(2)}
                </td>
                <td className="p-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className={cn("font-black text-xs font-mono", p.profit > 0 ? "text-emerald-400" : p.profit < 0 ? "text-rose-400" : "text-white/40")}>
                      {p.profit > 0 ? '+' : ''}{p.profit.toFixed(2)}
                    </span>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter mt-0.5">
                      (Achat: {(p.costPrice ?? 0).toFixed(2)})
                    </span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <span className={cn("inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black w-14 font-mono", 
                    p.margin > 30 ? "text-emerald-400 bg-emerald-400/10" : p.margin > 15 ? "text-amber-400 bg-amber-400/10" : p.margin > 0 ? "text-rose-400 bg-rose-400/10" : "text-white/20 bg-white/5")}>
                    {p.margin.toFixed(0)}%
                  </span>
                </td>
              </tr>
            );
          })}
          {productProfitData.length === 0 && (
            <tr>
              <td colSpan={6} className="p-12 text-center text-white/20 border-t border-white/5">
                <ShoppingBag className="w-12 h-12 text-white/5 mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">Aucun résultat</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
