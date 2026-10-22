import React, { memo, useState, useEffect } from 'react';
import { Store, Truck, ShoppingBag, X, Banknote, CreditCard, Printer, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CompanySettings, Voucher, Customer, CartItem } from '../../types';
import { toast } from 'sonner';

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
  const totalItems = (cart || []).reduce((sum, item) => sum + Math.abs(item.quantity), 0);
  const isDense = Boolean(settings?.fastModeEnabled);

  // État local pour le formulaire de remise globale
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    globalDiscount?.type || 'percentage'
  );
  const [discountInput, setDiscountInput] = useState<string>(
    globalDiscount && globalDiscount.value > 0 ? String(globalDiscount.value) : ''
  );

  useEffect(() => {
    if (globalDiscount && globalDiscount.value > 0) {
      setDiscountType(globalDiscount.type);
      setDiscountInput(String(globalDiscount.value));
    } else {
      setDiscountInput('');
    }
  }, [globalDiscount]);

  const handleApplyGlobalDiscount = () => {
    const val = parseFloat(discountInput);
    if (!isNaN(val) && val > 0) {
      if (setGlobalDiscount) {
        setGlobalDiscount({
          type: discountType,
          value: val
        });
        toast.success(`Remise globale de ${val}${discountType === 'percentage' ? '%' : ` ${currency}`} appliquée`);
      }
    } else {
      toast.warning("Veuillez saisir un montant de remise valide supérieur à 0");
    }
  };

  const handleApplyPreset = (preset: number) => {
    setDiscountInput(String(preset));
    if (setGlobalDiscount) {
      setGlobalDiscount({ type: discountType, value: preset });
      toast.success(`Remise de ${preset}${discountType === 'percentage' ? '%' : ` ${currency}`} appliquée`);
    }
  };

  const handleClearDiscount = () => {
    setDiscountInput('');
    if (setGlobalDiscount) setGlobalDiscount(null);
    toast.info("Remise globale retirée");
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black/20 select-none">
      <div className={cn(
        "flex-1 overflow-y-auto custom-scrollbar",
        isDense ? "p-3 space-y-3" : "p-4 sm:p-5 space-y-6"
      )}>
        {/* Mode de Service */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Mode de Service
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'in_store', icon: Store, label: 'COMPTOIR' },
              { id: 'delivery', icon: Truck, label: 'LIVRER' },
              { id: 'pickup', icon: ShoppingBag, label: 'RETRAIT' }
            ].map((m) => (
              <button 
                key={m.id}
                onClick={() => setDeliveryMethod(m.id as any)}
                className={cn(
                  "flex items-center justify-center border transition-all active:scale-95 group relative shadow-sm cursor-pointer gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold",
                  deliveryMethod === m.id 
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-xs ring-1 ring-white/20"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:border-slate-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <m.icon size={16} className="shrink-0" />
                <span className="truncate uppercase">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Remise Globale Panier */}
        <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
              Remise Globale (Panier)
            </h4>
            {globalDiscount && globalDiscount.value > 0 && (
              <button
                type="button"
                onClick={handleClearDiscount}
                className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X size={12} /> Effacer
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            <div className="flex bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer",
                  discountType === 'percentage' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer",
                  discountType === 'fixed' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {currency}
              </button>
            </div>

            <div className="relative flex-1 min-w-0">
              <input
                id="global-discount-input"
                type="number"
                min="0"
                step="any"
                placeholder={discountType === 'percentage' ? "Ex: 10 (%)" : `Ex: 200 (${currency})`}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyGlobalDiscount();
                  }
                }}
                className="w-full h-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleApplyGlobalDiscount}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shrink-0 cursor-pointer shadow-xs"
            >
              APPLIQUER
            </button>
          </div>

          {/* Boutons de remise rapide en 1 clic */}
          <div className="flex items-center gap-1.5 pt-0.5">
            {(discountType === 'percentage'
              ? [5, 10, 15, 20]
              : [50, 100, 200, 500]
            ).map((preset) => {
              const isSelected = globalDiscount?.value === preset && globalDiscount?.type === discountType;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[10px] font-bold font-mono border transition-all cursor-pointer active:scale-95",
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                      : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-emerald-500/50 hover:text-emerald-600"
                  )}
                >
                  -{preset}{discountType === 'percentage' ? '%' : ` ${currency}`}
                </button>
              );
            })}
          </div>

          {/* Badge de confirmation quand une remise globale est active */}
          {globalDiscount && globalDiscount.value > 0 && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-[11px] font-black">
              <span>
                ✓ Remise active : -{globalDiscount.value}{globalDiscount.type === 'percentage' ? '%' : ` ${currency}`} (-{(isNaN(discountAmount) ? 0 : discountAmount).toFixed(2)} {currency})
              </span>
              <button
                type="button"
                onClick={handleClearDiscount}
                className="p-1 hover:bg-rose-500/10 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                title="Annuler la remise"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Voucher Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="CODE COUPON / CADEAU..."
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyVoucher();
                }
              }}
              className="flex-1 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-normal text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-all"
            />
            <button
              type="button"
              onClick={applyVoucher}
              className="px-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl font-black text-xs uppercase tracking-normal text-slate-700 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 cursor-pointer"
            >
              APPLIQUER
            </button>
          </div>
          {appliedVoucher && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-black">
              <span>{appliedVoucher.code} ({appliedVoucher.type === 'percent' ? `${appliedVoucher.value}%` : `${appliedVoucher.currentBalance ?? appliedVoucher.value} ${currency}`})</span>
              <button onClick={() => setAppliedVoucher(null)} className="hover:text-rose-500 transition-colors p-1 cursor-pointer"><X size={16} /></button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 space-y-4 shadow-xl">
        <div className="space-y-2">
          <div className="flex justify-between text-slate-500 text-xs font-black uppercase tracking-normal px-2">
            <span>SOUS-TOTAL BRUT</span>
            <span className="font-mono text-slate-700 dark:text-slate-400 font-bold">{(isNaN(subtotal) ? 0 : subtotal).toFixed(2)} {currency}</span>
          </div>

          <div className="space-y-1.5 px-2">
            {(discountAmount || 0) > 0 && (
              <div className="flex justify-between text-rose-500 text-xs font-black uppercase tracking-normal animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> REMISES TOTALES</span>
                <span className="font-mono font-bold">-{(isNaN(discountAmount) ? 0 : discountAmount).toFixed(2)} {currency}</span>
              </div>
            )}
            {(pointsDiscount || 0) > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-500 text-xs font-black uppercase tracking-normal animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> FIDÉLITÉ DÉDUITE</span>
                <span className="font-mono font-bold">-{(isNaN(pointsDiscount) ? 0 : pointsDiscount).toFixed(2)} {currency}</span>
              </div>
            )}
            {(voucherDiscount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-500 text-xs font-black uppercase tracking-normal animate-in fade-in slide-in-from-right-2">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> COUPON / CADEAU</span>
                <span className="font-mono font-bold">-{(isNaN(voucherDiscount) ? 0 : voucherDiscount).toFixed(2)} {currency}</span>
              </div>
            )}
          </div>

          {/* ZONE DU TOTAL GÉANT */}
          <div className="flex justify-between items-center border-t-2 border-slate-200 dark:border-zinc-800 pt-3 sm:pt-4">
            <span className={cn(
              "text-xs sm:text-sm uppercase tracking-widest font-black flex flex-col",
              total < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
            )}>
              {total < 0 ? "À REMBOURSER" : "TOTAL NET"}
              <span className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider font-bold mt-0.5 uppercase">
                {totalItems || 0} ARTICLE{totalItems > 1 ? 'S' : ''}
              </span>
            </span>
            <div className="text-right flex flex-col items-end">
              {(selectedCustomer && !isNaN(total)) && (
                total > 0 ? (
                  <div className="text-[10px] font-black text-amber-600 dark:text-amber-500 mb-0.5 flex items-center justify-end gap-1.5 uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    +{Math.floor(total * (settings.loyaltyPointsPerCurrencyUnit || 1))} PTS
                  </div>
                ) : total < 0 ? (
                  <div className="text-[10px] font-black text-rose-500 mb-0.5 flex items-center justify-end gap-1.5 uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    -{Math.floor(Math.abs(total) * (settings.loyaltyPointsPerCurrencyUnit || 1))} PTS (DÉDUITS)
                  </div>
                ) : null
              )}
              <span className={cn(
                "flex items-baseline justify-end gap-1 font-mono tabular-nums leading-none",
                total < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              )}>
                <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
                  {(isNaN(total) ? 0 : total).toFixed(2)}
                </span>
                <span className={cn(
                  "text-lg sm:text-2xl uppercase tracking-wider font-black font-sans ml-1",
                  total < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                )}>
                  {currency}
                </span>
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

              {/* Rendu Dynamique Grand Format */}
              <div className="flex flex-col justify-center text-right font-mono bg-white dark:bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 shadow-sm min-h-[44px]">
                {(() => {
                  const typed = parseFloat(receivedAmount || '');
                  if (isNaN(typed) || receivedAmount === '') {
                    return <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">EN ATTENTE</span>;
                  }
                  if (typed > total) {
                    return (
                      <>
                        <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight tracking-tight">
                          +{(typed - total).toFixed(2)} {currency}
                        </span>
                        <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/80 px-1 py-0.5 rounded w-fit ml-auto mt-0.5">À RENDRE</span>
                      </>
                    );
                  } else if (typed < total) {
                    return (
                      <>
                        <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 leading-tight tracking-tight">
                          -{(total - typed).toFixed(2)} {currency}
                        </span>
                        <span className="text-[8px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest bg-amber-100 dark:bg-amber-950/80 px-1 py-0.5 rounded w-fit ml-auto mt-0.5">RESTE DÛ</span>
                      </>
                    );
                  } else {
                    return (
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/80 px-2 py-1 rounded text-center">
                        COMPTE JUSTE
                      </span>
                    );
                  }
                })()}
              </div>
            </div>

            {/* Boutons Rapides Billets Algériens (500, 1000, 2000, 5000 DA) */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setReceivedAmount(total.toFixed(2))}
                className="px-2.5 py-1.5 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10px] font-black rounded-lg border border-emerald-300 dark:border-emerald-700 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                COMPTE JUSTE
              </button>
              {[500, 1000, 2000, 5000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setReceivedAmount(val.toString())}
                  className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-[10px] font-black font-mono rounded-lg border border-slate-300 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  {val >= 1000 ? `${val / 1000}k` : val} DA
                </button>
              ))}
              {[500, 1000, 2000].map(addVal => {
                const cur = parseFloat(receivedAmount || '') || 0;
                return (
                  <button
                    key={`+${addVal}`}
                    type="button"
                    onClick={() => setReceivedAmount((cur + addVal).toString())}
                    className="px-2 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-[10px] font-black font-mono rounded-lg border border-slate-300 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer"
                  >
                    +{addVal >= 1000 ? `${addVal / 1000}k` : addVal}
                  </button>
                );
              })}
            </div>

            {/* Options & alertes de crédit/solde pour le client sélectionné */}
            {selectedCustomer && (() => {
              const typed = parseFloat(receivedAmount || '');
              if (!isNaN(typed) && receivedAmount !== '') {
                if (typed < total) {
                  const diff = total - typed;
                  return (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-400 text-[11px] animate-in fade-in duration-200">
                      <AlertCircle size={15} className="shrink-0 text-rose-500" />
                      <div className="leading-tight">
                        <span className="font-bold">Crédit client (+{diff.toFixed(2)} {currency}) : </span>
                        <span>Sera imputé à la dette de {selectedCustomer.name}.</span>
                      </div>
                    </div>
                  );
                } else if (typed > total && setKeepExcessInBalance) {
                  const diff = typed - total;
                  return (
                    <label className="flex items-center gap-2.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl cursor-pointer hover:bg-emerald-500/15 transition-all text-[11px] select-none text-emerald-800 dark:text-emerald-300">
                      <input
                        type="checkbox"
                        checked={keepExcessInBalance}
                        onChange={(e) => setKeepExcessInBalance(e.target.checked)}
                        className="accent-emerald-600 rounded cursor-pointer w-4 h-4 shrink-0"
                      />
                      <div className="leading-tight flex-1">
                        <span className="font-bold uppercase tracking-wider text-[10px]">Abonder le solde (+{diff.toFixed(2)} {currency})</span>
                        <div className="text-[9px] opacity-75 font-mono">
                          Nouveau solde : {((selectedCustomer.balance || 0) + diff).toFixed(2)} {currency}
                        </div>
                      </div>
                    </label>
                  );
                }
              }
              return null;
            })()}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button 
            type="button"
            className={cn(
              "flex items-center justify-between border transition-all font-black uppercase shadow-sm group active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none py-3 px-3.5 rounded-xl text-xs",
              editingTransaction
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100"
                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
            )}
            onClick={() => handleCheckout('cash', false)}
            disabled={cart.length === 0 || isProcessing}
            title="ENCAISSEMENT ESPÈCES SANS IMPRESSION (F5)"
          >
            <div className="flex items-center gap-2">
              <Banknote size={18} />
              <span className="truncate">{editingTransaction ? 'MàJ ESPÈCES' : total < 0 ? 'REMBOURSER' : 'ESPÈCES'}</span>
            </div>
            <span className="font-mono font-black tracking-widest px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px]">
              F5
            </span>
          </button>

          <button 
            type="button"
            className={cn(
              "flex items-center justify-between border transition-all font-black uppercase shadow-sm group active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none py-3 px-3.5 rounded-xl text-xs",
              editingTransaction
                ? "bg-amber-100/50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300"
                : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
            )}
            onClick={() => handleCheckout('card')}
            disabled={cart.length === 0 || isProcessing}
            title="ENCAISSEMENT CARTE / DIGITAL"
          >
            <div className="flex items-center gap-2">
              <CreditCard size={18} />
              <span className="truncate">{editingTransaction ? 'MàJ CARTE' : 'CARTE / TPE'}</span>
            </div>
          </button>
        </div>

        <button 
          type="button"
          className={cn(
            "w-full text-white font-black uppercase transition-all flex items-center justify-center gap-3 shadow-md active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none py-4 sm:py-4.5 rounded-xl text-xs sm:text-sm tracking-wider",
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
      </div>
    </div>
  );
});

PaymentOrderSummary.displayName = 'PaymentOrderSummary';
