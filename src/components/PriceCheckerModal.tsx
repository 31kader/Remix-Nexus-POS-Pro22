import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, RefreshCw, Camera, AlertCircle, Package, Award, 
  Barcode as BarcodeIcon, Printer, Plus, Minus, Trash2, 
  CheckCircle2, CloudUpload, Lock, Unlock, Monitor, Settings as SettingsIcon,
  Tag, X, ArrowLeft, ShieldCheck, Sparkles, Check
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { get as getIDB } from 'idb-keyval';
import bcrypt from 'bcryptjs';
import { Product, CompanySettings, Category, Brand } from '../types';
import { cn, playScanSound, announcePrice } from '../lib/utils';
import { Modal, Button } from './ui';
import { SafeImage } from './ui/SafeImage';
import { toast } from 'sonner';
import { getSecureItem, setSecureItem } from '../lib/security';
import {
  RemoteLabelQueueItem,
  fetchRemoteLabelQueue,
  addProductToRemoteLabelQueue,
  updateRemoteLabelQueueQuantity,
  removeFromRemoteLabelQueue,
  clearRemoteLabelQueue,
  subscribeToRemoteLabelQueue,
  persistQueueToCloud
} from '../services/remoteLabelQueueService';
import { useCoreStore } from '../store/useCoreStore';
import { printLabels } from '../services/labelPrintService';
import { PriceCheckerKioskView } from './price-checker/PriceCheckerKioskView';

interface PriceCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: CompanySettings;
  categories: Category[];
  brands: Brand[];
}

