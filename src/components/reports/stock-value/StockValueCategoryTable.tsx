import React from 'react';
import { Layers, Tag } from 'lucide-react';
import { Card } from '../../ui';
import { cn } from '../../../lib/utils';
import { CategoryStockRow } from './stockValueTypes';

interface StockValueCategoryTableProps {
  categoryRows: CategoryStockRow[];
  totalSaleVal: number;
  totalCostVal: number;
  totalProfitVal: number;
  totalQty: number;
  filteredProductsCount: number;
  stockFilterCategory: string;
  setStockFilterCategory: (cat: string) => void;
  onPageReset: () => void;
  currency: string;
}

export const StockValueCategoryTable: React.FC<StockValueCategoryTableProps> = ({
  categoryRows,
  totalSaleVal,
  totalCostVal,
  totalProfitVal,
  totalQty,
  filteredProductsCount,
  stockFilterCategory,
  setStockFilterCategory,
  onPageReset,
  currency,
}) => {
  return (
    <Card id="card-stock-category-table" className="p-0 overflow-hidden bg-zinc-900/90 border border-zinc-800">
      <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Layers size={18} className="text-indigo-400" />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">
            Répartition de la Valeur du Stock par Catégorie
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {stockFilterCategory !== 'all' && (
            <button
              type="button"
              onClick={() => {
                setStockFilterCategory('all');
                onPageReset();
              }}
              className="text-[10px] bg-indigo-600 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-wider cursor-pointer"
            >
              Afficher toutes les catégories
            </button>
          )}
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
            {categoryRows.length} Catégorie(s)
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-950/80 border-b border-zinc-800">
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Catégorie</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Références</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Quantité Totale</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valeur Achat</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valeur Vente</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Marge Potentielle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {categoryRows.map(catData => {
              const sharePercent = totalSaleVal > 0 ? (catData.retail / totalSaleVal) * 100 : 0;
              const isSelected = stockFilterCategory === catData.id;

              return (
                <tr
                  key={catData.id}
                  onClick={() => {
                    setStockFilterCategory(isSelected ? 'all' : catData.id);
                    onPageReset();
                  }}
                  className={cn(
                    'hover:bg-zinc-800/50 transition-colors cursor-pointer',
                    isSelected && 'bg-indigo-500/10'
                  )}
                  title="Cliquez pour filtrer les produits de cette catégorie"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <Tag size={14} className={catData.id === 'uncategorized' ? 'text-zinc-500' : 'text-indigo-400'} />
                      <div>
                        <span className="font-bold text-white text-sm">{catData.name}</span>
                        <div className="w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(2, sharePercent))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center text-xs font-bold text-zinc-300">
                    {catData.productCount} art.
                  </td>
                  <td className="p-4 text-center text-sm font-black text-white">
                    {catData.qty.toLocaleString()}
                  </td>
                  <td className="p-4 text-right text-sm font-mono text-amber-300">
                    {catData.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                  </td>
                  <td className="p-4 text-right text-sm font-black text-indigo-300">
                    {catData.retail.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                  </td>
                  <td className="p-4 text-right text-sm font-bold text-emerald-400">
                    +{catData.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-zinc-950 text-white border-t border-zinc-800">
            <tr>
              <td className="p-4 font-black uppercase tracking-widest text-xs">Total Général</td>
              <td className="p-4 text-center font-black text-xs text-zinc-400">{filteredProductsCount} art.</td>
              <td className="p-4 text-center font-black text-sm">{totalQty.toLocaleString()}</td>
              <td className="p-4 text-right font-black text-sm text-amber-300">
                {totalCostVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
              </td>
              <td className="p-4 text-right font-black text-sm text-indigo-400">
                {totalSaleVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
              </td>
              <td className="p-4 text-right font-black text-sm text-emerald-400">
                +{totalProfitVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};
