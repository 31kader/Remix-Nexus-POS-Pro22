import React, { memo } from 'react';
import { Trash2, Minus, Plus, Edit2, Tag } from 'lucide-react';
import { CartItem, Product, CompanySettings, RolePermissions } from '../../types';
import { cn } from '../../lib/utils';
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
  inputRef
}: CartItemRowProps) => {
  const unit = (item as any).unit || 'PCS';

  const unitPrice = item.overriddenPrice !== undefined 
    ? item.overriddenPrice 
    : (isWholesale && item.wholesalePrice ? item.wholesalePrice : item.price);

  const discountAmountPerUnit = item.lineDiscount
    ? (item.lineDiscount.type === 'percentage' 
        ? unitPrice * (item.lineDiscount.value / 100)
        : Math.min(unitPrice, item.lineDiscount.value))
    : 0;

  const finalUnitPrice = Math.max(0, unitPrice - discountAmountPerUnit);
  const lineTotal = finalUnitPrice * item.quantity;

  return (
    <div 
      key={item.cartItemId || item.id} 
      className={cn(
        "flex items-center justify-between gap-2 sm:gap-3 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white dark:bg-black/40 border transition-all duration-200 group relative overflow-hidden ring-1 ring-slate-200/50 dark:ring-white/5 shadow-xs cursor-pointer select-none",
        item.quantity < 0 
          ? "border-rose-400 dark:border-rose-500/50 bg-rose-50/60 dark:bg-rose-500/5"
          : (isLast || isSelected 
              ? "border-indigo-400 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/5" 
              : "border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50/70 dark:hover:bg-white/5")
      )}
      onClick={() => onSelect(item.id)}
    >
      {/* 1. Numéro & Désignation Produit */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        <div className={cn(
          "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center border text-[10px] font-black font-mono shadow-xs",
          item.quantity < 0
            ? "bg-rose-100 dark:bg-rose-900/50 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400"
            : "bg-slate-100 dark:bg-slate-900/90 border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400"
        )}>
          #{idx + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate uppercase leading-tight">
              {item.name}
            </h5>
            {item.quantity < 0 && (
              <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs shrink-0">
                RETOUR
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 dark:text-zinc-500 mt-0.5">
            <span className="truncate max-w-[80px] sm:max-w-none text-indigo-600 dark:text-indigo-400/70">
              {(item.sku || 'N/A').toUpperCase()}
            </span>
            <span>•</span>
            <span className="uppercase text-slate-500">{unit.toUpperCase()}</span>
            {item.lineDiscount && (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                (-{item.lineDiscount.value}{item.lineDiscount.type === 'percentage' ? '%' : ` ${settings.currency}`})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Contrôles de Quantité Tactiles Fitts Law & Prix */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Prix Unitaire (P.U) */}
        <div className="hidden sm:flex flex-col items-end text-right min-w-[65px]">
          <span className="text-[8px] uppercase font-bold text-slate-400 dark:text-zinc-500">P.U:</span>
          <input
            type="number"
            value={unitPrice}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') return;
              const parsed = parseFloat(val);
              if (!isNaN(parsed) && parsed >= 0) {
                onSetPrice(item.cartItemId || item.id, parsed);
              }
            }}
            onBlur={(e) => {
              const val = e.target.value;
              if (val === '' || isNaN(parseFloat(val))) {
                const defaultPrice = isWholesale && item.wholesalePrice ? item.wholesalePrice : item.price;
                onSetPrice(item.cartItemId || item.id, defaultPrice);
              }
            }}
            className={cn(
              "w-14 p-0 text-right text-xs font-black bg-transparent border-b border-dashed outline-none transition-all font-mono",
              item.lineDiscount 
                ? "text-amber-600 dark:text-amber-400 border-amber-500/40" 
                : "text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-white/10 focus:border-indigo-500"
            )}
            title="Modifier le prix unitaire"
          />
        </div>

        {/* Stepper Quantité Tactile avec boutons w-10 h-10 */}
        <div className="flex items-center bg-slate-100 dark:bg-black/50 rounded-xl p-0.5 border border-slate-200 dark:border-white/5 ring-1 ring-slate-200/50 dark:ring-white/5 shadow-inner">
          <button 
            type="button"
            onClick={(e) => { 
              e.stopPropagation();
              if (item.quantity < 0) {
                if (item.quantity < -1) {
                  onSetQuantity(item.cartItemId || item.id, item.quantity + 1, true);
                } else {
                  onRemove(item.cartItemId || item.id);
                }
              } else {
                onSetQuantity(item.cartItemId || item.id, item.quantity - 1, true); 
              }
            }}
            className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white rounded-lg transition-all text-slate-500 dark:text-slate-400 active:scale-90 cursor-pointer"
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
                onSetQuantity(item.cartItemId || item.id, item.quantity - 1, true);
              } else {
                onSetQuantity(item.cartItemId || item.id, item.quantity + 1, true); 
              }
            }}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:text-white rounded-lg transition-all text-slate-400 active:scale-90 cursor-pointer"
            title={item.quantity < 0 ? "Augmenter le retour" : "Augmenter quantité"}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Prix Total de la Ligne */}
        <div className="text-right min-w-[70px] sm:min-w-[90px] border-l border-slate-200 dark:border-white/10 pl-2 sm:pl-3">
          <span className={cn(
            "text-xs sm:text-base font-black font-mono tracking-tight leading-tight block tabular-nums",
            item.quantity < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
          )}>
            {lineTotal.toFixed(2)}
            <span className="text-[9px] font-bold text-slate-500 font-sans ml-1">
              {settings.currency}
            </span>
          </span>
        </div>

        {/* Actions Tactiles : Fiche Produit, Remise, Supprimer (>= 38x38px) */}
        <div className="flex items-center gap-1">
          {permissions.canAccessInventory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const { quantity, overriddenPrice, lineDiscount, productName, cartItemId, ...product } = item as any;
                onOpenProductModal(product as Product);
              }}
              className="min-w-[38px] min-h-[38px] hidden md:flex items-center justify-center rounded-lg text-slate-500 hover:bg-amber-500/10 hover:text-amber-400 transition-all border border-transparent hover:border-amber-500/20 active:scale-90 cursor-pointer"
              title="DÉTAILS PRODUIT"
            >
              <Edit2 size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenDiscountModal(item.cartItemId || item.id); }}
            className={cn(
              "min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg transition-all border active:scale-90 cursor-pointer",
              item.lineDiscount ? "bg-amber-500/10 text-amber-500 border-amber-500/40" : "text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-400 border-transparent hover:border-indigo-500/20"
            )}
            title="APPLIQUER UNE REMISE SUR L'ARTICLE"
          >
            <Tag size={15} fill={item.lineDiscount ? "currentColor" : "none"} />
          </button>

          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(item.cartItemId || item.id); }}
            className="min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all active:scale-90 cursor-pointer"
            title="Supprimer la ligne"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});

CartItemRow.displayName = 'CartItemRow';
