import React from 'react';
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
  addCustomerNote, setIsPOSCustomerModalOpen
}) => {
  return (
    <div id="checkout-panel" className="w-full lg:w-96 flex flex-col bg-slate-900/20 border-l border-slate-800/60 shadow-2xl z-10 transition-all relative overflow-y-auto h-full max-h-full no-scrollbar">
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
      />
    </div>
  );
};
