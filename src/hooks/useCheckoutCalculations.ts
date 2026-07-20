import { useMemo } from 'react';
import { CartItem, Promotion, Customer, CompanySettings, Voucher } from '../types';
import { calculateItemPrice } from '../lib/utils';

interface UseCheckoutCalculationsProps {
  cart: CartItem[];
  isWholesale: boolean;
  promotions: Promotion[];
  activePromotion: Promotion | null;
  selectedCustomer: Customer | null;
  useLoyaltyPoints: boolean;
  appliedVoucher: Voucher | null;
  settings: CompanySettings;
}

export function useCheckoutCalculations({
  cart,
  isWholesale,
  promotions,
  activePromotion,
  selectedCustomer,
  useLoyaltyPoints,
  appliedVoucher,
  settings,
}: UseCheckoutCalculationsProps) {
  return useMemo(() => {
    // 1. Calculate subtotal
    const subtotal = cart.reduce((sum: number, item: CartItem) => {
      const itemPrice = parseFloat(calculateItemPrice(item, isWholesale)?.toString()) || 0;
      const quantity = parseFloat(item.quantity?.toString()) || 0;
      return sum + (itemPrice * Math.max(-999, isNaN(quantity) ? 0 : quantity));
    }, 0);

    // 2. Identify automatic promotions (no code required)
    const autoPromotion = promotions.find((p: Promotion) => {
      if (p.code || !p.isActive) return false;
      const now = new Date();
      const start = p.startDate ? new Date(p.startDate) : null;
      const end = p.endDate ? new Date(p.endDate) : null;
      if (start && start > now) return false;
      if (end && end < now) return false;
      return !p.minPurchase || subtotal >= p.minPurchase;
    });

    const promotionToApply = activePromotion || autoPromotion;

    let total = subtotal;
    let discountAmount = 0;

    // 3. Apply promotional discounts
    if (promotionToApply) {
      const isApplicable = (item: CartItem) => {
        const hasCats = promotionToApply.applicableCategories && promotionToApply.applicableCategories.length > 0;
        const hasProds = promotionToApply.applicableProducts && promotionToApply.applicableProducts.length > 0;
        
        if (!hasCats && !hasProds) return true;
        
        const catMatch = hasCats && item.categoryId && promotionToApply.applicableCategories?.includes(item.categoryId);
        const prodMatch = hasProds && promotionToApply.applicableProducts?.includes(item.id);
        
        return catMatch || prodMatch;
      };

      if (promotionToApply.type === 'percentage') {
        const applicableSubtotal = cart.reduce((sum: number, item: CartItem) => {
          const p = parseFloat(item.price?.toString()) || 0;
          const q = parseFloat(item.quantity?.toString()) || 0;
          return isApplicable(item) ? sum + ((isNaN(p) ? 0 : p) * Math.max(0, isNaN(q) ? 0 : q)) : sum;
        }, 0);
        const val = parseFloat(promotionToApply.value?.toString());
        discountAmount = applicableSubtotal * ((isNaN(val) ? 0 : val) / 100);
      } else if (promotionToApply.type === 'fixed') {
        const val = parseFloat(promotionToApply.value?.toString());
        discountAmount = isNaN(val) ? 0 : val;
      } else if (promotionToApply.type === 'buy_x_get_y' && promotionToApply.buyQuantity && promotionToApply.getQuantity) {
        cart.forEach((item: CartItem) => {
          if (isApplicable(item)) {
            const q = parseFloat(item.quantity?.toString()) || 0;
            const p = parseFloat(item.price?.toString()) || 0;
            const safeQ = isNaN(q) ? 0 : Math.max(0, q);
            const safeP = isNaN(p) ? 0 : Math.max(0, p);
            
            const sets = Math.floor(safeQ / (promotionToApply.buyQuantity! + promotionToApply.getQuantity!));
            const remaining = safeQ % (promotionToApply.buyQuantity! + promotionToApply.getQuantity!);
            const discountedInRemaining = Math.max(0, remaining - promotionToApply.buyQuantity!);
            
            const totalDiscountedQty = (sets * promotionToApply.getQuantity!) + discountedInRemaining;
            const val = parseFloat(promotionToApply.value?.toString());
            discountAmount += totalDiscountedQty * safeP * ((isNaN(val) ? 0 : val) / 100);
          }
        });
      }
      total = Math.max(0, subtotal - (discountAmount || 0));
    }

    // 4. Calculate Customer profile loyalty points discounts
    const customerLoyaltyPoints = Number(selectedCustomer?.loyaltyPoints || 0);
    const pointValue = Number(settings?.loyaltyPointValue || 0.01);

    const pointsDiscount = (useLoyaltyPoints && selectedCustomer && customerLoyaltyPoints > 0)
      ? Math.min(total, customerLoyaltyPoints * pointValue)
      : 0;
    
    // 5. Calculate Applied physical/gift Voucher discounts
    let voucherDiscount = 0;
    if (appliedVoucher) {
      const vVal = Number(appliedVoucher.value || 0);
      if (appliedVoucher.type === 'percent') {
        voucherDiscount = (total - pointsDiscount) * (vVal / 100);
      } else {
        const vBalance = Number(appliedVoucher.currentBalance ?? vVal);
        voucherDiscount = Math.min(total - pointsDiscount, vBalance);
      }
    }

    total = Math.max(0, total - pointsDiscount - voucherDiscount);

    return {
      subtotal,
      discountAmount,
      pointsDiscount,
      voucherDiscount,
      total,
      promotionToApply
    };
  }, [
    cart,
    isWholesale,
    promotions,
    activePromotion,
    selectedCustomer,
    useLoyaltyPoints,
    appliedVoucher,
    settings
  ]);
}
