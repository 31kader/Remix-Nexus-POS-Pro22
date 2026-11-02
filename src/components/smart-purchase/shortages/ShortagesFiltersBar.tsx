import React from 'react';
import { 
  Search, Filter, Camera, X, 
  Building2, PackagePlus 
} from 'lucide-react';
import { Product, Supplier } from '../../../types';
import { BarcodeScanner } from '../../BarcodeScanner';
import { Button } from '../../ui';
import { ShortagesProductAutocompleteDropdown } from './ShortagesProductAutocompleteDropdown';
import { useShortagesFiltersBarLogic } from './useShortagesFiltersBarLogic';

interface ShortagesFiltersBarProps {
  products: Product[];
  suppliers: Supplier[];
  onOpenAddCustom?: (barcode?: string) => void;
}

export const ShortagesFiltersBar: React.FC<ShortagesFiltersBarProps> = ({
  products,
  suppliers,
  onOpenAddCustom
}) => {
  const {
    inputVal,
    setInputVal,
    setSearchQuery,
    selectedSupplierFilter,
    setSelectedSupplierFilter,
    isCameraScannerOpen,
    setIsCameraScannerOpen,
    isDropdownOpen,
    setIsDropdownOpen,
    inputRef,
    dropdownRef,
    supplierOptions,
    autocompleteSuggestions,
    handleAddProduct,
    handleKeyDown,
    handleCameraScan
  } = useShortagesFiltersBarLogic(products, suppliers, onOpenAddCustom);

  return (
    <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-industrial-900/60 p-3.5 rounded-2xl border border-industrial-800 shadow-md">
      {/* 1. Champ de Recherche Textuelle & Douchette USB */}
      <div className="relative flex-1">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-industrial-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => {
              const val = e.target.value;
              setInputVal(val);
              setSearchQuery(val);
              setIsDropdownOpen(val.trim().length >= 2);
            }}
            onFocus={() => {
              if (inputVal.trim().length >= 2) {
                setIsDropdownOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher ou scanner code-barres (douchette USB)..."
            className="w-full bg-industrial-950 border border-industrial-700/80 rounded-xl pl-10 pr-24 py-2.5 text-sm text-white placeholder-industrial-500 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />

          {/* Boutons d'action dans l'input (Effacer + Caméra) */}
          <div className="absolute right-2 flex items-center gap-1">
            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  setSearchQuery('');
                  setIsDropdownOpen(false);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors"
                title="Effacer la recherche"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all flex items-center gap-1 text-xs font-bold"
              title="Scanner via la caméra"
            >
              <Camera size={15} />
            </button>
          </div>
        </div>

        {/* Panneau déroulant d'autocomplétion (Suggestions du catalogue) */}
        <ShortagesProductAutocompleteDropdown
          isOpen={isDropdownOpen}
          suggestions={autocompleteSuggestions}
          onSelectProduct={handleAddProduct}
          dropdownRef={dropdownRef}
        />
      </div>

      {/* 2. Filtre par Fournisseur */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex items-center">
          <Building2 size={15} className="absolute left-3 text-industrial-400 pointer-events-none" />
          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
            className="bg-industrial-950 border border-industrial-700/80 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Tous les fournisseurs</option>
            {supplierOptions.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
          <Filter size={12} className="absolute right-3 text-industrial-500 pointer-events-none" />
        </div>

        {selectedSupplierFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setSelectedSupplierFilter('all')}
            className="p-2 rounded-xl bg-industrial-950 border border-industrial-700 text-industrial-400 hover:text-white hover:border-industrial-600 transition-all text-xs"
            title="Réinitialiser le filtre fournisseur"
          >
            <X size={14} />
          </button>
        )}

        {/* 3. Bouton "+ Produit Hors-Catalogue" */}
        {onOpenAddCustom && (
          <Button
            type="button"
            onClick={() => onOpenAddCustom()}
            className="shrink-0 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            title="Noter un produit manquant qui n'existe pas dans le catalogue"
          >
            <PackagePlus size={15} className="text-amber-400" />
            <span className="hidden md:inline">Hors-Catalogue</span>
            <span className="md:hidden">+ Libre</span>
          </Button>
        )}
      </div>

      {/* 3. Modal Scanner Caméra */}
      {isCameraScannerOpen && (
        <BarcodeScanner
          onScan={handleCameraScan}
          onClose={() => setIsCameraScannerOpen(false)}
        />
      )}
    </div>
  );
};
