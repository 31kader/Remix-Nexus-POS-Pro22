import { useState, useCallback } from 'react';

export type PurchaseCartItem = {
  lineId: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  discount: number;
  taxRate: number;
  imageUrl?: string;
  isDraft?: boolean;
};

export function usePurchaseCart(initialCart: PurchaseCartItem[] = []) {
  const [cart, setCart] = useState<PurchaseCartItem[]>(initialCart);

  const addToCart = useCallback((item: any) => {
    setCart(prev => {
      const productId = item.productId || item.id || '';
      const productName = item.productName || item.name || 'Article';
      const costPrice = item.costPrice !== undefined ? item.costPrice : (item.cost_price !== undefined ? item.cost_price : 0);
      const taxRate = item.taxRate !== undefined ? item.taxRate : (item.tax_rate !== undefined ? item.tax_rate : 19);
      const imageUrl = item.imageUrl || item.image_url;
      const isDraft = !!item.isDraft;

      if (productId && !isDraft) {
        const existing = prev.find(i => i.productId === productId && !i.isDraft);
        if (existing) {
          return prev.map(i => i === existing ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i);
        }
      }
      return [...prev, {
        lineId: item.lineId || Math.random().toString(36).substring(2, 9),
        productId,
        productName,
        quantity: item.quantity || 1,
        costPrice,
        discount: item.discount || 0,
        taxRate,
        imageUrl,
        isDraft
      }];
    });
  }, []);

  const removeFromCart = useCallback((lineId: string) => {
    setCart(prev => prev.filter(item => item.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setCart(prev => prev.map(item => item.lineId === lineId ? { ...item, quantity: Math.max(0, quantity) } : item));
  }, []);

  const updateItemField = useCallback((lineId: string, field: keyof PurchaseCartItem, value: any) => {
    setCart(prev => prev.map(item => item.lineId === lineId ? { ...item, [field]: value } : item));
  }, []);

  return { cart, setCart, addToCart, removeFromCart, updateQuantity, updateItemField };
}
