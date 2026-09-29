import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, RefreshCw, Camera, AlertCircle, Package, Award, Barcode as BarcodeIcon, Printer, Plus, Minus, Trash2, CheckCircle2, CloudUpload } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Product, CompanySettings, Category, Brand } from '../types';
import { cn, playScanSound, announcePrice } from '../lib/utils';
import { Modal, Button } from './ui';
import { SafeImage } from './ui/SafeImage';
import { toast } from 'sonner';
import {
  RemoteLabelQueueItem,
  fetchRemoteLabelQueue,
  addProductToRemoteLabelQueue,
  updateRemoteLabelQueueQuantity,
  removeFromRemoteLabelQueue,
  clearRemoteLabelQueue,
  subscribeToRemoteLabelQueue
} from '../services/remoteLabelQueueService';

interface PriceCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: CompanySettings;
  categories: Category[];
  brands: Brand[];
}

import { useCoreStore } from '../stores/useCoreStore';
import { useUIStore } from '../stores/useUIStore';
import { executePrintLabels } from '../services/labelPrintService';

export function PriceCheckerModal({ isOpen, onClose, products, settings, categories, brands }: PriceCheckerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [remoteQueue, setRemoteQueue] = useState<RemoteLabelQueueItem[]>([]);
  const [autoQueueOnScan, setAutoQueueOnScan] = useState<boolean>(true);
  const [labelQty, setLabelQty] = useState<number>(1);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);
  const wakeLockRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastProcessedScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const focusScannerInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchRemoteLabelQueue().then(setRemoteQueue).catch(() => {});
    const unsub = subscribeToRemoteLabelQueue(setRemoteQueue);
    focusScannerInput();
    return () => unsub();
  }, [isOpen]);

  const handleAddToRemoteQueue = async (prod: Product, qty: number = labelQty) => {
    const updated = await addProductToRemoteLabelQueue(prod, qty, 'Poste Vérificateur');
    setRemoteQueue(updated);
    toast.success(`"${prod.name}" (${prod.price.toFixed(2)} ${settings?.currency || 'DA'}) ajouté à la file d'impression (x${qty}) !`);
    focusScannerInput();
  };

  const handlePrintQueueNow = () => {
    if (remoteQueue.length === 0) {
      toast.warning("La file d'étiquettes est vide. Bipez d'abord vos articles.");
      return;
    }
    const allProds = (products && products.length > 0) ? products : (useCoreStore.getState().products || []);
    const queueForPrint = remoteQueue.map(item => {
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
      return { product: fullProd, quantity: item.quantity || 1 };
    });

    executePrintLabels({
      queue: queueForPrint,
      labelSize: '40x30',
      printerType: 'receipt_printer',
      paperRollWidth: 80,
      columns: 1,
      showPrice: true,
      showBarcode: true,
      showSku: true,
      showName: true,
      showStoreName: true,
      showDate: false,
      showUnitPrice: false,
      showLinearPrice: false,
      showPromoBadge: false,
      promoPercentage: 20,
      barcodeFormat: 'CODE128',
      fontSize: 'medium',
      labelStyle: 'modern',
      customWidth: 50,
      customHeight: 30,
      labelOrientation: 'landscape',
      labelRotation: 0,
      settings
    });
    toast.success(`Impression directe lancée (${remoteQueue.length} article(s)) !`);
    focusScannerInput();
  };

  const handleOpenInLabelStudio = () => {
    try {
      sessionStorage.setItem('nexus_auto_import_remote_labels', 'true');
      useUIStore.getState().setActiveTab('labels');
      onClose();
      toast.success("Ouverture du Studio d'Étiquettes avec votre file d'articles...");
    } catch (_) {}
  };

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
      playScanSound();
      announcePrice(product.name, product.price, settings?.currency || 'DA');
      if (autoQueueOnScan) {
        handleAddToRemoteQueue(product, labelQty);
      }
      focusScannerInput();
      return true;
    } else if (isFromEnterOrScanner) {
      setFoundProduct(null);
      setNotFoundCode(rawCode.trim());
      setSearchTerm('');
      focusScannerInput();
    }
    return false;
  };

  // Wake Lock implementation
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

  // Global scanner support (HID USB/Bluetooth barcode reader)
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isPriceInput = target === inputRef.current || target?.id === 'price-checker-input';

      // Si le focus est déjà dans le champ de recherche, laisser le formulaire gérer Enter sans cliquer sur un bouton
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
  }, [isOpen, products, autoQueueOnScan, labelQty, searchTerm]);

  useEffect(() => {
    let codeReader: BrowserMultiFormatReader | null = null;
    let lastScannedText = '';
    let lastScanTime = 0;
    
    if (isScanning && isOpen) {
      setCameraError(null);
      
      const startScanner = async () => {
        const videoElement = document.getElementById("camera-reader-price") as HTMLVideoElement;
        if (!videoElement) return;

        // Try BarcodeDetector (Native/Google ML engine) first
        if ('BarcodeDetector' in window) {
          try {
            // @ts-ignore
            const formats = await window.BarcodeDetector.getSupportedFormats();
            // @ts-ignore
            const detector = new window.BarcodeDetector({ formats });
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: facingMode }
            });
            videoElement.srcObject = stream;
            videoElement.setAttribute('playsinline', 'true');
            videoElement.muted = true;
            try {
              await videoElement.play();
            } catch (playErr) {
              console.warn("Video play failed:", playErr);
            }

            const detect = async () => {
              if (!isOpen || !isScanning || !videoElement) return;
              try {
                const barcodes = await detector.detect(videoElement);
                if (barcodes.length > 0) {
                  const decodedText = barcodes[0].rawValue;
                  const now = Date.now();
                  if (decodedText !== lastScannedText || (now - lastScanTime) > 3000) {
                    setSearchTerm(decodedText);
                    lastScannedText = decodedText;
                    lastScanTime = now;
                    playScanSound();
                  }
                }
              } catch (err) {
                console.error("Barcode detection error:", err);
              }
              if (isOpen && isScanning) {
                requestAnimationFrame(detect);
              }
            };
            detect();
            return; // Successfully using native detector
          } catch (err) {
            console.warn("BarcodeDetector failed, falling back to ZXing:", err);
          }
        }

        // Fallback to ZXing
        try {
          codeReader = new BrowserMultiFormatReader();
          codeReader.decodeFromVideoDevice(
            null,
            videoElement,
            (result) => {
              if (result) {
                const decodedText = result.getText();
                const now = Date.now();
                if (decodedText !== lastScannedText || (now - lastScanTime) > 3000) {
                  setSearchTerm(decodedText);
                  lastScannedText = decodedText;
                  lastScanTime = now;
                  playScanSound();
                }
              }
            }
          ).catch(err => {
            console.error("Camera failed", err);
            setIsScanning(false);
            setCameraError("Erreur lors de l'accès à la caméra de l'appareil.");
          });
        } catch (err: any) {
          console.error("Price checker camera failed", err);
          setIsScanning(false);
          setCameraError("Erreur lors de l'accès à la caméra de l'appareil.");
        }
      };

      setTimeout(startScanner, 300);
    }
    
    return () => {
      if (codeReader) {
         try {
             codeReader.reset();
         } catch(e) {}
      }
    };
  }, [isScanning, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsScanning(false);
      setSearchTerm('');
      setFoundProduct(null);
      setNotFoundCode(null);
      setCameraError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm && searchTerm.trim().length >= 3) {
      executeProductLookup(searchTerm, false);
    }
  }, [searchTerm, products, settings?.currency, autoQueueOnScan, labelQty]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    executeProductLookup(searchTerm, true);
  };

  const totalLabelsInQueue = remoteQueue.reduce((acc, i) => acc + (i.quantity || 1), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vérificateur de Prix & Collecteur d'Étiquettes Multi-Postes" maxWidth="max-w-4xl">
      <div className="space-y-4 p-2">
        {/* 1. Champ de Scan Code-Barres (Toujours actif en haut) */}
        <form onSubmit={handleManualSearch} className="relative group flex gap-2">
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

        {/* 2. AFFICHAGE IMMÉDIAT DU PRIX EN GÉANT DÈS QU'ON BIPE UN ARTICLE */}
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
                    handleAddToRemoteQueue(foundProduct, labelQty);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={12} /> + Ajouter Étiquette (x{labelQty})
                </button>
              </div>
            </div>
          </div>
        )}

        {notFoundCode && !foundProduct && (
          <div className="p-4 bg-rose-950/80 border-2 border-rose-500/60 rounded-xl text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={28} className="text-rose-400 shrink-0" />
              <div className="text-left">
                <p className="text-base font-black uppercase text-rose-300">Aucun article trouvé pour le code « {notFoundCode} »</p>
                <p className="text-xs text-rose-200/80">Bipez un autre article ou vérifiez le code-barres dans l'inventaire.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setNotFoundCode(null); focusScannerInput(); }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold cursor-pointer"
            >
              Effacer
            </button>
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

        {/* 4. Liste des articles enregistrés & Boutons directs pour continuer l'impression */}
        {showQueueDrawer && (
          <div className="p-4 bg-white dark:bg-zinc-900 border-2 border-indigo-500/40 rounded-xl space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                  📡 File d'Étiquettes Synchronisée ({remoteQueue.length} article(s) • {totalLabelsInQueue} étiquette(s))
                </h4>
                <p className="text-[11px] text-slate-500">
                  Vous pouvez imprimer directement ci-dessous, ouvrir le Studio d'Étiquettes, ou récupérer la file depuis un autre PC.
                </p>
              </div>
              {remoteQueue.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handlePrintQueueNow();
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer size={14} /> 🖨️ Imprimer Maintenant (80mm)
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

            {remoteQueue.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                Aucun article dans la file. Bipez un article avec le lecteur code-barres : son prix s'affichera en grand et il s'ajoutera automatiquement ici !
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                {remoteQueue.map(item => (
                  <div key={item.productId} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate">{item.name}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black font-mono">
                        Prix: {Number(item.price || 0).toFixed(2)} {settings.currency} • SKU: {item.sku}
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

        {cameraError && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium border border-rose-100 mb-4 flex items-center justify-center">
            {cameraError}
          </div>
        )}

        {isScanning && !cameraError && (
          <div className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border-2 border-indigo-500 bg-black aspect-video flex items-center justify-center">
            <video id="camera-reader-price" className="w-full h-full object-cover"></video>
          </div>
        )}

        <AnimatePresence mode="wait">
          {foundProduct ? (
            <motion.div 
              key={foundProduct.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-slate-100 dark:border-zinc-800"
            >
              {/* Image Section */}
              <div className="aspect-square bg-slate-50 flex items-center justify-center p-5 relative">
                <SafeImage src={foundProduct.imageUrl} alt={foundProduct.name} className="w-full h-full object-contain drop-shadow-lg" fallback={<Package size={100} className="text-slate-200" />} />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/80 border border-slate-100 dark:border-zinc-800 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {categories.find(c => c.id === foundProduct.categoryId)?.name || 'Général'}
                  </span>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-5 flex flex-col justify-center space-y-5">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight mb-1">{foundProduct.name}</h3>
                  <div className="flex items-center gap-2">
                    {foundProduct.brandId && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Award size={10} />
                        {brands.find(b => b.id === foundProduct.brandId)?.name}
                      </span>
                    )}
                    <p className="text-slate-400 font-mono text-sm">SKU: {foundProduct.sku}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-indigo-600 tracking-tighter">
                    {foundProduct.price.toFixed(2)}
                  </span>
                  <span className="text-2xl font-bold text-indigo-400">{settings.currency}</span>
                </div>

                <div className="flex items-center gap-3">
                   <div className={cn(
                     "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2",
                     foundProduct.stock > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                   )}>
                     <div className={cn("w-2 h-2 rounded-full", foundProduct.stock > 0 ? "bg-emerald-500" : "bg-rose-500")} />
                     {foundProduct.stock > 0 ? `En Stock (${foundProduct.stock})` : "Indisponible"}
                   </div>
                </div>

                {/* Bouton d'enregistrement pour impression d'étiquette depuis un autre poste */}
                <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2.5">
                  <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    🏷️ Imprimer cette étiquette depuis un autre poste :
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => handleAddToRemoteQueue(foundProduct, labelQty)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"
                    >
                      <Printer size={16} />
                      Enregistrer pour Impression (x{labelQty})
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleAddToRemoteQueue(foundProduct, 5)}
                      variant="secondary"
                      className="py-3 px-3 rounded-xl font-black text-xs"
                    >
                      +5 Étiq.
                    </Button>
                  </div>
                </div>

                {/* Quantity Discounts */}
                {foundProduct.quantityDiscounts && foundProduct.quantityDiscounts.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarifs Quantité</p>
                    <div className="grid grid-cols-2 gap-3">
                      {foundProduct.quantityDiscounts.map((d, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-600">x{d.minQuantity}</span>
                          <span className="text-sm font-black text-indigo-600">{d.discountPrice.toFixed(2)}{settings.currency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button onClick={() => setFoundProduct(null)} className="w-full bg-slate-900 hover:bg-slate-800 py-3.5 rounded-xl">
                  Rechercher un autre article
                </Button>
              </div>
            </motion.div>
          ) : searchTerm.length > 0 ? (
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               className="text-center py-12 p-5 bg-rose-50 rounded-xl border border-dashed border-rose-200"
            >
              <div className="w-16 h-16 bg-white dark:bg-zinc-900 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <AlertCircle size={32} />
              </div>
              <p className="text-rose-600 font-black text-2xl uppercase mb-2">ARTICLE N'EXISTE PAS</p>
              <p className="text-slate-500 mb-6">La recherche pour <span className="font-bold">"{searchTerm}"</span> n'a donné aucun résultat.</p>
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-bounce">Veuillez rescanner l'article...</p>
                <Button variant="secondary" onClick={() => setSearchTerm('')} className="px-5">
                  Réessayer
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="py-12 text-center text-slate-300 space-y-4">
              <BarcodeIcon size={64} className="mx-auto opacity-20" />
              <p className="font-bold uppercase tracking-widest text-sm">En attente d'un scan...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
