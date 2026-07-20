import React, { memo } from 'react';
import { Store, Truck, ShoppingBag, X, Gift, Banknote, CreditCard, Wallet, Printer, ArrowRight, Zap, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CompanySettings, Promotion, Voucher, Customer, CartItem } from '../../types';
import { Button } from '../ui';

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
  settings
}: PaymentOrderSummaryProps) {
  const totalItems = (cart || []).reduce((sum, item) => sum + item.quantity, 0);
  return (
    <div className="flex flex-col h-full bg-black/20">
      <div className="p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
        {/* Delivery Methods */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-neon-indigo" />
            Mode de Service
          </h4>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'in_store', icon: Store, label: 'COMPTOIR' },
              { id: 'delivery', icon: Truck, label: 'LIVRER' },
              { id: 'pickup', icon: ShoppingBag, label: 'RETRAIT' }
            ].map((m) => (
              <button 
                key={m.id}
                onClick={() => setDeliveryMethod(m.id as any)}
                className={cn(
                  "flex flex-col items-center gap-3 p-5 rounded-[2rem] border transition-all active:scale-90 group relative overflow-hidden shadow-2xl",
                  deliveryMethod === m.id 
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-neon-indigo ring-1 ring-white/20"
                    : "bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:text-white"
                )}
              >
                <div className={cn("p-3 rounded-2xl transition-all group-hover:scale-110", deliveryMethod === m.id ? "bg-white/20 shadow-inner" : "bg-black/40 border border-white/5")}>
                  <m.icon size={26} className={cn("transition-colors", deliveryMethod === m.id ? "text-white" : "text-slate-600 group-hover:text-indigo-400")} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Vouchers & Gift Cards & Promos */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-neon-indigo" />
            Codes & Coupons
          </h4>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Gift size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                placeholder="TICKET CADEAU..."
                className="w-full pl-12 pr-4 py-4 text-[10px] bg-black/40 border border-white/10 rounded-[1.25rem] outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 text-white font-black uppercase tracking-[0.2em] placeholder:text-slate-800 shadow-inner"
                value={voucherCode}
                onChange={e => setVoucherCode(e.target.value)}
              />
            </div>
            <button 
              onClick={applyVoucher}
              className="px-6 bg-indigo-600/10 text-indigo-400 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white hover:shadow-neon-indigo transition-all border border-indigo-500/20 active:scale-90"
            >
              VALIDER
            </button>
          </div>
          {appliedVoucher && (
            <div className="flex items-center justify-between p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 shadow-neon-cyan animate-in slide-in-from-top-2 duration-300">
              <span className="flex items-center gap-2 italic"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> COUPON APPLIQUÉ: -{appliedVoucher.value}{appliedVoucher.type === 'percent' ? '%' : ` ${currency}`}</span>
              <button onClick={() => setAppliedVoucher(null)} className="hover:text-rose-500 transition-colors p-1"><X size={16} /></button>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 bg-black/60 border-t border-white/5 space-y-6 backdrop-blur-3xl ring-1 ring-white/5">
        <div className="space-y-3">
          <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] px-2 italic">
            <span>SOUS-TOTAL BRUT</span>
            <span className="font-mono text-slate-400 tracking-tighter">{(isNaN(subtotal) ? 0 : subtotal).toFixed(2)} {currency}</span>
          </div>

          <div className="space-y-2 px-2">
            {(discountAmount || 0) > 0 && (
              <div className="flex justify-between text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-rose-500" /> REMISES ARTICLES</span>
                <span className="font-mono tracking-tighter">-{(isNaN(discountAmount) ? 0 : discountAmount).toFixed(2)} {currency}</span>
              </div>
            )}
            {(pointsDiscount || 0) > 0 && (
              <div className="flex justify-between text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-amber-500" /> FIDÉLITÉ DÉDUITE</span>
                <span className="font-mono tracking-tighter">-{(isNaN(pointsDiscount) ? 0 : pointsDiscount).toFixed(2)} {currency}</span>
              </div>
            )}
            {(voucherDiscount || 0) > 0 && (
              <div className="flex justify-between text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> COUPON / CADEAU</span>
                <span className="font-mono tracking-tighter">-{(isNaN(voucherDiscount) ? 0 : voucherDiscount).toFixed(2)} {currency}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between text-emerald-400 font-black text-4xl pt-6 border-t border-white/5 items-center tracking-tighter italic">
            <span className="text-[10px] text-emerald-500/60 uppercase tracking-[0.4em] font-black flex flex-col not-italic">
              TOTAL NET
              <span className="text-[8px] text-slate-600 tracking-[0.3em] font-black mt-1 uppercase italic">{totalItems || 0} ÉLÉMENTS SCANNÉS</span>
            </span>
            <div className="text-right flex flex-col items-end">
              {(selectedCustomer && !isNaN(total) && total > 0) && (
                <div className="text-[9px] font-black text-amber-500 mb-1 flex items-center justify-end gap-2 uppercase tracking-[0.2em] animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-neon-indigo" />
                  GAIN +{Math.floor(total * (settings.loyaltyPointsPerCurrencyUnit || 1))} PTS
                </div>
              )}
              <span className="flex items-baseline justify-end gap-2 text-emerald-400 drop-shadow-2xl">
                {(isNaN(total) ? 0 : total).toFixed(2)}
                <span className="text-sm text-emerald-500/60 uppercase tracking-[0.2em] font-black ml-1 not-italic">{currency}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            className="flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-[2rem] bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl group active:scale-90 relative overflow-hidden ring-1 ring-white/5"
            onClick={() => handleCheckout('cash')}
            disabled={cart.length === 0 || isProcessing}
            title="ENCAISSEMENT ESPÈCES (F1)"
          >
            <div className="p-2.5 bg-black/40 rounded-xl group-hover:bg-indigo-600/20 transition-colors">
              <Banknote size={22} className="text-slate-600 group-hover:text-white transition-colors" />
            </div>
            <span>ESPÈCES</span>
            <span className="absolute bottom-2 text-[7px] text-slate-700 font-black tracking-widest">HOTKEY: F1</span>
          </button>
          <button 
            className="flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-[2rem] bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl group active:scale-90 relative overflow-hidden ring-1 ring-white/5 hover:shadow-neon-indigo"
            onClick={() => handleCheckout('card')}
            disabled={cart.length === 0 || isProcessing}
            title="ENCAISSEMENT CARTE / DIGITAL"
          >
            <div className="p-2.5 bg-black/40 rounded-xl group-hover:bg-white/20 transition-colors shadow-inner">
              <CreditCard size={22} className="text-indigo-500 group-hover:text-white transition-colors" />
            </div>
            <span>CARTE / NFC</span>
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:animate-pulse">
               <Zap size={14} />
            </div>
          </button>
        </div>
        
        {selectedCustomer && (selectedCustomer.balance || 0) >= total && total > 0 && (
          <button 
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-[1.5rem] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl group hover:shadow-neon-cyan active:scale-95 ring-1 ring-white/5"
            onClick={() => handleCheckout('balance')}
            disabled={cart.length === 0 || isProcessing}
          >
            <Wallet size={18} className="group-hover:rotate-12 transition-transform" />
            <span>DÉBIT SOLDE COMPTE ({(selectedCustomer.balance || 0).toFixed(2)})</span>
          </button>
        )}

        <button 
          className="w-full py-6 rounded-[2rem] bg-emerald-600 text-white font-black text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 shadow-neon-cyan active:scale-90 relative overflow-hidden group ring-1 ring-white/20 italic"
          onClick={() => handleCheckout('cash', true)}
          disabled={cart.length === 0 || isProcessing}
        >
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
          <Printer size={20} className="group-hover:scale-110 transition-transform" />
          FINALISER & IMPRIMER LE TICKET (F4)
        </button>

        <div className="flex justify-center opacity-30 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3 px-6 py-2 bg-black/40 border border-white/5 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">
             <Shield size={10} className="text-indigo-500" /> SECURED TERMINAL
          </div>
        </div>
      </div>
    </div>
  );
});
