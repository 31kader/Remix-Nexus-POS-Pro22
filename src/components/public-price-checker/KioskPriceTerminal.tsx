import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Barcode as BarcodeIcon, Volume2, VolumeX, Maximize2, Minimize2,
  Lock, Unlock, Sparkles, CheckCircle2, AlertCircle, Package,
  Store, Camera, CameraOff, Delete, X, ArrowRight
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { get as getIDB } from 'idb-keyval';
import bcrypt from 'bcryptjs';
import { Product, CompanySettings, Category, Brand, Promotion } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { getSecureItem } from '../../lib/security';
import { announcePrice } from '../../lib/utils';
import { getProductPriceDetails, playScanBeep, formatCurrencyDA } from './priceUtils';

interface KioskPriceTerminalProps {
  products: Product[];
  settings: CompanySettings;
  categories?: Category[];
  brands?: Brand[];
  promotions?: Promotion[];
  onExit?: () => void;
}

export function KioskPriceTerminal({
  products = [],
  settings,
  categories = [],
  brands = [],
  promotions = [],
  onExit,
}: KioskPriceTerminalProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Compte à rebours 5 secondes pour réinitialisation automatique
  const [countdown, setCountdown] = useState<number>(5);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sécurité Sortie par Code PIN
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const pinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Références matérielles
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const storeName = settings?.name || 'Notre Magasin';

  // 1. Horloge en direct
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  // Assainissement défensif des articles (suppression absolue du prix d'achat et des marges)
  const safeProducts = useMemo(() => {
    return products.map(p => {
      if (!p) return p;
      const { costPrice, cost_price, ...clean } = p as any;
      return clean as Product;
    });
  }, [products]);

  // 2. Recherche produit dans le catalogue
  const executeLookup = (rawCode: string) => {
    const clean = rawCode.trim().toLowerCase();
    if (!clean) return;

    const now = Date.now();
    if (lastScanRef.current.code === clean && now - lastScanRef.current.time < 1200) {
      return;
    }
    lastScanRef.current = { code: clean, time: now };

    const match = safeProducts.find(p => p && (
      (p.barcode && String(p.barcode).trim().toLowerCase() === clean) ||
      (p.sku && String(p.sku).trim().toLowerCase() === clean) ||
      (p.name && p.name.trim().toLowerCase() === clean)
    )) || (clean.length >= 3 ? safeProducts.find(p => p && (
      (p.barcode && String(p.barcode).toLowerCase().includes(clean)) ||
      (p.name && p.name.toLowerCase().includes(clean))
    )) : null);

    if (match) {
      playScanBeep(true);
      setFoundProduct(match);
      setNotFoundCode(null);
      setCountdown(5);

      if (voiceEnabled) {
        const details = getProductPriceDetails(match, promotions);
        announcePrice(match.name, details.finalPrice, settings?.currency || 'DA');
      }
    } else {
      playScanBeep(false);
      setFoundProduct(null);
      setNotFoundCode(clean);
      setCountdown(4);
    }
  };

  // 3. Écoute globale de la Douchette Code-barres USB / Bluetooth (Clavier HID)
  useEffect(() => {
    let keyBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPinModal) return; // Ne pas intercepter pendant la saisie du PIN

      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 150) {
        keyBuffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (keyBuffer.length >= 2) {
          e.preventDefault();
          executeLookup(keyBuffer);
          keyBuffer = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        keyBuffer += e.key;
        if (keyBuffer.length > 50) keyBuffer = keyBuffer.slice(-50);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showPinModal, products, voiceEnabled, promotions, settings]);

  // 4. Caméra intégrée tablette pour scan optique
  useEffect(() => {
    if (!isCameraActive || foundProduct) {
      stopCamera();
      return;
    }

    let isMounted = true;
    const initCamera = async () => {
      try {
        stopCamera();

        if ('BarcodeDetector' in window) {
          try {
            // @ts-ignore
            const formats = await window.BarcodeDetector.getSupportedFormats();
            // @ts-ignore
            const detector = new window.BarcodeDetector({ formats });

            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });

            if (!isMounted) {
              stream.getTracks().forEach(t => t.stop());
              return;
            }

            mediaStreamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.setAttribute('playsinline', 'true');
              videoRef.current.muted = true;
              await videoRef.current.play();

              const loop = async () => {
                if (!isMounted || !videoRef.current || !mediaStreamRef.current) return;
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    executeLookup(barcodes[0].rawValue);
                  }
                } catch (_) {}
                if (isMounted && !foundProduct) {
                  requestAnimationFrame(loop);
                }
              };
              requestAnimationFrame(loop);
              return;
            }
          } catch (_) {}
        }

        const reader = new BrowserMultiFormatReader();
        codeReaderRef.current = reader;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play();

          reader.decodeFromVideoDevice(null, videoRef.current, (res: any) => {
            if (res && res.getText()) {
              executeLookup(res.getText());
            }
          });
        }
      } catch (err) {
        console.warn('[Kiosk] Camera access unavailable:', err);
      }
    };

    const timer = setTimeout(initCamera, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [isCameraActive, foundProduct]);

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (_) {}
      codeReaderRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }
  };

  // 5. Compte à rebours de réinitialisation automatique (5s)
  useEffect(() => {
    if (!foundProduct && !notFoundCode) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          setFoundProduct(null);
          setNotFoundCode(null);
          lastScanRef.current = { code: '', time: 0 };
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [foundProduct, notFoundCode]);

  // 6. Gestion du Plein Écran
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // 7. Vérification Sécurisée du Code PIN de Sortie Kiosque
  const handlePinDigit = (digit: string) => {
    setPinError(false);
    resetPinModalTimeout();
    if (enteredPin.length < 6) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      if (next.length >= 4) {
        verifyPin(next);
      }
    }
  };

  const handlePinDelete = () => {
    resetPinModalTimeout();
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError(false);
  };

  const resetPinModalTimeout = () => {
    if (pinTimeoutRef.current) clearTimeout(pinTimeoutRef.current);
    pinTimeoutRef.current = setTimeout(() => {
      setShowPinModal(false);
      setEnteredPin('');
      setPinError(false);
    }, 8000); // Ferme automatiquement après 8 secondes d'inactivité
  };

  const openPinModal = () => {
    setShowPinModal(true);
    setEnteredPin('');
    setPinError(false);
    resetPinModalTimeout();
  };

  const verifyPin = async (candidate: string) => {
    let customMaster = getSecureItem<string>('nexus_pos_master_pin');
    if (!customMaster) {
      customMaster = localStorage.getItem('nexus_pos_master_pin');
    }

    let isValid = false;

    // 1. Master PIN
    if (customMaster) {
      if (customMaster.startsWith('$2a$') || customMaster.startsWith('$2b$')) {
        try { isValid = bcrypt.compareSync(candidate, customMaster); } catch (_) {}
      } else if (customMaster === candidate) {
        isValid = true;
      }
    }

    // 2. Vérification contre n'importe quel employé en base locale
    if (!isValid) {
      try {
        const [usersObj, employeesObj] = await Promise.all([
          getIDB<Record<string, any>>('nexus_db_users').catch(() => null),
          getIDB<Record<string, any>>('nexus_db_employees').catch(() => null),
        ]);
        const allStaff = [
          ...(usersObj ? Object.values(usersObj) : []),
          ...(employeesObj ? Object.values(employeesObj) : []),
        ];
        for (const u of allStaff) {
          const hash = u?.password_hash || u?.password || u?.pin_hash || u?.pin;
          if (hash) {
            if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
              try {
                if (bcrypt.compareSync(candidate, hash)) {
                  isValid = true;
                  break;
                }
              } catch (_) {}
            } else if (hash === candidate) {
              isValid = true;
              break;
            }
          }
        }
      } catch (_) {}
    }

    // 3. Code d'urgence par défaut commerçant
    if (!isValid && candidate === '1234') {
      isValid = true;
    }

    if (isValid) {
      if (pinTimeoutRef.current) clearTimeout(pinTimeoutRef.current);
      setShowPinModal(false);
      if (onExit) {
        onExit();
      } else {
        window.location.search = '';
        window.location.hash = 'checkout';
      }
    } else if (candidate.length >= 4) {
      setPinError(true);
      setTimeout(() => {
        setEnteredPin('');
      }, 600);
    }
  };

  // Détails produit calculés
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

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] text-white flex flex-col select-none overflow-hidden font-sans">
      {/* ── Barre Supérieure de la Borne ── */}
      <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {(settings?.logoUrl || (settings as any)?.logo) ? (
            <img 
              src={settings?.logoUrl || (settings as any)?.logo} 
              alt={storeName} 
              className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1 border border-slate-700" 
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Store size={22} />
            </div>
          )}
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white line-clamp-1">
              {storeName}
            </h1>
            <p className="text-[11px] text-cyan-400 font-semibold tracking-wider uppercase">
              Borne Prix Rayon • Kiosque Libre-Service
            </p>
          </div>
        </div>

        {/* Centre : Horloge magasin */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-sm font-bold text-slate-300">
          <span>{currentTime}</span>
        </div>

        {/* Droite : Contrôles Borne & Cadenas de Sortie */}
        <div className="flex items-center gap-2">
          {/* Synthèse vocale On/Off */}
          <button
            type="button"
            onClick={() => setVoiceEnabled(prev => !prev)}
            className={`p-2.5 rounded-xl border transition-all ${
              voiceEnabled 
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20' 
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={voiceEnabled ? 'Voix activée' : 'Voix coupée'}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Caméra tablette On/Off */}
          <button
            type="button"
            onClick={() => setIsCameraActive(prev => !prev)}
            className={`p-2.5 rounded-xl border transition-all ${
              isCameraActive 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={isCameraActive ? 'Caméra active' : 'Caméra désactivée'}
          >
            {isCameraActive ? <Camera size={18} /> : <CameraOff size={18} />}
          </button>

          {/* Plein écran */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all"
            title="Mode plein écran"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          {/* Cadenas Sortie Borne (Protégé par PIN) */}
          <button
            type="button"
            onClick={openPinModal}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 transition-all ml-1"
            title="Sortir du mode kiosque (Réservé au personnel)"
          >
            <Lock size={18} />
          </button>
        </div>
      </header>

      {/* ── Contenu Principal de la Borne ── */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden">
        <AnimatePresence mode="wait">
          {foundProduct && priceDetails ? (
            /* 1. FICHE PRODUIT GÉANTE HAUTE VISIBILITÉ */
            <motion.div
              key="kiosk-product"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-4xl bg-slate-900/90 border-2 border-cyan-500/40 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col md:flex-row gap-8 items-center relative overflow-hidden backdrop-blur-xl"
            >
              {/* Barre de Compte à Rebours 5s en haut de la carte */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                />
              </div>

              {/* Photo Haute Résolution */}
              <div className="w-full md:w-80 h-72 md:h-88 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
                <SafeImage
                  src={foundProduct.imageUrl || foundProduct.image}
                  alt={foundProduct.name}
                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                  fallback={
                    <div className="flex flex-col items-center justify-center text-slate-600 gap-3">
                      <Package size={64} strokeWidth={1.5} />
                      <span className="text-xs text-slate-500">Image non disponible</span>
                    </div>
                  }
                />
              </div>

              {/* Informations & Prix */}
              <div className="flex-1 w-full flex flex-col justify-between h-full space-y-6">
                <div>
                  {/* Badges Disponibilité & Catégorie */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      priceDetails.isAvailable 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {priceDetails.isAvailable ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {priceDetails.isAvailable ? 'Disponible en rayon' : 'Rupture temporaire'}
                    </span>

                    {categoryName && (
                      <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                        {categoryName}
                      </span>
                    )}
                    {brandName && (
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1 rounded-full">
                        {brandName}
                      </span>
                    )}
                  </div>

                  {/* Nom du produit */}
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                    {foundProduct.name}
                  </h2>

                  {foundProduct.barcode && (
                    <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1.5">
                      <BarcodeIcon size={14} /> {foundProduct.barcode}
                    </p>
                  )}
                </div>

                {/* Bloc Prix Géant */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 md:p-6 flex items-center justify-between shadow-inner">
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 block mb-1">
                      Prix TTC
                    </span>
                    <div className="flex items-baseline gap-4">
                      <span className="text-4xl md:text-5xl font-black text-emerald-400 tracking-tight">
                        {formatCurrencyDA(priceDetails.finalPrice)}
                      </span>
                      {priceDetails.hasDiscount && (
                        <span className="text-xl md:text-2xl font-bold text-slate-500 line-through">
                          {formatCurrencyDA(priceDetails.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {priceDetails.hasDiscount && (
                    <div className="text-right bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-xl">
                      <span className="text-[11px] font-bold text-rose-300 block uppercase">
                        Économie Immédiate
                      </span>
                      <span className="text-lg md:text-xl font-black text-rose-400">
                        -{formatCurrencyDA(priceDetails.savedAmount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Remise quantité éventuelle */}
                {foundProduct.quantityDiscounts && foundProduct.quantityDiscounts.length > 0 && (
                  <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-3 text-xs flex items-center justify-between">
                    <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles size={14} /> Offre Spéciale par Lot :
                    </span>
                    <span className="font-bold text-indigo-200">
                      Dès {foundProduct.quantityDiscounts[0].minQuantity} pcs : {formatCurrencyDA(foundProduct.quantityDiscounts[0].discountPrice)}
                    </span>
                  </div>
                )}

                {/* Message & Compteur de Réinitialisation */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <span>Passez un autre article à tout moment</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    Accueil dans {countdown}s
                  </span>
                </div>
              </div>
            </motion.div>
          ) : notFoundCode ? (
            /* 2. ÉCRAN ARTICLE NON TROUVÉ */
            <motion.div
              key="kiosk-not-found"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-slate-900/90 border-2 border-amber-500/40 rounded-3xl p-8 text-center shadow-2xl space-y-5"
            >
              <div className="w-20 h-20 rounded-full bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <AlertCircle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">Code non répertorié</h3>
                <p className="text-sm text-slate-400">
                  Le code <span className="font-mono text-amber-300 bg-slate-800 px-2 py-0.5 rounded">{notFoundCode}</span> n'a pas été trouvé.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Veuillez vous adresser à un membre de notre équipe pour connaître le prix.
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-500">
                Retour à l'accueil dans {countdown}s...
              </div>
            </motion.div>
          ) : (
            /* 3. ÉCRAN D'ACCUEIL DYNAMIQUE / VEILLE ACTIVE */
            <motion.div
              key="kiosk-idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center max-w-xl space-y-8"
            >
              {/* Animation Faisceau Scanner Laser */}
              <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-3xl bg-slate-900 border-2 border-slate-800 flex items-center justify-center overflow-hidden shadow-2xl group">
                <BarcodeIcon size={96} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />

                {/* Laser Rouge / Cyan Animé */}
                <motion.div
                  animate={{ y: [-90, 90, -90] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                  className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]"
                />

                <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-3xl pointer-events-none" />
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  Vérifiez vos prix en rayon
                </h2>
                <p className="text-base text-slate-400 max-w-md mx-auto leading-relaxed">
                  Présentez le code-barres de votre produit sous le scanner pour afficher son prix instantanément.
                </p>
                <p className="text-xs text-cyan-400 font-bold" dir="rtl">
                  مرر رمز المنتج لمعرفة السعر فوراً
                </p>
              </div>

              {/* Incrustation Caméra discrète si active */}
              {isCameraActive && (
                <div className="relative w-44 h-28 rounded-2xl overflow-hidden border border-slate-800 bg-black/60 shadow-lg">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-14 border border-cyan-400/60 rounded-lg" />
                  </div>
                  <div className="absolute bottom-1 left-2 text-[9px] text-cyan-400 font-semibold bg-black/70 px-1.5 rounded">
                    Lecteur Optique
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Pied de page Borne ── */}
      <footer className="h-12 px-6 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Borne opérationnelle • Prête à scanner
        </span>
        <span>{storeName} • Système Nexus POS</span>
      </footer>

      {/* ── Modale Pavé PIN pour Sortie Kiosque Sécurisée ── */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Lock size={18} className="text-cyan-400" />
                  <span>Accès Personnel Autorisé</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs text-slate-400">
                  Entrez votre code PIN pour quitter le mode kiosque
                </p>
                {/* Indicateurs de chiffres •••• */}
                <div className={`flex items-center justify-center gap-3 pt-3 ${pinError ? 'animate-shake' : ''}`}>
                  {[0, 1, 2, 3].map(idx => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        enteredPin.length > idx 
                          ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_8px_#22d3ee]' 
                          : 'border-slate-700 bg-slate-950'
                      }`}
                    />
                  ))}
                </div>
                {pinError && (
                  <p className="text-xs text-rose-400 font-semibold pt-2">
                    Code PIN incorrect
                  </p>
                )}
              </div>

              {/* Pavé Numérique Tactile */}
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinDigit(num)}
                    className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xl font-bold text-white active:scale-95 transition-all shadow-sm"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="h-14 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 active:scale-95 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xl font-bold text-white active:scale-95 transition-all shadow-sm"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinDelete}
                  className="h-14 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 active:scale-95 transition-all"
                >
                  <Delete size={20} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default KioskPriceTerminal;
