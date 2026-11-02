import React from 'react';
import { Trash2, Plus, Package, Link2, Minus, Camera } from 'lucide-react';
import { SafeImage } from '../ui';
import { Product } from '../../types';
import { PurchaseCartItem } from '../../hooks/usePurchaseCart';
import { computeMarginStats } from './operations/marginAlertDetector';

interface PurchaseCartMobileCardsProps {
  cart: PurchaseCartItem[];
  products: Product[];
  openQuickCreateModal: (item: PurchaseCartItem) => void;
  setLinkingItem: (item: PurchaseCartItem) => void;
  setIsLinkModalOpen: (v: boolean) => void;
  updateItemField: (id: string, field: keyof PurchaseCartItem, value: any) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeFromCart: (lineId: string) => void;
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onInspectCartonPhoto: (url: string) => void;
}

export const PurchaseCartMobileCards: React.FC<PurchaseCartMobileCardsProps> = ({
  cart,
  products,
  openQuickCreateModal,
  setLinkingItem,
  setIsLinkModalOpen,
  updateItemField,
  updateQuantity,
  removeFromCart,
  quantityInputRefs,
  onInspectCartonPhoto
}) => {
  if (cart.length === 0) {
    return (
      <div className="py-16 text-center text-industrial-600 font-black uppercase tracking-widest text-xs">
        Panier vide. Scannez un bon ou ajoutez des articles.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cart.map((item) => {
        const matchedProd = item.productId ? products.find(p => p.id === item.productId) : undefined;
        const marginStats = matchedProd ? computeMarginStats(item.costPrice, matchedProd.price) : null;
        const lineTotal = ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)) * (1 - (Number(item.discount) || 0) / 100);

        return (
          <div
            key={item.lineId}
            className="p-4 rounded-2xl border border-industrial-800 bg-industrial-950/80 shadow-sm space-y-3"
          >
            {/* Header: Image & Nom Article */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-industrial-900 border border-industrial-800 flex items-center justify-center overflow-hidden shrink-0 shadow">
                {item.imageUrl ? (
                  <SafeImage 
                    src={item.imageUrl} 
                    className="w-full h-full object-cover" 
                    fallback={<Package size={20} className="text-industrial-600"/>}
                  />
                ) : <Package size={20} className="text-industrial-600"/>}
              </div>

              <div className="min-w-0 flex-1">
                {item.productId ? (
                  <div>
                    <p className="font-bold text-white uppercase text-sm tracking-tight truncate leading-tight">
                      {matchedProd?.name || item.productName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {matchedProd?.sku && (
                        <span className="text-[10px] font-mono text-industrial-400 uppercase">
                          REF: {matchedProd.sku}
                        </span>
                      )}
                      {matchedProd?.barcode && (
                        <span className="text-[10px] font-mono text-industrial-400">
                          EAN: {matchedProd.barcode}
                        </span>
                      )}
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                        ✓ Associé
                      </span>
                      {item.cartonPhotoUrl && (
                        <button 
                          type="button" 
                          onClick={() => onInspectCartonPhoto(item.cartonPhotoUrl!)}
                          className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold flex items-center gap-1 hover:bg-amber-500/30 cursor-pointer"
                        >
                          <Camera size={10} /> Photo Carton
                        </button>
                      )}
                      {item.cartonCount && item.unitsPerCarton && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase">
                          📦 {item.cartonCount} cartons × {item.unitsPerCarton} pcs
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-amber-400 uppercase text-sm tracking-tight truncate leading-tight">
                      {item.productName}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openQuickCreateModal(item)}
                        className="min-h-[38px] px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500 hover:text-industrial-950 text-amber-400 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} /> Créer Fiche
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLinkingItem(item); setIsLinkModalOpen(true); }}
                        className="min-h-[38px] px-3 py-1.5 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500 hover:text-industrial-950 text-cyan-400 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Link2 size={14} /> Associer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Champs Financiers: Prix Achat HT, Remise, TVA */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-industrial-900/90 border border-industrial-800/80 text-xs font-mono">
              <div>
                <span className="text-[10px] text-industrial-400 uppercase font-bold block">P. Achat HT</span>
                {item.cartonCostPrice ? (
                  <span className="text-[9px] text-amber-400 font-mono block mb-1">
                    {Number(item.cartonCostPrice).toLocaleString('fr-DZ')} DA / ct
                  </span>
                ) : null}
                <input 
                  type="number" 
                  step="any"
                  value={item.costPrice} 
                  onChange={(e) => updateItemField(item.lineId, 'costPrice', parseFloat(e.target.value) || 0)} 
                  className="w-full py-1.5 px-2 bg-industrial-950 border border-industrial-700 focus:border-indigo-500 rounded-lg text-white font-bold text-xs mt-1 outline-none" 
                />
                {marginStats && (
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold border ${marginStats.badgeColor}`}>
                    {marginStats.badgeLabel}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-industrial-400 uppercase font-bold block">Remise %</span>
                <input 
                  type="number" 
                  step="any"
                  value={item.discount || 0} 
                  onChange={(e) => updateItemField(item.lineId, 'discount', parseFloat(e.target.value) || 0)} 
                  className="w-full py-1.5 px-2 bg-industrial-950 border border-industrial-700 focus:border-indigo-500 rounded-lg text-white font-bold text-xs mt-1 outline-none text-center" 
                />
              </div>

              <div>
                <span className="text-[10px] text-industrial-400 uppercase font-bold block">TVA %</span>
                <input 
                  type="number" 
                  step="any"
                  value={item.taxRate || 0} 
                  onChange={(e) => updateItemField(item.lineId, 'taxRate', parseFloat(e.target.value) || 0)} 
                  className="w-full py-1.5 px-2 bg-industrial-950 border border-industrial-700 focus:border-indigo-500 rounded-lg text-white font-bold text-xs mt-1 outline-none text-center" 
                />
              </div>
            </div>

            {/* Stepper Quantité (>= 38x38px) + Total HT + Poubelle */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-industrial-800/80">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.lineId, Math.max(1, (item.quantity || 1) - 1))}
                  className="w-10 h-10 rounded-xl bg-industrial-900 hover:bg-industrial-800 border border-industrial-700 text-industrial-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer"
                  aria-label="Diminuer la quantité"
                >
                  <Minus size={16} />
                </button>

                <input
                  ref={el => { quantityInputRefs.current[item.lineId] = el; }}
                  type="number"
                  step="any"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.lineId, parseFloat(e.target.value) || 1)}
                  className="w-14 h-10 text-center font-mono font-black text-sm bg-industrial-950 border border-industrial-700 rounded-xl text-white outline-none focus:border-indigo-500 shadow-inner"
                />

                <button
                  type="button"
                  onClick={() => updateQuantity(item.lineId, (item.quantity || 1) + 1)}
                  className="w-10 h-10 rounded-xl bg-industrial-900 hover:bg-industrial-800 border border-industrial-700 text-industrial-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer"
                  aria-label="Augmenter la quantité"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right font-mono">
                  <span className="text-[9px] uppercase text-industrial-400 block">Total HT</span>
                  <span className="font-bold text-indigo-300 text-sm">
                    {lineTotal.toFixed(2)} DA
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.lineId)}
                  className="w-10 h-10 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 hover:text-rose-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Supprimer la ligne"
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
