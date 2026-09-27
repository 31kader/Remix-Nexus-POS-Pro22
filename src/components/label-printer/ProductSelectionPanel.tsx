import React from 'react';
import { Search, Trash2, Minus, Plus, Barcode, PackageCheck, X } from 'lucide-react';
import { Product } from '../../types';
import { Button } from '../ui';
import { LabelPrinterState } from './types';

interface ProductSelectionPanelProps {
  state: LabelPrinterState;
  filteredProducts: Product[];
  selectedProducts: { productId: string; quantity: number; customPrice?: number; oldPrice?: number }[];
  products: Product[];
  itemsToPrint: Product[];
  addProduct: (p: Product) => void;
  deleteProductFromList: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  setExactQuantity?: (id: string, qty: number) => void;
  updateCustomPrice?: (id: string, customPrice?: number, oldPrice?: number) => void;
  syncQuantitiesWithStock?: () => void;
  currency: string;
}

export function ProductSelectionPanel({
  state,
  filteredProducts,
  selectedProducts,
  products,
  itemsToPrint,
  addProduct,
  deleteProductFromList,
  updateQuantity,
  setExactQuantity,
  updateCustomPrice,
  syncQuantitiesWithStock,
  currency
}: ProductSelectionPanelProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      e.preventDefault();
      const q = state.search.trim().toLowerCase();
      const exactMatch = filteredProducts.find(
        p => String(p.barcode || '').toLowerCase() === q || String(p.sku || '').toLowerCase() === q
      );
      addProduct(exactMatch || filteredProducts[0]);
      state.setSearch('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col h-[620px]">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase flex items-center gap-2">
              <Search size={15} className="text-indigo-500" /> 1. Recherche Rapide & File
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              0 produit préchargé
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Tapez un nom ou scannez un code-barres (Entrée) pour ajouter à la file.
          </p>
        </div>

        {/* Instant Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
          <input
            type="text"
            placeholder="🔍 Nom, Code-barres ou SKU (min. 2 lettres)..."
            value={state.search}
            onChange={e => state.setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-indigo-500/30 focus:border-indigo-600 rounded-xl pl-10 pr-8 py-2.5 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-colors"
          />
          {state.search && (
            <button
              type="button"
              onClick={() => state.setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results Area (Only shows when user searches!) */}
        {state.search.trim().length >= 2 && (
          <div className="max-h-[190px] overflow-y-auto space-y-1.5 mb-3 p-2 rounded-xl bg-indigo-50/50 dark:bg-zinc-800/70 border border-indigo-500/20 custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div className="text-slate-500 dark:text-zinc-400 text-xs text-center py-4">
                Aucun produit trouvé pour « {state.search} ».
              </div>
            ) : (
              filteredProducts.map(p => (
                <div
                  key={'p-item-' + p.id}
                  onClick={() => {
                    addProduct(p);
                    state.setSearch('');
                  }}
                  className="flex justify-between items-center p-2.5 border border-slate-200 dark:border-zinc-700 hover:border-indigo-500 bg-white dark:bg-zinc-900 rounded-xl cursor-pointer transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-slate-900 dark:text-white text-xs truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                      <span className="font-mono">{p.barcode || p.sku || 'Sans code'}</span>
                      <span>• Stock: {p.stock || 0}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-black">
                        {Number(p.price || 0).toFixed(2)} {currency}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      addProduct(p);
                      state.setSearch('');
                    }}
                    className="ml-2 bg-indigo-600 text-white hover:bg-indigo-700 py-1 px-2.5 text-[11px] rounded-lg font-bold shrink-0"
                  >
                    + Ajouter
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Selected Items Queue */}
        <div className="flex-1 flex flex-col min-h-0 border-t border-slate-100 dark:border-zinc-800 pt-3">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                File d'Étiquettes ({selectedProducts.length} réf.)
              </span>
              {itemsToPrint.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black border border-indigo-500/20">
                  {itemsToPrint.length} étiq.
                </span>
              )}
            </div>

            {selectedProducts.length > 0 && syncQuantitiesWithStock && (
              <button
                type="button"
                onClick={syncQuantitiesWithStock}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                title="Régler le nombre d'étiquettes sur le stock réel de chaque produit"
              >
                <PackageCheck size={13} /> Qté = Stock
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {selectedProducts.length === 0 ? (
              <div className="h-full border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center p-6 text-center">
                <Barcode size={28} className="text-indigo-400 mb-2 opacity-75" />
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  File d'impression vide
                </p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                  Tapez un nom ou scannez un code-barres dans la barre ci-dessus pour ajouter uniquement les articles dont vous souhaitez imprimer l'étiquette.
                </p>
              </div>
            ) : (
              selectedProducts.map(sp => {
                const p = products.find(prod => prod.id === sp.productId);
                if (!p) return null;
                const currentPrice = sp.customPrice !== undefined ? sp.customPrice : p.price;
                return (
                  <div
                    key={'sel-item-' + sp.productId}
                    className="p-3 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl space-y-2"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => deleteProductFromList(p.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                          title="Retirer de la file"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="truncate font-black text-slate-900 dark:text-white text-xs">
                          {p.name}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(p.id, -1)}
                          className="p-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-100 text-slate-700 dark:text-zinc-200"
                        >
                          <Minus size={11} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={sp.quantity}
                          onChange={e => setExactQuantity && setExactQuantity(p.id, Number(e.target.value))}
                          className="w-12 text-center font-mono text-xs font-black bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg py-0.5 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(p.id, 1)}
                          className="p-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-100 text-slate-700 dark:text-zinc-200"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>

                    {updateCustomPrice && (
                      <div className="grid grid-cols-2 gap-2 pl-5">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">
                            Prix Étiquette ({currency})
                          </label>
                          <input
                            type="number"
                            value={currentPrice}
                            onChange={e => updateCustomPrice(p.id, Number(e.target.value), sp.oldPrice)}
                            className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-black"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">
                            Ancien Prix Barré (Promo)
                          </label>
                          <input
                            type="number"
                            placeholder="Optionnel"
                            value={sp.oldPrice || ''}
                            onChange={e =>
                              updateCustomPrice(
                                p.id,
                                currentPrice,
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                            className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
