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

export function PriceCheckerModal({ isOpen, onClose, products, settings, categories, brands }: PriceCheckerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [remoteQueue, setRemoteQueue] = useState<RemoteLabelQueueItem[]>([]);
  const [autoQueueOnScan, setAutoQueueOnScan] = useState<boolean>(false);
  const [labelQty, setLabelQty] = useState<number>(1);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchRemoteLabelQueue().then(setRemoteQueue).catch(() => {});
    const unsub = subscribeToRemoteLabelQueue(setRemoteQueue);
    return () => unsub();
  }, [isOpen]);

  const handleAddToRemoteQueue = async (prod: Product, qty: number = labelQty) => {
    const updated = await addProductToRemoteLabelQueue(prod, qty, 'Poste Vérificateur');
    setRemoteQueue(updated);
    toast.success(`"${prod.name}" (x${qty}) envoyé à la file d'impression multi-postes !`);
  };

  // Wake Lock implementation
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if (isOpen && 'wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock is active');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };

    if (isOpen) {
      requestWakeLock();
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          wakeLockRef.current = null;
          console.log('Wake Lock released');
        });
      }
    };
  }, [isOpen]);

  // Global scanner support (HID)
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input that is NOT the search input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target !== document.querySelector('#price-checker-input')) {
        return;
      }

      const currentTime = Date.now();
      
      // If it's been more than 50ms since last key, it's likely a new scan or manual typing
      if (currentTime - lastKeyTime > 50) {
        // We could reset buffer here if we wanted to be strict about scan speed,
        // but scanners usually dump the whole code at once.
      }
      
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          setSearchTerm(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        // Auto-clear buffer if too long or stale
        if (buffer.length > 50) buffer = buffer.slice(-50);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

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
      setIsScanning(true);
      setSearchTerm('');
      setFoundProduct(null);
      setCameraError(null);
    }
  }, [isOpen]);


  useEffect(() => {
    if (searchTerm) {
      const cleanTerm = searchTerm.trim().toLowerCase();
      const product = (products || []).find(p => p && (
        (p.barcode && p.barcode.trim().toLowerCase() === cleanTerm) ||
        (p.sku && p.sku.toLowerCase() === cleanTerm) ||
        (p.name && p.name.toLowerCase() === cleanTerm)
      ));
      if (product) {
        setFoundProduct(product);
        setSearchTerm('');
        announcePrice(product.name, product.price, settings?.currency || 'DA');
        if (autoQueueOnScan) {
          handleAddToRemoteQueue(product, labelQty);
        }
      }
    }
  }, [searchTerm, products, settings?.currency, autoQueueOnScan, labelQty]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTerm = searchTerm.trim().toLowerCase();
    if (!cleanTerm) return;
    const product = (products || []).find(p => p && (
      (p.barcode && p.barcode.trim().toLowerCase() === cleanTerm) ||
      (p.sku && p.sku.toLowerCase().includes(cleanTerm)) ||
      (p.name && p.name.toLowerCase().includes(cleanTerm))
    ));
    setFoundProduct(product || null);
    if (product && autoQueueOnScan) {
      handleAddToRemoteQueue(product, labelQty);
    }
  };

  const totalLabelsInQueue = remoteQueue.reduce((acc, i) => acc + (i.quantity || 1), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vérificateur de Prix & Collecteur d'Étiquettes Multi-Postes" maxWidth="max-w-4xl">
      <div className="space-y-4 p-2">
        {/* Barre d'outils : Collecte d'Étiquettes pour Impression sur un Autre Poste */}
        <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAutoQueueOnScan(!autoQueueOnScan)}
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
                  onClick={() => setLabelQty(q)}
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

          <button
            type="button"
            onClick={() => setShowQueueDrawer(!showQueueDrawer)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer size={15} />
            File d'Impression Autre Poste ({remoteQueue.length} art. / {totalLabelsInQueue} étiq.)
          </button>
        </div>

        {/* Liste des articles enregistrés pour impression sur un autre poste */}
        {showQueueDrawer && (
          <div className="p-4 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
              <div>
                <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                  📡 File d'Étiquettes Synchronisée (Prête à imprimer sur le Poste Principal)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Ouvrez « Studio d'Étiquettes » sur l'autre ordinateur et cliquez sur « Importer File Vérificateur ».
                </p>
              </div>
              {remoteQueue.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await clearRemoteLabelQueue();
                    setRemoteQueue([]);
                    toast.info("File d'impression distante vidée.");
                  }}
                  className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} /> Vider la file
                </button>
              )}
            </div>

            {remoteQueue.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                Aucun article enregistré pour le moment. Scannez un article et cliquez sur « Envoyer à l'impression (Autre Poste) ».
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                {remoteQueue.map(item => (
                  <div key={item.productId} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        SKU: {item.sku} • {item.price.toFixed(2)} {settings.currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          const next = Math.max(1, item.quantity - 1);
                          setRemoteQueue(await updateRemoteLabelQueueQuantity(item.productId, next));
                        }}
                        className="p-1 bg-slate-100 dark:bg-zinc-800 rounded hover:bg-slate-200 cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-black w-8 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          setRemoteQueue(await updateRemoteLabelQueueQuantity(item.productId, item.quantity + 1));
                        }}
                        className="p-1 bg-slate-100 dark:bg-zinc-800 rounded hover:bg-slate-200 cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setRemoteQueue(await removeFromRemoteLabelQueue(item.productId));
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

        <form onSubmit={handleManualSearch} className="relative group flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input
              id="price-checker-input"
              type="text"
              placeholder="Scanner un code-barres ou rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all font-bold text-lg"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            {isScanning && (
              <button
                type="button"
                onClick={() => setFacingMode(prev => prev === "environment" ? "user" : "environment")}
                className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center"
                title="Changer de caméra"
              >
                <RefreshCw size={24} className={cn(facingMode === "user" ? "rotate-180" : "")} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsScanning(!isScanning)}
              className={`p-4 rounded-xl border transition-colors flex items-center justify-center ${isScanning ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-100'}`}
              title={isScanning ? "Arrêter la caméra" : "Démarrer la caméra"}
            >
              <Camera size={24} />
            </button>
          </div>
        </form>

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
