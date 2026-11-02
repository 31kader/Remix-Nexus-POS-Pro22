import React, { memo } from 'react';
import { cn } from '../../lib/utils';
import { CompanySettings, Voucher, Customer, CartItem } from '../../types';
import {
  ServiceMethodSelector,
  GlobalDiscountSection,
  VoucherInputSection,
  OrderTotalsDisplay,
  CashReceivedTerminal,
  PaymentActionButtons
} from './summary';

interface PaymentOrderSummaryProps {
  deliveryMethod: 'in_store' | 'delivery' | 'pickup';
  setDeliveryMethod: (m: 'in_store' | 'delivery' | 'pickup') => void;
  voucherCode: string;
  setVoucherCode: (s: string) => void;
  appliedVoucher: Voucher | null;
  setAppliedVoucher: (v: Voucher | null) => void;
  applyVoucher: () => void;
  subtotal: number;
  discountAmount: number;
  pointsDiscount: number;
  voucherDiscount: number;
  total: number;
  currency: string;
  cart: CartItem[];
  selectedCustomer: Customer | null;
  handleCheckout: (method: 'cash' | 'card' | 'balance', shouldPrint?: boolean) => void;
  isProcessing: boolean;
  setIsDeliveryModalOpen: (v: boolean) => void;
  settings: CompanySettings;
  globalDiscount?: { type: 'percentage' | 'fixed'; value: number } | null;
  setGlobalDiscount?: (d: { type: 'percentage' | 'fixed'; value: number } | null) => void;
  editingTransaction?: any;
  receivedAmount?: string;
  setReceivedAmount?: (v: string) => void;
  keepExcessInBalance?: boolean;
  setKeepExcessInBalance?: (v: boolean) => void;
}

export const PaymentOrderSummary = memo(function PaymentOrderSummary({
  deliveryMethod,
  setDeliveryMethod,
  voucherCode,
  setVoucherCode,
  appliedVoucher,
  setAppliedVoucher,
  applyVoucher,
  subtotal,
  discountAmount,
  pointsDiscount,
  voucherDiscount,
  total,
  currency,
  cart,
  selectedCustomer,
  handleCheckout,
  isProcessing,
  settings,
  globalDiscount,
  setGlobalDiscount,
  editingTransaction,
  receivedAmount = '',
  setReceivedAmount,
  keepExcessInBalance = false,
  setKeepExcessInBalance
}: PaymentOrderSummaryProps) {
  const totalItems = (cart || []).reduce((sum, item) => sum + Math.abs(item.quantity), 0);
  const isDense = Boolean(settings?.fastModeEnabled);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black/20 select-none">
      <div className={cn(
        "flex-1 overflow-y-auto custom-scrollbar",
        isDense ? "p-2.5 space-y-2" : "p-3 space-y-3"
      )}>
        {/* Mode de Service */}
        <ServiceMethodSelector
          deliveryMethod={deliveryMethod}
          setDeliveryMethod={setDeliveryMethod}
        />

        {/* Remise Globale Panier */}
        <GlobalDiscountSection
          globalDiscount={globalDiscount}
          setGlobalDiscount={setGlobalDiscount}
          discountAmount={discountAmount}
          currency={currency}
        />

        {/* Coupon / Voucher */}
        <VoucherInputSection
          voucherCode={voucherCode}
          setVoucherCode={setVoucherCode}
          appliedVoucher={appliedVoucher}
          setAppliedVoucher={setAppliedVoucher}
          applyVoucher={applyVoucher}
          currency={currency}
        />
      </div>

      <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 space-y-2.5 shadow-lg">
        {/* Affichage des Totaux */}
        <OrderTotalsDisplay
          subtotal={subtotal}
          discountAmount={discountAmount}
          pointsDiscount={pointsDiscount}
          voucherDiscount={voucherDiscount}
          total={total}
          currency={currency}
          totalItems={totalItems}
          selectedCustomer={selectedCustomer}
          settings={settings}
        />

        {editingTransaction && (
          <div className="p-3 bg-amber-500/15 dark:bg-amber-950/40 border border-amber-500/40 rounded-xl text-center space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5">
              <span>⚠️</span>
              <span>Modification Ticket #{String(editingTransaction.id || '').slice(-8).toUpperCase()}</span>
            </div>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
              Le ticket existant sera mis à jour en place (aucun doublon). Les écarts de stocks et de fidélité seront calculés automatiquement.
            </p>
          </div>
        )}

        {/* Terminal de Règlement Espèces épuré */}
        {total > 0 && setReceivedAmount && (
          <CashReceivedTerminal
            total={total}
            currency={currency}
            receivedAmount={receivedAmount}
            setReceivedAmount={setReceivedAmount}
            selectedCustomer={selectedCustomer}
            keepExcessInBalance={keepExcessInBalance}
            setKeepExcessInBalance={setKeepExcessInBalance}
          />
        )}

        {/* Boutons d'Action / Encaissement */}
        <PaymentActionButtons
          total={total}
          cart={cart}
          isProcessing={isProcessing}
          editingTransaction={editingTransaction}
          handleCheckout={handleCheckout}
        />
      </div>
    </div>
  );
});

PaymentOrderSummary.displayName = 'PaymentOrderSummary';
