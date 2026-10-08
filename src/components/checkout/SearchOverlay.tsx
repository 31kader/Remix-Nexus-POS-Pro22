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
  return (
    <AnimatePresence>
      {search && search.trim().length >= 1 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute top-full left-0 right-0 mt-3 bg-slate-950/98 border-2 border-indigo-500/60 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] overflow-hidden max-h-[65vh] flex flex-col  ring-2 ring-white/10"
        >
          <div className="p-4 px-6 border-b border-white/15 bg-slate-900 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={18} className="text-indigo-400" />
              Résultats de recherche ({filteredProducts.length} articles) — <span className="text-emerald-400 font-bold">↑ ↓ Naviguer | Entrée Ajouter</span>
            </span>
            <button 
              type="button"
              onClick={() => { setSearch(''); searchRef.current?.focus(); }} 
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar divide-y divide-white/10 bg-slate-950 p-4 space-y-3 pb-32">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={p.id || `search-res-${idx}`}
                    type="button"
                    className={cn(
                      "w-full text-left p-4 lg:p-5 rounded-xl flex items-center gap-5 transition-all group outline-none border",
                      isSelected 
                        ? "bg-indigo-600/40 border-indigo-400 ring-2 ring-indigo-300 shadow-xs scale-[1.01]"
                        : "hover:bg-indigo-600/20 border-white/5 hover:border-indigo-500/40"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToCart(p, isReturnMode ? -1 : 1);
                      setSearch('');
                    }}
                  >
                    {/* Large 64px High-Visibility Thumbnail Image */}
                    <SafeImage
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-16 h-16 object-cover rounded-xl border-2 border-white/15 group-hover:border-indigo-400 transition-colors shadow-lg flex-shrink-0"
                      containerClassName="w-16 h-16 rounded-xl flex-shrink-0"
                      fallback={
                        <div className="w-16 h-16 bg-slate-900 rounded-xl flex-shrink-0 flex items-center justify-center text-slate-400 border-2 border-white/15 group-hover:border-indigo-400 transition-colors shadow-lg">
                          <Package size={28} />
                        </div>
                      }
                    />

                    {/* Large High-Contrast Product Details */}
                    <div className="flex-1 min-w-0 py-1">
                      <p className={cn("text-base lg:text-lg font-black leading-snug truncate transition-colors", isSelected ? "text-indigo-100" : "text-white group-hover:text-indigo-200")}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-mono font-black text-indigo-300 bg-indigo-950/60 px-3 py-1 rounded-lg border border-indigo-500/30">
                          {p.barcode || p.sku || 'SANS-CODE'}
                        </span>
                        <span className={cn(
                          "text-xs px-3 py-1 rounded-lg font-black uppercase tracking-tight border",
                          (p.stock || 0) <= (p.minStock || 5) ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        )}>
                          Stock: {p.stock ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Giant Price Tag */}
                    <div className="text-right flex flex-col justify-center flex-shrink-0 min-w-[110px]">
                      <p className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tight leading-none">{(p.price || 0).toFixed(2)}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{settings.currency || 'DA'}</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-500 border border-white/10">
                  <Search size={32} />
                </div>
                <p className="text-white font-black text-base">Aucun produit trouvé pour "{search}"</p>
                <p className="text-xs text-slate-400">Vérifiez le nom, le code-barres ou la référence.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
