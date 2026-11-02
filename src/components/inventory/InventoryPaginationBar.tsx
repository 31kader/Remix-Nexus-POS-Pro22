import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InventoryPaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function InventoryPaginationBar({
  currentPage,
  totalPages,
  totalItems,
  onPageChange
}: InventoryPaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Page <strong className="text-slate-900 dark:text-white">{currentPage}</strong> sur <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({totalItems} articles)
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-sm"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-sm"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
