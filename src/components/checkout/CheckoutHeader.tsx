import React from 'react';
import { Search, Scan } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SearchOverlay } from './SearchOverlay';
import { Product } from '../../types';

interface Props {
  search: string;
  setSearch: (s: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  handleBarcodeScan: (val: string) => void;
  setIsScannerOpen: (v: boolean) => void;
  filteredProducts: Product[];
  addToCart: (p: Product, qty?: number) => void;
  isReturnMode: boolean;
  settings: any;
}

export const CheckoutHeader: React.FC<Props> = ({
  search, setSearch, searchRef, handleBarcodeScan, setIsScannerOpen, filteredProducts, addToCart, isReturnMode, settings
}) => {
  const [localSearch, setLocalSearch] = React.useState(search);

  const searchTimeoutRef = React.useRef<any>(null);

  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(val);
    }, 150);
  };

  return (
    <div className="p-6 border-b border-white/5 bg-workspace/60 sticky top-0 z-50 backdrop-blur-2xl ring-1 ring-white/5">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-all duration-300" size={22} />
          <input 
            ref={searchRef}
            type="text"
            placeholder="RECHERCHE SCANNER ACTIF... (F3)"
            className="w-full pl-14 pr-6 py-5 bg-black/40 border border-white/10 rounded-[1.5rem] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 outline-none transition-all text-white font-black text-[11px] uppercase tracking-[0.2em] placeholder:text-slate-700 shadow-inner group-hover:border-white/20"
            value={localSearch}
            onChange={handleChange}
            onKeyDown={(e) => {
              const val = e.currentTarget.value;
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (val.trim() !== '') {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                  handleBarcodeScan(val.trim());
                  setSearch('');
                  setLocalSearch('');
                  
                  // Trailing clear helper to wipe out any carriage return / line feed residues
                  setTimeout(() => {
                    setSearch('');
                    setLocalSearch('');
                  }, 50);
                }
              }
            }}
          />
          <SearchOverlay 
            search={search}
            setSearch={setSearch}
            filteredProducts={filteredProducts}
            addToCart={addToCart}
            isReturnMode={isReturnMode}
            settings={settings}
            searchRef={searchRef}
          />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="p-4 bg-black/40 border border-white/10 rounded-2xl hover:bg-indigo-600 hover:text-white text-slate-500 transition-all shadow-2xl active:scale-90 group relative overflow-hidden"
            title="DÉMARRER SCANNER OPTIQUE"
          >
            <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
            <Scan size={24} className="relative z-10" />
          </button>
        </div>
      </div>
    </div>
  );
};
