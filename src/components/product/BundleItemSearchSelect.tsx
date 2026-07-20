import React, { useState } from 'react';
import { Search, X, Package } from 'lucide-react';
import { Product } from '../../types';
import { SafeImage } from '../ui';
import { cn } from '../../lib/utils';

export function BundleItemSearchSelect({ 
  value, 
  onChange, 
  products,
  filterFn
}: { 
  value: string; 
  onChange: (val: string) => void; 
  products: Product[];
  filterFn?: (p: Product) => boolean;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedProduct = products.find(p => p.id === value);
  const displayValue = selectedProduct ? selectedProduct.name : '';
  
  const filteredProducts = products.filter(p => {
    if (filterFn && !filterFn(p)) return false;
    const searchTerms = search.toLowerCase().trim().split(' ').filter(Boolean);
    if (searchTerms.length === 0) return true;
    return searchTerms.every(term => 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term) ||
      (p.barcode || '').toLowerCase().includes(term) ||
      (p.reference || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400/50" size={16} />
        <input 
          type="text" 
          placeholder="Rechercher par nom, SKU ou code..."
          className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-white/20 transition-all font-bold"
          value={isOpen ? search : displayValue}
          onFocus={() => { setIsOpen(true); setSearch(''); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
        />
        {value && !isOpen && (
           <button type="button" onClick={() => { onChange(''); setSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"><X size={16}/></button>
        )}
      </div>
      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-workspace border border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-hidden flex flex-col backdrop-blur-xl">
          <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
             <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] px-1">Résultats ({filteredProducts.length})</span>
             <button type="button" className="text-white/20 hover:text-white transition-colors p-1" onClick={() => { onChange(''); setIsOpen(false); }}>
               <X size={16} />
             </button>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-white/20 italic">
              <Package size={24} className="mx-auto mb-2 opacity-10" />
              <p className="text-xs font-bold uppercase tracking-widest">Aucun produit</p>
            </div>
          ) : (
            filteredProducts.map(p => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 last:border-0 flex items-center gap-4 transition-all group"
                onClick={() => {
                  onChange(p.id);
                  setIsOpen(false);
                }}
              >
                <div className="w-12 h-12 bg-industrial-800 rounded-xl flex-shrink-0 overflow-hidden border border-industrial-700 group-hover:border-indigo-500/50 transition-all shadow-lg">
                  {(() => {
                    const imgSrc = p.imageUrl || p.imageUrls?.[0];
                    return imgSrc && imgSrc.trim() !== '' ? (
                      <SafeImage 
                        src={imgSrc} 
                        alt={p.name} 
                        className="w-full h-full object-cover" 
                        fallback={<Package size={18} className="text-slate-500/20" />}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10">
                        <Package size={20} />
                      </div>
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white uppercase tracking-wider truncate group-hover:text-indigo-400 transition-colors">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-black text-white tracking-widest uppercase">{p.sku}</span>
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter",
                      p.stock <= (p.minStock || 5) ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    )}>
                      Stock: {p.stock}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-indigo-400">{p.price.toFixed(2)}</p>
                </div>
              </button>
            ))
          )}
          </div>
        </div>
      )}
    </div>
  );
}
