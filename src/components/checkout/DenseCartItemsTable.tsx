import React, { memo } from 'react';
import { Trash2, Minus, Plus, Tag, AlertCircle } from 'lucide-react';
import { CartItem, Product, CompanySettings, RolePermissions } from '../../types';
import { cn } from '../../lib/utils';
import { QuantityInput } from './QuantityInput';

interface DenseCartItemsTableProps {
  cart: CartItem[];
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  removeFromCart: (cartItemId: string) => void;
  setQuantity: (cartItemId: string, q: number) => void;
  setEditingProduct: (product: Product) => void;
  setIsProductModalOpen: (open: boolean) => void;
  setDiscountingItemId: (id: string | null) => void;
  setPrice: (cartItemId: string, price: number) => void;
  isWholesale: boolean;
  permissions: RolePermissions;
  settings: CompanySettings;
  products: Product[];
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  cartEndRef: React.RefObject<HTMLDivElement | null>;
}

export const DenseCartItemsTable = memo(function DenseCartItemsTable({
  cart,
  selectedItemId,
  setSelectedItemId,
  removeFromCart,
  setQuantity,
  setEditingProduct,
  setIsProductModalOpen,
  setDiscountingItemId,
  setPrice,
  isWholesale,
  permissions,
  settings,
  products,
  quantityInputRefs,
  cartEndRef
}: DenseCartItemsTableProps) {
  const currency = settings?.currency || 'DA';

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#07090e] overflow-hidden select-none">
      {/* Table Header */}
      <div className="grid grid-cols-[40px_1fr_100px_130px_70px_110px_42px] items-center px-3 py-2 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span className="text-center">#</span>
        <span className="truncate">Article & Référence</span>
        <span className="text-right">P.U ({currency})</span>
        <span className="text-center">Quantité</span>
        <span className="text-center">Remise</span>
        <span className="text-right">Total ({currency})</span>
        <span className="text-center">Act.</span>
      </div>

      {/* Table Body - Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-850">
        {cart.map((item, idx) => {
          const isSelected = selectedItemId === item.id;
          const isReturn = item.quantity < 0;
          const effectiveUnitPrice = item.overriddenPrice !== undefined ? item.overriddenPrice : (isWholesale && item.wholesalePrice ? item.wholesalePrice : item.price);
          const lineDiscountAmount = item.lineDiscount
            ? (item.lineDiscount.type === 'percentage'
                ? (effectiveUnitPrice * Math.abs(item.quantity) * (item.lineDiscount.value / 100))
                : item.lineDiscount.value)
            : 0;
          const lineTotal = (effectiveUnitPrice * item.quantity) - (item.quantity < 0 ? -lineDiscountAmount : lineDiscountAmount);
          const originalProduct = products.find(p => p.id === item.id);
          const hasDiscount = Boolean(item.lineDiscount && item.lineDiscount.value > 0);
          const discountLabel = item.lineDiscount
            ? (item.lineDiscount.type === 'percentage' ? `-${item.lineDiscount.value}%` : `-${item.lineDiscount.value} DA`)
            : '0%';

          return (
            <div
              key={item.cartItemId || item.id}
              onClick={() => setSelectedItemId(item.id)}
              className={cn(
                "grid grid-cols-[40px_1fr_100px_130px_70px_110px_42px] items-center px-3 py-1.5 transition-colors cursor-pointer text-xs",
                isReturn
                  ? "bg-rose-50/70 dark:bg-rose-950/25 hover:bg-rose-100/70 dark:hover:bg-rose-900/30"
                  : isSelected
                    ? "bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40"
                    : idx % 2 === 0
                      ? "bg-white dark:bg-[#07090e] hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      : "bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-100/70 dark:hover:bg-slate-900/50"
              )}
            >
              {/* Row Index */}
              <div className="flex justify-center">
                <span className={cn(
                  "w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-[10px]",
                  isReturn
                    ? "bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200"
                    : isSelected
                      ? "bg-indigo-600 text-white font-black"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
                )}>
                  {idx + 1}
                </span>
              </div>

              {/* Product Name & SKU */}
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span 
                    onClick={(e) => {
                      if (originalProduct) {
                        e.stopPropagation();
                        setEditingProduct(originalProduct);
                        setIsProductModalOpen(true);
                      }
                    }}
                    className={cn(
                      "font-semibold text-slate-900 dark:text-slate-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors",
                      isReturn && "text-rose-600 dark:text-rose-300"
                    )}
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  {isReturn && (
                    <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-rose-600 text-white shrink-0">
                      RETOUR
                    </span>
                  )}
                  {isWholesale && Boolean(item.wholesalePrice) && (
                    <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                      GROS
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  <span>REF: {item.sku || 'N/A'}</span>
                  {item.barcode && <span>• {item.barcode}</span>}
                  {(item as any).unit && <span className="uppercase">• {(item as any).unit}</span>}
                </div>
              </div>

              {/* Unit Price */}
              <div className="text-right pr-2">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {(Number(effectiveUnitPrice) || 0).toFixed(2)}
                </span>
              </div>

              {/* Quantity Controls (- / input / +) */}
              <div 
                className="flex items-center justify-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setQuantity(item.cartItemId || item.id, item.quantity - 1)}
                  className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-400 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                  title="Diminuer"
                >
                  <Minus size={11} strokeWidth={2.5} />
                </button>

                <div className="w-14 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                  <QuantityInput
                    item={item}
                    setQuantity={setQuantity}
                    ref={(el) => {
                      const key = item.cartItemId || '';
                      if (el) {
                        quantityInputRefs.current[key] = el;
                      } else {
                        delete quantityInputRefs.current[key];
                      }
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setQuantity(item.cartItemId || item.id, item.quantity + 1)}
                  className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-600 dark:text-slate-400 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                  title="Augmenter"
                >
                  <Plus size={11} strokeWidth={2.5} />
                </button>
              </div>

              {/* Discount Tag / Button */}
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                {permissions.canApplyDiscount ? (
                  <button
                    type="button"
                    onClick={() => setDiscountingItemId(item.cartItemId || item.id)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer",
                      hasDiscount
                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold"
                        : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                    title="Appliquer une remise sur la ligne"
                  >
                    <Tag size={10} />
                    {discountLabel}
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {hasDiscount ? discountLabel : '-'}
                  </span>
                )}
              </div>

              {/* Line Total */}
              <div className="text-right pr-2">
                <span className={cn(
                  "font-mono font-bold text-xs tabular-nums",
                  isReturn 
                    ? "text-rose-600 dark:text-rose-400" 
                    : "text-emerald-700 dark:text-emerald-400 font-extrabold"
                )}>
                  {(Number(lineTotal) || 0).toFixed(2)}
                </span>
              </div>

              {/* Delete Action Button */}
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.cartItemId || item.id)}
                  className="w-7 h-7 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center transition-colors cursor-pointer"
                  title="Supprimer la ligne"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
        <div ref={cartEndRef} />
      </div>
    </div>
  );
});
