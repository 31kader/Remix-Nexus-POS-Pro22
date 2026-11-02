import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExpiryPaginationBarProps {
  totalCount: number;
  startIndex: number;
  endIndex: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export function ExpiryPaginationBar({
  totalCount,
  startIndex,
  endIndex,
  currentPage,
  totalPages,
  pageSize,
  setCurrentPage,
  setPageSize
}: ExpiryPaginationBarProps) {
  if (totalCount <= 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/10 shadow-xl">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
          Affichage <span className="text-white font-black">{startIndex} - {endIndex}</span> sur <span className="text-indigo-400 font-black">{totalCount}</span> articles
        </span>

        <div className="h-4 w-px bg-white/10 mx-2" />

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Par page :</span>
          {[10, 20, 50].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setPageSize(size)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer",
                pageSize === size 
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                  : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(1)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Première page"
        >
          <ChevronsLeft size={16} />
        </button>

        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft size={14} /> Précédent
        </button>

        <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black tracking-wider">
          Page {currentPage} / {totalPages}
        </div>

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
          className="px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          Suivant <ChevronRight size={14} />
        </button>

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Dernière page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
