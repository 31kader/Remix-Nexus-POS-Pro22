import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { CustomerSelection } from './CustomerSelection';
import { PaymentOrderSummary } from './PaymentOrderSummary';

export const CheckoutControlsPanel: React.FC<any> = ({
  selectedCustomer, setSelectedCustomer, customerSearch, setCustomerSearch, customers,
  isWholesale, setIsWholesale, useLoyaltyPoints, setUseLoyaltyPoints, settings,
  total, receivedAmount, setReceivedAmount, keepExcessInBalance, setKeepExcessInBalance,
  deliveryMethod, setDeliveryMethod, voucherCode, setVoucherCode,
  appliedVoucher, setAppliedVoucher, applyVoucher, subtotal,
  discountAmount, pointsDiscount, voucherDiscount, currency,
  cart, handleCheckout, isProcessing, setIsDeliveryModalOpen,
  addCustomerNote, setIsPOSCustomerModalOpen, globalDiscount, setGlobalDiscount,
  editingTransaction,
  onClose
}) => {
  return (
    <div id="checkout-panel" className="w-full lg:w-96 shrink-0 flex flex-col bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-xl z-10 transition-all relative overflow-y-auto h-full max-h-full no-scrollbar">
      {onClose && (
        <div className="hidden lg:flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 select-none">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Panneau Caisse</span>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Masquer le panneau de paiement"
          >
            <span>Réduire</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
      <CustomerSelection 
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        customerSearch={customerSearch}
        setCustomerSearch={setCustomerSearch}
        customers={customers}
        isWholesale={isWholesale}
        setIsWholesale={setIsWholesale}
        useLoyaltyPoints={useLoyaltyPoints}
        setUseLoyaltyPoints={setUseLoyaltyPoints}
        settings={settings}
        total={total}
        receivedAmount={receivedAmount}
        setReceivedAmount={setReceivedAmount}
        keepExcessInBalance={keepExcessInBalance}
        setKeepExcessInBalance={setKeepExcessInBalance}
        handleCheckout={handleCheckout}
        addCustomerNote={addCustomerNote}
        setIsPOSCustomerModalOpen={setIsPOSCustomerModalOpen}
      />
      <PaymentOrderSummary 
        deliveryMethod={deliveryMethod}
        setDeliveryMethod={setDeliveryMethod}
        voucherCode={voucherCode}
        setVoucherCode={setVoucherCode}
        appliedVoucher={appliedVoucher}
        setAppliedVoucher={setAppliedVoucher}
        applyVoucher={applyVoucher}
        subtotal={subtotal}
        discountAmount={discountAmount}
        pointsDiscount={pointsDiscount}
        voucherDiscount={voucherDiscount}
        total={total}
        currency={currency}
        cart={cart}
        selectedCustomer={selectedCustomer}
        handleCheckout={handleCheckout}
        isProcessing={isProcessing}
        setIsDeliveryModalOpen={setIsDeliveryModalOpen}
        settings={settings}
        globalDiscount={globalDiscount}
        setGlobalDiscount={setGlobalDiscount}
        editingTransaction={editingTransaction}
        receivedAmount={receivedAmount}
        setReceivedAmount={setReceivedAmount}
        keepExcessInBalance={keepExcessInBalance}
        setKeepExcessInBalance={setKeepExcessInBalance}
      />
    </div>
  );
};
