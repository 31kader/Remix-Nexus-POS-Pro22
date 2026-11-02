import React from 'react';
import { Camera, RotateCcw, Check, Sparkles, CheckCircle2, ShoppingCart, Zap, Search, ScanLine, X, Package, Barcode, ChevronRight, PlusCircle } from 'lucide-react';
import { Product } from '../../../types';
import { SafeImage } from '../../ui';
import { CartonRecognitionResult } from '../../../services/cartonIntakeService';

interface MobileCartonScannerViewProps {
  cartonPhoto: string;
  isCompressing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handlePhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isRecognizing: boolean;
  recognitionResult: CartonRecognitionResult | null;
  autoAddToCart: boolean;
  unitsPerCarton: number;
  totalUnits: number;
  handleSendToCart: () => Promise<void>;
  handleDirectValidate: () => Promise<void>;
  isSubmitting: boolean;
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setIsScannerOpen: (open: boolean) => void;
  effectiveProducts: Product[];
  filteredProducts: Product[];
  handleSelectProduct: (p: Product) => void;
  setQuickName: (n: string) => void;
  setQuickBarcode: (b: string) => void;
  setIsQuickCreateOpen: (open: boolean) => void;
}

export function MobileCartonScannerView({
  cartonPhoto,
  isCompressing,
  fileInputRef,
  handlePhotoCapture,
  isRecognizing,
  recognitionResult,
  autoAddToCart,
  unitsPerCarton,
  totalUnits,
  handleSendToCart,
  handleDirectValidate,
  isSubmitting,
  selectedProduct,
  setSelectedProduct,
  searchQuery,
  setSearchQuery,
  setIsScannerOpen,
  effectiveProducts,
  filteredProducts,
  handleSelectProduct,
  setQuickName,
  setQuickBarcode,
  setIsQuickCreateOpen
}: MobileCartonScannerViewProps) {
  return (
    <div className="space-y-4">
      {/* ─── ÉTAPE 1 : PHOTO DU CARTON PHYSIQUE ─── */}
      <section className="bg-slate-50 dark:bg-industrial-900/70 rounded-2xl border border-slate-200 dark:border-industrial-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-industrial-950 text-xs font-black flex items-center justify-center">
              1
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-industrial-200">
              Photo du Carton Physique
            </span>
          </div>
          {cartonPhoto && (
            <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
              <Check size={12} /> Photo enregistrée
            </span>
          )}
        </div>

        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
          id="mobile-carton-camera-input"
        />

        {!cartonPhoto ? (
          <label
            htmlFor="mobile-carton-camera-input"
            className="w-full py-6 sm:py-8 px-4 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 active:scale-[0.99] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shadow-inner">
              {isCompressing ? (
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={26} />
              )}
            </div>
            <div>
              <p className="text-sm font-black text-amber-600 dark:text-amber-300 uppercase tracking-wide">
                Prendre en photo le Carton
              </p>
              <p className="text-[11px] text-slate-500 dark:text-industrial-400 mt-0.5">
                Photographiez l'emballage / colisage pour preuve visuelle d'arrivage
              </p>
            </div>
          </label>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-industrial-700 bg-industrial-950 group">
            <img
              src={cartonPhoto}
              alt="Carton reçu"
              className="w-full h-44 sm:h-52 object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-industrial-950/80 via-transparent to-transparent flex items-end justify-between p-3">
              <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10">
                📦 Carton capturé
              </span>
              <label
                htmlFor="mobile-carton-camera-input"
                className="px-3 py-1.5 rounded-lg bg-industrial-900/90 hover:bg-industrial-800 text-white border border-industrial-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-transform"
              >
                <RotateCcw size={12} />
                Reprendre
              </label>
            </div>
          </div>
        )}

        {/* Indicateur d'Analyse / Scan Visuel */}
        {isRecognizing && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center gap-3 animate-pulse">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-xs font-black">🔍 Reconnaissance visuelle en cours...</p>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Recherche de code-barres et d'empreinte dHash</p>
            </div>
          </div>
        )}

        {/* Bannière de Carton Reconnu Automatiquement */}
        {recognitionResult && !autoAddToCart && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-teal-500/10 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10 space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/30">
                  <Sparkles size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    ✨ Carton Reconnu ({recognitionResult.confidence}%)
                  </span>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white mt-0.5">
                    {recognitionResult.product.name}
                  </h4>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                {unitsPerCarton} pcs/carton
              </span>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>
                {recognitionResult.method === 'barcode' 
                  ? `Code-barres carton reconnu (${recognitionResult.detectedBarcode}). Colisage et prix pré-remplis !`
                  : `Empreinte visuelle reconnue dans votre mémoire de cartons. Tout est prêt !`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleSendToCart}
                disabled={isSubmitting}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
              >
                <ShoppingCart size={15} />
                <span>Ajouter direct au Panier (+{totalUnits} pcs)</span>
              </button>

              <button
                type="button"
                onClick={handleDirectValidate}
                disabled={isSubmitting}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
              >
                <Zap size={15} />
                <span>Réception Stock Immédiate (+{totalUnits})</span>
              </button>
            </div>
          </div>
        )}

        {cartonPhoto && !recognitionResult && !isRecognizing && (
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-2">
            <Sparkles size={16} className="shrink-0 text-indigo-500" />
            <span>
              <strong>Nouveau carton détecté :</strong> Associez l'article ci-dessous pour que Nexus le retienne pour les prochains arrivages !
            </span>
          </div>
        )}
      </section>

      {/* ─── ÉTAPE 2 : LIER AU PRODUIT EXISTANT EN BASE + SCANNER ─── */}
      <section className="bg-slate-50 dark:bg-industrial-900/70 rounded-2xl border border-slate-200 dark:border-industrial-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white text-xs font-black flex items-center justify-center">
              2
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-industrial-200">
              Associer au Produit Existant
            </span>
          </div>
          {selectedProduct && (
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
            >
              Changer de produit
            </button>
          )}
        </div>

        {!selectedProduct ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-industrial-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom (ex: Ifri), code-barres..."
                  className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-industrial-950 border border-slate-300 dark:border-industrial-700 focus:border-indigo-500 text-slate-900 dark:text-white text-xs sm:text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-industrial-500 shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-industrial-500 dark:hover:text-white"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer shrink-0 transition-transform"
                title="Scanner le code-barres avec la caméra"
              >
                <ScanLine size={16} className="stroke-[2.5]" />
                <span className="hidden sm:inline">Scanner</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-industrial-400 px-1">
              <span>{searchQuery.trim() ? "Résultats trouvés :" : "Articles récents en inventaire :"}</span>
              <span className="font-mono text-[10px]">{effectiveProducts.length} articles en base</span>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-industrial-800/80 rounded-xl border border-slate-200 dark:border-industrial-800 bg-white dark:bg-industrial-950 shadow-inner">
              {filteredProducts.length === 0 ? (
                <div className="p-4 sm:p-5 text-center space-y-3">
                  <p className="text-xs text-slate-500 dark:text-industrial-400">
                    Aucun produit trouvé pour <strong className="text-slate-800 dark:text-white">"{searchQuery}"</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickName(searchQuery);
                      setQuickBarcode('');
                      setIsQuickCreateOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    <PlusCircle size={14} />
                    <span>Créer l'article "{searchQuery}"</span>
                  </button>
                </div>
              ) : (
                filteredProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className="w-full p-2.5 sm:p-3 text-left hover:bg-slate-50 dark:hover:bg-industrial-800/50 flex items-center gap-3 transition-colors active:bg-indigo-50 dark:active:bg-indigo-950/30 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-industrial-900 border border-slate-200 dark:border-industrial-800 flex items-center justify-center overflow-hidden shrink-0">
                      {p.imageUrl ? (
                        <SafeImage src={p.imageUrl} className="w-full h-full object-cover" fallback={<Package size={18} className="text-slate-400 dark:text-industrial-600"/>}/>
                      ) : (
                        <Package size={18} className="text-slate-400 dark:text-industrial-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase truncate leading-tight">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-industrial-400 font-mono">
                        {p.barcode && <span className="flex items-center gap-0.5"><Barcode size={10} /> {p.barcode}</span>}
                        <span>Stock : <strong className="text-indigo-600 dark:text-indigo-400">{p.stock || 0}</strong></span>
                        {p.costPrice ? <span>P.U : {p.costPrice} DA</span> : null}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 dark:text-industrial-600 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-white dark:bg-industrial-950 border border-emerald-500/40 flex items-center gap-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-industrial-900 border border-slate-200 dark:border-industrial-800 flex items-center justify-center overflow-hidden shrink-0">
              {selectedProduct.imageUrl ? (
                <SafeImage src={selectedProduct.imageUrl} className="w-full h-full object-cover" fallback={<Package size={20} className="text-slate-400 dark:text-industrial-600"/>}/>
              ) : (
                <Package size={20} className="text-slate-400 dark:text-industrial-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase truncate">
                  {selectedProduct.name}
                </p>
                <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                  ✓ Lié
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-industrial-400 font-mono">
                <span>Stock actuel : <strong className="text-emerald-600 dark:text-emerald-400">{selectedProduct.stock || 0}</strong> pcs</span>
                {selectedProduct.sku && <span>REF : {selectedProduct.sku}</span>}
                {selectedProduct.barcode && <span>EAN : {selectedProduct.barcode}</span>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
