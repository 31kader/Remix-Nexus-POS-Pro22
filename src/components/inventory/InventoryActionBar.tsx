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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl shadow-sm">
      {/* Search Box with instant clear button */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={17} />
        <input 
          type="text"
          placeholder="Rechercher par nom, SKU, code-barres ou fournisseur..."
          className="w-full pl-10 pr-9 py-2.5 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-inner"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button 
            type="button" 
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Action Controls & View Switcher */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {/* Toggle Filters Button */}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm",
            showFilters 
              ? "bg-indigo-50 dark:bg-indigo-600/20 border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300" 
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
          )}
        >
          <Filter size={14} />
          <span>Filtres</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Optical Barcode Scanner Button */}
        <button
          onClick={() => setIsScannerOpen(true)}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all cursor-pointer shadow-sm"
          title="Scanner un code-barres par caméra"
        >
          <Scan size={15} />
        </button>

        {/* Bulk Delete / Purge Button */}
        <button
          onClick={selectedProductIds.length > 0 ? onBulkDelete : onClearInventory}
          className={cn(
            "p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm",
            selectedProductIds.length > 0 
              ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30" 
              : "bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/30"
          )}
          title={selectedProductIds.length > 0 ? `Supprimer (${selectedProductIds.length}) éléments sélectionnés` : "Vider le catalogue"}
        >
          <Trash2 size={15} />
        </button>

        {/* Quick Select (Favorites) Mode Toggle */}
        <button 
          onClick={() => setIsQuickSelectMode(!isQuickSelectMode)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm",
            isQuickSelectMode 
              ? "bg-amber-50 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-300" 
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
          title="Activer le mode édition des favoris de caisse"
        >
          <Star size={14} fill={isQuickSelectMode ? "currentColor" : "none"} />
          <span className="hidden md:inline">Favoris</span>
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        {/* View Mode Switcher (Grid vs List) */}
        <div className="flex bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button 
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              viewMode === 'grid' 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
            title="Affichage en Grille Visuelle (Cartes)"
          >
            <LayoutGrid size={15} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              viewMode === 'list' 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
            title="Affichage en Tableau (Lignes)"
          >
            <List size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
