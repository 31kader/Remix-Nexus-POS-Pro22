import React, { memo } from 'react';
import { CreditCard } from 'lucide-react';
import { formatPrice } from '../../lib/utils';

interface CheckoutDesktopToggleBtnProps {
  total: number;
  currency: string;
  cartLength: number;
  onOpenControlsPanel: () => void;
}

export const CheckoutDesktopToggleBtn = memo(function CheckoutDesktopToggleBtn({
  total,
  currency,
  cartLength,
  onOpenControlsPanel,
}: CheckoutDesktopToggleBtnProps) {
  return (
    <button
      onClick={onOpenControlsPanel}
      className="hidden lg:flex flex-col items-center justify-between py-6 px-3 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer select-none group w-12 shrink-0 shadow-sm"
      title="Ouvrir le panneau de paiement (Caisse)"
    >
      <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
        <CreditCard size={18} />
      </div>
      <span className="[writing-mode:vertical-lr] text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
        Caisse • {formatPrice(total, 0)} {currency || 'DA'}
      </span>
      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
        {cartLength} art.
      </span>
    </button>
  );
});
