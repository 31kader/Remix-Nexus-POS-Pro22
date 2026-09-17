import React, { memo } from 'react';
import { Package, Trash2, Minus, Plus, Edit2, Tag, Percent } from 'lucide-react';
import { CartItem, Product, CompanySettings, RolePermissions } from '../../types';
import { cn } from '../../lib/utils';
import { SafeImage } from '../ui';
import { QuantityInput } from './QuantityInput';

interface CartItemRowProps {
  item: CartItem;
  idx: number;
  isSelected: boolean;
  isLast: boolean;
  onSelect: (id: string) => void;
  onRemove: (cartItemId: string) => void;
  onSetQuantity: (cartItemId: string, q: number, shouldFocusSearch?: boolean) => void;
  onOpenProductModal: (product: Product) => void;
  onOpenDiscountModal: (cartItemId: string) => void;
  onSetPrice: (cartItemId: string, price: number) => void;
  isWholesale: boolean;
  permissions: RolePermissions;
  settings: CompanySettings;
  products: Product[];
  inputRef: React.Ref<HTMLInputElement>;
}

export const CartItemRow = memo(({
  item,
  idx,
  isSelected,
  isLast,
  onSelect,
  onRemove,
  onSetQuantity,
  onOpenProductModal,
  onOpenDiscountModal,
  onSetPrice,
  isWholesale,
  permissions,
  settings,
  products,
  inputRef
}: CartItemRowProps) => {
  const unit = (item as any).unit || 'PCS';

  return (
    <div 
      key={item.cartItemId || item.id} 
      className={cn(
        "flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-black/40 border transition-all duration-300 group relative overflow-hidden ring-1 ring-slate-200/50 dark:ring-white/5 shadow-sm",
        item.quantity < 0 
          ? "border-rose-400 dark:border-rose-500/50 bg-rose-50/80 dark:bg-rose-500/5 shadow-rose-500/10"
          : (isLast || isSelected ? "border-indigo-400 dark:border-indigo-500/50 bg-indigo-50/80 dark:bg-indigo-500/5 shadow-indigo-500/10" : "border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5")
      )}
      onClick={() => onSelect(item.id)}
    >
      {/* Sleek Item Number Badge */}
      <div className={cn(
        "w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center border text-xs font-black font-mono shadow-sm",
        item.quantity < 0
          ? "bg-rose-100 dark:bg-rose-900/50 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400"
          : "bg-slate-100 dark:bg-slate-900/90 border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400"
      )}>
        #{idx + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate uppercase italic">{item.name}</h5>
              {item.quantity < 0 && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm shrink-0">
                  RETOUR
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[9px] font-bold font-mono text-indigo-600 dark:text-indigo-400/60 uppercase tracking-wider">REF: {(item.sku || 'N/A').toUpperCase()}</p>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-800" />
              <p className="text-[9px] font-bold text-slate-500 uppercase">{unit.toUpperCase()}</p>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(item.cartItemId || ''); }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all active:scale-90 cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-black/50 rounded-xl p-0.5 border border-slate-200 dark:border-white/5 ring-1 ring-slate-200/50 dark:ring-white/5 shadow-inner" onClick={(e) => e.stopPropagation()}>
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation();
                  if (item.quantity < 0) {
                    if (item.quantity < -1) {
                      onSetQuantity(item.cartItemId || '', item.quantity + 1, true);
                    } else {
                      onRemove(item.cartItemId || '');
                    }
                  } else {
                    onSetQuantity(item.cartItemId || '', item.quantity - 1, true); 
                  }
                }}
                className="w-7 h-7 flex items-center justify-center hover:bg-white dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white rounded-lg transition-all text-slate-500 dark:text-slate-400 active:scale-90 cursor-pointer"
                title={item.quantity < 0 ? "Réduire le retour" : "Diminuer quantité"}
              >
                <Minus size={14} />
              </button>
              <QuantityInput 
                item={item} 
                setQuantity={onSetQuantity} 
                ref={inputRef}
              />
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (item.quantity < 0) {
                    onSetQuantity(item.cartItemId || '', item.quantity - 1, true);
                  } else {
                    onSetQuantity(item.cartItemId || '', item.quantity + 1, true); 
                  }
                }}
                className="w-7 h-7 flex items-center justify-center hover:bg-white/10 hover:text-white rounded-lg transition-all text-slate-400 active:scale-90"
                title={item.quantity < 0 ? "Augmenter le retour" : "Augmenter quantité"}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {permissions.canAccessInventory && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const { quantity, overriddenPrice, lineDiscount, productName, cartItemId, ...product } = item as any;
                    onOpenProductModal(product as Product);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-500/10 hover:text-amber-400 transition-all border border-transparent hover:border-amber-500/20 active:scale-90"
                  title="DÉTAILS PRODUIT"
                >
                  <Edit2 size={15} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onOpenDiscountModal(item.cartItemId || ''); }}
                className={cn(
                  "p-1.5 rounded-lg transition-all border active:scale-90",
                  item.lineDiscount ? "bg-amber-500/10 text-amber-400 border-amber-500/40" : "text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-400 border-transparent hover:border-indigo-500/20"
                )}
                title="APPLIQUER REMISE"
              >
                <Tag size={15} fill={item.lineDiscount ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="text-right border-l border-slate-200 dark:border-white/5 pl-3">
              <div className="flex items-center gap-1 justify-end">
                <input
                  type="number"
                  value={item.overriddenPrice !== undefined ? item.overriddenPrice : (isWholesale && item.wholesalePrice ? item.wholesalePrice : item.price)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') return;
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed) && parsed >= 0) {
                      onSetPrice(item.cartItemId || '', parsed);
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '' || isNaN(parseFloat(val))) {
                      const defaultPrice = isWholesale && item.wholesalePrice ? item.wholesalePrice : item.price;
                      onSetPrice(item.cartItemId || '', defaultPrice);
                    }
                  }}
                  className={cn(
                    "w-20 p-0.5 text-right text-base font-bold bg-transparent border-b border-dashed outline-none transition-all font-mono tracking-tighter",
                    item.lineDiscount ? "text-amber-600 dark:text-amber-400 border-amber-500/40" : "text-slate-900 dark:text-white border-slate-300 dark:border-white/10 focus:border-indigo-500"
                  )}
                />
                <span className={cn("text-[9px] font-bold uppercase tracking-wider", item.lineDiscount ? "text-amber-600 dark:text-amber-500/60" : "text-slate-400 dark:text-slate-500")}>{settings.currency}</span>
              </div>
              {item.lineDiscount && (
                <p className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mt-0.5 italic">
                  OFF: -{item.lineDiscount.value}{item.lineDiscount.type === 'percentage' ? '%' : settings.currency}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CartItemRow.displayName = 'CartItemRow';
