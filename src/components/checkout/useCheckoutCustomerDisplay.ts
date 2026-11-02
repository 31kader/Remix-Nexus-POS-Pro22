import { useEffect } from 'react';
import { broadcastCustomerDisplay } from '../../services/customerDisplayService';
import { Customer } from '../../types';

interface UseCheckoutCustomerDisplayParams {
  cart: any[];
  displayTotal: number;
  discountAmount: number;
  subtotal: number;
  receivedAmount: string;
  selectedCustomer?: Customer | null;
  showSuccess: boolean;
}

export function useCheckoutCustomerDisplay({
  cart,
  displayTotal,
  discountAmount,
  subtotal,
  receivedAmount,
  selectedCustomer,
  showSuccess
}: UseCheckoutCustomerDisplayParams) {
  useEffect(() => {
    const numReceived = parseFloat(receivedAmount) || 0;
    const changeDue = numReceived > displayTotal ? numReceived - displayTotal : 0;
    broadcastCustomerDisplay({
      items: (cart || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        price: i.overriddenPrice ?? i.price ?? 0,
        quantity: i.quantity || 1,
        barcode: i.barcode || i.sku || ''
      })),
      subtotal: subtotal || 0,
      discountAmount: discountAmount || 0,
      total: displayTotal || 0,
      amountPaid: numReceived,
      changeDue: changeDue,
      customerName: selectedCustomer?.name,
      isPaid: showSuccess
    });
  }, [cart, displayTotal, discountAmount, subtotal, receivedAmount, selectedCustomer, showSuccess]);
}
