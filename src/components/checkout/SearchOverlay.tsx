import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Package, ShoppingBag } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { SafeImage } from '../ui';

interface SearchOverlayProps {
  search: string;
  setSearch: (s: string) => void;
  filteredProducts: Product[];
  addToCart: (p: Product, q?: number) => void;
  isReturnMode: boolean;
  settings: CompanySettings;
  searchRef: React.RefObject<HTMLInputElement | null>;
  selectedIndex?: number;
}

export const SearchOverlay = memo(function SearchOverlay({
  search,
  setSearch,
  filteredProducts,
  addToCart,
  isReturnMode,
  settings,
  searchRef,
  selectedIndex = 0
}: SearchOverlayProps) {
  const currency = settings?.currency || 'DA';

  return (
    <AnimatePresence>
      {search && search.trim().length >= 1 && (
        <motion.div 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className="absolute top-full left-0 right-0 mt-1.5 bg-slate-950/98 border border-indigo-500/50 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-[100] overflow-hidden max-h-[70vh] flex flex-col ring-1 ring-white/10 backdrop-blur-md"
        >
          {/* En-tête compact de navigation */}
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 border-b border-white/10 bg-slate-900/90 flex items-center justify-between flex-shrink-0">
            <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-indigo-400" />
              <span>{filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}</span>
              <span className="hidden sm:inline text-emerald-400 font-bold font-mono text-[10px] ml-2">
                [↑ ↓ Naviguer • Entrée Ajouter]
              </span>
            </span>
            <button 
              type="button"
              onClick={() => { setSearch(''); searchRef.current?.focus(); }} 
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              title="Fermer la recherche (Échap)"
            >
              <X size={16} />
            </button>
          </div>

          {/* Liste haute densité des articles (8 à 12 visibles simultanément) */}
          <div className="overflow-y-auto custom-scrollbar divide-y divide-white/5 bg-slate-950 p-1.5 sm:p-2 space-y-0.5">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p, idx) => {
                const isSelected = idx === selectedIndex;
                const stock = p.stock ?? 0;
                const isLowStock = stock <= (p.minStock ?? 5);

                return (
                  <button
                    key={p.id || `search-res-${idx}`}
                    type="button"
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg flex items-center gap-2.5 sm:gap-3 transition-all group outline-none border cursor-pointer select-none",
                      isSelected 
                        ? "bg-indigo-600/35 border-indigo-400 ring-1 ring-indigo-300/60 shadow-xs"
                        : "hover:bg-indigo-600/15 border-transparent hover:border-indigo-500/30"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToCart(p, isReturnMode ? -1 : 1);
                      setSearch('');
                    }}
                  >
                    {/* Miniature Compacte (38x38px) */}
                    <SafeImage
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-lg border border-white/15 group-hover:border-indigo-400 transition-colors flex-shrink-0"
                      containerClassName="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex-shrink-0"
                      fallback={
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-900 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-500 border border-white/10 group-hover:border-indigo-400 transition-colors">
                          <Package size={18} />
                        </div>
                      }
                    />

                    {/* Détails du produit : Nom + Code-barres & Stock sur la même ligne */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-xs sm:text-sm font-bold truncate leading-tight transition-colors",
                        isSelected ? "text-indigo-100" : "text-white group-hover:text-indigo-200"
                      )}>
                        {p.name}
                      </p>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-indigo-300/80 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-500/20 truncate max-w-[130px]">
                          {p.barcode || p.sku || 'SANS-CODE'}
                        </span>

                        <span className={cn(
                          "text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-tight border",
                          isLowStock 
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40" 
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        )}>
                          Stock: {stock}
                        </span>

                        {p.category && (
                          <span className="hidden md:inline text-[9px] text-slate-400 truncate max-w-[100px]">
                            • {p.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prix compact en gras */}
                    <div className="text-right flex flex-col justify-center flex-shrink-0 min-w-[75px] sm:min-w-[95px] pl-2 border-l border-white/10">
                      <span className="text-sm sm:text-base font-black font-mono text-emerald-400 tracking-tight leading-none tabular-nums">
                        {(p.price || 0).toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {currency}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-5 text-center space-y-2">
                <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-500 border border-white/10">
                  <Search size={20} />
                </div>
                <p className="text-white font-bold text-xs">Aucun produit trouvé pour "{search}"</p>
                <p className="text-[10px] text-slate-400">Vérifiez la désignation, le code-barres ou la référence.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
