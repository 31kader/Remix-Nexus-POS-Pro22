import React, { memo } from 'react';
import { ShoppingBag, Tag, RotateCcw } from 'lucide-react';
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
    <div className="w-full bg-slate-900/95 dark:bg-black/95 backdrop-blur-md border-b border-emerald-500/40 py-2 px-3 sm:px-6 flex items-center justify-between gap-2 shadow-lg z-20 flex-shrink-0 select-none">
      {/* Gauche : Nombre d'articles */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 dark:bg-zinc-900/90 text-slate-200 dark:text-zinc-200 text-xs sm:text-sm font-black uppercase tracking-wider font-mono border border-slate-700/80 dark:border-zinc-800 shadow-inner">
          <ShoppingBag size={14} className="text-emerald-400 shrink-0" />
          <span>{totalItemCount} article{totalItemCount > 1 ? 's' : ''}</span>
        </div>
        {isReturnMode && (
          <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black uppercase tracking-wider animate-pulse shadow-sm">
            <RotateCcw size={12} />
            <span>Mode Retour</span>
          </span>
        )}
      </div>

      {/* Centre : GRAND AFFICHAGE DU PRIX TOTAL */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 sm:gap-3.5 px-5 py-1.5 sm:px-8 sm:py-2 bg-gradient-to-r from-slate-950 via-zinc-950 to-slate-950 dark:from-black dark:via-zinc-950 dark:to-black border-2 border-emerald-500/90 rounded-2xl shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/30">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400/90 font-mono">
            TOTAL :
          </span>
          <span className="text-2xl sm:text-4xl lg:text-5xl font-black font-mono font-financial text-emerald-300 tracking-tight tabular-nums drop-shadow-[0_0_14px_rgba(16,185,129,0.45)]">
            {displayTotal.toFixed(2)}
          </span>
          <span className="text-xs sm:text-sm font-black font-mono text-emerald-400 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
            {currency || 'DA'}
          </span>
        </div>
      </div>

      {/* Droite : Remise si appliquée ou badge POS */}
      <div className="flex items-center gap-2">
        {discountAmount > 0 ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-black font-mono shadow-xs">
            <Tag size={13} className="text-amber-400" />
            <span>Remise: -{discountAmount.toFixed(2)} {currency || 'DA'}</span>
          </span>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-black font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Nexus POS</span>
          </span>
        )}
      </div>
    </div>
  );
});
