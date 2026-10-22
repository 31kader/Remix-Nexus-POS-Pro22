import React, { useState, useEffect, useRef } from 'react';
import { CartItem } from '../../types';

interface QuantityInputProps {
  item: CartItem;
  setQuantity: (cartItemId: string, quantity: number, shouldFocusSearch?: boolean) => void;
}

/**
 * Normalise la saisie pour gérer nativement les claviers AZERTY français/algériens
 * et claviers arabes sans forcer l'utilisateur à maintenir Shift ou verrouiller Majuscule.
 * & -> 1, é -> 2, " -> 3, ' -> 4, ( -> 5, - -> 6 (si non retour), è -> 7, _ -> 8, ç -> 9, à -> 0
 * ٠-٩ -> 0-9
 */
function normalizeAzertyDigits(rawStr: string, isNegativeAllowed: boolean): string {
  if (!rawStr) return rawStr;
  
  const arabicIndicDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };

  const azertyMap: Record<string, string> = {
    '&': '1',
    'é': '2',
    'É': '2',
    '"': '3',
    "'": '4',
    '(': '5',
    'è': '7',
    'È': '7',
    '_': '8',
    'ç': '9',
    'Ç': '9',
    'à': '0',
    'À': '0',
  };

  let out = '';
  for (let i = 0; i < rawStr.length; i++) {
    const ch = rawStr[i];
    // Gestion spécifique du tiret '-' (Touche 6 sur clavier AZERTY standard) :
    // - Si c'est un article en retour ou un signe négatif explicite au premier caractère : garder '-'
    // - Sinon, sur clavier AZERTY, la frappe de la touche 6 sans Shift produit un tiret '-' -> convertir en '6'
    if (ch === '-' && i === 0 && isNegativeAllowed) {
      out += '-';
    } else if (ch === '-') {
      out += '6';
    } else if (azertyMap[ch] !== undefined) {
      out += azertyMap[ch];
    } else if (arabicIndicDigits[ch] !== undefined) {
      out += arabicIndicDigits[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

export const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(
  ({ item, setQuantity }, ref) => {
    const [localVal, setLocalVal] = useState<string>(item.quantity.toString());
    const isFocusedRef = useRef<boolean>(false);

    useEffect(() => {
      if (!isFocusedRef.current) {
        setLocalVal(item.quantity.toString());
      }
    }, [item.quantity]);

    const isReturnItem = item.quantity < 0;

    const handleChange = (rawValStr: string) => {
      // 1. Conversion AZERTY & normalisation virgule vers point
      const converted = normalizeAzertyDigits(rawValStr, isReturnItem);
      const normalized = converted.replace(',', '.');
      
      if (normalized === '' || normalized === '-' || normalized === '.' || /^-?\d*[.]?\d*$/.test(normalized)) {
        setLocalVal(normalized);
        
        const parsed = parseFloat(normalized);
        if (!isNaN(parsed) && (isReturnItem ? parsed <= 0 : parsed >= 0)) {
          setQuantity(item.cartItemId || item.id, parsed, false);
        }
      }
    };

    const commitValue = () => {
      isFocusedRef.current = false;
      const converted = normalizeAzertyDigits(localVal, isReturnItem);
      const normalized = converted.replace(',', '.');
      const parsed = parseFloat(normalized);

      if (isReturnItem || parsed < 0) {
        if (isNaN(parsed) || parsed === 0) {
          setLocalVal('-1');
          setQuantity(item.cartItemId || item.id, -1, false);
        } else {
          const neg = -Math.abs(parsed);
          setLocalVal(neg.toString());
          setQuantity(item.cartItemId || item.id, neg, false);
        }
      } else {
        if (isNaN(parsed) || parsed <= 0) {
          setLocalVal('1');
          setQuantity(item.cartItemId || item.id, 1, false);
        } else {
          setLocalVal(parsed.toString());
          setQuantity(item.cartItemId || item.id, parsed, false);
        }
      }
    };

    const handleBlur = () => {
      commitValue();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Isolation absolue : empêcher les raccourcis globaux de capturer les frappes dans ce champ
      e.stopPropagation();

      if (e.key === 'Enter') {
        e.preventDefault();
        commitValue();
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setLocalVal(item.quantity.toString());
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const current = parseFloat(localVal) || 0;
        const next = current + 1;
        setLocalVal(next.toString());
        setQuantity(item.cartItemId || item.id, next, false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const current = parseFloat(localVal) || 0;
        const next = isReturnItem ? current - 1 : Math.max(1, current - 1);
        setLocalVal(next.toString());
        setQuantity(item.cartItemId || item.id, next, false);
      }
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        data-quantity-input="true"
        data-cart-item-id={item.cartItemId || item.id}
        data-item-id={item.id}
        ref={ref}
        value={localVal}
        onFocus={(e) => {
          isFocusedRef.current = true;
          e.target.select();
        }}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          e.stopPropagation();
          (e.target as HTMLInputElement).select();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="qty-input w-11 sm:w-14 px-1 text-center text-xs sm:text-sm font-black bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 outline-none text-slate-900 dark:text-white appearance-none m-0 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 rounded-md font-mono shadow-xs select-all"
        title="Modifier la quantité [F11]"
      />
    );
  }
);

QuantityInput.displayName = 'QuantityInput';
