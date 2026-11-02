import React from 'react';
import { Clock, Eye } from 'lucide-react';
import { formatSafe, formatPrice } from '../../lib/utils';
import { ProductReturn, CompanySettings } from '../../types';

interface ReturnsMobileCardsProps {
  displayedReturns: ProductReturn[];
  currency: string;
  onSelectReturn: (r: ProductReturn) => void;
}

export const ReturnsMobileCards: React.FC<ReturnsMobileCardsProps> = ({
  displayedReturns,
  currency,
  onSelectReturn,
}) => {
  return (
    <div className="block lg:hidden space-y-3">
      {displayedReturns.map((r: any) => {
        const dateVal = r.timestamp || r.date || r.created_at || r.updated_at;
        const refundVal = typeof r.totalRefund === 'number' 
          ? r.totalRefund 
          : (typeof r.refundAmount === 'number' 
              ? r.refundAmount 
              : (parseFloat(r.refundAmount || r.totalRefund || r.refund_amount || r.total_refund || '0') || 0));
        const returnTypeMapped = r.type || 'refund';
        const txDisplay = String(r.transactionId || r.transaction_id || '').slice(-8).toUpperCase() || 'INCONNU';

        return (
          <div 
            key={`mobile-return-${r.id}`}
            className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all space-y-3 text-left shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                  Ticket #{txDisplay}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-1 flex items-center gap-1">
                  <Clock size={11} className="text-slate-400" />
                  {dateVal ? formatSafe(dateVal, 'dd/MM/yyyy à HH:mm:ss') : '—'}
                </p>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                returnTypeMapped === 'refund' 
                  ? "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30" 
                  : "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
              }`}>
                {returnTypeMapped === 'refund' ? 'Remboursement' : 'Note de Crédit'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs text-slate-700 dark:text-zinc-300">
              <span className="font-bold text-slate-500 dark:text-zinc-400">Motif :</span> {r.reason || r.notes || 'Aucune raison indiquée'}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Montant :</span>{' '}
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatPrice(refundVal)} {currency}
                </span>
              </div>

              <button 
                type="button"
                onClick={() => onSelectReturn(r)}
                className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                title="Voir les détails"
              >
                <Eye size={15} /> Détails
              </button>
            </div>
          </div>
        );
      })}
      {displayedReturns.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-zinc-900/60 rounded-2xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-mono text-xs">
          AUCUN RETOUR CORRESPONDANT
        </div>
      )}
    </div>
  );
};
