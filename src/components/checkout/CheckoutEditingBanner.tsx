import React, { memo } from 'react';
import { Edit3, X } from 'lucide-react';
import { Transaction } from '../../types';

interface CheckoutEditingBannerProps {
  editingTransaction: Transaction | null;
  onCancelEditTransaction: () => void;
  currency: string;
}

export const CheckoutEditingBanner = memo(function CheckoutEditingBanner({
  editingTransaction,
  onCancelEditTransaction,
  currency,
}: CheckoutEditingBannerProps) {
  if (!editingTransaction) return null;

  return (
    <div className="mx-3 mt-2.5 p-3 bg-amber-500/15 dark:bg-amber-950/40 border-2 border-amber-500/40 dark:border-amber-500/50 rounded-xl flex flex-wrap items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
          <Edit3 className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-[11px] uppercase tracking-wider bg-amber-500/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md">
              Mode Modification Vente
            </span>
            <span className="font-mono font-bold text-xs">
              #{String(editingTransaction.id || '').slice(-8).toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
            Ticket original du {editingTransaction.timestamp ? new Date(editingTransaction.timestamp).toLocaleString('fr-FR') : ''} • Total initial : <span className="font-bold">{Number(editingTransaction.originalTotal || editingTransaction.total || 0).toFixed(2)} {currency || 'DA'}</span>
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancelEditTransaction}
        className="px-3 py-1.5 text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
        title="Annuler l'édition de cette vente et réinitialiser le panier"
      >
        <X size={14} />
        Annuler la modification
      </button>
    </div>
  );
});
