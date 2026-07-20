import { useEffect } from 'react';

interface UsePurchaseShortcutsProps {
  activeSubTab: string;
  setActiveSubTab: (v: any) => void;
  mode: string;
  setMode: (v: any) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  cart: any[];
  quantityInputRefs: React.RefObject<Record<string, HTMLInputElement | null>>;
  confirmPurchase: (shouldPrint: boolean) => void;
}

export function usePurchaseShortcuts({
  activeSubTab,
  setActiveSubTab,
  mode,
  setMode,
  searchInputRef,
  cart,
  quantityInputRefs,
  confirmPurchase
}: UsePurchaseShortcutsProps) {
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F3' || e.key === 'F10') {
        e.preventDefault();
        e.stopPropagation();

        // Ensure we are working on the creation tab in manual mode
        if (activeSubTab !== 'new') {
          setActiveSubTab('new');
        }
        if (mode !== 'manual') {
          setMode('manual');
        }

        // Wait slightly for state transition to mount input if necessary
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
          } else {
            const fallbackInput = document.querySelector('input[placeholder*="NOM, SKU"]') as HTMLInputElement;
            if (fallbackInput) {
              fallbackInput.focus();
              fallbackInput.select();
            }
          }
        }, 60);
      } else if (e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        if (cart.length > 0) {
          const lastItem = cart[cart.length - 1];
          setTimeout(() => {
            const input = quantityInputRefs.current[lastItem.lineId];
            if (input) {
              input.focus();
              input.select();
            }
          }, 10);
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        confirmPurchase(false);
      } else if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        confirmPurchase(true);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts, true);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts, true);
  }, [mode, activeSubTab, cart, confirmPurchase]);
}
