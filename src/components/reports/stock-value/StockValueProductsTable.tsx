import React from 'react';
import { ArrowUpDown, Package, Search, Edit } from 'lucide-react';
import { Card, SafeImage } from '../../ui';
import { cn } from '../../../lib/utils';
import { Product } from '../../../types';
import { EnrichedStockProduct } from './stockValueTypes';

interface StockValueProductsTableProps {
  products: EnrichedStockProduct[];
  totalProductsCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number | ((p: number) => number)) => void;
  currency: string;
  itemsPerPage: number;
  onEditProduct?: (product: Product) => void;
}

export const StockValueProductsTable: React.FC<StockValueProductsTableProps> = ({
  products,
  totalProductsCount,
  currentPage,
  totalPages,
  onPageChange,
  currency,
  itemsPerPage,
  onEditProduct,
}) => {
  return (
    <Card className="p-0 overflow-hidden bg-zinc-900/90 border border-zinc-800">
      <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <ArrowUpDown size={18} className="text-emerald-400" />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">
            Détail des Produits Valorisés ({totalProductsCount.toLocaleString()} articles)
          </h4>
        </div>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          Page {currentPage} sur {totalPages} (50 par page)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-950/80 border-b border-zinc-800">
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Produit & Code-Barres</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Catégorie</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Stock Actuel</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">P.U Achat / Vente</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valeur Stock Achat</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valeur Stock Vente</th>
              <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Marge Totale</th>
              {onEditProduct && (
                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {products.map(item => {
              const { product, catName, rawStock, cost, price, lineCostVal, lineSaleVal, lineProfitVal } = item;
              const minStock = Number(product.minStock || 5);
              const stockBadgeColor =
                rawStock <= 0
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : rawStock <= minStock
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

              return (
                <tr key={product.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {product.imageUrl ? (
                          <SafeImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={18} className="text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs sm:text-sm line-clamp-1">{product.name}</p>
                        <p className="text-[10px] font-mono text-zinc-400">
                          {product.barcode || product.sku || 'Sans code'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                      {catName}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-black border', stockBadgeColor)}>
                      {rawStock} {product.unit || 'u'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right text-xs">
                    <div className="text-zinc-400">Achat: <span className="text-amber-300 font-mono">{cost.toFixed(2)}</span></div>
                    <div className="text-zinc-300 font-bold">Vente: <span className="text-white font-mono">{price.toFixed(2)}</span></div>
                  </td>
                  <td className="p-3.5 text-right font-mono text-xs sm:text-sm text-amber-300 font-bold">
                    {lineCostVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                  </td>
                  <td className="p-3.5 text-right font-mono text-xs sm:text-sm text-indigo-300 font-black">
                    {lineSaleVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                  </td>
                  <td className="p-3.5 text-right font-mono text-xs sm:text-sm text-emerald-400 font-bold">
                    +{lineProfitVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                  </td>
                  {onEditProduct && (
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onEditProduct(product)}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title="Modifier le stock ou le prix de ce produit"
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}

            {products.length === 0 && (
              <tr>
                <td colSpan={onEditProduct ? 8 : 7} className="p-8 text-center text-zinc-400">
                  <Search className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="font-semibold">Aucun produit ne correspond à vos filtres.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination 50 produits par page */}
      {totalProductsCount > itemsPerPage && (
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-3 text-xs">
          <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
            Affichage {(currentPage - 1) * itemsPerPage + 1} à{' '}
            {Math.min(currentPage * itemsPerPage, totalProductsCount)} sur{' '}
            {totalProductsCount.toLocaleString()} produits
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
            >
              Précédent
            </button>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-black border border-indigo-500/30">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};
