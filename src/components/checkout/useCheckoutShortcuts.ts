import { useEffect, RefObject } from 'react';
import { CartItem } from '../../types';

interface UseCheckoutShortcutsProps {
  cart: CartItem[];
  searchRef: RefObject<HTMLInputElement | null>;
  setSelectedItemId: (id: string | null) => void;
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  handleCheckout: (method: 'cash', isFreeHand?: boolean) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export function useCheckoutShortcuts({
  cart,
  searchRef,
  setSelectedItemId,
  quantityInputRefs,
  handleCheckout,
  setCart,
}: UseCheckoutShortcutsProps) {
  
  // 🛡️ SÉCURISATION : On garantit qu'on manipule toujours un tableau valide
  const safeCart = Array.isArray(cart) ? cart : [];

  // Focus and general keyboard shortcuts (F2, F11, F10, F3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' || e.key === 'F11') {
        e.preventDefault();
        // Utilisation du tableau sécurisé pour éviter le crash .length
        if (safeCart.length > 0) {
          const lastItem = safeCart[safeCart.length - 1];
          if (lastItem) {
            setSelectedItemId(lastItem.id);
            setTimeout(() => {
              const input = quantityInputRefs.current?.[lastItem.cartItemId || ''];
              if (input) {
                input.focus();
                input.select();
              }
            }, 10);
          }
        }
      } else if (e.key === 'F10' || e.key === 'F3') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeCart, setSelectedItemId, quantityInputRefs, searchRef]); // Dépendance mise à jour avec safeCart

  // Checkout and special actions keyboard shortcuts (F1, F5, Ctrl+Enter, Ctrl+V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' || e.key === 'F5') { 
        e.preventDefault(); 
        handleCheckout('cash', false); 
      }
      else if (e.key === 'F3' || e.key === 'F10') { 
        e.preventDefault(); 
        searchRef.current?.focus(); 
        searchRef.current?.select();
      }
      else if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleCheckout('cash'); }
      else if (e.ctrlKey && e.key === 'v') { e.preventDefault(); setCart([]); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCheckout, setCart, searchRef]);
}