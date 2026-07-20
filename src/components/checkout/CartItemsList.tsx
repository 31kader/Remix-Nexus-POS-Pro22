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
        <div className="px-5 py-3 bg-slate-900/60 border-b border-slate-800/40 flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-400">
          <span className="flex items-center gap-2">
            <LayoutList size={14} className="opacity-50"/> 
            Produits uniques : <span className="text-white">{cart.length}</span>
          </span>
          <span>
            Total articles : <span className="text-white">{cart.reduce((sum, item) => sum + (item?.quantity || 0), 0)}</span>
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-workspace/10">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/40 p-12 text-center max-w-sm mx-auto">
            <div className="w-24 h-24 bg-slate-900/40 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl border border-slate-800/60 group">
              <ShoppingBag size={48} strokeWidth={1} className="text-white/10 group-hover:text-indigo-500/40 transition-colors duration-500" />
            </div>
            <h4 className="text-lg font-black text-white/40 uppercase tracking-[0.2em] mb-2">Panier Vide</h4>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-relaxed">Prêt pour une nouvelle vente futuriste.</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <AnimatePresence initial={false}>
              {cart.map((item: CartItem, idx: number) => (
                <motion.div
                  key={item.cartItemId || item.id}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.2 }}
                >
                  <CartItemRow 
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
                    inputRef={(el) => { if (el) quantityInputRefs.current[item.cartItemId || ''] = el; }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={cartEndRef} />
          </div>
        )}
      </div>
    </>
  );
};