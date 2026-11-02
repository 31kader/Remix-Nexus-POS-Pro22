import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomerTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalFilteredCount: number;
  pageSize: number;
  setTablePage: React.Dispatch<React.SetStateAction<number>>;
}

export function CustomerTablePagination({
  currentPage,
  totalPages,
  totalFilteredCount,
  pageSize,
  setTablePage
}: CustomerTablePaginationProps) {
  if (totalFilteredCount <= pageSize) return null;

  return (
    <div className="flex items-center justify-between pt-2 text-xs">
      <span className="text-slate-500 dark:text-zinc-400 font-medium">
        Affichage de <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> à <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, totalFilteredCount)}</span> sur <span className="font-bold text-slate-900 dark:text-white">{totalFilteredCount}</span> clients
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => setTablePage(p => Math.max(1, p - 1))}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 font-bold uppercase text-[11px] shadow-xs cursor-pointer"
        >
          <ChevronLeft size={14} /> Précédent
        </button>
        <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 font-mono font-bold text-xs">
          Page {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 font-bold uppercase text-[11px] shadow-xs cursor-pointer"
        >
          Suivant <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
