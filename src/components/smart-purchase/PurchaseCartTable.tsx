import React from 'react';
import { Trash2, Edit, Plus, Package, Link2, Sparkles } from 'lucide-react';
import { SafeImage } from '../ui';
import { Product, CompanySettings } from '../../types';
import { PurchaseCartItem } from '../usePurchaseCart';

interface PurchaseCartTableProps {
  cart: PurchaseCartItem[];
  products: Product[];
  settings: CompanySettings;
  selectedSupplierId: string;
  openQuickCreateModal: (item: PurchaseCartItem) => void;
  setLinkingItem: (item: PurchaseCartItem) => void;
  setIsLinkModalOpen: (v: boolean) => void;
  updateItemField: (id: string, field: keyof PurchaseCartItem, value: any) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeFromCart: (lineId: string) => void;
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  setEditingProduct: (v: any) => void;
  setIsProductModalOpen: (v: boolean) => void;
}

export function PurchaseCartTable({
  cart,
  products,
  settings,
  selectedSupplierId,
  openQuickCreateModal,
  setLinkingItem,
  setIsLinkModalOpen,
  updateItemField,
  updateQuantity,
  removeFromCart,
  quantityInputRefs,
  setEditingProduct,
  setIsProductModalOpen
}: PurchaseCartTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="bg-industrial-950/70 border-b border-industrial-800 text-industrial-400 font-black uppercase text-[11px] tracking-wider select-none">
            <th className="py-3 px-4 text-left">
              Article {cart.length > 0 && <span className="text-industrial-500 font-mono font-normal">({cart.length})</span>}
            </th>
            <th className="py-3 px-3 text-right w-32">P. Achat HT</th>
            <th className="py-3 px-3 text-center w-24">Qté</th>
            <th className="py-3 px-3 text-center w-24">Remise (%)</th>
            <th className="py-3 px-3 text-center w-24">TVA (%)</th>
            <th className="py-3 px-4 text-right w-36">Total HT</th>
            <th className="py-3 px-3 text-center w-20">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-industrial-800/60">
          {cart.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-20 text-center text-industrial-600 font-black uppercase tracking-widest text-xs ">
                Panier vide. Scannez un bon ou ajoutez des articles.
              </td>
            </tr>
          ) : (
            cart.map((item) => {
              const matchedProd = item.productId ? products.find(p => p.id === item.productId) : undefined;
              const lineTotal = ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)) * (1 - (Number(item.discount) || 0) / 100);

              return (
                <tr key={item.lineId} className="hover:bg-industrial-800/30 group transition-colors">
                  {/* Article Name & Thumbnail */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-industrial-950 border border-industrial-800 flex items-center justify-center overflow-hidden shrink-0 shadow">
                        {item.imageUrl ? (
                          <SafeImage 
                            src={item.imageUrl} 
                            className="w-full h-full object-cover" 
                            fallback={<Package size={18} className="text-industrial-600"/>}
                          />
                        ) : <Package size={18} className="text-industrial-600"/>}
                      </div>

                      <div className="min-w-0 flex-1">
                        {item.productId ? (
                          <div>
                            <p className="font-bold text-white uppercase text-sm tracking-tight truncate leading-tight group-hover:text-indigo-400 transition-colors">
                              {matchedProd?.name || item.productName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {matchedProd?.sku && (
                                <span className="text-[10px] font-mono text-industrial-500 uppercase">
                                  REF: {matchedProd.sku}
                                </span>
                              )}
                              {matchedProd?.barcode && (
                                <span className="text-[10px] font-mono text-industrial-500">
                                  EAN: {matchedProd.barcode}
                                </span>
                              )}
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                ✓ Associé
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-amber-400 uppercase text-sm tracking-tight truncate leading-tight">
                              {item.productName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <button
                                type="button"
                                onClick={() => openQuickCreateModal(item)}
                                className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500 hover:text-industrial-950 text-amber-400 font-black rounded text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Plus size={10} /> Créer Fiche
                              </button>
                              <button
                                type="button"
                                onClick={() => { setLinkingItem(item); setIsLinkModalOpen(true); }}
                                className="px-2 py-0.5 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500 hover:text-industrial-950 text-cyan-400 font-black rounded text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Link2 size={10} /> Associer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Prix Achat HT */}
                  <td className="py-2.5 px-3 text-right">
                    <input 
                      type="number" 
                      step="any"
                      value={item.costPrice} 
                      onChange={(e) => updateItemField(item.lineId, 'costPrice', parseFloat(e.target.value) || 0)} 
                      className="w-24 sm:w-28 py-1.5 px-2 bg-industrial-950 border border-industrial-800 hover:border-indigo-500/40 focus:border-indigo-500 rounded-xl text-white text-right outline-none font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all select-all shadow-inner" 
                    />
                  </td>

                  {/* Quantité */}
                  <td className="py-2.5 px-3 text-center">
                    <input 
                      type="number" 
                      step="any"
                      ref={(el) => { if (el) quantityInputRefs.current[item.lineId] = el; }}
                      value={item.quantity} 
                      onChange={(e) => updateQuantity(item.lineId, parseFloat(e.target.value) || 0)} 
                      className="w-18 sm:w-20 py-1.5 px-2 bg-industrial-950 border border-industrial-800 hover:border-indigo-500/40 focus:border-indigo-500 rounded-xl text-white text-center font-black font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all select-all shadow-inner" 
                    />
                  </td>

                  {/* Remise (%) */}
                  <td className="py-2.5 px-3 text-center">
                    <input 
                      type="number" 
                      step="any"
                      value={item.discount} 
                      onChange={(e) => updateItemField(item.lineId, 'discount', parseFloat(e.target.value) || 0)} 
                      className="w-16 sm:w-20 py-1.5 px-2 bg-industrial-950 border border-industrial-800 hover:border-indigo-500/40 focus:border-indigo-500 rounded-xl text-indigo-400 text-center font-bold font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all select-all shadow-inner" 
                    />
                  </td>

                  {/* TVA (%) */}
                  <td className="py-2.5 px-3 text-center">
                    <input 
                      type="number" 
                      step="any"
                      value={item.taxRate} 
                      onChange={(e) => updateItemField(item.lineId, 'taxRate', parseFloat(e.target.value) || 0)} 
                      className="w-16 sm:w-20 py-1.5 px-2 bg-industrial-950 border border-industrial-800 hover:border-indigo-500/40 focus:border-indigo-500 rounded-xl text-slate-400 text-center font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all select-all shadow-inner" 
                    />
                  </td>

                  {/* Total HT */}
                  <td className="py-2.5 px-4 text-right font-black text-white font-mono text-base tracking-tight">
                    {(Number(lineTotal) || 0).toFixed(2)}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {item.productId ? (
                        <button 
                          type="button"
                          onClick={() => {
                            if (matchedProd) {
                              setEditingProduct(matchedProd);
                              setIsProductModalOpen(true);
                            }
                          }} 
                          title="Modifier la fiche produit"
                          className="text-industrial-400 hover:text-amber-400 p-1.5 hover:bg-amber-500/10 rounded-lg transition-all cursor-pointer"
                        >
                          <Edit size={15}/>
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              id: '',
                              name: item.productName,
                              price: 0,
                              costPrice: item.costPrice,
                              sku: '',
                              taxRate: item.taxRate || 0,
                              stock: 0,
                              minStock: 5,
                              categoryId: '',
                              brandId: '',
                              supplier: selectedSupplierId || '',
                              description: '',
                              status: 'active',
                              unit: 'pcs',
                              updatedAt: new Date().toISOString()
                            });
                            setIsProductModalOpen(true);
                          }} 
                          title="Créer la fiche produit"
                          className="text-industrial-400 hover:text-indigo-400 p-1.5 hover:bg-indigo-500/10 rounded-lg transition-all cursor-pointer"
                        >
                          <Plus size={15}/>
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={() => removeFromCart(item.lineId)} 
                        title="Supprimer la ligne de produit"
                        className="text-industrial-400 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
