import React, { useState, useEffect } from 'react';
import { CartItem } from '../../types';

interface QuantityInputProps {
  item: CartItem;
  setQuantity: (cartItemId: string, quantity: number, shouldFocusSearch?: boolean) => void;
}

/**
 * Normalise la saisie pour gérer nativement les claviers AZERTY français/algériens
 * sans forcer l'utilisateur à maintenir Shift ou verrouiller Majuscule.
 * & -> 1, é -> 2, " -> 3, ' -> 4, ( -> 5, è -> 7, _ -> 8, ç -> 9, à -> 0
 */
function normalizeAzertyDigits(rawStr: string, isNegativeAllowed: boolean): string {
  if (!rawStr) return rawStr;
  
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
    if (ch === '-' && i === 0 && isNegativeAllowed) {
      out += '-';
    } else if (ch === '-' && i > 0) {
      out += '6'; // sur AZERTY standard, la touche 6 sans shift produit un tiret '-'
    } else if (azertyMap[ch] !== undefined) {
      out += azertyMap[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

export const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(
  ({ item, setQuantity }, ref) => {
    const [localVal, setLocalVal] = useState<string>(item.quantity.toString());
    const [isFocused, setIsFocused] = useState<boolean>(false);

    useEffect(() => {
      if (!isFocused) {
        setLocalVal(item.quantity.toString());
      }
    }, [item.quantity, isFocused]);

    const isReturnItem = item.quantity < 0;

    const handleChange = (rawValStr: string) => {
      // 1. Conversion AZERTY & normalisation virgule vers point
      const converted = normalizeAzertyDigits(rawValStr, isReturnItem || rawValStr.startsWith('-'));
      const normalized = converted.replace(',', '.');
      
      if (normalized === '' || normalized === '-' || normalized === '.' || /^-?\d*[.]?\d*$/.test(normalized)) {
        setLocalVal(normalized);
        
        const parsed = parseFloat(normalized);
        if (!isNaN(parsed) && (isReturnItem || normalized.startsWith('-') ? parsed <= 0 : parsed >= 0)) {
          setQuantity(item.cartItemId || item.id, parsed, false);
        }
      }
    };

    const commitValue = () => {
      setIsFocused(false);
      const converted = normalizeAzertyDigits(localVal, isReturnItem || localVal.startsWith('-'));
      const normalized = converted.replace(',', '.');
      const parsed = parseFloat(normalized);

      if (isReturnItem || normalized.startsWith('-') || parsed < 0) {
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
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        commitValue();
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setLocalVal(item.quantity.toString());
        (e.target as HTMLInputElement).blur();
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
          setIsFocused(true);
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
        className="qty-input w-24 min-w-[5.5rem] px-1 text-center text-lg font-black bg-white dark:bg-zinc-800/80 border border-slate-300 dark:border-white/10 outline-none text-slate-900 dark:text-white appearance-none m-0 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg font-mono shadow-xs"
        title="Modifier la quantité [F11]"
      />
    );
  }
);

QuantityInput.displayName = 'QuantityInput';
