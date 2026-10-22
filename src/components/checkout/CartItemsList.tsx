import React, { RefObject } from 'react';
import { LayoutList, ShoppingBag, Zap, Trash2 } from 'lucide-react';
import { CartItem, Product, CompanySettings, RolePermissions } from '../../types';
import { CartItemRow } from './CartItemRow';
import { cn } from '../../lib/utils';

interface Props {
  cart: CartItem[];
  cartEndRef: RefObject<HTMLDivElement | null>;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  removeFromCart: (id: string) => void;
  setQuantity: (id: string, qty: number) => void;
  setEditingProduct: (p: Product) => void;
  setIsProductModalOpen: (v: boolean) => void;
  setDiscountingItemId: (id: string | null) => void;
  setPrice: (id: string, price: number) => void;
  isWholesale: boolean;
  permissions: RolePermissions;
  settings: CompanySettings;
  products: Product[];
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}

export const CartItemsList: React.FC<Props> = (props) => {
  // SÉCURITÉ ABSOLUE : Si props.cart n'est pas un tableau valide, on force un tableau vide immédiatement
  const cart = Array.isArray(props.cart) ? props.cart : [];

  const {
    cartEndRef, selectedItemId, setSelectedItemId, removeFromCart, setQuantity,
    setEditingProduct, setIsProductModalOpen, setDiscountingItemId, setPrice,
    isWholesale, permissions, settings, products, quantityInputRefs
  } = props;

  // Article actif : soit celui explicitement sélectionné, soit le dernier article du panier
  const activeItem = cart.find(
    item => (item.cartItemId && item.cartItemId === selectedItemId) || item.id === selectedItemId
  ) || (cart.length > 0 ? cart[cart.length - 1] : null);

  return (
    <>
      {cart.length > 0 && (
        <div className="px-4 py-2 bg-slate-200/80 dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800 flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 select-none">
          <span className="flex items-center gap-2">
            <LayoutList size={14} className="opacity-70 text-indigo-600 dark:text-indigo-400"/> 
            Articles : <span className="text-slate-900 dark:text-white font-extrabold">{cart.length}</span>
          </span>
          <div className="flex items-center gap-3">
            <span>
              Pièces : <span className="text-slate-900 dark:text-white font-extrabold">{cart.reduce((sum, item) => sum + (item?.quantity || 0), 0)}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Voulez-vous vraiment vider le panier ?")) {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
                }
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-bold border border-rose-500/20 transition-all cursor-pointer"
              title="Vider le panier (Raccourci F2)"
            >
              <Trash2 size={12} />
              <span>Vider [F2]</span>
            </button>
          </div>
        </div>
      )}

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-6 text-center max-w-sm mx-auto select-none">
          <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-5 shadow-sm dark:shadow-xl border border-slate-200 dark:border-zinc-800">
            <ShoppingBag size={44} strokeWidth={1.5} className="text-slate-400 dark:text-zinc-600" />
          </div>
          <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Panier Vide</h4>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Scannez un code-barres ou choisissez un article</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100 dark:bg-zinc-950">
          <div className="p-3 space-y-2">
            {cart.map((item: CartItem, idx: number) => (
              <CartItemRow 
                key={item.cartItemId || item.id}
                item={item}
                idx={idx}
                isSelected={selectedItemId === item.id || selectedItemId === item.cartItemId}
                isLast={idx === cart.length - 1}
                onSelect={(id) => setSelectedItemId(item.cartItemId || id)}
                onRemove={removeFromCart}
                onSetQuantity={setQuantity}
                onOpenProductModal={(p) => { setEditingProduct(p); setIsProductModalOpen(true); }}
                onOpenDiscountModal={setDiscountingItemId}
                onSetPrice={setPrice}
                isWholesale={isWholesale}
                permissions={permissions}
                settings={settings}
                products={products}
                inputRef={(el) => {
                  const key = item.cartItemId || item.id;
                  if (el) {
                    quantityInputRefs.current[key] = el;
                    if (item.id) quantityInputRefs.current[item.id] = el;
                  } else {
                    delete quantityInputRefs.current[key];
                    if (item.id) delete quantityInputRefs.current[item.id];
                  }
                }}
              />
            ))}
            <div ref={cartEndRef} />
          </div>
        </div>
      )}

      {/* Mini-barre Tactile de Quantité Rapide Panier */}
      {cart.length > 0 && activeItem && (
        <div className="flex-shrink-0 px-3 py-2 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 shrink-0">
              Qté [F11] ({activeItem.name.slice(0, 14)}{activeItem.name.length > 14 ? '…' : ''}) :
            </span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => {
                  const currentQty = activeItem.quantity || 1;
                  if (currentQty <= 1) {
                    removeFromCart(activeItem.cartItemId || activeItem.id);
                  } else {
                    setQuantity(activeItem.cartItemId || activeItem.id, currentQty - 1);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-black text-xs transition-all active:scale-90 cursor-pointer border border-slate-200 dark:border-zinc-700"
                title="Diminuer de 1"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentQty = activeItem.quantity || 0;
                  setQuantity(activeItem.cartItemId || activeItem.id, currentQty + 1);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-black text-xs transition-all active:scale-90 cursor-pointer border border-slate-200 dark:border-zinc-700"
                title="Augmenter de 1"
              >
                +1
              </button>
              {[1, 2, 3, 5, 10, 20].map((qtyVal) => (
                <button
                  key={qtyVal}
                  type="button"
                  onClick={() => setQuantity(activeItem.cartItemId || activeItem.id, qtyVal)}
                  className={cn(
                    "min-w-[38px] h-10 px-2 flex items-center justify-center rounded-lg font-mono font-black text-xs transition-all active:scale-90 cursor-pointer border",
                    activeItem.quantity === qtyVal
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                      : "bg-white dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
                  )}
                  title={`Définir la quantité à ${qtyVal}`}
                >
                  {qtyVal}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => removeFromCart(activeItem.cartItemId || activeItem.id)}
            className="flex items-center gap-1 px-2 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-90 shrink-0 cursor-pointer"
            title="Supprimer cet article du panier"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">Suppr</span>
          </button>
        </div>
      )}
    </>
  );
};