import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, Search, Flashlight, FlashlightOff, RefreshCw, 
  Package, CheckCircle2, AlertCircle, Sparkles, ArrowLeft,
  Barcode as BarcodeIcon, Store, ShieldCheck, Tag, Info
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Product, CompanySettings, Category, Brand, Promotion } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { formatPrice } from '../../lib/utils';
import { getProductPriceDetails, playScanBeep, formatCurrencyDA } from './priceUtils';

interface ClientPriceScannerProps {
  products: Product[];
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
  const [activeMode, setActiveMode] = useState<'camera' | 'search'>('camera');
  const [isScanning, setIsScanning] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<Product[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const storeName = settings?.name || 'Notre Magasin';

  // Assainissement défensif des articles (suppression absolue du prix d'achat et des marges)
  const safeProducts = useMemo(() => {
    return products.map(p => {
      if (!p) return p;
      const { costPrice, cost_price, ...clean } = p as any;
      return clean as Product;
    });
  }, [products]);

  // Recherche produit dans le catalogue local
  const lookupProduct = (rawQuery: string): Product | null => {
    const term = rawQuery.trim().toLowerCase();
    if (!term) return null;

    // 1. Recherche exacte par code-barre ou SKU
    const exact = safeProducts.find(p => p && (
      (p.barcode && String(p.barcode).trim().toLowerCase() === term) ||
      (p.sku && String(p.sku).trim().toLowerCase() === term)
    ));
    if (exact) return exact;

    // 2. Recherche exacte par nom
    const exactName = safeProducts.find(p => p && p.name && p.name.trim().toLowerCase() === term);
    if (exactName) return exactName;

    // 3. Recherche partielle si >= 3 caractères
    if (term.length >= 3) {
      const partial = safeProducts.find(p => p && (
        (p.barcode && String(p.barcode).toLowerCase().includes(term)) ||
        (p.name && p.name.toLowerCase().includes(term))
      ));
      if (partial) return partial;
    }

    return null;
  };

  // Traiter un code détecté (caméra ou saisie)
  const handleBarcodeDetected = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    const now = Date.now();
    if (lastScannedCodeRef.current.code === cleanCode && now - lastScannedCodeRef.current.time < 1800) {
      return;
    }
    lastScannedCodeRef.current = { code: cleanCode, time: now };

    const prod = lookupProduct(cleanCode);
    if (prod) {
      playScanBeep(true);
      setFoundProduct(prod);
      setNotFoundBarcode(null);
      setRecentScans(prev => {
        const filtered = prev.filter(p => p.id !== prod.id);
        return [prod, ...filtered].slice(0, 5);
      });
    } else {
      playScanBeep(false);
      setFoundProduct(null);
      setNotFoundBarcode(cleanCode);
    }
  };

