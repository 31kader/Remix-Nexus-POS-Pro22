import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface GeneralNotesFilterBarProps {
  filterType: 'all' | 'versement' | 'retrait' | 'memo';
  setFilterType: (type: 'all' | 'versement' | 'retrait' | 'memo') => void;
  totalNotesCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onResetPage: () => void;
}

export const GeneralNotesFilterBar: React.FC<GeneralNotesFilterBarProps> = ({
  filterType,
  setFilterType,
  totalNotesCount,
  searchQuery,
  setSearchQuery,
  onResetPage
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
        <button
          type="button"
          onClick={() => { setFilterType('all'); onResetPage(); }}
          className={cn(
            "px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
            filterType === 'all'
              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
          )}
        >
          Toutes ({totalNotesCount})
        </button>
        <button
          type="button"
          onClick={() => { setFilterType('versement'); onResetPage(); }}
          className={cn(
            "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer",
            filterType === 'versement'
              ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
          )}
        >
          Versements
        </button>
        <button
          type="button"
          onClick={() => { setFilterType('retrait'); onResetPage(); }}
          className={cn(
            "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer",
            filterType === 'retrait'
              ? "bg-rose-600 text-white border-rose-500 shadow-sm"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
          )}
        >
          Retraits
        </button>
        <button
          type="button"
          onClick={() => { setFilterType('memo'); onResetPage(); }}
          className={cn(
            "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer",
            filterType === 'memo'
              ? "bg-slate-700 text-white border-slate-600 shadow-sm"
              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
          )}
        >
          Mémos
        </button>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
        <input
          type="text"
          placeholder="Rechercher client, auteur, détail..."
          className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold uppercase"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); onResetPage(); }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); onResetPage(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
