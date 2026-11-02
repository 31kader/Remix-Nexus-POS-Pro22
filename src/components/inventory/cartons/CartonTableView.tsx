import React from 'react';
import { Boxes, Search, X, Camera, Plus, RefreshCw } from 'lucide-react';
import { EnrichedCarton } from './useCartonManagerLogic';
import { Product } from '../../../types';
import { CartonTableKpiCards } from './CartonTableKpiCards';
import { CartonCardItem } from './CartonCardItem';

interface CartonTableViewProps {
  totals: { totalCartons: number; totalCost: number; totalRetail: number };
  outOfStockCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  stockFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  setStockFilter: (f: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock') => void;
  sortBy: 'name' | 'carton_stock' | 'updated';
  setSortBy: (s: 'name' | 'carton_stock' | 'updated') => void;
  onSwitchToScanner?: () => void;
  handleOpenCreate: () => void;
  isLoading: boolean;
  filteredCartons: EnrichedCarton[];
  setZoomedImage: (img: { url: string; title: string } | null) => void;
  setHistoryProduct: (p: Product) => void;
  setIsHistoryModalOpen: (o: boolean) => void;
  setEditingProductSheet: (p: Product) => void;
  setIsProductSheetModalOpen: (o: boolean) => void;
  setAdjustingTemplate: (t: EnrichedCarton) => void;
  setCartonDeltaInput: (d: number) => void;
  onAddToCartDirectly?: (item: any) => void;
  handleOpenEdit: (t: EnrichedCarton) => void;
  handleDeleteTemplate: (t: EnrichedCarton) => void;
  categories: { id: string; name: string }[];
}

export function CartonTableView({
  totals,
  outOfStockCount,
  searchQuery,
  setSearchQuery,
  stockFilter,
  setStockFilter,
  sortBy,
  setSortBy,
  onSwitchToScanner,
  handleOpenCreate,
  isLoading,
  filteredCartons,
  setZoomedImage,
  setHistoryProduct,
  setIsHistoryModalOpen,
  setEditingProductSheet,
  setIsProductSheetModalOpen,
  setAdjustingTemplate,
  setCartonDeltaInput,
  onAddToCartDirectly,
  handleOpenEdit,
  handleDeleteTemplate,
  categories: _categories
}: CartonTableViewProps) {
  return (
    <div className="space-y-4">
      {/* 4 Cartes de Synthèse KPI */}
      <CartonTableKpiCards
        totals={totals}
        outOfStockCount={outOfStockCount}
      />

      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par produit, code-barres carton, SKU..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs font-semibold shrink-0">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${stockFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Tous
            </button>
            <button
              onClick={() => setStockFilter('in_stock')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${stockFilter === 'in_stock' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              En stock
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${stockFilter === 'out_of_stock' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Rupture
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500 shrink-0 cursor-pointer"
          >
            <option value="updated">Récents</option>
            <option value="carton_stock">Stock Cartons</option>
            <option value="name">Nom Produit</option>
          </select>

          {onSwitchToScanner && (
            <button
              type="button"
              onClick={onSwitchToScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              <Camera size={14} />
              <span className="hidden sm:inline">Scanner Réception</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 shrink-0 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Nouveau Carton</span>
          </button>
        </div>
      </div>

      {/* Grille des Cartons */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-xs">
          <RefreshCw size={20} className="animate-spin mr-2 text-amber-400" />
          Chargement de l'inventaire des cartons...
        </div>
      ) : filteredCartons.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Boxes size={28} />
          </div>
          <h3 className="font-bold text-sm text-white">Aucun carton trouvé</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery 
              ? "Aucun modèle de carton ne correspond à votre recherche." 
              : "Vous n'avez pas encore configuré de modèle de carton."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer"
          >
            <Plus size={16} />
            Créer un modèle de carton
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCartons.map(carton => (
            <CartonCardItem
              key={carton.id}
              carton={carton}
              setZoomedImage={setZoomedImage}
              setHistoryProduct={setHistoryProduct}
              setIsHistoryModalOpen={setIsHistoryModalOpen}
              setEditingProductSheet={setEditingProductSheet}
              setIsProductSheetModalOpen={setIsProductSheetModalOpen}
              setAdjustingTemplate={setAdjustingTemplate}
              setCartonDeltaInput={setCartonDeltaInput}
              onAddToCartDirectly={onAddToCartDirectly}
              handleOpenEdit={handleOpenEdit}
              handleDeleteTemplate={handleDeleteTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
