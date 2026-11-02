import React, { Suspense } from 'react';

const QuickAddProductModal = React.lazy(() => import('../QuickAddProductModal').then(m => ({ default: m.QuickAddProductModal })));
const DeliveryRequestModal = React.lazy(() => import('../DeliveryRequestModal').then(m => ({ default: m.DeliveryRequestModal })));
const CustomerDisplayModal = React.lazy(() => import('./CustomerDisplayModal').then(m => ({ default: m.CustomerDisplayModal })));

interface CheckoutSecondaryModalsProps {
  isCustomerDisplayModalOpen: boolean;
  setIsCustomerDisplayModalOpen: (open: boolean) => void;
  isQuickAddModalOpen: boolean;
  setIsQuickAddModalOpen: (open: boolean) => void;
  isDeliveryModalOpen: boolean;
  setIsDeliveryModalOpen: (open: boolean) => void;
  newProductBarcode?: string;
  user?: any;
  displayTotal: number;
  onQuickAddSuccess: (product: any) => void;
}

export function CheckoutSecondaryModals({
  isCustomerDisplayModalOpen,
  setIsCustomerDisplayModalOpen,
  isQuickAddModalOpen,
  setIsQuickAddModalOpen,
  isDeliveryModalOpen,
  setIsDeliveryModalOpen,
  newProductBarcode,
  user,
  displayTotal,
  onQuickAddSuccess
}: CheckoutSecondaryModalsProps) {
  return (
    <>
      {isCustomerDisplayModalOpen && (
        <Suspense fallback={null}>
          <CustomerDisplayModal 
            isOpen={isCustomerDisplayModalOpen}
            onClose={() => setIsCustomerDisplayModalOpen(false)}
          />
        </Suspense>
      )}
      {isQuickAddModalOpen && (
        <Suspense fallback={null}>
          <QuickAddProductModal 
            isOpen={isQuickAddModalOpen}
            onClose={() => setIsQuickAddModalOpen(false)}
            barcode={newProductBarcode || ''}
            user={user}
            onSuccess={onQuickAddSuccess}
          />
        </Suspense>
      )}
      {isDeliveryModalOpen && (
        <Suspense fallback={null}>
          <DeliveryRequestModal 
            isOpen={isDeliveryModalOpen}
            onClose={() => setIsDeliveryModalOpen(false)}
            cartTotal={displayTotal}
          />
        </Suspense>
      )}
    </>
  );
}
