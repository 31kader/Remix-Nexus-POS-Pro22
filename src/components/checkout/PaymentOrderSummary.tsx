import React, { memo } from 'react';
import { Store, Truck, ShoppingBag, X, Gift, Banknote, CreditCard, Wallet, Printer, ArrowRight, Zap, Shield, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CompanySettings, Voucher, Customer, CartItem } from '../../types';

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
  setIsDeliveryModalOpen,
  settings,
  globalDiscount,
  setGlobalDiscount,
  editingTransaction
}: PaymentOrderSummaryProps) {
  const totalItems = (cart || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black/20">
      <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
        {/* Mode de Service */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-neon-indigo" />
            Mode de Service
          </h4>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { id: 'in_store', icon: Store, label: 'COMPTOIR' },
              { id: 'delivery', icon: Truck, label: 'LIVRER' },
              { id: 'pickup', icon: ShoppingBag, label: 'RETRAIT' }
            ].map((m) => (
              <button 
                key={m.id}
                onClick={() => setDeliveryMethod(m.id as any)}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 sm:p-5 rounded-[2rem] border transition-all active:scale-90 group relative overflow-hidden shadow-sm cursor-pointer",
                  deliveryMethod === m.id 
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-neon-indigo ring-1 ring-white/20"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-500 border-slate-200 dark:border-white/5 hover:border-slate-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <div className={cn("p-2.5 sm:p-3 rounded-2xl transition-all group-hover:scale-110", deliveryMethod === m.id ? "bg-white/20 shadow-inner" : "bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5")}>
                  <m.icon size={24} className={cn("transition-colors", deliveryMethod === m.id ? "text-white" : "text-slate-600 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400")} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Remise Globale Panier */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-neon-cyan" />
            Remise Globale (Panier)
          </h4>
          <div className="flex gap-2">
            <div className="flex bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setGlobalDiscount && setGlobalDiscount(globalDiscount ? { ...globalDiscount, type: 'percentage' } : { type: 'percentage', value: 0 })}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer",
                  (!globalDiscount || globalDiscount.type === 'percentage') ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setGlobalDiscount && setGlobalDiscount(globalDiscount ? { ...globalDiscount, type: 'fixed' } : { type: 'fixed', value: 0 })}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer",
                  (globalDiscount?.type === 'fixed') ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {currency}
              </button>
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={globalDiscount && globalDiscount.value > 0 ? globalDiscount.value : ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (setGlobalDiscount) {
                    if (raw === '') {
                      setGlobalDiscount({
                        type: globalDiscount?.type || 'percentage',
                        value: 0
                      });
                    } else {
                      const val = parseFloat(raw);
                      if (!isNaN(val) && val >= 0) {
                        setGlobalDiscount({
                          type: globalDiscount?.type || 'percentage',
                          value: val
                        });
                      }
                    }
                  }
                }}
                className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/5 transition-all"
              />
              {globalDiscount && globalDiscount.value > 0 && (
                <button
                  type="button"
                  onClick={() => setGlobalDiscount && setGlobalDiscount(null)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Voucher Input */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="CODE COUPON / CADEAU..."
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              className="flex-1 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-800 focus:outline-none focus:border-indigo-500/40 transition-all"
            />
            <button
              onClick={applyVoucher}
              className="px-6 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 cursor-pointer"
            >
              APPLIQUER
            </button>
          </div>
          {appliedVoucher && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-black">
              <span>{appliedVoucher.code} ({appliedVoucher.type === 'percent' ? `${appliedVoucher.value}%` : `${appliedVoucher.currentBalance ?? appliedVoucher.value} ${currency}`})</span>
              <button onClick={() => setAppliedVoucher(null)} className="hover:text-rose-500 transition-colors p-1 cursor-pointer"><X size={16} /></button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-8 bg-slate-50 dark:bg-black/60 border-t border-slate-200 dark:border-white/5 space-y-6 backdrop-blur-3xl ring-1 ring-slate-200/50 dark:ring-white/5">
        <div className="space-y-3">
          <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] px-2 italic">
            <span>SOUS-TOTAL BRUT</span>
            <span className="font-mono text-slate-700 dark:text-slate-400 tracking-tighter">{(isNaN(subtotal) ? 0 : subtotal).toFixed(2)} {currency}</span>
          </div>

          <div className="space-y-2 px-2">
            {(discountAmount || 0) > 0 && (
              <div className="flex justify-between text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-rose-500" /> REMISES TOTALES</span>
                <span className="font-mono tracking-tighter">-{(isNaN(discountAmount) ? 0 : discountAmount).toFixed(2)} {currency}</span>
              </div>
            )}
            {(pointsDiscount || 0) > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-amber-500" /> FIDÉLITÉ DÉDUITE</span>
                <span className="font-mono tracking-tighter">-{(isNaN(pointsDiscount) ? 0 : pointsDiscount).toFixed(2)} {currency}</span>
              </div>
            )}
            {(voucherDiscount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> COUPON / CADEAU</span>
                <span className="font-mono tracking-tighter">-{(isNaN(voucherDiscount) ? 0 : voucherDiscount).toFixed(2)} {currency}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-black text-4xl pt-6 border-t border-slate-200 dark:border-white/5 items-center tracking-tighter italic">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-500/60 uppercase tracking-[0.4em] font-black flex flex-col not-italic">
              TOTAL NET
              <span className="text-[8px] text-slate-500 dark:text-slate-600 tracking-[0.3em] font-black mt-1 uppercase italic">{totalItems || 0} ÉLÉMENTS SCANNÉS</span>
            </span>
            <div className="text-right flex flex-col items-end">
              {(selectedCustomer && !isNaN(total) && total > 0) && (
                <div className="text-[9px] font-black text-amber-600 dark:text-amber-500 mb-1 flex items-center justify-end gap-2 uppercase tracking-[0.2em] animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-neon-indigo" />
                  GAIN +{Math.floor(total * (settings.loyaltyPointsPerCurrencyUnit || 1))} PTS
                </div>
              )}
              <span className="flex items-baseline justify-end gap-2 text-emerald-600 dark:text-emerald-400 font-mono">
                {(isNaN(total) ? 0 : total).toFixed(2)}
                <span className="text-sm text-emerald-700 dark:text-emerald-500/60 uppercase tracking-[0.2em] font-black ml-1 not-italic font-sans">{currency}</span>
              </span>
            </div>
          </div>
        </div>

        {editingTransaction && (
          <div className="p-3.5 bg-amber-500/15 dark:bg-amber-950/40 border border-amber-500/40 rounded-2xl text-center space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5">
              <span>⚠️</span>
              <span>Modification Ticket #{String(editingTransaction.id || '').slice(-8).toUpperCase()}</span>
            </div>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
              Le ticket existant sera mis à jour en place (aucun doublon). Les écarts de stocks et de fidélité seront calculés automatiquement.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button 
            className={cn(
              "flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-[2rem] border transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-sm group active:scale-90 relative overflow-hidden cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none",
              editingTransaction
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white"
            )}
            onClick={() => handleCheckout('cash')}
            disabled={cart.length === 0 || isProcessing}
            title="ENCAISSEMENT ESPÈCES (F1)"
          >
            <div className={cn("p-2.5 rounded-xl transition-colors", editingTransaction ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600" : "bg-slate-100 dark:bg-black/40 text-slate-700 dark:text-slate-600 group-hover:bg-indigo-600/20 group-hover:text-indigo-600 dark:group-hover:text-white")}>
              <Banknote size={22} />
            </div>
            <span>{editingTransaction ? 'METTRE À JOUR (ESPÈCES)' : 'ESPÈCES'}</span>
            <span className="absolute bottom-2 text-[7px] text-slate-400 dark:text-slate-700 font-black tracking-widest">HOTKEY: F1</span>
          </button>
          <button 
            className={cn(
              "flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-[2rem] border transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-sm group active:scale-90 relative overflow-hidden cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none",
              editingTransaction
                ? "bg-amber-100/50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 hover:bg-amber-200/50"
                : "bg-indigo-50 dark:bg-indigo-600/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white hover:shadow-neon-indigo"
            )}
            onClick={() => handleCheckout('card')}
            disabled={cart.length === 0 || isProcessing}
            title="ENCAISSEMENT CARTE / DIGITAL"
          >
            <div className={cn("p-2.5 rounded-xl transition-colors shadow-inner", editingTransaction ? "bg-amber-200/60 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300" : "bg-indigo-100 dark:bg-black/40 text-indigo-600 dark:text-indigo-500 group-hover:bg-white/20 group-hover:text-white")}>
              <CreditCard size={22} />
            </div>
            <span>{editingTransaction ? 'METTRE À JOUR (CARTE)' : 'CARTE / NFC'}</span>
          </button>
        </div>

        <button 
          className={cn(
            "w-full py-5 sm:py-6 rounded-[2rem] text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-lg active:scale-90 relative overflow-hidden group italic cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none",
            editingTransaction
              ? "bg-amber-600 hover:bg-amber-700 hover:shadow-amber-500/25"
              : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-500/25"
          )}
          onClick={() => handleCheckout('cash', true)}
          disabled={cart.length === 0 || isProcessing}
        >
          <Printer size={20} className="group-hover:scale-110 transition-transform" />
          {editingTransaction ? 'METTRE À JOUR LE TICKET (F4)' : 'FINALISER & IMPRIMER LE TICKET (F4)'}
        </button>
      </div>
    </div>
  );
});

PaymentOrderSummary.displayName = 'PaymentOrderSummary';
