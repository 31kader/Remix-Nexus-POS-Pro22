import { toast } from 'sonner';
import { useEffect, RefObject } from 'react';
import { CartItem } from '../../types';

interface UseCheckoutShortcutsProps {
  cart: CartItem[];
  selectedItemId?: string | null;
  searchRef: RefObject<HTMLInputElement | null>;
  setSelectedItemId?: (id: string | null) => void;
  quantityInputRefs?: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  handleCheckout: (method: 'cash' | 'card' | 'balance', shouldPrint?: boolean) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addNewSession?: () => void;
  onReprintLastTicket?: () => void;
}

/**
 * Gestionnaire exclusif des raccourcis clavier de la caisse (POS)
 * Raccourcis autorisés :
 * - F2 : Vider le panier
 * - F3 : Sélectionner la barre de recherche
 * - F4 : Ouvrir un nouveau panier (Session)
 * - F5 : Valider sans imprimer (intercepté pour empêcher le rechargement navigateur)
 * - F10 : Sélectionner la barre de code-barres direct
 * - F11 : Sélectionner / modifier la quantité de l'article en caisse
 * - Alt+P : Valider et imprimer
 */
export function useCheckoutShortcuts({
  cart,
  selectedItemId,
  searchRef,
  setSelectedItemId,
  quantityInputRefs,
  handleCheckout,
  setCart,
  addNewSession,
  onReprintLastTicket
}: UseCheckoutShortcutsProps) {
  
  const safeCart = Array.isArray(cart) ? cart : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. F2 : VIDER LE PANIER
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        if (safeCart.length > 0) {
          if (window.confirm("Voulez-vous vraiment vider le panier ?")) {
            setCart([]);
          }
        }
        return;
      }

      // 2. F3 : SÉLECTIONNER LA BARRE DE RECHERCHE
      if (e.key === 'F3') {
        e.preventDefault();
        e.stopPropagation();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      // 3. F4 : OUVRIR UN NOUVEAU PANIER
      if (e.key === 'F4') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof addNewSession === 'function') {
          addNewSession();
          toast.success("Nouveau panier ouvert (F4)");
        }
        return;
      }

      // 4. F5 : VALIDER SANS IMPRIMER (Interception stricte anti-rechargement navigateur)
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        if (safeCart.length > 0) {
          handleCheckout('cash', false);
        }
        return;
      }

      // 5. F10 : SÉLECTIONNER LA BARRE DE CODE-BARRES DIRECT
      if (e.key === 'F10') {
        e.preventDefault();
        e.stopPropagation();
        const barcodeInput = document.getElementById('direct-barcode-input') as HTMLInputElement | null;
        if (barcodeInput) {
          barcodeInput.focus();
          barcodeInput.select();
        } else {
          searchRef.current?.focus();
          searchRef.current?.select();
        }
        return;
      }

      // 6. F11 : SÉLECTIONNER LA QUANTITÉ DE L'ARTICLE
      if (e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        if (safeCart.length > 0) {
          // Si un article est déjà sélectionné, cibler celui-ci, sinon le dernier article ajouté
          const targetItem = (selectedItemId
            ? safeCart.find(i => (i.cartItemId && i.cartItemId === selectedItemId) || i.id === selectedItemId)
            : null) || safeCart[safeCart.length - 1];

          if (targetItem) {
            const itemId = targetItem.cartItemId || targetItem.id;
            if (typeof setSelectedItemId === 'function') {
              setSelectedItemId(itemId);
            }

            const focusInput = (shouldSelect = true) => {
              const refs = quantityInputRefs?.current;
              const inputEl = (refs && (refs[itemId] || refs[targetItem.id])) ||
                (document.querySelector(`input[data-cart-item-id="${itemId}"]`) as HTMLInputElement | null) ||
                (document.querySelector(`input[data-item-id="${targetItem.id}"]`) as HTMLInputElement | null) ||
                (document.querySelector(`input[data-quantity-input="true"]`) as HTMLInputElement | null);
              if (inputEl) {
                inputEl.focus();
                if (shouldSelect) {
                  inputEl.select();
                }
                try {
                  inputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } catch (_) {}
                return true;
              }
              return false;
            };

            // Focus et sélection immédiate
            const focused = focusInput(true);
            // Rattrapage unique si le DOM était en cours de cycle de rendu React
            if (!focused) {
              setTimeout(() => {
                focusInput(true);
              }, 40);
            }
            toast.info(`Quantité : ${targetItem.name}`);
          }
        } else {
          toast.warning("Le panier est vide");
        }
        return;
      }

      // 7. ALT+P : VALIDER ET IMPRIMER
      const isAltP = (e.altKey || (e.getModifierState && e.getModifierState('AltGraph'))) && (e.key.toLowerCase() === 'p' || e.code === 'KeyP');
      if (isAltP) {
        e.preventDefault();
        e.stopPropagation();
        if (safeCart.length > 0) {
          handleCheckout('cash', true);
        }
        return;
      }

      // 🚫 TOUT AUTRE RACCOURCI DÉSACTIVÉ :
      // Bloquer les autres touches F inutiles (F1, F6, F7, F8, F9, F12) pour éviter tout conflit navigateur
      if (e.key.startsWith('F') && !isNaN(Number(e.key.slice(1)))) {
        if (e.ctrlKey || e.altKey || (e.shiftKey && e.key === 'F12')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Capture = true pour intercepter les touches de fonction avant le comportement natif
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [safeCart, selectedItemId, searchRef, setSelectedItemId, quantityInputRefs, handleCheckout, setCart, addNewSession]);
}
