import React, { RefObject } from 'react';
import { LayoutList, Package, ShoppingBag } from 'lucide-react';
import { CartItem, Product, CompanySettings, RolePermissions } from '../../types';
import { CartItemRow } from './CartItemRow';
import { AnimatePresence, motion } from 'motion/react';

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

  return (
    <>
      {cart.length > 0 && (
        <div className="px-5 py-2.5 bg-slate-200/80 dark:bg-slate-900/80 border-b border-slate-300 dark:border-slate-800/60 flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 select-none">
          <span className="flex items-center gap-2">
            <LayoutList size={14} className="opacity-70 text-indigo-600 dark:text-indigo-400"/> 
            Articles distincts : <span className="text-slate-900 dark:text-white font-extrabold">{cart.length}</span>
          </span>
          <span>
            Total pièces : <span className="text-slate-900 dark:text-white font-extrabold">{cart.reduce((sum, item) => sum + (item?.quantity || 0), 0)}</span>
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100 dark:bg-[#07090e]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-12 text-center max-w-sm mx-auto select-none">
            <div className="w-24 h-24 bg-white dark:bg-slate-900/60 rounded-3xl flex items-center justify-center mb-5 shadow-sm dark:shadow-xl border border-slate-200 dark:border-slate-800/80">
              <ShoppingBag size={44} strokeWidth={1.5} className="text-slate-400 dark:text-slate-600" />
            </div>
            <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Panier Vide</h4>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Scannez un code-barres ou choisissez un article</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {cart.map((item: CartItem, idx: number) => (
              <CartItemRow 
                key={item.cartItemId || item.id}
                item={item}
                idx={idx}
                isSelected={selectedItemId === item.id}
                isLast={idx === cart.length - 1}
                onSelect={setSelectedItemId}
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
                  const key = item.cartItemId || '';
                  if (el) {
                    quantityInputRefs.current[key] = el;
                  } else {
                    delete quantityInputRefs.current[key];
                  }
                }}
              />
            ))}
            <div ref={cartEndRef} />
          </div>
        )}
      </div>
    </>
  );
};