import { useState } from 'react';
import { Product, PurchaseCartItem } from '../types';
import { generateUniqueId } from '../lib/utils';

export function usePurchaseCart(initialCart: PurchaseCartItem[] = []) {
  const [cart, setCart] = useState<PurchaseCartItem[]>(initialCart);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: (item.quantity || 1) + 1 } : item);
      }
      return [...prev, {
        lineId: generateUniqueId(),
        productId: product.id,
        productName: product.name,
        quantity: 1,
        costPrice: product.costPrice || 0,
        taxRate: product.taxRate || 0,
        discount: 0,
        imageUrl: product.imageUrl
      }];
    });
  };

  const removeFromCart = (lineId: string) => {
    setCart(prev => prev.filter(item => item.lineId !== lineId));
  };

  const updateQuantity = (lineId: string, quantity: number) => {
    setCart(prev => prev.map(item => item.lineId === lineId ? { ...item, quantity: Math.max(0, quantity) } : item));
  };

  const updateItemField = (lineId: string, field: keyof PurchaseCartItem, value: any) => {
    setCart(prev => prev.map(item => item.lineId === lineId ? { ...item, [field]: value } : item));
  };

  return {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateItemField
  };
}
