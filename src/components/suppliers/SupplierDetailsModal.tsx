import React, { memo } from 'react';
import { 
  Supplier, Product, CompanySettings, Category, DamagedRecord, SupplierPayment 
} from '../../types';
import { Modal } from '../ui';
import { SupplierDamagedTab } from './SupplierDamagedTab';
import { SupplierProductsTab } from './SupplierProductsTab';
import { SupplierDetailsHeader } from './details/SupplierDetailsHeader';
import { SupplierPurchasesTab } from './details/SupplierPurchasesTab';
import { SupplierPaymentsTab } from './details/SupplierPaymentsTab';

interface SupplierDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingDetailsSupplier: Supplier | null;
  settings: CompanySettings;
  products: Product[];
  categories: Category[];
  purchases: any[];
  damagedItems: DamagedRecord[];
  supplierPayments: any[];
  activeDetailsTab: 'products' | 'purchases' | 'payments' | 'damaged';
  setActiveDetailsTab: (tab: 'products' | 'purchases' | 'payments' | 'damaged') => void;
  setViewingPurchaseVoucher: (p: any) => void;
  setIsPaymentModalOpen: (v: boolean) => void;
  setIsDamageModalOpen: (v: boolean) => void;
  paymentData: { amount: number; method: 'cash' | 'card' | 'transfer' | 'check'; note: string; date: string };
  setPaymentData: (v: any) => void;
  poDraftItems: { productId: string; productName: string; quantity: number; price: number }[];
  setPoDraftItems: React.Dispatch<React.SetStateAction<{ productId: string; productName: string; quantity: number; price: number }[]>>;
  isPODraftOpen: boolean;
  setIsPODraftOpen: (v: boolean) => void;
  isSavingPurchaseOrder: boolean;
  handleSavePurchaseOrderDraft: () => Promise<void>;
  selectedProductForDamage: Product | null;
  setSelectedProductForDamage: (p: Product | null) => void;
  damageData: { quantity: number; reason: string };
  setDamageData: (v: any) => void;
  handleUpdateClaimStatus: (recordId: string, status: string) => Promise<void>;
  setEditingPayment: (p: SupplierPayment | null) => void;
  handlePaymentDelete: (payment: SupplierPayment) => Promise<void>;
  togglePoDraftItem?: (product: Product, supplierName: string) => void;
}

export const SupplierDetailsModal = memo(function SupplierDetailsModal({
  isOpen,
  onClose,
  viewingDetailsSupplier,
  settings,
  products,
  categories,
  purchases,
  damagedItems,
  supplierPayments,
  activeDetailsTab,
  setActiveDetailsTab,
  setViewingPurchaseVoucher,
  setIsPaymentModalOpen,
  setIsDamageModalOpen,
  paymentData,
  setPaymentData,
  poDraftItems,
  setPoDraftItems,
  isPODraftOpen,
  setIsPODraftOpen,
  isSavingPurchaseOrder,
  handleSavePurchaseOrderDraft,
  selectedProductForDamage,
  setSelectedProductForDamage,
  damageData,
  setDamageData,
  handleUpdateClaimStatus,
  setEditingPayment,
  handlePaymentDelete,
  togglePoDraftItem = () => {}
}: SupplierDetailsModalProps) {
  if (!viewingDetailsSupplier) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={null}
      maxWidth="max-w-[96vw]"
      maxHeight="max-h-[96vh]"
      padding="p-0"
    >
      <div className="flex flex-col bg-[#0a0a0f] h-[96vh] max-h-[96vh] overflow-hidden text-white text-left">
        <SupplierDetailsHeader
          onClose={onClose}
          viewingDetailsSupplier={viewingDetailsSupplier}
          settings={settings}
          activeDetailsTab={activeDetailsTab}
          setActiveDetailsTab={setActiveDetailsTab}
          paymentData={paymentData}
          setPaymentData={setPaymentData}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#0a0a0f]">
          {activeDetailsTab === 'products' && (
            <SupplierProductsTab
              products={products}
              supplier={viewingDetailsSupplier}
              settings={settings}
              categories={categories}
              isPODraftOpen={isPODraftOpen}
              setIsPODraftOpen={setIsPODraftOpen}
              poDraftItems={poDraftItems}
              setPoDraftItems={setPoDraftItems}
              togglePoDraftItem={togglePoDraftItem}
              isSavingPurchaseOrder={isSavingPurchaseOrder}
              handleSavePurchaseOrderDraft={handleSavePurchaseOrderDraft}
              setSelectedProductForDamage={setSelectedProductForDamage}
              setDamageData={setDamageData}
              setIsDamageModalOpen={setIsDamageModalOpen}
            />
          )}

          {activeDetailsTab === 'purchases' && (
            <SupplierPurchasesTab
              viewingDetailsSupplier={viewingDetailsSupplier}
              purchases={purchases}
              settings={settings}
              paymentData={paymentData}
              setPaymentData={setPaymentData}
              setIsPaymentModalOpen={setIsPaymentModalOpen}
              onClose={onClose}
              setViewingPurchaseVoucher={setViewingPurchaseVoucher}
            />
          )}

          {activeDetailsTab === 'damaged' && (
            <SupplierDamagedTab
              damagedItems={damagedItems}
              products={products}
              viewingDetailsSupplier={viewingDetailsSupplier}
              settings={settings}
              setSelectedProductForDamage={setSelectedProductForDamage}
              setDamageData={setDamageData}
              setIsDamageModalOpen={setIsDamageModalOpen}
              handleUpdateClaimStatus={handleUpdateClaimStatus}
            />
          )}

          {activeDetailsTab === 'payments' && (
            <SupplierPaymentsTab
              viewingDetailsSupplier={viewingDetailsSupplier}
              supplierPayments={supplierPayments}
              settings={settings}
              paymentData={paymentData}
              setPaymentData={setPaymentData}
              setIsPaymentModalOpen={setIsPaymentModalOpen}
              setEditingPayment={setEditingPayment}
              handlePaymentDelete={handlePaymentDelete}
            />
          )}
        </div>
      </div>
    </Modal>
  );
});
