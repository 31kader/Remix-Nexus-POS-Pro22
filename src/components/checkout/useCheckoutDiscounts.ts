import { useState, useEffect, useCallback } from 'react';
import { CartItem, Transaction } from '../../types';
import { calculateItemPrice } from '../../lib/utils';

interface UseCheckoutDiscountsProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  editingTransaction: Transaction | null;
  activeSessionId: string;
  showSuccess: boolean;
}

export function useCheckoutDiscounts({
  cart,
  setCart,
  editingTransaction,
  activeSessionId,
  showSuccess,
}: UseCheckoutDiscountsProps) {
  const [globalDiscount, setGlobalDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number } | null>(null);
  const [discountingItemId, setDiscountingItemId] = useState<string | null>(null);
  const [lineDiscountType, setLineDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [lineDiscountValue, setLineDiscountValue] = useState<string>('0');

  // Reset session-specific discount when switching active session (sauf si un ticket en modification porte une remise)
  useEffect(() => {
    if (!editingTransaction) {
      setGlobalDiscount(null);
    }
  }, [activeSessionId]);

  // Restaurer automatiquement la remise effectuée en caisse lorsqu'on ouvre un ancien panier ("Modifier Panier en Caisse")
  useEffect(() => {
    if (editingTransaction) {
      const explicitDiscount = Number(
        editingTransaction.discountAmount ??
        (editingTransaction as any).discount_amount ??
        0
      );
      const rawItems = Array.isArray(editingTransaction.items) ? editingTransaction.items : [];
      const itemsSubtotal = rawItems.reduce((sum: number, it: any) => {
        const unitP = Number(calculateItemPrice(it, editingTransaction.isWholesale) ?? it?.price ?? 0);
        const q = Number(it?.quantity) || 1;
        return sum + unitP * q;
      }, 0);
      const txTotal = Number(editingTransaction.total ?? itemsSubtotal);
      const pointsAndVoucher = Number(editingTransaction.pointsDiscount || 0) + Number(editingTransaction.voucherDiscount || 0);
      const implicitDiscount = Math.max(0, Math.round((itemsSubtotal - txTotal - pointsAndVoucher) * 100) / 100);
      const finalRestoredDiscount = explicitDiscount > 0 ? explicitDiscount : implicitDiscount;

      if (finalRestoredDiscount > 0) {
        setGlobalDiscount({ type: 'fixed', value: finalRestoredDiscount });
      } else {
        setGlobalDiscount(null);
      }
    }
  }, [editingTransaction?.id]);

  useEffect(() => {
    if (showSuccess) {
      setGlobalDiscount(null);
    }
  }, [showSuccess]);

  useEffect(() => {
    if (discountingItemId) {
      const safeCart = Array.isArray(cart) ? cart : [];
      const item = safeCart.find(i => i && i.cartItemId === discountingItemId);
      if (item?.lineDiscount) {
        setLineDiscountType(item.lineDiscount.type);
        setLineDiscountValue(item.lineDiscount.value.toString());
      } else {
        setLineDiscountType('percentage');
        setLineDiscountValue('0');
      }
    }
  }, [discountingItemId, cart]);

  // 🛡️ SÉCURISÉ : Protection de setLineDiscount
  const setLineDiscount = useCallback((cartItemId: string, discount: { type: 'percentage' | 'fixed'; value: number } | null) => {
    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(item => {
        if (item && item.cartItemId === cartItemId) return { ...item, lineDiscount: discount || undefined };
        return item;
      });
    });
  }, [setCart]);

  return {
    globalDiscount,
    setGlobalDiscount,
    discountingItemId,
    setDiscountingItemId,
    lineDiscountType,
    setLineDiscountType,
    lineDiscountValue,
    setLineDiscountValue,
    setLineDiscount,
  };
}
