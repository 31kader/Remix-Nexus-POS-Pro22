import React from 'react';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../ui';
import { formatSafe, formatPrice } from '../../lib/utils';
import { ProductReturn } from '../../types';

interface ReturnsDesktopTableProps {
  displayedReturns: ProductReturn[];
  currency: string;
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((p: number) => number)) => void;
  totalPages: number;
  validPage: number;
  totalFilteredCount: number;
  onSelectReturn: (r: ProductReturn) => void;
}

export const ReturnsDesktopTable: React.FC<ReturnsDesktopTableProps> = ({
  displayedReturns,
  currency,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  totalPages,
  validPage,
  totalFilteredCount,
  onSelectReturn,
}) => {
  return (
    <Card className="hidden lg:block p-0 overflow-hidden bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <th className="p-4 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Date & Heure Exacte</th>
              <th className="p-4 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Transaction</th>
              <th className="p-4 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Type</th>
              <th className="p-4 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Raison</th>
              <th className="p-4 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Remboursement</th>
              <th className="p-4 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {displayedReturns.map((r: any) => {
              const dateVal = r.timestamp || r.date || r.created_at || r.updated_at;
              const refundVal = typeof r.totalRefund === 'number' 
                ? r.totalRefund 
                : (typeof r.refundAmount === 'number' 
                    ? r.refundAmount 
                    : (parseFloat(r.refundAmount || r.totalRefund || r.refund_amount || r.total_refund || '0') || 0));
              const returnTypeMapped = r.type || 'refund';

              return (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 text-xs font-mono text-slate-800 dark:text-slate-300 font-semibold whitespace-nowrap">
                    {dateVal ? formatSafe(dateVal, 'dd/MM/yyyy à HH:mm:ss') : '—'}
                  </td>
                  <td className="p-4 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap">
                    #{String(r.transactionId || r.transaction_id || '').slice(-8).toUpperCase() || 'INCONNU'}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      returnTypeMapped === 'refund' 
                        ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20" 
                        : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                    }`}>
                      {returnTypeMapped === 'refund' ? 'Remboursement' : 'Note de Crédit'}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={r.reason || r.notes || ''}>
                    "{r.reason || r.notes || 'Aucune raison indiquée'}"
                  </td>
                  <td className="p-4 font-black text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                    {formatPrice(refundVal)} {currency}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onSelectReturn(r)}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                      title="Voir les détails"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {displayedReturns.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-mono text-xs">
                  AUCUN RETOUR CORRESPONDANT
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Lignes par page :</span>
          {[50, 100, 200].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => { setPageSize(size); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                pageSize === size
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent'
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {totalFilteredCount > 0
              ? `${(validPage - 1) * pageSize + 1}-${Math.min(validPage * pageSize, totalFilteredCount)} sur ${totalFilteredCount}`
              : '0 sur 0'}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                <ChevronLeft size={16} /> Précédent
              </button>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-2 font-mono">
                Page {validPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
