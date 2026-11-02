import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface JournalPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
}

export function JournalPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: JournalPaginationProps) {
  if (totalPages <= 1) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
      <span className="text-slate-400 font-medium">
        Affichage de <strong className="text-white font-mono">{startIdx}</strong> à{' '}
        <strong className="text-white font-mono">{endIdx}</strong> sur{' '}
        <strong className="text-white font-mono">{totalItems}</strong> écritures
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Page précédente"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono font-bold text-indigo-400 text-xs">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Page suivante"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