  // Gestion du cycle de vie du lecteur caméra
  useEffect(() => {
    if (activeMode !== 'camera' || foundProduct || notFoundBarcode) {
      stopCamera();
      return;
    }

    let isMounted = true;
    setCameraError(null);

    const initCamera = async () => {
      try {
        stopCamera();

        // 1. BarcodeDetector API natif (Ultra-rapide sur Chrome / Android / iOS récent)
        if ('BarcodeDetector' in window) {
          try {
            // @ts-ignore
            const formats = await window.BarcodeDetector.getSupportedFormats();
            // @ts-ignore
            const detector = new window.BarcodeDetector({ formats });

            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: facingMode },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });

            if (!isMounted) {
              stream.getTracks().forEach(t => t.stop());
              return;
            }

            mediaStreamRef.current = stream;

            // Détection du support du flash
            const videoTrack = stream.getVideoTracks()[0];
            const capabilities: any = videoTrack?.getCapabilities?.() || {};
            setHasTorch(Boolean(capabilities?.torch));

            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.setAttribute('playsinline', 'true');
              videoRef.current.muted = true;
              await videoRef.current.play();

              const detectFrame = async () => {
                if (!isMounted || !videoRef.current || !mediaStreamRef.current) return;
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0) {
                    const rawValue = barcodes[0].rawValue;
                    if (rawValue) {
                      handleBarcodeDetected(rawValue);
                    }
                  }
                } catch (_) {}

                if (isMounted && !foundProduct && !notFoundBarcode) {
                  requestAnimationFrame(detectFrame);
                }
              };

              requestAnimationFrame(detectFrame);
              setIsScanning(true);
              return;
            }
          } catch (nativeErr) {
            console.warn('[BarcodeDetector] Fallback vers ZXing', nativeErr);
          }
        }

        // 2. Fallback ZXing BrowserMultiFormatReader
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities: any = videoTrack?.getCapabilities?.() || {};
        setHasTorch(Boolean(capabilities?.torch));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play();

          codeReader.decodeFromVideoDevice(null, videoRef.current, (result: any) => {
            if (result) {
              const text = result.getText();
              if (text) {
                handleBarcodeDetected(text);
              }
            }
          });
          setIsScanning(true);
        }
      } catch (err: any) {
        console.error('[ClientPriceScanner] Camera access error:', err);
        if (isMounted) {
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Accès caméra refusé. Veuillez autoriser la caméra dans votre navigateur ou utiliser la recherche manuelle.'
              : 'Impossible d\'accéder à la caméra. Vérifiez vos permissions ou utilisez la recherche.'
          );
          setIsScanning(false);
        }
      }
    };

    const timer = setTimeout(initCamera, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [activeMode, facingMode, foundProduct, notFoundBarcode]);

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (_) {}
      codeReaderRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }
    setTorchOn(false);
  };

  // Basculer la torche/flash
  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !torchOn;
      // @ts-ignore
      await track.applyConstraints({ advanced: [{ torch: nextState }] });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Torch error:', e);
    }
  };

  // Réinitialiser le scanner pour un autre article
  const handleResetScan = () => {
    setFoundProduct(null);
    setNotFoundBarcode(null);
    setSearchTerm('');
    lastScannedCodeRef.current = { code: '', time: 0 };
  };

  // Détails de prix calculés du produit trouvé
  const priceDetails = useMemo(() => {
    if (!foundProduct) return null;
    return getProductPriceDetails(foundProduct, promotions);
  }, [foundProduct, promotions]);

  const categoryName = useMemo(() => {
    if (!foundProduct?.categoryId) return null;
    return categories.find(c => c.id === foundProduct.categoryId)?.name || null;
  }, [foundProduct, categories]);

  const brandName = useMemo(() => {
    if (!foundProduct?.brandId) return null;
    return brands.find(b => b.id === foundProduct.brandId)?.name || null;
  }, [foundProduct, brands]);

  // Résultats de recherche manuelle
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.trim().toLowerCase();
    return safeProducts
      .filter(p => p && (
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(term)) ||
        (p.sku && String(p.sku).toLowerCase().includes(term))
      ))
      .slice(0, 10);
  }, [searchTerm, products]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── Header Magasin Épuré ── */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
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
      <main className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* 1. FICHE PRODUIT TROUVÉ */}
          {foundProduct && priceDetails ? (
            <motion.div
              key="found-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-5 my-auto"
            >
              {/* Badge Disponibilité */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                  priceDetails.isAvailable 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {priceDetails.isAvailable ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      En Rayon / Disponible
                    </>
                  ) : (
                    <>
                      <AlertCircle size={13} className="text-amber-400" />
                      Rupture Temporaire
                    </>
                  )}
                </span>

                {priceDetails.hasDiscount && priceDetails.discountLabel && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-extrabold animate-pulse">
                    <Tag size={12} /> PROMO {priceDetails.discountLabel}
                  </span>
                )}
              </div>

              {/* Photo du Produit */}
              <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800/80 group">
                <SafeImage
                  src={foundProduct.imageUrl || foundProduct.image}
                  alt={foundProduct.name}
                  className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                  fallback={
                    <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
                      <Package size={48} strokeWidth={1.5} />
                      <span className="text-xs text-slate-500">Photo non disponible</span>
                    </div>
                  }
                />
              </div>

              {/* Nom & Tags */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {categoryName && (
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                      {categoryName}
                    </span>
                  )}
                  {brandName && (
                    <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/50">
                      {brandName}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-white leading-snug">
                  {foundProduct.name}
                </h2>
                {foundProduct.barcode && (
                  <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                    <BarcodeIcon size={14} /> {foundProduct.barcode}
                  </p>
                )}
              </div>

              {/* Section Prix Public */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-400 block mb-0.5">
                    Prix Public TTC
                  </span>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-emerald-400 tracking-tight">
                      {formatCurrencyDA(priceDetails.finalPrice)}
                    </span>
                    {priceDetails.hasDiscount && (
                      <span className="text-base font-semibold text-slate-500 line-through">
                        {formatCurrencyDA(priceDetails.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>

                {priceDetails.hasDiscount && priceDetails.savedAmount > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Économie
                    </span>
                    <span className="text-sm font-extrabold text-rose-400">
                      -{formatCurrencyDA(priceDetails.savedAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Remises par lots / quantités si existantes */}
              {foundProduct.quantityDiscounts && foundProduct.quantityDiscounts.length > 0 && (
                <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-3 text-xs">
                  <span className="font-bold text-indigo-300 block mb-1.5 flex items-center gap-1">
                    <Sparkles size={13} /> Offre Prix Spécial par Quantité :
                  </span>
                  <div className="space-y-1">
                    {foundProduct.quantityDiscounts.map((qd, idx) => (
                      <div key={idx} className="flex justify-between text-slate-300">
                        <span>Dès {qd.minQuantity} articles :</span>
                        <span className="font-bold text-indigo-400">{formatCurrencyDA(qd.discountPrice)} / unité</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bouton Scanner un autre article */}
              <button
                type="button"
                onClick={handleResetScan}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm tracking-wide transition-all active:scale-[0.98]"
              >
                <BarcodeIcon size={18} />
                Scanner un autre article
              </button>
            </motion.div>
          ) : notFoundBarcode ? (
            /* 2. ÉCRAN CODE INTROUVABLE */
            <motion.div
              key="not-found"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 my-auto"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Article non répertorié</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Le code <span className="font-mono text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded">{notFoundBarcode}</span> n'a pas été trouvé dans notre catalogue actuel.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2 text-left w-full">
                <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
                <span>N'hésitez pas à demander de l'aide à un conseiller ou en caisse pour obtenir le prix exact.</span>
              </div>

              <button
                type="button"
                onClick={handleResetScan}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all"
              >
                Réessayer le scan
              </button>
            </motion.div>
          ) : activeMode === 'camera' ? (
            /* 3. VISEUR CAMÉRA SMARTPHONE */
            <motion.div
              key="camera-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4"
            >
              {cameraError ? (
                <div className="bg-slate-900 border border-rose-900/50 rounded-2xl p-5 text-center max-w-sm space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle size={24} />
                  </div>
                  <p className="text-xs text-rose-300 leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveMode('search')}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all"
                  >
                    Passer en recherche manuelle
                  </button>
                </div>
              ) : (
                <div className="relative w-full max-w-xs aspect-[3/4] rounded-3xl overflow-hidden bg-black shadow-2xl border-2 border-slate-800 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />

                  {/* Masque Viseur Sombre avec Cadre Lumineux */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="relative w-full aspect-square max-w-[220px] rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                      {/* Coins stylisés */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      {/* Ligne Laser Rouge/Verte Animée */}
                      <motion.div
                        animate={{ y: [0, 190, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981]"
                      />
                    </div>

                    <p className="text-[12px] font-medium text-white/90 text-center mt-5 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm shadow-md">
                      Pointez le code-barres de l'article
                    </p>
                  </div>

                  {/* Contrôles Caméra (Torche + Bascule) */}
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-4 z-10 px-4">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                          torchOn 
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/30' 
                            : 'bg-black/50 text-white border-white/20 hover:bg-black/70'
                        }`}
                        title="Flash / Torche"
                      >
                        {torchOn ? <FlashlightOff size={18} /> : <Flashlight size={18} />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                      className="p-3 rounded-full bg-black/50 text-white border border-white/20 hover:bg-black/70 backdrop-blur-md transition-all"
                      title="Changer de caméra"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Raccourci vers saisie manuelle */}
              <button
                type="button"
                onClick={() => setActiveMode('search')}
                className="text-xs text-slate-400 hover:text-emerald-400 underline underline-offset-4 transition-colors"
              >
                Code illisible ? Tapez le code ou le nom de l'article
              </button>
            </motion.div>
          ) : (
            /* 4. RECHERCHE / SAISIE MANUELLE */
            <motion.div
              key="search-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-4"
            >
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tapez un code-barres ou nom..."
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
                />
              </div>

              {/* Résultats de recherche */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {searchResults.length > 0 ? (
                  searchResults.map(prod => {
                    const details = getProductPriceDetails(prod, promotions);
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          setFoundProduct(prod);
                          playScanBeep(true);
                        }}
                        className="w-full bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 rounded-2xl p-3 text-left flex items-center gap-3 transition-all active:scale-[0.99]"
                      >
                        <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                          <SafeImage
                            src={prod.imageUrl || prod.image}
                            alt={prod.name}
                            className="w-full h-full object-contain p-1"
                            fallback={<Package size={20} className="text-slate-600" />}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{prod.name}</h4>
                          <p className="text-[11px] text-slate-400 font-mono">{prod.barcode || prod.sku}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-black text-emerald-400">
                              {formatCurrencyDA(details.finalPrice)}
                            </span>
                            {details.hasDiscount && (
                              <span className="text-[10px] text-slate-500 line-through">
                                {formatCurrencyDA(details.originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            details.isAvailable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {details.isAvailable ? 'En stock' : 'Rupture'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : searchTerm.trim().length >= 2 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Aucun article correspondant à "{searchTerm}"
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs space-y-1">
                    <p>Saisissez au moins 2 caractères pour rechercher.</p>
                    <p className="text-[11px] text-slate-600">Vous pouvez aussi taper directement les chiffres du code-barres.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Historique récent des scans rapides */}
        {recentScans.length > 0 && !foundProduct && !notFoundBarcode && (
          <div className="mt-auto pt-4 border-t border-slate-900">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Derniers articles consultés
            </h4>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {recentScans.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setFoundProduct(item); playScanBeep(true); }}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 shrink-0 flex items-center gap-2 hover:border-slate-700 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-200 max-w-[120px] truncate">{item.name}</span>
                  <span className="text-xs font-bold text-emerald-400">{formatPrice(item.price, 0)} DA</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer Discret & Rassurance ── */}
      <footer className="py-2.5 px-4 text-center border-t border-slate-900 bg-slate-950 text-[10px] text-slate-600 flex items-center justify-center gap-1.5">
        <ShieldCheck size={12} className="text-slate-500" />
        <span>Prix garantis en caisse • Service offert par {storeName}</span>
      </footer>
    </div>
  );
}

export default ClientPriceScanner;
