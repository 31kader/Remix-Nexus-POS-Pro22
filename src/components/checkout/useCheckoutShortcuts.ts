import { useEffect, RefObject } from 'react';
import { CartItem } from '../../types';

interface UseCheckoutShortcutsProps {
  cart: CartItem[];
  searchRef: RefObject<HTMLInputElement | null>;
  setSelectedItemId: (id: string | null) => void;
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  handleCheckout: (method: 'cash', shouldPrint?: boolean) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addNewSession?: () => void;
}

export function useCheckoutShortcuts({
  cart,
  searchRef,
  setSelectedItemId,
  quantityInputRefs,
  handleCheckout,
  setCart,
  addNewSession
}: UseCheckoutShortcutsProps) {
  
  const safeCart = Array.isArray(cart) ? cart : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltP = (e.altKey || (e.getModifierState && e.getModifierState('AltGraph'))) && e.key.toLowerCase() === 'p';

      // F1: Valider la vente SANS imprimer le ticket
      if (e.key === 'F1') {
        e.preventDefault();
        handleCheckout('cash', false);
      }
      // F2: Vider le panier actuel (avec confirmation)
      else if (e.key === 'F2') {
        e.preventDefault();
        if (safeCart.length > 0) {
          if (window.confirm("Voulez-vous vraiment vider le panier ?")) {
            setCart([]);
          }
        }
      }
      // F3: Activer et sélectionner la barre de recherche
      else if (e.key === 'F3') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      // F4: Ouvrir un nouveau panier/session
      else if (e.key === 'F4') {
        e.preventDefault();
        if (addNewSession) addNewSession();
      }
      // F5 ou AltGr+P ou Ctrl+Enter: Valider ET Imprimer le ticket
      else if (e.key === 'F5' || isAltP || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handleCheckout('cash', true);
      }
      // F11: Focus sur la quantité du dernier article
      else if (e.key === 'F11') {
        e.preventDefault();
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeCart, setSelectedItemId, quantityInputRefs, searchRef, handleCheckout, setCart, addNewSession]);
}