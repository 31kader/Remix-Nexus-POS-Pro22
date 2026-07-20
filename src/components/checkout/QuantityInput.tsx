import React, { useState, useEffect } from 'react';
import { CartItem } from '../../types';

interface QuantityInputProps {
  item: CartItem;
  setQuantity: (cartItemId: string, quantity: number) => void;
}

export const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(
  ({ item, setQuantity }, ref) => {
    const [localVal, setLocalVal] = useState<string>(item.quantity.toString());

    useEffect(() => {
      if (parseFloat(localVal) !== item.quantity) {
        setLocalVal(item.quantity.toString());
      }
    }, [item.quantity]);

    const handleChange = (valStr: string) => {
      const normalized = valStr.replace(',', '.');
      
      if (normalized === '' || normalized === '-' || /^-?\d*[.]?\d*$/.test(normalized)) {
        setLocalVal(valStr);
        
        const parsed = parseFloat(normalized);
        if (!isNaN(parsed)) {
          setQuantity(item.cartItemId || '', parsed);
        }
      }
    };

    const handleBlur = () => {
      const parsed = parseFloat(localVal.replace(',', '.'));
      if (isNaN(parsed) || parsed <= 0) {
        setLocalVal('0');
        setQuantity(item.cartItemId || '', 0);
      } else {
        setLocalVal(parsed.toString());
        setQuantity(item.cartItemId || '', parsed);
      }
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        ref={ref}
        value={localVal}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
        className="w-16 text-center text-lg font-black bg-transparent border-none outline-none text-white appearance-none m-0 focus:ring-0 italic font-mono"
      />
    );
  }
);

QuantityInput.displayName = 'QuantityInput';
