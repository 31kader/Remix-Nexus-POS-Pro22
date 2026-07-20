import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Package } from 'lucide-react';
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
}

export const SearchOverlay = memo(function SearchOverlay({
  search,
  setSearch,
  filteredProducts,
  addToCart,
  isReturnMode,
  settings,
  searchRef
}: SearchOverlayProps) {
  return (
    <AnimatePresence>
      {search.length >= 2 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden max-h-[70vh] flex flex-col"
        >
          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <span className="text-xs font-black text-white/40 uppercase tracking-widest">Résultats de recherche ({filteredProducts.length})</span>
            <button onClick={() => { setSearch(''); searchRef.current?.focus(); }} className="p-2 text-white/40 hover:text-white transition-colors"><X size={20} /></button>
          </div>
          <div className="overflow-y-auto bg-slate-900">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p, idx) => (
                <button
                  key={p.id || `search-res-${idx}`}
                  type="button"
                  className="w-full text-left p-5 hover:bg-white/5 flex items-center gap-5 transition-colors border-b border-white/5 last:border-0 group outline-none focus:bg-white/5"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToCart(p, isReturnMode ? -1 : 1);
                    setSearch('');
                  }}
                >
                  <div className="w-14 h-14 bg-white/5 rounded-xl flex-shrink-0 overflow-hidden border border-white/5 group-hover:border-indigo-500/30 transition-colors shadow-sm">
                    {(() => {
                      const imgSource = p.imageUrl || (p.imageUrls && p.imageUrls[0]) || p.image || '';
                      return imgSource ? (
                        <SafeImage 
                          src={imgSource} 
                          alt={p.name} 
                          className="w-full h-full object-cover" 
                          fallback={<Package size={18} className="text-slate-500/20" />}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package size={24} />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <p className="text-base font-black text-white truncate group-hover:text-indigo-400 transition-colors">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-mono font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded">SKU: {p.sku}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-black uppercase tracking-tighter",
                        p.stock <= (p.minStock || 5) ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                      )}>
                        Stock: {p.stock}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-center gap-0.5">
                    <p className="text-xl font-black text-indigo-600 tracking-tighter leading-none">{p.price.toFixed(2)}</p>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{settings.currency}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-12 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Search size={32} />
                </div>
                <p className="text-slate-500 font-medium">Aucun produit trouvé pour "{search}"</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
