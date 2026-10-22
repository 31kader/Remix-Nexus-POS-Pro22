import React from 'react';
import { Search, Scan, X, Barcode } from 'lucide-react';
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
  search,
  setSearch,
  searchRef,
  handleBarcodeScan,
  setIsScannerOpen,
  filteredProducts,
  addToCart,
  isReturnMode,
  settings,
  total = 0
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [directBarcode, setDirectBarcode] = React.useState('');
  const barcodeRef = React.useRef<HTMLInputElement>(null);

  const hasUsedArrowKeys = React.useRef(false);

  React.useEffect(() => {
    setSelectedIndex(0);
    hasUsedArrowKeys.current = false;
  }, [search]);

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
    <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-b border-slate-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-30 shadow-xs">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-2.5">
        {/* TOTAL BANNER — Sobre, harmonieux et reposant pour les yeux */}
        <div className="w-full sm:w-auto flex-shrink-0 h-11 flex items-center justify-between sm:justify-start px-3.5 sm:px-4 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-xl shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mr-2 sm:mr-3">
            TOTAL :
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-800 dark:text-emerald-200 tracking-tight">
            {total.toFixed(2)}
            <span className="text-xs font-bold text-emerald-600/90 dark:text-emerald-400/90 ml-1.5 font-sans">
              {settings?.currency || 'DA'}
            </span>
          </span>
        </div>

        {/* INPUT CODE-BARRES DIRECT (F10) */}
        <div className="hidden sm:block relative group sm:w-52 lg:w-60 flex-shrink-0">
          <Barcode
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors pointer-events-none"
            size={16}
          />
          <input
            ref={barcodeRef}
            id="direct-barcode-input"
            type="text"
            placeholder="Code-barres..."
            className="w-full h-11 pl-9 pr-11 bg-slate-50 hover:bg-slate-100/70 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 rounded-xl outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-500 transition-all shadow-xs"
            value={directBarcode}
            onChange={(e) => setDirectBarcode(e.target.value)}
            onKeyDown={handleDirectBarcodeKeyDown}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400 border border-slate-300/60 dark:border-zinc-600">
              F10
            </kbd>
          </span>
        </div>

        {/* BARRE DE RECHERCHE PRINCIPALE (F3) */}
        <div className="relative flex-1 min-w-[180px] group">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors pointer-events-none"
            size={16}
          />
          <input
            ref={searchRef}
            id="product-search-input"
            type="text"
            placeholder="Rechercher par nom, SKU... (F3)"
            className="w-full h-11 pl-10 pr-16 bg-slate-50 hover:bg-slate-100/70 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 rounded-xl outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 transition-all shadow-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              const val = e.currentTarget.value;

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                hasUsedArrowKeys.current = true;
                setSelectedIndex((prev) => Math.min(filteredProducts.length - 1, prev + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                hasUsedArrowKeys.current = true;
                setSelectedIndex((prev) => Math.max(0, prev - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();

                const cleanVal = val.trim();
                if (!cleanVal) return;

                // 1. Si navigation manuelle avec flèches dans la liste suggérée
                if (hasUsedArrowKeys.current && filteredProducts.length > 0 && filteredProducts[selectedIndex]) {
                  addToCart(filteredProducts[selectedIndex], isReturnMode ? -1 : 1);
                  setSearch('');
                  return;
                }

                // 2. Scan ou saisie directe : tenter la résolution exacte code-barres / SKU d'abord
                const found = handleBarcodeScan(cleanVal, true);
                if (found) {
                  setSearch('');
                  return;
                }

                // 3. Premier résultat suggéré
                if (filteredProducts.length > 0 && filteredProducts[0]) {
                  addToCart(filteredProducts[0], isReturnMode ? -1 : 1);
                  setSearch('');
                } else {
                  handleBarcodeScan(cleanVal, false);
                  setSearch('');
                }
              }
            }}
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors p-1 rounded-md hover:bg-slate-200/80 dark:hover:bg-zinc-700 cursor-pointer"
                title="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
            <kbd className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400 border border-slate-300/60 dark:border-zinc-600 hidden sm:inline-block pointer-events-none">
              F3
            </kbd>
          </div>

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

        {/* BOUTON SCANNER OPTIQUE */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="h-11 w-11 flex items-center justify-center bg-slate-50 hover:bg-indigo-50 dark:bg-zinc-800/80 dark:hover:bg-zinc-750 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Démarrer le scanner caméra (Code-barres / QR)"
          >
            <Scan size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
