import React from 'react';
import { OnlineOrder, Product } from '../../../types';
import { SafeImage } from '../../ui';
import { Package, Check, ZoomIn } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface OrderItemsPickingListProps {
  order: OnlineOrder;
  orderItems: any[];
  products: Product[];
  checkedItems: Record<string, boolean>;
  setCheckedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  openImageZoom: (imageUrl: string, title: string) => void;
  currency: string;
}

export function OrderItemsPickingList({
  order,
  orderItems,
  products = [],
  checkedItems,
  setCheckedItems,
  openImageZoom,
  currency
}: OrderItemsPickingListProps) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-800/70 border border-zinc-700/60 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-zinc-700/50">
        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <Package size={15} className="text-indigo-400" />
          Articles Commandés ({orderItems.length})
        </p>
        <span className="text-[11px] text-zinc-400 font-medium">Cochez pour préparer</span>
      </div>

      <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1">
        {orderItems
          .slice()
          .sort((a, b) => {
            const prodA = (products || []).find(p => p.id === (a.productId || (a as any).id));
            const prodB = (products || []).find(p => p.id === (b.productId || (b as any).id));
            const locA = prodA?.location || 'ZZZ';
            const locB = prodB?.location || 'ZZZ';
            return locA.localeCompare(locB);
          })
          .map((item, idx) => {
            const itemKey = `${order.id}-${item.lineId || `pick-item-${idx}`}`;
            const isItemChecked = !!checkedItems[itemKey];
            const productRef = (products || []).find(p => p.id === (item.productId || (item as any).id));
            const rawImg = item.image || item.imageUrl || productRef?.imageUrl || productRef?.imageUrls?.[0];
            const hasImage = Boolean(rawImg && rawImg.trim() !== '');

            return (
              <div 
                key={itemKey} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isItemChecked 
                    ? "bg-emerald-950/20 border-emerald-500/30 opacity-75" 
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                )}
              >
                {/* Checkbox stylisée pour picking */}
                <button
                  type="button"
                  onClick={() => setCheckedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                  className={cn(
                    "w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90",
                    isItemChecked 
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-xs" 
                      : "bg-zinc-800 border-zinc-700 text-transparent hover:border-zinc-500"
                  )}
                  aria-label={isItemChecked ? "Décocher l'article" : "Valider la préparation de l'article"}
                >
                  <Check size={16} strokeWidth={3} className={isItemChecked ? "text-white" : "opacity-0"} />
                </button>
                
                {/* Miniature de produit cliquable avec zoom */}
                <div 
                  className={cn(
                    "w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700/80 overflow-hidden shrink-0 relative group",
                    hasImage ? "cursor-zoom-in hover:border-indigo-500" : "cursor-default"
                  )}
                  onClick={() => {
                    if (hasImage && rawImg) {
                      openImageZoom(rawImg, item.name);
                    }
                  }}
                  title={hasImage ? "Cliquer pour agrandir la photo" : "Aucune image"}
                >
                  {hasImage ? (
                    <>
                      <SafeImage 
                        src={rawImg} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                        alt={item.name}
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn size={16} className="text-white drop-shadow-md" />
                      </div>
                      <div className="absolute bottom-0.5 right-0.5 bg-black/60 rounded px-1 py-0.5 text-[9px] text-white/90">
                        🔍
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                      <Package size={22} />
                    </div>
                  )}
                </div>

                {/* Nom, Emplacement & Prix */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setCheckedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {productRef?.location && (
                      <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold uppercase shrink-0">
                        {productRef.location}
                      </span>
                    )}
                    <p className={cn(
                      "text-sm font-bold truncate leading-tight transition-colors",
                      isItemChecked ? "line-through text-zinc-400" : "text-white"
                    )}>
                      {item.name}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    {(item.price || 0).toFixed(2)} {currency} × {item.quantity}
                  </p>
                </div>

                {/* Total de la ligne */}
                <div className="text-right shrink-0">
                  <p className="text-base font-black text-white font-mono">
                    {((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">{currency}</p>
                </div>
              </div>
            );
          })}
      </div>

      {/* Total de la commande */}
      <div className="border-t border-dashed border-zinc-700 pt-3 flex justify-between items-center bg-zinc-900/40 -mx-4 -mb-4 p-4 rounded-b-2xl">
        <div>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total de la commande</p>
          <p className="text-xs text-indigo-400 font-medium">TTC et service inclus</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-white font-mono tracking-tight">
            {(order.total || 0).toFixed(2)} <span className="text-sm font-bold text-indigo-400">{currency}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
