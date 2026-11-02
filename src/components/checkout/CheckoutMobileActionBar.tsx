import React from 'react';
import { ShoppingCart, LayoutGrid, ArrowRight } from 'lucide-react';
import { cn, formatPrice } from '../../lib/utils';

interface CheckoutMobileActionBarProps {
  isMobile: boolean;
  mobileTab: 'cart' | 'catalog';
  setMobileTab: (tab: 'cart' | 'catalog') => void;
  cartLength: number;
  displayTotal: number;
  currency: string;
  onOpenPaymentSheet: () => void;
}

export function CheckoutMobileActionBar({
  isMobile,
  mobileTab,
  setMobileTab,
  cartLength,
  displayTotal,
  currency,
  onOpenPaymentSheet
}: CheckoutMobileActionBarProps) {
  if (!isMobile) return null;

  return (
    <div className="shrink-0 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 px-2.5 py-2 pb-[max(env(safe-area-inset-bottom,0px),10px)] flex items-center justify-between gap-2.5 z-[50]">
      <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
            mobileTab === 'cart' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-zinc-400"
          )}
        >
          <ShoppingCart size={16} />
          <span>Panier ({cartLength})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
            mobileTab === 'catalog' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-zinc-400"
          )}
        >
          <LayoutGrid size={16} />
          <span>Grille</span>
        </button>
      </div>

      <div className="flex-1">
        <button
          type="button"
          disabled={cartLength === 0}
          onClick={onOpenPaymentSheet}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-normal shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Payer {formatPrice(displayTotal, 2)} {currency}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
