import React from 'react';
import { cn } from '../../../lib/utils';
import { CompanySettings, Customer } from '../../../types';

export interface OrderTotalsDisplayProps {
  subtotal: number;
  discountAmount: number;
  pointsDiscount: number;
  voucherDiscount: number;
  total: number;
  currency: string;
  totalItems: number;
  selectedCustomer: Customer | null;
  settings: CompanySettings;
}

export const OrderTotalsDisplay: React.FC<OrderTotalsDisplayProps> = ({
  subtotal,
  discountAmount,
  pointsDiscount,
  voucherDiscount,
  total,
  currency,
  totalItems,
  selectedCustomer,
  settings
}) => {
  return (
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
            "flex items-baseline justify-end gap-1 font-mono font-financial tabular-nums leading-none",
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
  );
};