export function PriceCheckerModal({ isOpen, onClose, products, settings, categories, brands }: PriceCheckerModalProps) {
  // Mode Borne Client (Kiosque plein écran) vs Mode Gestion Rayon
  const [isKioskMode, setIsKioskMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_price_checker_kiosk_mode');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [remoteQueue, setRemoteQueue] = useState<RemoteLabelQueueItem[]>([]);
  const [autoQueueOnScan, setAutoQueueOnScan] = useState<boolean>(false);
  const [labelQty, setLabelQty] = useState<number>(1);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // 1. Compte à rebours de 5 secondes pour réinitialisation de la borne client
  const [resetCountdown, setResetCountdown] = useState<number>(5);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Sécurité sortie par PIN
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [pinDialogTimeout, setPinDialogTimeout] = useState<number>(5);
  const pinTimerRef = useRef<NodeJS.Timeout | null>(null);

  const wakeLockRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastProcessedScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const focusScannerInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Horloge en direct pour la borne
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Synchronisation file d'impression
  useEffect(() => {
    if (!isOpen) return;
    fetchRemoteLabelQueue().then(setRemoteQueue).catch(() => {});
    const unsub = subscribeToRemoteLabelQueue(setRemoteQueue);
    focusScannerInput();
    return () => unsub();
  }, [isOpen]);

  // Sauvegarde de la préférence Kiosque
  const toggleKioskMode = (enabled: boolean) => {
    setIsKioskMode(enabled);
    try {
      localStorage.setItem('nexus_price_checker_kiosk_mode', enabled ? 'true' : 'false');
    } catch (_) {}
    focusScannerInput();
  };

  // Décompte automatique de 5 secondes après affichage du produit ou code introuvable en Mode Borne
  useEffect(() => {
    if (!isOpen || !isKioskMode || (!foundProduct && !notFoundCode)) {
      setResetCountdown(5);
      if (resetTimerRef.current) clearInterval(resetTimerRef.current);
      return;
    }

    setResetCountdown(5);
    const interval = setInterval(() => {
      setResetCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFoundProduct(null);
          setNotFoundCode(null);
          setSearchTerm('');
          focusScannerInput();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    resetTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [foundProduct, notFoundCode, isKioskMode, isOpen]);

  // Décompte de sécurité de 5 secondes sur la boîte de PIN (fermeture auto si le client tente de tester l'écran)
  useEffect(() => {
    if (!showPinModal) {
      setPinDialogTimeout(5);
      if (pinTimerRef.current) clearInterval(pinTimerRef.current);
      return;
    }

    setPinDialogTimeout(5);
    const interval = setInterval(() => {
      setPinDialogTimeout((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowPinModal(false);
          setEnteredPin('');
          setPinError(false);
          focusScannerInput();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    pinTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [showPinModal]);

  // Ajout discret à la file d'étiquettes
  const handleAddToRemoteQueue = async (prod: Product, qty: number = 1, isDiscreet: boolean = false) => {
    const updated = await addProductToRemoteLabelQueue(prod, qty, 'Borne Rayon');
    setRemoteQueue(updated);
    if (isDiscreet) {
      toast.success(`🏷️ "${prod.name}" ajouté à la file d'impression distante (x${qty})`, {
        duration: 2500,
        position: 'bottom-right'
      });
    } else {
      toast.success(`"${prod.name}" (${prod.price.toFixed(2)} ${settings?.currency || 'DA'}) ajouté à la file (x${qty}) !`);
    }
    focusScannerInput();
  };

  const handlePrintQueueNow = () => {
    if (remoteQueue.length === 0) {
      toast.warning("La file d'étiquettes est vide. Bipez d'abord vos articles.");
      return;
    }
    const allProds = (products && products.length > 0) ? products : (useCoreStore.getState().products || []);
    const expandedProducts: Product[] = [];
    remoteQueue.forEach(item => {
      const fullProd = allProds.find(p => p && String(p.id) === String(item.productId)) || ({
        id: item.productId,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        price: item.price,
        unit: item.unit || 'pcs',
        stock: 1,
        categoryId: 'uncategorized'
      } as Product);
      const count = Math.max(1, Number(item.quantity) || 1);
      for (let i = 0; i < count; i++) {
        expandedProducts.push(fullProd);
      }
    });

    const savedPrinterType = (() => {
      try {
        const val = localStorage.getItem('nexus_label_printer_type');
        if (val === 'dedicated_label_printer' || val === 'receipt_printer') return val;
      } catch (_) {}
      return 'dedicated_label_printer';
    })();

    printLabels(expandedProducts, {
      ...settings,
      labelPrinterType: savedPrinterType
    } as any);
    toast.success(`Impression directe lancée (${expandedProducts.length} étiquette(s)) !`);
    focusScannerInput();
  };

  const handleOpenInLabelStudio = () => {
    try {
      sessionStorage.setItem('nexus_auto_import_remote_labels', 'true');
      window.location.hash = 'labels';
      onClose();
      toast.success("Ouverture du Studio d'Étiquettes avec votre file d'articles...");
    } catch (_) {}
  };

  // Recherche produit au scan
  const executeProductLookup = (rawCode: string, isFromEnterOrScanner: boolean = false) => {
    const cleanTerm = String(rawCode || '').trim().toLowerCase();
    if (!cleanTerm) return false;

    const now = Date.now();
    if (
      isFromEnterOrScanner &&
      lastProcessedScanRef.current.code === cleanTerm &&
      now - lastProcessedScanRef.current.time < 400
    ) {
      return true;
    }

    const allProds = (products && products.length > 0) ? products : (useCoreStore.getState().products || []);
    const exactMatch = allProds.find(p => p && (
      (p.barcode && String(p.barcode).trim().toLowerCase() === cleanTerm) ||
      (p.sku && String(p.sku).trim().toLowerCase() === cleanTerm) ||
      ((p as any).reference && String((p as any).reference).trim().toLowerCase() === cleanTerm) ||
      (p.name && String(p.name).trim().toLowerCase() === cleanTerm)
    ));

    const partialMatch = isFromEnterOrScanner && !exactMatch
      ? allProds.find(p => p && (
          (p.barcode && String(p.barcode).toLowerCase().includes(cleanTerm)) ||
          (p.sku && String(p.sku).toLowerCase().includes(cleanTerm)) ||
          (p.name && String(p.name).toLowerCase().includes(cleanTerm))
        ))
      : undefined;

    const product = exactMatch || partialMatch;
    if (product) {
      lastProcessedScanRef.current = { code: cleanTerm, time: now };
      setFoundProduct(product);
      setNotFoundCode(null);
      setSearchTerm('');
      setResetCountdown(5);
      playScanSound();
      announcePrice(product.name, product.price, settings?.currency || 'DA');
      
      // En mode Kiosque client, on n'ajoute JAMAIS automatiquement à la file d'impression
      if (autoQueueOnScan && !isKioskMode) {
        handleAddToRemoteQueue(product, labelQty, false);
      }
      focusScannerInput();
      return true;
    } else if (isFromEnterOrScanner) {
      setFoundProduct(null);
      setNotFoundCode(rawCode.trim());
      setSearchTerm('');
      setResetCountdown(4);
      focusScannerInput();
    }
    return false;
  };

  // Wake Lock implementation (écran toujours allumé sur la borne)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if (isOpen && 'wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
    };
    if (isOpen) requestWakeLock();
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
      }
    };
  }, [isOpen]);

  // Global scanner support (douchette USB / Bluetooth)
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Si la modale de PIN est ouverte, laisser le pavé PIN gérer
      if (showPinModal) return;

      const target = e.target as HTMLElement;
      const isPriceInput = target === inputRef.current || target?.id === 'price-checker-input';

      if (isPriceInput) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const currentVal = (inputRef.current?.value || searchTerm || buffer).trim();
          if (currentVal) {
            executeProductLookup(currentVal, true);
          }
          buffer = '';
        }
        return;
      }

      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 120) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Escape') {
        if (isKioskMode) {
          handleAttemptExit();
        } else {
          onClose();
        }
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          executeProductLookup(buffer, true);
          buffer = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
        if (buffer.length > 50) buffer = buffer.slice(-50);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isOpen, products, autoQueueOnScan, labelQty, searchTerm, isKioskMode, showPinModal]);

  // Caméra Barcode Scanner (pour tablettes/mobiles/webcam)
  useEffect(() => {
    let codeReader: BrowserMultiFormatReader | null = null;
    let activeStream: MediaStream | null = null;
    let lastScannedText = '';
    let lastScanTime = 0;
    
    if (isScanning && isOpen && !foundProduct) {
      setCameraError(null);
      const startScanner = async () => {
        const videoElement = document.getElementById("camera-reader-price") as HTMLVideoElement;
        if (!videoElement) return;

        if ('BarcodeDetector' in window) {
          try {
            // @ts-ignore
            const formats = await window.BarcodeDetector.getSupportedFormats();
            // @ts-ignore
            const detector = new window.BarcodeDetector({ formats });
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: facingMode }
            });
            activeStream = stream;
            videoElement.srcObject = stream;
            videoElement.setAttribute('playsinline', 'true');
            videoElement.muted = true;
            try { await videoElement.play(); } catch (_) {}

            const detect = async () => {
              if (!isOpen || !isScanning || !videoElement || !activeStream) return;
              try {
                const barcodes = await detector.detect(videoElement);
                if (barcodes.length > 0) {
                  const decodedText = barcodes[0].rawValue;
                  const now = Date.now();
                  if (decodedText !== lastScannedText || (now - lastScanTime) > 2500) {
                    executeProductLookup(decodedText, true);
                    lastScannedText = decodedText;
                    lastScanTime = now;
                  }
                }
              } catch (_) {}
              if (isOpen && isScanning && !foundProduct) {
                requestAnimationFrame(detect);
              }
            };
            detect();
            return;
          } catch (_) {}
        }

        try {
          codeReader = new BrowserMultiFormatReader();
          codeReader.decodeFromVideoDevice(
            null,
            videoElement,
            (result) => {
              if (result) {
                const decodedText = result.getText();
                const now = Date.now();
                if (decodedText !== lastScannedText || (now - lastScanTime) > 2500) {
                  executeProductLookup(decodedText, true);
                  lastScannedText = decodedText;
                  lastScanTime = now;
                }
              }
            }
          ).catch(() => {
            setIsScanning(false);
            setCameraError("Erreur d'accès à la caméra.");
          });
        } catch (_) {
          setIsScanning(false);
          setCameraError("Caméra indisponible.");
        }
      };

      setTimeout(startScanner, 200);
    }
    
    return () => {
      if (codeReader) {
        try { codeReader.reset(); } catch (_) {}
      }
      if (activeStream) {
        try {
          activeStream.getTracks().forEach(t => t.stop());
        } catch (_) {}
      }
    };
  }, [isScanning, isOpen, facingMode, foundProduct]);

  useEffect(() => {
    if (!isOpen) {
      setIsScanning(false);
      setSearchTerm('');
      setFoundProduct(null);
      setNotFoundCode(null);
      setCameraError(null);
      setShowPinModal(false);
    }
  }, [isOpen]);

  // Tentative de fermeture / sortie de la borne
  const handleAttemptExit = () => {
    if (isKioskMode) {
      setShowPinModal(true);
      setEnteredPin('');
      setPinError(false);
      setPinDialogTimeout(5);
    } else {
      onClose();
    }
  };

  // Vérification sécurisée du Code PIN
  const verifyEnteredPin = async (candidatePin: string) => {
    const customStoredPin = getSecureItem<string>('nexus_pos_master_pin');

    let isValid = false;

    // 1. Vérification contre Master PIN (Bcrypt $2a$ / $2b$ uniquement)
    if (customStoredPin && (customStoredPin.startsWith('$2a$') || customStoredPin.startsWith('$2b$'))) {
      try { isValid = bcrypt.compareSync(candidatePin, customStoredPin); } catch (_) {}
    }

    // 2. Vérification contre n'importe quel employé/utilisateur local (Bcrypt $2a$ / $2b$ uniquement)
    if (!isValid) {
      try {
        const [usersObj, employeesObj] = await Promise.all([
          getIDB<Record<string, any>>('nexus_db_users').catch(() => null),
          getIDB<Record<string, any>>('nexus_db_employees').catch(() => null)
        ]);
        const allStaff = [
          ...(usersObj ? Object.values(usersObj) : []),
          ...(employeesObj ? Object.values(employeesObj) : [])
        ];
        for (const u of allStaff) {
          const hash = u?.password_hash || u?.pin_hash;
          if (hash && (hash.startsWith('$2a$') || hash.startsWith('$2b$'))) {
            try {
              if (bcrypt.compareSync(candidatePin, hash)) {
                isValid = true;
                break;
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    if (isValid) {
      toast.success("Borne déverrouillée avec succès !");
      setShowPinModal(false);
      setEnteredPin('');
      onClose();
    } else {
      setPinError(true);
      toast.error("Code PIN incorrect");
      setTimeout(() => {
        setEnteredPin('');
        setPinError(false);
      }, 700);
    }
  };

  const handlePinDigitPress = (digit: string) => {
    setPinDialogTimeout(5); // Réinitialise le délai de sécurité à chaque frappe
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      if (nextPin.length === 4) {
        verifyEnteredPin(nextPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setPinDialogTimeout(5);
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError(false);
  };

  // Clavier physique pour la modale PIN
  useEffect(() => {
    if (!showPinModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      setPinDialogTimeout(5);
      if (e.key >= '0' && e.key <= '9') {
        handlePinDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Escape') {
        setShowPinModal(false);
        setEnteredPin('');
        focusScannerInput();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinModal, enteredPin]);

  if (!isOpen) return null;

  const totalLabelsInQueue = remoteQueue.reduce((acc, i) => acc + (i.quantity || 1), 0);

  // =========================================================================
  // 🖥️ AFFICHAGE DU MODE BORNE CLIENT (PLEIN ÉCRAN KIOSQUE SÉCURISÉ)
  // =========================================================================
  if (isKioskMode) {
    return (
      <PriceCheckerKioskView
        inputRef={inputRef}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        focusScannerInput={focusScannerInput}
        handleAttemptExit={handleAttemptExit}
        foundProduct={foundProduct}
        notFoundCode={notFoundCode}
        isScanning={isScanning}
        setIsScanning={setIsScanning}
        facingMode={facingMode}
        setFacingMode={setFacingMode}
        cameraError={cameraError}
        settings={settings}
        resetCountdown={resetCountdown}
        handleAddToRemoteQueue={handleAddToRemoteQueue}
        showPinModal={showPinModal}
        setShowPinModal={setShowPinModal}
        enteredPin={enteredPin}
        setEnteredPin={setEnteredPin}
        pinError={pinError}
        handlePinDigitPress={handlePinDigitPress}
        handlePinBackspace={handlePinBackspace}
        toggleKioskMode={toggleKioskMode}
        pinDialogTimeout={pinDialogTimeout}
      />
    );
  }

  // =========================================================================
  // 🛠️ AFFICHAGE DU MODE GESTION RAYON & IMPRESSION (MODAL STANDARD)
  // =========================================================================
  return (
    <Modal isOpen={isOpen} onClose={handleAttemptExit} title="Vérificateur de Prix & Collecteur d'Étiquettes Multi-Postes" maxWidth="max-w-4xl">
      <div className="space-y-4 p-2">
        {/* En-tête : Bascule vers le Mode Borne Client Plein Écran */}
        <div className="p-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border-2 border-indigo-500/50 rounded-2xl flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Monitor size={24} className="text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-white">Borne Libre-Service Client</p>
              <p className="text-[11px] text-indigo-200">Verrouille le poste en plein écran avec sécurité PIN pour les clients en rayon.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleKioskMode(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
          >
            <Sparkles size={14} /> 🖥️ Activer Plein Écran Borne
          </button>
        </div>

        {/* 1. Champ de Scan Code-Barres */}
        <form onSubmit={(e) => { e.preventDefault(); if (searchTerm.trim()) executeProductLookup(searchTerm, true); }} className="relative group flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input
              ref={inputRef}
              id="price-checker-input"
              type="text"
              placeholder="Bipez un code-barres avec la douchette ou tapez le nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-zinc-900 border-2 border-indigo-500/50 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-black text-lg text-slate-900 dark:text-white"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                if (searchTerm.trim()) executeProductLookup(searchTerm, true);
                focusScannerInput();
              }}
              className="px-5 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Vérifier Prix
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setIsScanning(!isScanning);
                focusScannerInput();
              }}
              className={`p-4 rounded-xl border transition-colors flex items-center justify-center cursor-pointer ${isScanning ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-100'}`}
              title={isScanning ? "Arrêter la caméra" : "Activer la caméra"}
            >
              <Camera size={22} />
            </button>
          </div>
        </form>

        {/* 2. Affichage Produit Scanné en Mode Gestion */}
        {foundProduct && (
          <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-2 border-emerald-500/60 rounded-2xl shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
              <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                <SafeImage src={foundProduct.imageUrl} alt={foundProduct.name} className="w-full h-full object-contain" fallback={<Package size={40} className="text-emerald-400" />} />
              </div>
              <div className="min-w-0 text-left">
                <span className="inline-block px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-black uppercase tracking-widest mb-1">
                  ✅ Article Scanné • Stock: {foundProduct.stock} {foundProduct.unit || 'u.'}
                </span>
                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight truncate">
                  {foundProduct.name}
                </h3>
                <p className="text-xs font-mono text-indigo-300 mt-0.5">
                  Code-barres: {foundProduct.barcode || 'N/A'} • SKU: {foundProduct.sku || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end justify-center bg-emerald-500/15 border border-emerald-400/40 px-6 py-3 rounded-2xl shrink-0 w-full md:w-auto text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">PRIX DE VENTE TTC</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl md:text-6xl font-black text-emerald-400 tracking-tighter font-mono">
                  {Number(foundProduct.price || 0).toFixed(2)}
                </span>
                <span className="text-2xl font-black text-emerald-300 uppercase">{settings?.currency || 'DA'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleAddToRemoteQueue(foundProduct, labelQty, false);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={12} /> + Ajouter Étiquette (x{labelQty})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Barre d'outils : Collecte d'Étiquettes & Impression */}
        <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setAutoQueueOnScan(!autoQueueOnScan);
                focusScannerInput();
              }}
              className={cn(
                "px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border",
                autoQueueOnScan
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                  : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-zinc-700"
              )}
            >
              <CloudUpload size={15} />
              {autoQueueOnScan ? "⚡ Auto-Enregistrement Scan : ACTIF" : "Auto-Enregistrer au Scan (Rayon)"}
            </button>

            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
              <span className="text-[10px] font-black text-slate-500 uppercase">Qté étiq/scan :</span>
              {[1, 2, 5].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setLabelQty(q);
                    focusScannerInput();
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-black cursor-pointer",
                    labelQty === q ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  )}
                >
                  x{q}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {remoteQueue.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handlePrintQueueNow();
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={15} />
                🖨️ Imprimer ({totalLabelsInQueue})
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setShowQueueDrawer(!showQueueDrawer);
                focusScannerInput();
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Printer size={15} />
              File d'Impression ({remoteQueue.length} art. / {totalLabelsInQueue} étiq.)
            </button>
          </div>
        </div>

        {/* 4. Liste des articles enregistrés (Tiroir) */}
        {showQueueDrawer && (
          <div className="p-4 bg-white dark:bg-zinc-900 border-2 border-indigo-500/40 rounded-xl space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                  📡 File d'Étiquettes Synchronisée ({remoteQueue.length} article(s) • {totalLabelsInQueue} étiquette(s))
                </h4>
                <p className="text-[11px] text-slate-500">
                  Envoyez au poste relié à l'imprimante ou imprimez directement.
                </p>
              </div>
              {remoteQueue.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.currentTarget.blur();
                      const ok = await persistQueueToCloud(remoteQueue);
                      if (ok) {
                        toast.success(`✅ ${remoteQueue.length} article(s) envoyé(s) sur le Cloud ! Allez sur le PC relié à l'imprimante pour imprimer.`);
                      } else {
                        toast.warning("File sauvegardée en local.");
                      }
                      focusScannerInput();
                    }}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <CloudUpload size={14} /> ☁️ Envoyer au Poste Imprimante
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handlePrintQueueNow();
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer size={14} /> 🖨️ Imprimer sur cet appareil
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleOpenInLabelStudio();
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    🚀 Ouvrir Studio d'Étiquettes
                  </button>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.currentTarget.blur();
                      await clearRemoteLabelQueue();
                      setRemoteQueue([]);
                      toast.info("File d'impression distante vidée.");
                      focusScannerInput();
                    }}
                    className="px-2.5 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} /> Vider
                  </button>
                </div>
              )}
            </div>

            {remoteQueue.length > 0 && (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                {remoteQueue.map(item => (
                  <div key={item.productId} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate">{item.name}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black font-mono">
                        Prix: {Number(item.price || 0).toFixed(2)} {settings?.currency || 'DA'} • SKU: {item.sku}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.currentTarget.blur();
                          const next = Math.max(1, item.quantity - 1);
                          setRemoteQueue(await updateRemoteLabelQueueQuantity(item.productId, next));
                          focusScannerInput();
                        }}
                        className="p-1 bg-slate-100 dark:bg-zinc-800 rounded hover:bg-slate-200 cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-black w-8 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.currentTarget.blur();
                          setRemoteQueue(await updateRemoteLabelQueueQuantity(item.productId, item.quantity + 1));
                          focusScannerInput();
                        }}
                        className="p-1 bg-slate-100 dark:bg-zinc-800 rounded hover:bg-slate-200 cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.currentTarget.blur();
                          setRemoteQueue(await removeFromRemoteLabelQueue(item.productId));
                          focusScannerInput();
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isScanning && !cameraError && (
          <div className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border-2 border-indigo-500 bg-black aspect-video flex items-center justify-center">
            <video id="camera-reader-price" className="w-full h-full object-cover"></video>
          </div>
        )}
      </div>
    </Modal>
  );
}
