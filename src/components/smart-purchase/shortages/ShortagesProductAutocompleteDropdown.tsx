import React from 'react';
import { Package, Barcode, Plus } from 'lucide-react';
import { Product } from '../../../types';

export interface AutocompleteSuggestionItem {
  product: Product;
  alreadyInShortages: boolean;
}

export interface ShortagesProductAutocompleteDropdownProps {
  isOpen: boolean;
  suggestions: AutocompleteSuggestionItem[];
  onSelectProduct: (product: Product) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export const ShortagesProductAutocompleteDropdown: React.FC<ShortagesProductAutocompleteDropdownProps> = ({
  isOpen,
  suggestions,
  onSelectProduct,
  dropdownRef
}) => {
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 top-full mt-2 bg-industrial-950 border border-industrial-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="px-3 py-2 bg-industrial-900 border-b border-industrial-800 flex items-center justify-between text-[11px] font-mono text-industrial-400">
        <span>Articles du catalogue correspondants ({suggestions.length})</span>
        <span className="text-[10px] text-industrial-500">Appuyez sur Entrée ou cliquez pour ajouter</span>
      </div>

      <div className="divide-y divide-industrial-800/60">
        {suggestions.map(({ product, alreadyInShortages }) => (
          <div
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className="px-3.5 py-2.5 flex items-center justify-between hover:bg-industrial-900/80 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-industrial-900 border border-industrial-800 flex items-center justify-center shrink-0 text-industrial-400">
                <Package size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                  {product.name}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-industrial-400">
                  {product.barcode && (
                    <span className="flex items-center gap-1">
                      <Barcode size={10} /> {product.barcode}
                    </span>
                  )}
                  <span>•</span>
                  <span>Stock: {product.stock || 0}</span>
                  <span>•</span>
                  <span>Coût: {Number(product.costPrice || 0).toLocaleString('fr-DZ')} DA</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {alreadyInShortages ? (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold">
                  Déjà présent (+1)
                </span>
              ) : (
                <span className="p-1 rounded-lg bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Plus size={14} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
