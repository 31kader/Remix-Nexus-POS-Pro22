import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Barcode as BarcodeIcon, Camera, Search, 
  Store, Sparkles, RefreshCw, Zap, ZapOff, AlertCircle, ChevronRight, Package
} from 'lucide-react';
import { Product, CompanySettings, Category, Brand, Promotion } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { formatCurrencyDA } from './priceUtils';
import { useClientPriceScannerLogic } from './useClientPriceScannerLogic';
import { 
  ClientFoundProductCard, 
  ClientNotFoundCard, 
  ClientRecentScansTray 
} from './ClientPriceScannerViews';

interface ClientPriceScannerProps {
  products?: Product[];
  settings: CompanySettings;
  categories?: Category[];
  brands?: Brand[];
  promotions?: Promotion[];
}

export function ClientPriceScanner({
  products = [],
  settings,
  categories = [],
  brands = [],
  promotions = [],
}: ClientPriceScannerProps) {
  const {
    activeMode,
    setActiveMode,
    cameraError,
    facingMode,
    setFacingMode,
    torchOn,
    hasTorch,
    toggleTorch,
    searchTerm,
    setSearchTerm,
    searchResults,
    foundProduct,
    setFoundProduct,
    notFoundBarcode,
    recentScans,
    videoRef,
    storeName,
    handleResetScan
  } = useClientPriceScannerLogic({
    products,
    settings,
    promotions
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] text-white flex flex-col select-none overflow-hidden font-sans">
      {/* ── Barre Supérieure Mobile ── */}
      <header className="h-14 px-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          {(settings?.logoUrl || (settings as any)?.logo) ? (
            <SafeImage 
              src={settings?.logoUrl || (settings as any)?.logo} 
              alt={storeName} 
              className="w-9 h-9 rounded-xl object-contain bg-white/5 p-1 border border-slate-700" 
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Store size={20} />
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white line-clamp-1">
              {storeName}
            </h1>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <Sparkles size={11} /> Vérificateur de Prix Client
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-800/80 p-0.5 border border-slate-700/60">
            <button
              type="button"
              onClick={() => { setActiveMode('camera'); handleResetScan(); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeMode === 'camera'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera size={14} /> Scan
            </button>
            <button
              type="button"
              onClick={() => { setActiveMode('search'); handleResetScan(); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeMode === 'search'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search size={14} /> Chercher
            </button>
          </div>
        </div>
      </header>

      {/* ── Contenu Principal ── */}
      <main className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* 1. FICHE PRODUIT TROUVÉ */}
          {foundProduct ? (
            <ClientFoundProductCard
              foundProduct={foundProduct}
              categories={categories}
              brands={brands}
              promotions={promotions}
              onResetScan={handleResetScan}
            />
          ) : notFoundBarcode ? (
            /* 2. ÉCRAN CODE INTROUVABLE */
            <ClientNotFoundCard
              notFoundBarcode={notFoundBarcode}
              onResetScan={handleResetScan}
            />
          ) : activeMode === 'camera' ? (
            /* 3. MODE SCANNER CAMÉRA */
            <motion.div
              key="camera-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center my-auto"
            >
              {cameraError ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center max-w-sm">
                  <AlertCircle size={36} className="text-amber-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-300 mb-4">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveMode('search')}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Passer en recherche textuelle
                  </button>
                </div>
              ) : (
                <div className="relative w-full aspect-square max-w-[320px] rounded-3xl overflow-hidden bg-slate-950 border-2 border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.2)]">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                  />
                  {/* Viseur & Laser */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-56 h-56 border-2 border-dashed border-emerald-400/60 rounded-2xl relative">
                      <motion.div
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399]"
                      />
                    </div>
                  </div>

                  {/* Contrôles Caméra (Flash & Flip) */}
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
                          torchOn ? 'bg-amber-400 text-slate-950' : 'bg-black/60 text-white'
                        }`}
                      >
                        {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                      className="p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:text-emerald-400 transition-all"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400 mt-4 text-center">
                Centrez le code-barres dans le carré vert pour afficher son prix
              </p>
            </motion.div>
          ) : (
            /* 4. MODE RECHERCHE TEXTUELLE */
            <motion.div
              key="search-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-4"
            >
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, marque ou code-barres..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all shadow-inner"
                  autoFocus
                />
              </div>

              {/* Résultats de recherche */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {searchResults.map(prod => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => setFoundProduct(prod)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-2xl transition-all text-left cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center shrink-0 border border-slate-800">
                      <SafeImage
                        src={prod.imageUrl || prod.image}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                        fallback={<Package size={20} className="text-slate-600" />}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {prod.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {prod.barcode || prod.sku || 'Sans code'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-emerald-400 font-mono">
                        {formatCurrencyDA(prod.price)}
                      </p>
                      <ChevronRight size={16} className="text-slate-600 ml-auto group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </button>
                ))}

                {searchTerm.length >= 2 && searchResults.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Aucun article correspondant à « {searchTerm} »
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Historique des Consultations Récentes ── */}
      <ClientRecentScansTray
        recentScans={recentScans}
        onSelectProduct={(p) => setFoundProduct(p)}
      />
    </div>
  );
}

export default ClientPriceScanner;
