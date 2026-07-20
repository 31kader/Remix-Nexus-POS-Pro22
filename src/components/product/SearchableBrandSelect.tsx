import React, { useState } from 'react';
import { Search, X, Award } from 'lucide-react';
import { Brand } from '../../types';
import { SafeImage } from '../ui';
import { cn } from '../../lib/utils';

export function SearchableBrandSelect({ 
  value, 
  onChange, 
  brands,
  onManage
}: { 
  value: string; 
  onChange: (val: string) => void; 
  brands: Brand[];
  onManage?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedBrand = brands.find(b => b.id === value);
  const displayValue = selectedBrand ? selectedBrand.name : '';
  
  const filteredBrands = brands.filter(b => {
    const searchTerms = search.toLowerCase().trim().split(' ').filter(Boolean);
    if (searchTerms.length === 0) return true;
    return searchTerms.every(term => b.name.toLowerCase().includes(term));
  }).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="relative flex-1">
      <div className="relative">
        <input 
          type="text" 
          placeholder="Rechercher une marque..."
          className="w-full pl-4 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-white/20 transition-all font-bold"
          value={isOpen ? search : displayValue}
          onFocus={() => { setIsOpen(true); setSearch(''); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {value && !isOpen && (
            <button type="button" onClick={() => { onChange(''); setSearch(''); }} className="text-white/20 hover:text-white transition-colors">
               <X size={16}/>
            </button>
          )}
          <Search size={16} className="text-white/20" />
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-workspace border border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-hidden flex flex-col backdrop-blur-xl">
          <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
             <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] px-1 flex-1">Marques ({filteredBrands.length})</span>
             {onManage && (
               <button type="button" onClick={onManage} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest px-2 transition-colors">Gérer</button>
             )}
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1">
          {filteredBrands.length === 0 ? (
            <div className="p-8 text-center text-white/20 italic">
              <Award size={24} className="mx-auto mb-2 opacity-10" />
              <p className="text-xs font-bold uppercase tracking-widest">Aucune marque</p>
            </div>
          ) : (
            filteredBrands.map(b => (
              <button
                key={b.id}
                type="button"
                className={cn(
                  "w-full text-left p-3 hover:bg-white/5 border-b border-white/5 last:border-0 flex items-center gap-4 transition-all group",
                  value === b.id ? "bg-indigo-500/10" : ""
                )}
                onClick={() => {
                  onChange(b.id);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                <div className="w-8 h-8 bg-industrial-800 rounded-lg flex-shrink-0 overflow-hidden border border-industrial-700 group-hover:border-indigo-500/50 transition-all shadow-md">
                  {b.logoUrl ? (
                    <SafeImage src={b.logoUrl} alt={b.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 font-bold text-xs">{b.name.substring(0, 2).toUpperCase()}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors cursor-pointer">{b.name}</p>
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
