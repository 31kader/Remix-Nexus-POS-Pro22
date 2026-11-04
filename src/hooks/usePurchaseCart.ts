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
  // Packaging / Carton fields (Agent de saisie dépôt)
  cartonCount?: number;
  unitsPerCarton?: number;
  cartonCostPrice?: number;
  cartonPhotoUrl?: string;
};

export function usePurchaseCart(initialCart: PurchaseCartItem[] = []) {
  const [cart, setCart] = useState<PurchaseCartItem[]>(initialCart);

  const addToCart = useCallback((item: any) => {
    setCart(prev => {
      const productId = item.productId || item.id || '';
      const productName = item.productName || item.name || 'Article';
      const costPrice = item.costPrice !== undefined ? item.costPrice : (item.cost_price !== undefined ? item.cost_price : 0);
      // Approvisionnement : TVA à 0% par défaut (la TVA de vente au détail ne s'applique pas aux achats)
      const taxRate = typeof item.purchaseTaxRate === 'number'
        ? item.purchaseTaxRate
        : (typeof item.taxRate === 'number' && item.taxRate !== 19
            ? item.taxRate
            : (typeof item.tax_rate === 'number' && item.tax_rate !== 19 ? item.tax_rate : 0));
      const imageUrl = item.imageUrl || item.image_url;
      const isDraft = !!item.isDraft;

      // Colisage / Carton
      const cartonCount = item.cartonCount !== undefined ? Number(item.cartonCount) : undefined;
      const unitsPerCarton = item.unitsPerCarton !== undefined ? Number(item.unitsPerCarton) : undefined;
      const cartonCostPrice = item.cartonCostPrice !== undefined ? Number(item.cartonCostPrice) : undefined;
      const cartonPhotoUrl = item.cartonPhotoUrl || item.carton_photo_url;

      // Si cartonCount et unitsPerCarton sont spécifiés, la quantité totale est cartonCount * unitsPerCarton
      const computedQuantity = (cartonCount && unitsPerCarton)
        ? (cartonCount * unitsPerCarton)
        : (item.quantity !== undefined ? Number(item.quantity) : 1);

      if (productId && !isDraft) {
        const existing = prev.find(i => i.productId === productId && !i.isDraft);
        if (existing) {
          const newCartonCount = (existing.cartonCount || 0) + (cartonCount || 0);
          return prev.map(i => i === existing ? {
            ...i,
            quantity: i.quantity + computedQuantity,
            cartonCount: newCartonCount > 0 ? newCartonCount : existing.cartonCount,
            unitsPerCarton: unitsPerCarton || existing.unitsPerCarton,
            cartonCostPrice: cartonCostPrice || existing.cartonCostPrice,
            cartonPhotoUrl: cartonPhotoUrl || existing.cartonPhotoUrl
          } : i);
        }
      }

      return [...prev, {
        lineId: item.lineId || Math.random().toString(36).substring(2, 9),
        productId,
        productName,
        quantity: computedQuantity,
        costPrice,
        discount: item.discount || 0,
        taxRate,
        imageUrl,
        isDraft,
        cartonCount,
        unitsPerCarton,
        cartonCostPrice,
        cartonPhotoUrl
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
