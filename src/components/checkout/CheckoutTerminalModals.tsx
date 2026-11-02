import React, { Suspense } from 'react';
import { LineDiscountModal } from './LineDiscountModal';
import { printReceipt } from '../../services/printService';

const CheckoutSuccessModal = React.lazy(() => import('./CheckoutSuccessModal').then(m => ({ default: m.CheckoutSuccessModal })));

interface CheckoutTerminalModalsProps {
  discountingItemId: string | null;
  setDiscountingItemId: (id: string | null) => void;
  discountingItem: any;
  currency: string;
  isWholesale: boolean;
  onApplyLineDiscount: (itemId: string, discount: { type: 'percentage' | 'fixed'; value: number } | null) => void;
  showSuccess: boolean;
  setShowSuccess: (show: boolean) => void;
  lastTransaction: any;
  settings: any;
  customers: any[];
}

export function CheckoutTerminalModals({
  discountingItemId,
  setDiscountingItemId,
  discountingItem,
  currency,
  isWholesale,
  onApplyLineDiscount,
  showSuccess,
  setShowSuccess,
  lastTransaction,
  settings,
  customers
}: CheckoutTerminalModalsProps) {
  return (
    <>
      {discountingItemId && (
        <LineDiscountModal
          isOpen={Boolean(discountingItemId)}
          onClose={() => setDiscountingItemId(null)}
          item={discountingItem}
          currency={currency}
          isWholesale={isWholesale}
          onApply={(discount) => {
            if (discountingItemId) {
              onApplyLineDiscount(discountingItemId, discount);
            }
          }}
        />
      )}

      {showSuccess && (
        <Suspense fallback={null}>
          <CheckoutSuccessModal
            isOpen={showSuccess}
            onClose={() => setShowSuccess(false)}
            lastTransaction={lastTransaction}
            settings={settings}
            customers={customers}
            printReceipt={(tx, st) => {
              printReceipt(tx, st);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
