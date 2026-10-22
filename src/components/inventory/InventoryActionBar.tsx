import React from 'react';
import { Search, Filter, Scan, Trash2, Star, LayoutGrid, List, X } from 'lucide-react';
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
  viewMode: 'list' | 'grouped' | 'grid';
  setViewMode: (v: any) => void;
}

export const InventoryActionBar: React.FC<InventoryActionBarProps> = ({
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
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-2.5 sm:p-3 rounded-xl shadow-xs">
      {/* Search Box with instant clear button */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
        <input 
          type="text"
          placeholder="Rechercher nom, SKU, code-barres..."
          className="w-full h-10 pl-9 pr-9 bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-inner"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button 
            type="button" 
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Action Controls & View Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto no-scrollbar py-0.5">
        {/* Toggle Filters Button */}
        <button 
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "h-9 flex items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0 active:scale-95",
            showFilters 
              ? "bg-indigo-50 dark:bg-indigo-600/20 border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300" 
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
          )}
        >
          <Filter size={13} />
          <span>Filtres</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Optical Barcode Scanner Button */}
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="h-9 w-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
          title="Scanner un code-barres par caméra"
        >
          <Scan size={15} />
        </button>

        {/* Bulk Delete / Purge Button */}
        <button
          type="button"
          onClick={selectedProductIds.length > 0 ? onBulkDelete : onClearInventory}
          className={cn(
            "h-9 px-2.5 rounded-xl border transition-all cursor-pointer shadow-xs shrink-0 active:scale-95 flex items-center gap-1",
            selectedProductIds.length > 0 
              ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30" 
              : "bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/30"
          )}
          title={selectedProductIds.length > 0 ? `Supprimer (${selectedProductIds.length}) éléments sélectionnés` : "Vider le catalogue"}
        >
          <Trash2 size={14} />
          {selectedProductIds.length > 0 && <span className="text-xs font-mono font-bold">({selectedProductIds.length})</span>}
        </button>

        {/* Quick Select (Favorites) Mode Toggle */}
        <button 
          type="button"
          onClick={() => setIsQuickSelectMode(!isQuickSelectMode)}
          className={cn(
            "h-9 flex items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0 active:scale-95",
            isQuickSelectMode 
              ? "bg-amber-50 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-300" 
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
          title="Activer le mode édition des favoris de caisse"
        >
          <Star size={13} fill={isQuickSelectMode ? "currentColor" : "none"} />
          <span className="hidden sm:inline">Favoris</span>
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block shrink-0" />

        {/* View Mode Switcher (Grid vs List) */}
        <div className="h-9 flex items-center bg-slate-100 dark:bg-slate-950/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
          <button 
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer",
              viewMode === 'grid' 
                ? "bg-indigo-600 text-white shadow-xs" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
            title="Affichage en Grille Visuelle (Cartes)"
          >
            <LayoutGrid size={14} />
          </button>
          <button 
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer",
              viewMode === 'list' 
                ? "bg-indigo-600 text-white shadow-xs" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
            title="Affichage en Tableau (Lignes)"
          >
            <List size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
