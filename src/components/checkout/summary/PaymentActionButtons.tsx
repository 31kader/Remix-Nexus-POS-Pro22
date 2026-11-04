import React, { useState } from 'react';
import { Banknote, CreditCard, Printer, Smartphone } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CartItem } from '../../../types';
import { BaridiMobPaymentModal } from '../payment/BaridiMobPaymentModal';
import { TpePaymentModal } from '../payment/TpePaymentModal';

export interface PaymentActionButtonsProps {
  total: number;
  cart: CartItem[];
  isProcessing: boolean;
  editingTransaction?: any;
  handleCheckout: (method: 'cash' | 'card' | 'balance' | 'transfer', shouldPrint?: boolean) => void;
}

export const PaymentActionButtons: React.FC<PaymentActionButtonsProps> = ({
  total,
  cart,
  isProcessing,
  editingTransaction,
  handleCheckout
}) => {
  const [isBaridiOpen, setIsBaridiOpen] = useState(false);
  const [isTpeOpen, setIsTpeOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button 
          type="button"
          className={cn(
            "btn-touch-action flex items-center justify-between border transition-all font-black uppercase shadow-sm group active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none py-3 px-2.5 rounded-xl text-xs",
            "font-financial",
            editingTransaction
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100"
              : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
          )}
          onClick={() => handleCheckout('cash', false)}
          disabled={cart.length === 0 || isProcessing}
          title="ENCAISSEMENT ESPÈCES SANS IMPRESSION (F5)"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Banknote size={16} />
            <span className="truncate">{editingTransaction ? 'MàJ' : total < 0 ? 'RETOUR' : 'ESPÈCES'}</span>
          </div>
          <span className="font-mono font-black tracking-widest px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[8px]">
            F5
          </span>
        </button>

        <button 
          type="button"
          className={cn(
            "btn-touch-action flex items-center justify-center gap-1.5 border transition-all font-black uppercase shadow-sm group active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none py-3 px-2.5 rounded-xl text-xs",
            "font-financial",
            editingTransaction
              ? "bg-amber-100/50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300"
              : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
          )}
          onClick={() => setIsTpeOpen(true)}
          disabled={cart.length === 0 || isProcessing}
          title="ENCAISSEMENT CARTE / TPE (CIB / DAHABIA)"
        >
          <CreditCard size={16} />
          <span className="truncate">CARTE / TPE</span>
        </button>

        <button 
          type="button"
          className={cn(
            "btn-touch-action flex items-center justify-center gap-1.5 border transition-all font-black uppercase shadow-sm group active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none py-3 px-2 rounded-xl text-xs",
            "font-financial",
            "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-white hover:border-amber-500"
          )}
          onClick={() => setIsBaridiOpen(true)}
          disabled={cart.length === 0 || isProcessing || total <= 0}
          title="PAIEMENT BARIDIMOB / QR CODE"
        >
          <Smartphone size={16} />
          <span className="truncate">BARIDIMOB</span>
        </button>
      </div>

      <button 
        type="button"
        className={cn(
          "btn-touch-action font-financial w-full text-white font-black uppercase transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm tracking-wider",
          editingTransaction
            ? "bg-amber-600 hover:bg-amber-700"
            : total < 0
              ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
              : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
        )}
        onClick={() => handleCheckout('cash', true)}
        disabled={cart.length === 0 || isProcessing}
        title="VALIDER & IMPRIMER LE TICKET (ALT+P)"
      >
        <Printer size={18} />
        <span>
          {editingTransaction 
            ? 'METTRE À JOUR LE TICKET [ALT+P]' 
            : total < 0 
              ? 'VALIDER LE RETOUR [ALT+P]' 
              : 'VALIDER & IMPRIMER [ALT+P]'}
        </span>
      </button>

      <BaridiMobPaymentModal
        isOpen={isBaridiOpen}
        onClose={() => setIsBaridiOpen(false)}
        total={total}
        onConfirmPayment={() => handleCheckout('transfer', true)}
      />

      <TpePaymentModal
        isOpen={isTpeOpen}
        onClose={() => setIsTpeOpen(false)}
        amountDzd={total}
        onPaymentSuccess={() => {
          setIsTpeOpen(false);
          handleCheckout('card', true);
        }}
      />
    </>
  );
};
