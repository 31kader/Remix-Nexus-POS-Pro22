import React from 'react';
import { Grid, Search, Trash2, Minus, Plus } from 'lucide-react';
import { Product } from '../../types';
import { Button } from '../ui';
import { LabelPrinterState } from './types';

interface ProductSelectionPanelProps {
  state: LabelPrinterState;
  filteredProducts: Product[];
  selectedProducts: { productId: string, quantity: number }[];
  products: Product[];
  itemsToPrint: Product[];
  addProduct: (p: Product) => void;
  deleteProductFromList: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
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
  currency
}: ProductSelectionPanelProps) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col h-[580px]">
        <div className="mb-4">
          <h3 className="font-bold text-white text-sm uppercase mb-1 flex items-center gap-2">
            <Grid size={15} className="text-indigo-400" /> 1. Sélectionner les produits
          </h3>
          <p className="text-xs text-slate-400">Recherchez et ajoutez des produits à imprimer.</p>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Rechercher par nom, SKU..." 
            value={state.search}
            onChange={(e) => state.setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* List products */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-10">Aucun produit trouvé.</div>
          ) : (
            filteredProducts.map(p => (
              <div key={'p-item-'+p.id} className="flex justify-between items-center p-3 border border-slate-800/60 hover:border-slate-700 bg-slate-950/40 rounded-xl transition-all group">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white text-xs truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 divide-x divide-slate-800">
                    <span>{p.sku || 'Sans SKU'}</span>
                    <span className="pl-2 text-indigo-400 font-mono font-bold">{p.price.toFixed(2)} {currency}</span>
                  </div>
                </div>
                <Button 
                  onClick={() => addProduct(p)} 
                  className="ml-3 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white py-1 px-3 border-none text-xs rounded-lg font-bold"
                >
                  Ajouter
                </Button>
              </div>
            ))
          )}
        </div>
        
        {/* selected items queue */}
        <div className="mt-4 border-t border-slate-800 pt-4 flex flex-col h-[200px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-white uppercase">Sélectionnés ({selectedProducts.length})</span>
            {itemsToPrint.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-dark bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/10">Total: {itemsToPrint.length}</span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {selectedProducts.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">Aucun produit dans la file d'impression.</div>
            ) : (
              selectedProducts.map(sp => {
                const p = products.find(prod => prod.id === sp.productId);
                if (!p) return null;
                return (
                  <div key={'sel-item-'+sp.productId} className="flex justify-between items-center p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <button 
                        onClick={() => deleteProductFromList(p.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                        title="Retirer"
                      >
                        <Trash2 size={13} />
                      </button>
                      <div className="truncate font-semibold text-white text-xs max-w-[120px]">{p.name}</div>
                    </div>
                    <div className="flex items-center gap-2.5 ml-2">
                      <button onClick={() => updateQuantity(p.id, -1)} className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-slate-300"><Minus size={11}/></button>
                      <span className="font-mono text-xs font-bold text-white w-4 text-center">{sp.quantity}</span>
                      <button onClick={() => updateQuantity(p.id, 1)} className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-slate-300"><Plus size={11}/></button>
                    </div>
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
