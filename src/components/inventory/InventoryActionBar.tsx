import React from 'react';
import { Search, Filter, Scan, Trash2, Check, Star, LayoutList, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InventoryActionBarProps {
  search: string;
  setSearch: (s: string) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  hasActiveFilters: boolean;
  setIsScannerOpen: (v: boolean) => void;
  selectedProductIds: string[];
  onBulkDelete: () => void;
  onClearInventory: () => void;
  isQuickSelectMode: boolean;
  setIsQuickSelectMode: (v: boolean) => void;
  viewMode: 'list' | 'grouped';
  setViewMode: (v: 'list' | 'grouped') => void;
}

export const InventoryActionBar = ({
  search,
  setSearch,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  setIsScannerOpen,
  selectedProductIds,
  onBulkDelete,
  onClearInventory,
  isQuickSelectMode,
  setIsQuickSelectMode,
  viewMode,
  setViewMode
}: InventoryActionBarProps) => {
  return (
    <div className="flex flex-col xl:flex-row items-center gap-6">
      <div className="flex-1 relative group w-full">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-all duration-300" size={22} />
        <input 
          type="text"
          placeholder="RECHERCHER PAR DÉSIGNATION, SKU OU FOURNISSEUR..."
          className="w-full pl-14 pr-6 py-5 bg-black/40 border border-white/10 rounded-[1.5rem] outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 text-[11px] font-black text-white placeholder:text-slate-800 transition-all uppercase tracking-[0.2em] shadow-inner group-hover:border-white/20"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-4 w-full xl:w-auto">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "px-8 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all active:scale-95 shadow-2xl relative overflow-hidden group",
            showFilters ? "bg-indigo-600 text-white border-indigo-400 shadow-neon-indigo italic" : "bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:text-white"
          )}
        >
          <Filter size={18} className="group-hover:rotate-12 transition-transform" /> FILTRES AVANCÉS
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-rose-500 rounded-full shadow-neon-cyan animate-pulse ring-2 ring-white/10" />
          )}
        </button>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="p-4 bg-white/5 text-slate-500 border border-white/5 rounded-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-400 transition-all shadow-2xl active:scale-90 group"
          title="SCANNER OPTIQUE"
        >
          <Scan size={22} className="group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={selectedProductIds.length > 0 ? onBulkDelete : onClearInventory}
          className={cn(
            "p-4 rounded-2xl border transition-all shadow-2xl active:scale-90 group relative overflow-hidden",
            selectedProductIds.length > 0 
              ? "bg-rose-600 text-white border-rose-400 shadow-neon-rose"
              : "bg-rose-500/5 text-rose-500/40 border-rose-500/10 hover:bg-rose-600 hover:text-white"
          )}
          title={selectedProductIds.length > 0 ? "SUPPRIMER SÉLECTION" : "VIDER CATALOGUE"}
        >
          <Trash2 size={22} className="group-hover:scale-110 transition-transform relative z-10" />
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </button>

        <div className="h-10 w-px bg-white/5 mx-2" />

        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
          <button 
            onClick={() => setIsQuickSelectMode(!isQuickSelectMode)}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.2em] active:scale-95",
              isQuickSelectMode ? "bg-amber-600 text-white shadow-neon-indigo italic" : "text-slate-600 hover:text-slate-300 hover:bg-white/5"
            )}
            title="MODE ÉDITION FAVORIS"
          >
            <Star size={16} fill={isQuickSelectMode ? "white" : "none"} /> <span className="hidden sm:inline font-black tracking-widest">FAVORIS</span>
          </button>
        </div>

        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
          <button onClick={() => setViewMode('list')} className={cn("p-3 rounded-xl transition-all active:scale-90", viewMode === 'list' ? "bg-white/10 text-white shadow-2xl border border-white/10" : "text-slate-700 hover:text-slate-400")}>
            <LayoutList size={22} />
          </button>
          <button onClick={() => setViewMode('grouped')} className={cn("p-3 rounded-xl transition-all active:scale-90", viewMode === 'grouped' ? "bg-white/10 text-white shadow-2xl border border-white/10" : "text-slate-700 hover:text-slate-400")}>
            <Layers size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
