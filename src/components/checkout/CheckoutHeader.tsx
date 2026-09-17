import React from 'react';
import { Search, Scan, X, Barcode } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SearchOverlay } from './SearchOverlay';
import { Product } from '../../types';

interface Props {
  search: string;
  setSearch: (s: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  handleBarcodeScan: (val: string, suppressToast?: boolean) => boolean | void;
  setIsScannerOpen: (v: boolean) => void;
  filteredProducts: Product[];
  addToCart: (p: Product, qty?: number) => void;
  isReturnMode: boolean;
  settings: any;
  total?: number;
}

export const CheckoutHeader: React.FC<Props> = ({
  search, setSearch, searchRef, handleBarcodeScan, setIsScannerOpen, filteredProducts, addToCart, isReturnMode, settings, total = 0
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [directBarcode, setDirectBarcode] = React.useState('');
  const barcodeRef = React.useRef<HTMLInputElement>(null);

  const hasUsedArrowKeys = React.useRef(false);

  React.useEffect(() => {
    setSelectedIndex(0);
    hasUsedArrowKeys.current = false;
  }, [search]);

  React.useEffect(() => {
    const handleF10Key = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        barcodeRef.current?.focus();
        barcodeRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleF10Key);
    return () => window.removeEventListener('keydown', handleF10Key);
  }, []);

  const handleClearSearch = () => {
    setSearch('');
    setTimeout(() => {
      searchRef.current?.focus();
    }, 10);
  };

  const handleDirectBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const val = directBarcode.trim();
      if (val) {
        handleBarcodeScan(val);
        setDirectBarcode('');
      }
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-5 border-b border-slate-200 dark:border-white/5 bg-white/95 dark:bg-workspace/60 sticky top-0 z-30 backdrop-blur-2xl shadow-sm">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 md:gap-4">
        {/* Giant High-Visibility Centered Total Banner */}
        <div className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 dark:from-emerald-950/90 dark:via-emerald-900/90 dark:to-emerald-950/90 border-2 border-emerald-400 dark:border-emerald-500/50 rounded-2xl px-5 py-2 shadow-lg shadow-emerald-500/10 min-w-[200px]">
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100 dark:text-emerald-300 block">TOTAL À PAYER</span>
            <span className="text-2xl lg:text-3xl font-black font-mono text-white dark:text-emerald-400 drop-shadow-sm">
              {total.toFixed(2)} <span className="text-xs font-bold text-emerald-100 dark:text-emerald-300/80">{settings?.currency || 'DA'}</span>
            </span>
          </div>
        </div>

        {/* Dedicated Direct Barcode / Shortcut Input (F10) */}
        <div className="relative group w-full sm:w-56 lg:w-64 flex-shrink-0">
          <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={18} />
          <input 
            ref={barcodeRef}
            id="direct-barcode-input"
            type="text"
            placeholder="⚡ Code Raccourci (F10)"
            className="w-full pl-10 pr-3 py-2.5 bg-emerald-50/60 dark:bg-slate-950/80 border border-emerald-300 dark:border-emerald-500/40 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 text-xs font-mono font-bold text-emerald-900 dark:text-emerald-300 placeholder:text-emerald-700/60 dark:placeholder:text-slate-500 transition-all shadow-inner"
            value={directBarcode}
            onChange={(e) => setDirectBarcode(e.target.value)}
            onKeyDown={handleDirectBarcodeKeyDown}
          />
        </div>

        {/* Search Box with instant clear button */}
        <div className="relative flex-1 min-w-0 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" size={18} />
          <input 
            ref={searchRef}
            id="product-search-input"
            type="text"
            placeholder="Rechercher par nom, SKU... (F3 | Entrée)"
            className="w-full pl-11 pr-10 py-2.5 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              const val = e.currentTarget.value;

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                hasUsedArrowKeys.current = true;
                setSelectedIndex(prev => Math.min(filteredProducts.length - 1, prev + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                hasUsedArrowKeys.current = true;
                setSelectedIndex(prev => Math.max(0, prev - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();

                const cleanVal = val.trim();
                if (!cleanVal) return;

                // 1. Si l'utilisateur a explicitement navigué avec les flèches haut/bas dans les résultats suggérés
                if (hasUsedArrowKeys.current && filteredProducts.length > 0 && filteredProducts[selectedIndex]) {
                  addToCart(filteredProducts[selectedIndex], isReturnMode ? -1 : 1);
                  setSearch('');
                  return;
                }

                // 2. Scan ou saisie directe : tenter la résolution exacte du code-barres / SKU d'abord
                const found = handleBarcodeScan(cleanVal, true);
                if (found) {
                  setSearch('');
                  return;
                }

                // 3. Si aucun code-barre exact ne correspond, utiliser le premier résultat de recherche textuelle
                if (filteredProducts.length > 0 && filteredProducts[0]) {
                  addToCart(filteredProducts[0], isReturnMode ? -1 : 1);
                  setSearch('');
                } else {
                  // Déclencher le message d'erreur code-barres non reconnu
                  handleBarcodeScan(cleanVal, false);
                  setSearch('');
                }
              }
            }}
          />
          {search && (
            <button 
              type="button" 
              onClick={handleClearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
              title="Effacer la recherche"
            >
              <X size={15} />
            </button>
          )}
          <SearchOverlay 
            search={search}
            setSearch={setSearch}
            filteredProducts={filteredProducts}
            addToCart={addToCart}
            isReturnMode={isReturnMode}
            settings={settings}
            searchRef={searchRef}
            selectedIndex={selectedIndex}
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="p-3 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-500 transition-all shadow-sm active:scale-90 group relative overflow-hidden cursor-pointer"
            title="DÉMARRER SCANNER OPTIQUE"
          >
            <Scan size={20} className="relative z-10" />
          </button>
        </div>
      </div>
    </div>
  );
};
