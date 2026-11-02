import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OrdersTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalFilteredCount: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export function OrdersTablePagination({
  currentPage,
  totalPages,
  totalFilteredCount,
  setCurrentPage
}: OrdersTablePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border border-zinc-800 rounded-xl bg-zinc-900/60">
      <span className="text-xs text-zinc-400">
        Page {currentPage} sur {totalPages} ({totalFilteredCount} cde{totalFilteredCount > 1 ? 's' : ''})
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Page précédente"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-mono font-bold text-white px-2">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Page suivante"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
