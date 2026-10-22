import React, { useState, useEffect } from 'react';
import { CartItem } from '../../types';

interface QuantityInputProps {
  item: CartItem;
  setQuantity: (cartItemId: string, quantity: number, shouldFocusSearch?: boolean) => void;
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

    const handleChange = (valStr: string) => {
      const normalized = valStr.replace(',', '.');
      
      if (valStr === '' || valStr === '-' || valStr === '.' || valStr === ',' || /^-?\d*[.,]?\d*$/.test(valStr)) {
        setLocalVal(valStr);
        
        const parsed = parseFloat(normalized);
        if (!isNaN(parsed) && (isReturnItem || valStr.startsWith('-') ? parsed <= 0 : parsed >= 0)) {
          setQuantity(item.cartItemId || item.id, parsed, false);
        }
      }
    };

    const commitValue = () => {
      setIsFocused(false);
      const normalized = localVal.replace(',', '.');
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
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-24 min-w-[5.5rem] px-1 text-center text-lg font-black bg-transparent border-none outline-none text-slate-900 dark:text-white appearance-none m-0 focus:ring-2 focus:ring-indigo-500/50 rounded-lg font-mono"
      />
    );
  }
);

QuantityInput.displayName = 'QuantityInput';
