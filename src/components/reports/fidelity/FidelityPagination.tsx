import React from 'react';

interface FidelityPaginationProps {
  currentPage: number;
  totalPages: number;
  activeListLength: number;
  itemsPerPage: number;
  onPageChange: (page: number | ((p: number) => number)) => void;
}

export const FidelityPagination: React.FC<FidelityPaginationProps> = ({
  currentPage,
  totalPages,
  activeListLength,
  itemsPerPage,
  onPageChange,
}) => {
  if (activeListLength <= itemsPerPage) return null;

  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
      <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
        Affichage {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, activeListLength)} sur{' '}
        {activeListLength}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(p => Math.max(1, p - 1))}
          className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
        >
          Précédent
        </button>
        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-black border border-indigo-500/30">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
          className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
        >
          Suivant
        </button>
      </div>
    </div>
  );
};
