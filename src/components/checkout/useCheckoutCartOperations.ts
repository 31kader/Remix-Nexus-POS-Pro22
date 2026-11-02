import { useCallback } from 'react';
import { Product, CartItem, CompanySettings } from '../../types';
import { generateUniqueId } from '../../lib/utils';
import { toast } from 'sonner';

interface CheckoutCartOperationsParams {
  products: Product[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  settings: CompanySettings;
  setSelectedItemId: (id: string | null) => void;
  isReturnMode: boolean;
  activeSessionId: string;
  setPosSessions: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useCheckoutCartOperations({
  products,
  setCart,
  settings,
  setSelectedItemId,
  isReturnMode,
  activeSessionId,
  setPosSessions
}: CheckoutCartOperationsParams) {
  // 🛡️ MODIFIÉ & SÉCURISÉ : Plus aucun risque de findIndex sur undefined au clic/scan produit
  const addToCart = useCallback((product: Product, quantity: number = 1, isDistinctScan: boolean = false) => {
    if (!product) return;
    if (settings.allowNegativeStock === false && (product.stock || 0) <= 0 && quantity > 0) {
      toast.error(`Rupture de stock pour ${product.name}. Stock actuel: ${product.stock}`);
      return;
    }
    const newCartItemId = generateUniqueId();
    setSelectedItemId(product.id);
    
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];

      if (quantity === 0) return safePrev;
      const existingIdx = safePrev.findIndex(item => item && item.id === product.id);
      
      if (existingIdx !== -1 && !isDistinctScan) {
        const existing = safePrev[existingIdx];
        const samePolarity = (existing.quantity > 0 && quantity > 0) || (existing.quantity < 0 && quantity < 0);
        
        if (samePolarity) {
          const updated = [...safePrev];
          const newQty = (existing?.quantity || 0) + quantity;
          
          if (settings.allowNegativeStock === false && newQty > (product.stock || 0) && quantity > 0) {
            toast.error(`Stock insuffisant pour ${product.name}. Stock: ${product.stock}`);
            return safePrev;
          }
          updated[existingIdx] = { ...existing, quantity: newQty };
          toast.success(`${product.name} mis à jour (${newQty < 0 ? `${newQty} (Retour)` : `+${quantity}`})`);
          return updated;
        }
      }
      
      const availableStock = product.stock ?? 0;
      const allowNegative = settings.allowNegativeStock !== false;
      const initQty = allowNegative ? quantity : (quantity > 0 ? Math.min(quantity, Math.max(0, availableStock)) : quantity);
      if (initQty <= 0 && quantity > 0 && !allowNegative) {
        toast.error(`Stock épuisé pour ${product.name}`);
        return safePrev;
      }
      toast.success(`${product.name} ajouté au panier`);
      return [...safePrev, { ...product, quantity: initQty, cartItemId: newCartItemId }];
    });
  }, [settings.allowNegativeStock, setCart, isReturnMode, setSelectedItemId]);

  // 🛡️ SÉCURISÉ : Protection de setQuantity + Focus optionnel
  const setQuantity = useCallback((cartItemId: string, quantity: number, _shouldFocusSearch: boolean = false) => {
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(item => {
        if (item && (item.cartItemId === cartItemId || item.id === cartItemId)) {
          const safeProducts = Array.isArray(products) ? products : [];
          const prod = safeProducts.find(p => p && p.id === item.id);
          const resolved = isNaN(quantity) ? 0 : quantity;
          const maxStock = prod?.stock ?? 0;
          return { 
            ...item,
            quantity: settings.allowNegativeStock !== false ? resolved : (resolved > 0 ? Math.min(resolved, Math.max(0, maxStock)) : resolved) 
          };
        }
        return item;
      });
    });
  }, [settings.allowNegativeStock, setCart, products]);

  // 🛡️ SÉCURISÉ : Protection de setPrice sans vol de focus
  const setPrice = useCallback((cartItemId: string, price: number) => {
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(item => {
        if (item && (item.cartItemId === cartItemId || item.id === cartItemId)) return { ...item, overriddenPrice: price };
        return item;
      });
    });
  }, [setCart]);

  // 🛡️ SÉCURISÉ : Protection de removeFromCart
  const removeFromCart = useCallback((cartItemId: string) => {
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.filter(item => item && (item.cartItemId !== cartItemId && item.id !== cartItemId));
    });
  }, [setCart]);

  const handleCancelEditTransaction = useCallback(() => {
    if (window.confirm("Voulez-vous annuler la modification de ce ticket ? Le panier sera vidé et le ticket initial restera intact.")) {
      setCart([]);
      if (typeof setPosSessions === 'function') {
        setPosSessions((prev: any) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.map((s: any) => 
            s?.id === activeSessionId 
              ? { 
                  ...s, 
                  name: s.name?.includes('(Modif)') ? 'Ticket 1' : s.name,
                  cart: [], 
                  selectedCustomer: null,
                  editingTransaction: null 
                } 
              : s
          );
        });
      }
      toast.info("Modification de vente annulée.");
    }
  }, [activeSessionId, setCart, setPosSessions]);

  return {
    addToCart,
    setQuantity,
    setPrice,
    removeFromCart,
    handleCancelEditTransaction
  };
}
