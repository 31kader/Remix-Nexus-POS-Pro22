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
  setIsDeliveryModalOpen,
  settings,
  globalDiscount,
  setGlobalDiscount,
  editingTransaction,
  receivedAmount = '',
  setReceivedAmount,
  keepExcessInBalance = false,
  setKeepExcessInBalance
}: PaymentOrderSummaryProps) {
  const totalItems = (cart || []).reduce((sum, item) => sum + item.quantity, 0);
  const isDense = Boolean(settings?.fastModeEnabled);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black/20 select-none">
      <div className={cn(
        "flex-1 overflow-y-auto custom-scrollbar",
        isDense ? "p-4 space-y-4" : "p-6 sm:p-5 space-y-8"
      )}>
        {/* Mode de Service */}
        <div className={cn(isDense ? "space-y-2" : "space-y-6")}>
          <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Mode de Service
          </h4>
          <div className={cn(isDense ? "grid grid-cols-3 gap-2" : "grid grid-cols-3 gap-3 sm:gap-4")}>
            {[
              { id: 'in_store', icon: Store, label: 'COMPTOIR' },
              { id: 'delivery', icon: Truck, label: 'LIVRER' },
              { id: 'pickup', icon: ShoppingBag, label: 'RETRAIT' }
            ].map((m) => (
              <button 
                key={m.id}
                onClick={() => setDeliveryMethod(m.id as any)}
                className={cn(
                  "flex items-center justify-center border transition-all active:scale-95 group relative shadow-sm cursor-pointer",
                  isDense 
                    ? "gap-1.5 py-2.5 px-2 rounded-xl text-[10px] font-bold" 
                    : "flex-col gap-3 p-4 sm:p-5 rounded-xl text-[9px] font-black tracking-normal",
                  deliveryMethod === m.id 
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-xs ring-1 ring-white/20"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:border-slate-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {!isDense ? (
                  <div className={cn("p-2.5 sm:p-3 rounded-xl transition-all group-hover:scale-110", deliveryMethod === m.id ? "bg-white/20 shadow-inner" : "bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5")}>
                    <m.icon size={24} className={cn("transition-colors", deliveryMethod === m.id ? "text-white" : "text-slate-600 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400")} />
                  </div>
                ) : (
                  <m.icon size={15} className="shrink-0" />
                )}
                <span className={cn(isDense ? "truncate" : "uppercase tracking-normal")}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Remise Globale Panier */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-normal flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
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
              className="flex-1 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-normal text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-800 focus:outline-none focus:border-indigo-500/40 transition-all"
            />
            <button
              onClick={applyVoucher}
              className="px-6 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl font-black text-[9px] uppercase tracking-normal text-slate-700 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 cursor-pointer"
            >
              APPLIQUER
            </button>
          </div>
          {appliedVoucher && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-black">
              <span>{appliedVoucher.code} ({appliedVoucher.type === 'percent' ? `${appliedVoucher.value}%` : `${appliedVoucher.currentBalance ?? appliedVoucher.value} ${currency}`})</span>
              <button onClick={() => setAppliedVoucher(null)} className="hover:text-rose-500 transition-colors p-1 cursor-pointer"><X size={16} /></button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 space-y-4 shadow-xl">
        <div className="space-y-3">
          <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-normal px-2 ">
            <span>SOUS-TOTAL BRUT</span>
            <span className="font-mono text-slate-700 dark:text-slate-400 tracking-tighter">{(isNaN(subtotal) ? 0 : subtotal).toFixed(2)} {currency}</span>
          </div>

          <div className="space-y-2 px-2">
            {(discountAmount || 0) > 0 && (
              <div className="flex justify-between text-rose-500 text-[10px] font-black uppercase tracking-normal animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-rose-500" /> REMISES TOTALES</span>
                <span className="font-mono tracking-tighter">-{(isNaN(discountAmount) ? 0 : discountAmount).toFixed(2)} {currency}</span>
              </div>
            )}
            {(pointsDiscount || 0) > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-500 text-[10px] font-black uppercase tracking-normal animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-amber-500" /> FIDÉLITÉ DÉDUITE</span>
                <span className="font-mono tracking-tighter">-{(isNaN(pointsDiscount) ? 0 : pointsDiscount).toFixed(2)} {currency}</span>
              </div>
            )}
            {(voucherDiscount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-500 text-[10px] font-black uppercase tracking-normal animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> COUPON / CADEAU</span>
                <span className="font-mono tracking-tighter">-{(isNaN(voucherDiscount) ? 0 : voucherDiscount).toFixed(2)} {currency}</span>
              </div>
            )}
          </div>

          <div className={cn(
            "flex justify-between items-center border-t border-slate-200 dark:border-white/5 font-black",
            isDense ? "pt-3.5 text-3xl" : "pt-6 text-4xl  tracking-tighter"
          )}>
            <span className={cn(
              "text-[10px] uppercase tracking-widest font-black flex flex-col not-",
              total < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-500/80"
            )}>
              {total < 0 ? "À REMBOURSER" : "TOTAL NET"}
              <span className="text-[8px] text-slate-500 dark:text-slate-500 tracking-wider font-bold mt-0.5 uppercase">{totalItems || 0} ARTICLES</span>
            </span>
            <div className="text-right flex flex-col items-end">
              {(selectedCustomer && !isNaN(total)) && (
                total > 0 ? (
                  <div className="text-[9px] font-black text-amber-600 dark:text-amber-500 mb-0.5 flex items-center justify-end gap-1.5 uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    +{Math.floor(total * (settings.loyaltyPointsPerCurrencyUnit || 1))} PTS
                  </div>
                ) : total < 0 ? (
                  <div className="text-[9px] font-black text-rose-500 mb-0.5 flex items-center justify-end gap-1.5 uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    -{Math.floor(Math.abs(total) * (settings.loyaltyPointsPerCurrencyUnit || 1))} PTS (DÉDUITS)
                  </div>
                ) : null
              )}
              <span className={cn(
                "flex items-baseline justify-end gap-1.5 font-mono tabular-nums",
                total < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {(isNaN(total) ? 0 : total).toFixed(2)}
                <span className={cn(
                  "text-sm uppercase tracking-widest font-black font-sans",
                  total < 0 ? "text-rose-700 dark:text-rose-400/80" : "text-emerald-700 dark:text-emerald-500/80"
                )}>{currency}</span>
              </span>
            </div>
          </div>
        </div>

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

        {/* Terminal de Règlement & Monnaie Rapide (Dinars Algériens) */}
        {total > 0 && setReceivedAmount && (
          <div className="p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Banknote size={14} className="text-emerald-500" />
                Règlement Espèces (DA)
              </span>
              {receivedAmount !== '' && (
                <button
                  type="button"
                  onClick={() => setReceivedAmount('')}
                  className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 tracking-wider cursor-pointer"
                >
                  Effacer
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-base font-black font-mono rounded-xl px-3 py-1.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 font-mono">
                  {currency}
                </span>
              </div>

              {/* Rendu Dynamique */}
              <div className="flex flex-col justify-center text-right font-mono bg-slate-50 dark:bg-zinc-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-inner min-h-[38px]">
                {(() => {
                  const typed = parseFloat(receivedAmount || '');
                  if (isNaN(typed) || receivedAmount === '') {
                    return <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase">EN ATTENTE</span>;
                  }
                  if (typed > total) {
                    return (
                      <>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                          +{(typed - total).toFixed(2)} {currency}
                        </span>
                        <span className="text-[7.5px] font-black text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wider">À RENDRE</span>
                      </>
                    );
                  } else if (typed < total) {
                    return (
                      <>
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400 leading-tight">
                          -{(total - typed).toFixed(2)} {currency}
                        </span>
                        <span className="text-[7.5px] font-black text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wider">RESTE DÛ</span>
                      </>
                    );
                  } else {
                    return (
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        COMPTE JUSTE
                      </span>
                    );
                  }
                })()}
              </div>
            </div>

            {/* Boutons Rapides Billets Algériens */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => setReceivedAmount(total.toFixed(2))}
                className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[9px] font-black rounded-lg border border-emerald-300 dark:border-emerald-700/60 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                COMPTE JUSTE
              </button>
              {[500, 1000, 2000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setReceivedAmount(val.toString())}
                  className="px-2 py-1 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-[9px] font-black font-mono rounded-lg border border-slate-300 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  {val} DA
                </button>
              ))}
              {[500, 1000].map(addVal => {
                const cur = parseFloat(receivedAmount || '') || 0;
                return (
                  <button
                    key={`+${addVal}`}
                    type="button"
                    onClick={() => setReceivedAmount((cur + addVal).toString())}
                    className="px-1.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[9px] font-black font-mono rounded-lg border border-slate-300 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer"
                  >
                    +{addVal}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={cn("grid grid-cols-2", isDense ? "gap-2.5" : "gap-4")}>
          <button 
            className={cn(
              "flex items-center justify-between border transition-all font-black uppercase shadow-sm group active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
              isDense 
                ? "py-3 px-3.5 rounded-xl text-xs" 
                : "flex-col justify-center gap-3 py-6 px-4 rounded-xl text-[10px] tracking-normal relative overflow-hidden",
              editingTransaction
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100"
                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
            )}
            onClick={() => handleCheckout('cash')}
            disabled={cart.length === 0 || isProcessing}
            title="ENCAISSEMENT ESPÈCES (F1)"
          >
            <div className="flex items-center gap-2">
              <Banknote size={isDense ? 18 : 22} />
              <span className="truncate">{editingTransaction ? 'MàJ ESPÈCES' : total < 0 ? 'REMBOURSER' : 'ESPÈCES'}</span>
            </div>
            <span className={cn(
              "font-mono font-black tracking-widest",
              isDense 
                ? "px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px]" 
                : "absolute bottom-2 text-[8px] font-bold text-slate-500 dark:text-zinc-400 group-hover:text-white/80"
            )}>
              F1
            </span>
          </button>

          <button 
            className={cn(
              "flex items-center justify-between border transition-all font-black uppercase shadow-sm group active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
              isDense 
                ? "py-3 px-3.5 rounded-xl text-xs" 
                : "flex-col justify-center gap-3 py-6 px-4 rounded-xl text-[10px] tracking-normal relative overflow-hidden",
              editingTransaction
                ? "bg-amber-100/50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300"
                : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
            )}
            onClick={() => handleCheckout('card')}
            disabled={cart.length === 0 || isProcessing}
            title="ENCAISSEMENT CARTE / DIGITAL (F2)"
          >
            <div className="flex items-center gap-2">
              <CreditCard size={isDense ? 18 : 22} />
              <span className="truncate">{editingTransaction ? 'MàJ CARTE' : 'CARTE / TPE'}</span>
            </div>
            <span className={cn(
              "font-mono font-black tracking-widest",
              isDense 
                ? "px-1.5 py-0.5 rounded bg-indigo-500/20 text-[9px]" 
                : "absolute bottom-2 text-[8px] font-bold text-slate-500 dark:text-zinc-400 group-hover:text-white/80"
            )}>
              F2
            </span>
          </button>
        </div>

        <button 
          className={cn(
            "w-full text-white font-black uppercase transition-all flex items-center justify-center gap-3 shadow-md active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
            isDense 
              ? "py-3.5 rounded-xl text-xs tracking-wider" 
              : "py-5 sm:py-6 rounded-xl text-[11px] tracking-normal  shadow-lg",
            editingTransaction
              ? "bg-amber-600 hover:bg-amber-700"
              : total < 0
                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
          )}
          onClick={() => handleCheckout('cash', true)}
          disabled={cart.length === 0 || isProcessing}
        >
          <Printer size={isDense ? 18 : 20} />
          <span>
            {editingTransaction 
              ? 'METTRE À JOUR LE TICKET (F4)' 
              : total < 0 
                ? 'VALIDER LE RETOUR (F4)' 
                : 'VALIDER & IMPRIMER [F4]'}
          </span>
        </button>
      </div>
    </div>
  );
});

PaymentOrderSummary.displayName = 'PaymentOrderSummary';
