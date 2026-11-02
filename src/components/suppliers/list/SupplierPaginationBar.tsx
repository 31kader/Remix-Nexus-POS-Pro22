import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SupplierPaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
}

export const SupplierPaginationBar: React.FC<SupplierPaginationBarProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}) => {
  if (totalItems <= pageSize) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
        Affichage de <span className="text-slate-900 dark:text-white font-black">{(currentPage - 1) * pageSize + 1}</span> à{' '}
        <span className="text-slate-900 dark:text-white font-black">{Math.min(currentPage * pageSize, totalItems)}</span> sur{' '}
        <span className="text-slate-900 dark:text-white font-black">{totalItems}</span> fournisseurs
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(p => Math.max(1, (typeof p === 'number' ? p : 1) - 1))}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} /> Précédent
        </button>
        <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-200 px-2">
          Page {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(p => Math.min(totalPages, (typeof p === 'number' ? p : 1) + 1))}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Suivant <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
