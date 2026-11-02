import React, { memo } from 'react';
import { CartItem } from '../../types';

interface CheckoutTotalBannerProps {
  cart: CartItem[];
  isReturnMode: boolean;
  displayTotal: number;
  discountAmount: number;
  currency: string;
}

export const CheckoutTotalBanner = memo(function CheckoutTotalBanner({
  cart,
  isReturnMode,
  displayTotal,
  discountAmount,
  currency,
}: CheckoutTotalBannerProps) {
  const totalItemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="w-full bg-slate-900/95 dark:bg-black/95 border-b-2 border-emerald-500/50 py-2 px-3 sm:px-6 flex items-center justify-between gap-2 shadow-md z-20 flex-shrink-0 select-none">
      {/* Gauche : Nombre d'articles */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-xl bg-slate-800 dark:bg-zinc-900 text-slate-200 dark:text-zinc-200 text-xs sm:text-sm font-black uppercase tracking-wider font-mono border border-slate-700 dark:border-zinc-800 shadow-xs">
          {totalItemCount} article(s)
        </span>
        {isReturnMode && (
          <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-black uppercase tracking-wider animate-pulse">
            Mode Retour
          </span>
        )}
      </div>

      {/* Centre : GRAND AFFICHAGE DU PRIX */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2.5 sm:gap-4 px-6 py-1.5 sm:px-10 sm:py-2 bg-slate-950 dark:bg-zinc-950 border-2 border-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/25">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400">
            TOTAL :
          </span>
          <span className="text-2xl sm:text-4xl lg:text-5xl font-black font-mono text-emerald-300 tracking-tight tabular-nums drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">
            {displayTotal.toFixed(2)}
          </span>
          <span className="text-xs sm:text-base font-black font-sans text-emerald-400">
            {currency || 'DA'}
          </span>
        </div>
      </div>

      {/* Droite : Remise si appliquée ou badge POS */}
      <div className="flex items-center gap-2">
        {discountAmount > 0 ? (
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-black font-mono shadow-xs">
            Remise: -{discountAmount.toFixed(2)} {currency || 'DA'}
          </span>
        ) : (
          <span className="hidden sm:inline-block text-xs font-black font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
            Nexus POS Pro
          </span>
        )}
      </div>
    </div>
  );
});
