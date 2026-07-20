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
  onSetQuantity: (cartItemId: string, q: number) => void;
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
  const productInfo = products.find((p: Product) => p.id === item.id);
  const imageUrl = item.imageUrl || productInfo?.imageUrl;
  const unit = (item as any).unit || 'PCS';

  return (
    <div 
      key={`${item.cartItemId || item.id}-${item.quantity}`} 
      className={cn(
        "flex items-center gap-5 p-5 rounded-[2rem] bg-black/40 border transition-all duration-500 group relative overflow-hidden ring-1 ring-white/5",
        isLast || isSelected ? "border-indigo-500/50 bg-indigo-500/5 shadow-neon-indigo scale-[1.01]" : "border-white/5 hover:border-white/10 hover:bg-white/5"
      )}
      onClick={() => onSelect(item.id)}
    >
      <div className="w-16 h-16 bg-white/5 rounded-3xl flex-shrink-0 overflow-hidden border border-white/5 shadow-inner group-hover:scale-105 transition-transform duration-500 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {imageUrl ? (
          <SafeImage 
            src={imageUrl} 
            alt={item.name} 
            className="w-full h-full object-cover" 
            fallback={<Package size={20} className="text-slate-700" />}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            <Package size={28} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h5 className="text-lg font-black text-white truncate tracking-tight uppercase italic">{item.name}</h5>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[9px] font-black font-mono text-indigo-400/60 uppercase tracking-[0.2em]">REF: {(item.sku || 'N/A').toUpperCase()}</p>
              <span className="w-1 h-1 rounded-full bg-slate-800" />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{unit.toUpperCase()}</p>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(item.cartItemId || ''); }}
            className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-rose-500/20"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-black/40 rounded-2xl p-1 border border-white/5 ring-1 ring-white/5 shadow-inner" onClick={(e) => e.stopPropagation()}>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onSetQuantity(item.cartItemId || '', item.quantity - 1); }}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/5 hover:text-white rounded-xl transition-all text-slate-600 active:scale-90"
              >
                <Minus size={18} />
              </button>
              <QuantityInput 
                item={item} 
                setQuantity={onSetQuantity} 
                ref={inputRef}
              />
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onSetQuantity(item.cartItemId || '', item.quantity + 1); }}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/5 hover:text-white rounded-xl transition-all text-slate-600 active:scale-90"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {permissions.canAccessInventory && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const { quantity, overriddenPrice, lineDiscount, productName, cartItemId, ...product } = item as any;
                    onOpenProductModal(product as Product);
                  }}
                  className="p-2.5 rounded-xl text-slate-600 hover:bg-amber-500/10 hover:text-amber-400 transition-all border border-transparent hover:border-amber-500/20 active:scale-90"
                  title="DÉTAILS PRODUIT"
                >
                  <Edit2 size={18} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onOpenDiscountModal(item.cartItemId || ''); }}
                className={cn(
                  "p-2.5 rounded-xl transition-all border active:scale-90",
                  item.lineDiscount ? "bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-neon-indigo" : "text-slate-600 hover:bg-indigo-500/10 hover:text-indigo-400 border-transparent hover:border-indigo-500/20"
                )}
                title="APPLIQUER REMISE"
              >
                <Tag size={18} fill={item.lineDiscount ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="text-right border-l border-white/5 pl-4 ml-2">
              <div className="flex items-center gap-2 justify-end">
                <input
                  type="number"
                  value={item.overriddenPrice !== undefined ? item.overriddenPrice : (isWholesale && item.wholesalePrice ? item.wholesalePrice : item.price)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onSetPrice(item.cartItemId || '', parseFloat(e.target.value) || 0)}
                  className={cn(
                    "w-24 p-1 text-right text-lg font-black bg-transparent border-b border-dashed outline-none transition-all font-mono tracking-tighter",
                    item.lineDiscount ? "text-amber-400 border-amber-500/40" : "text-white border-white/10 focus:border-indigo-500"
                  )}
                />
                <span className={cn("text-[10px] font-black uppercase tracking-widest", item.lineDiscount ? "text-amber-500/60" : "text-slate-600")}>{settings.currency}</span>
              </div>
              {item.lineDiscount && (
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mt-1 italic">
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
