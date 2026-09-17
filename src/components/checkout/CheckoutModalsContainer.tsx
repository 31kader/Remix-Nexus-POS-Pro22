import React from 'react';
import { QuickAddProductModal } from '../QuickAddProductModal';
import { DeliveryRequestModal } from '../DeliveryRequestModal';
import { Product } from '../../types';

interface CheckoutModalsContainerProps {
  isQuickAddModalOpen: boolean;
  setIsQuickAddModalOpen: (open: boolean) => void;
  newProductBarcode: string;
  user: any;
  addToCart: (product: Product, quantity: number) => void;
  isReturnMode: boolean;
  isDeliveryModalOpen: boolean;
  setIsDeliveryModalOpen: (open: boolean) => void;
  displayTotal: number;
}

export function CheckoutModalsContainer({
  isQuickAddModalOpen,
  setIsQuickAddModalOpen,
  newProductBarcode,
  user,
  addToCart,
  isReturnMode,
  isDeliveryModalOpen,
  setIsDeliveryModalOpen,
  displayTotal
}: CheckoutModalsContainerProps) {
  return (
    <>
      <QuickAddProductModal 
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        barcode={newProductBarcode}
        user={user}
        onSuccess={(product: Product) => addToCart(product, isReturnMode ? -1 : 1)}
      />
      <DeliveryRequestModal 
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        cartTotal={displayTotal}
      />
    </>
  );
}
