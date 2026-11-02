import React from 'react';
import { 
  FileText, Trash2, TrendingDown, CreditCard, Banknote, RefreshCw, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Card, SortableHeader } from '../ui';
import { cn, formatSafe, formatPrice } from '../../lib/utils';
import { Expense, CompanySettings } from '../../types';
import { isReturnOrRefundExpense } from './expensesTypes';

export interface ExpensesTableProps {
  displayedExpenses: Expense[];
  filteredExpenses: Expense[];
  isolationMode: 'daily' | 'returns' | 'all';
  sortConfig: { key: keyof Expense; direction: 'asc' | 'desc' } | null;
  requestSort: (key: keyof Expense) => void;
  settings: CompanySettings;
  setEditingExpense: (e: Expense) => void;
  setIsModalOpen: (open: boolean) => void;
  handleDelete: (id: string) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  validPage: number;
}

export const ExpensesTable: React.FC<ExpensesTableProps> = ({
  displayedExpenses,
  filteredExpenses,
  isolationMode,
  sortConfig,
  requestSort,
  settings,
  setEditingExpense,
  setIsModalOpen,
  handleDelete,
  pageSize,
  setPageSize,
  setCurrentPage,
  totalPages,
  validPage
}) => {
  return (
    <Card className="overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
      {/* Vue Cartes Tactiles Mobiles (< lg) */}
      <div className="block lg:hidden space-y-3 p-3">
        {displayedExpenses.map((expense) => {
          const isRet = isReturnOrRefundExpense(expense);
          return (
            <div
              key={expense.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shadow-xs space-y-3"
            >
              {/* Header: Date, Catégorie, Mode */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-mono font-bold">
                  {formatSafe(expense.date, 'dd/MM/yyyy')}
                </span>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {isRet ? (
                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-md text-[10px] font-black uppercase">
                      ↩️ Retour Client
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-md text-[10px] font-black uppercase">
                      💼 {expense.category || 'Charge'}
                    </span>
                  )}

                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {expense.paymentMethod === 'card' ? <CreditCard size={12} /> : 
                     expense.paymentMethod === 'cash' ? <Banknote size={12} /> : <RefreshCw size={12} />}
                    <span>
                      {expense.paymentMethod === 'cash' ? 'Espèces' : expense.paymentMethod === 'card' ? 'Carte' : 'Virement'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Motif / Titre */}
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug">
                  {expense.description}
                </h4>
                {expense.userId && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Par : <span className="font-bold text-slate-700 dark:text-slate-300">{expense.userId}</span>
                  </p>
                )}
              </div>

              {/* Montant & Boutons d'Action */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Montant</span>
                  <p className="text-base font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                    -{formatPrice(expense.amount)} {settings.currency || 'DA'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }}
                    className="min-w-[38px] min-h-[38px] px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/50 transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
                    title="Modifier la dépense"
                  >
                    <FileText size={16} />
                    <span>Modifier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(expense.id)}
                    className="min-w-[38px] min-h-[38px] p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/50 transition-all flex items-center justify-center"
                    title="Supprimer la dépense"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredExpenses.length === 0 && (
          <div className="p-8 text-center text-slate-400 uppercase">
            <div className="flex flex-col items-center gap-2">
              <TrendingDown size={36} strokeWidth={1.5} className="text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-black">
                {isolationMode === 'daily'
                  ? 'Aucune dépense quotidienne trouvée pour ces filtres'
                  : isolationMode === 'returns'
                    ? 'Aucun retour client trouvé pour ces filtres'
                    : 'Aucune écriture trouvée'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tableau Traditionnel Bureau (>= lg) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <SortableHeader label="Date" sortKey="date" currentSort={sortConfig} onSort={() => requestSort('date')} />
              <SortableHeader label="Description / Motif" sortKey="description" currentSort={sortConfig} onSort={() => requestSort('description')} />
              <SortableHeader label="Type & Catégorie" sortKey="category" currentSort={sortConfig} onSort={() => requestSort('category')} />
              <SortableHeader label="Mode" sortKey="paymentMethod" currentSort={sortConfig} onSort={() => requestSort('paymentMethod')} />
              <SortableHeader label="Montant" sortKey="amount" currentSort={sortConfig} onSort={() => requestSort('amount')} />
              <th className="p-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {displayedExpenses.map((expense) => {
              const isRet = isReturnOrRefundExpense(expense);
              return (
                <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 text-xs text-slate-600 dark:text-slate-300 font-mono font-bold">
                    {formatSafe(expense.date, 'dd/MM/yyyy')}
                  </td>
                  <td className="p-3">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{expense.description}</p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {isRet ? (
                        <span className="px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-md text-[10px] font-black uppercase">
                          ↩️ Retour Client
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-md text-[10px] font-black uppercase">
                          💼 {expense.category || 'Charge'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                      {expense.paymentMethod === 'card' ? <CreditCard size={13} /> : 
                       expense.paymentMethod === 'cash' ? <Banknote size={13} /> : <RefreshCw size={13} />}
                      <span>
                        {expense.paymentMethod === 'cash' ? 'Espèces' : expense.paymentMethod === 'card' ? 'Carte' : 'Virement'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                      -{formatPrice(expense.amount)} {settings.currency || 'DA'}
                    </p>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        title="Modifier"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(expense.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredExpenses.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-400 uppercase">
                  <div className="flex flex-col items-center gap-2">
                    <TrendingDown size={36} strokeWidth={1.5} className="text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-black">
                      {isolationMode === 'daily'
                        ? 'Aucune dépense quotidienne trouvée pour ces filtres'
                        : isolationMode === 'returns'
                          ? 'Aucun retour client trouvé pour ces filtres'
                          : 'Aucune écriture trouvée'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Lignes par page :</span>
          {[50, 100, 200].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => { setPageSize(size); setCurrentPage(1); }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                pageSize === size
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              )}
            >
              {size}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {filteredExpenses.length > 0
              ? `${(validPage - 1) * pageSize + 1}-${Math.min(validPage * pageSize, filteredExpenses.length)} sur ${filteredExpenses.length}`
              : '0 sur 0'}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Page {validPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
