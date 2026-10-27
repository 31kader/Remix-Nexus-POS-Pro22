import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Printer, CheckCircle2, X, AlertCircle, ShoppingBag, 
  Upload, Sparkles, RefreshCw, Eye, Brain, FileText, Clock, Search, Camera, Package,
  ZoomIn, ZoomOut, RotateCw, Maximize2, Columns, Smartphone, QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { subscribeToCartonIntakes, resolveBarcodeOrCarton, getCartonTemplates, CartonTemplate } from '../../services/cartonIntakeService';
import { MobileCartonReception } from '../mobile/MobileCartonReception';
import { Card, Button, SafeImage } from '../ui';
import { Product, Supplier, CompanySettings } from '../../types';
import { PurchaseCartItem } from '../../hooks/usePurchaseCart';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { PurchaseCartTable } from './PurchaseCartTable';
import { PurchaseScanArea } from './components/PurchaseScanArea';
import { PurchaseSummaryFooter } from './components/PurchaseSummaryFooter';

interface SubTabNewPurchaseProps {
  mode: 'manual' | 'scan';
  setMode: (v: 'manual' | 'scan') => void;
  scanMethod: 'ai' | 'ocr';
  setScanMethod: (v: 'ai' | 'ocr') => void;
  error: string | null;
  setError: (v: string | null) => void;
  autoMargin: boolean;
  setAutoMargin: (v: boolean) => void;
  setEditingProduct: (v: any) => void;
  setIsProductModalOpen: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isScanning: boolean;
  isOfflineScanning: boolean;
  processFile: (file: File) => void;
  processFileOffline: (file: File) => void;
  offlineScanProgress: string;
  showMockOption: boolean;
  file: File | null;
  simulateInvoiceScanning: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  search: string;
  setSearch: (v: string) => void;
  setIsPurchaseScannerOpen: (v: boolean) => void;
  filteredProducts: Product[];
  cartonTemplates?: CartonTemplate[];
  addToCart: (p: any) => void;
  settings: CompanySettings;
  selectedSupplierId: string;
  setSelectedSupplierId: (v: string) => void;
  suppliers: Supplier[];
  setIsQuickSupplierModalOpen: (v: boolean) => void;
  purchaseStatus: 'draft' | 'ordered' | 'completed';
  setPurchaseStatus: (v: 'draft' | 'ordered' | 'completed') => void;
  rawOcrText: string;
  scannedImageUrl?: string;
  setIsOcrInspectorOpen: (v: boolean) => void;
  detectedOcrType: 'pos' | 'standard';
  invoiceNumber: string;
  setInvoiceNumber: (v: string) => void;
  receptionDate: string;
  setReceptionDate: (v: string) => void;
  cart: PurchaseCartItem[];
  products: Product[];
  openQuickCreateModal: (item: PurchaseCartItem) => void;
  setLinkingItem: (item: PurchaseCartItem) => void;
  setIsLinkModalOpen: (v: boolean) => void;
  updateItemField: (id: string, field: keyof PurchaseCartItem, value: any) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeFromCart: (lineId: string) => void;
  quantityInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  paidAmount: number;
  setPaidAmount: (v: number) => void;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'check';
  setPaymentMethod: (v: 'cash' | 'card' | 'transfer' | 'check') => void;
  resetForm: () => void;
  globalDiscount: number;
  setGlobalDiscount: (v: number) => void;
  globalTax: number;
  setGlobalTax: (v: number) => void;
  isProcessing: boolean;
  confirmPurchase: () => void;
  editingPurchaseId: string | null;
}

export function SubTabNewPurchase({
  mode, setMode, scanMethod, setScanMethod, error, setError, autoMargin, setAutoMargin,
  setEditingProduct, setIsProductModalOpen, fileInputRef, handleFileChange, isScanning,
  isOfflineScanning, processFile, processFileOffline, offlineScanProgress, showMockOption,
  file, simulateInvoiceScanning, searchInputRef, search, setSearch, setIsPurchaseScannerOpen,
  filteredProducts, cartonTemplates: cartonTemplatesProp = [], addToCart, settings, selectedSupplierId, setSelectedSupplierId, suppliers,
  setIsQuickSupplierModalOpen, purchaseStatus, setPurchaseStatus, rawOcrText, scannedImageUrl, setIsOcrInspectorOpen,
  detectedOcrType, invoiceNumber, setInvoiceNumber, receptionDate, setReceptionDate,
  cart, products, openQuickCreateModal, setLinkingItem, setIsLinkModalOpen,
  updateItemField, updateQuantity, removeFromCart, quantityInputRefs, paidAmount, setPaidAmount,
  paymentMethod, setPaymentMethod, resetForm, globalDiscount, setGlobalDiscount,
  globalTax, setGlobalTax, isProcessing, confirmPurchase, editingPurchaseId
}: SubTabNewPurchaseProps) {
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [showInlineScanViewer, setShowInlineScanViewer] = useState<boolean>(true);
  const [viewerLayout, setViewerLayout] = useState<'split' | 'top'>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(150);
  const [rotation, setRotation] = useState<number>(0);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [isCartonMobileModalOpen, setIsCartonMobileModalOpen] = useState<boolean>(false);
  const [isDirectIntakeOpen, setIsDirectIntakeOpen] = useState<boolean>(false);
  const [lanIp, setLanIp] = useState<string>('');

  useEffect(() => {
    fetch('/api/network-ip')
      .then(r => r.json())
      .then(data => {
        if (data?.ip) setLanIp(data.ip);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCartonIntakes((item) => {
      addToCart({
        productId: item.productId,
        productName: item.productName,
        quantity: item.totalUnits,
        costPrice: item.unitCostPrice,
        cartonCount: item.cartonCount,
        unitsPerCarton: item.unitsPerCarton,
        cartonCostPrice: item.cartonCostPrice,
        cartonPhotoUrl: item.cartonPhotoUrl,
        imageUrl: item.cartonPhotoUrl
      });
      toast.success(`📦 Carton reçu du mobile : ${item.productName} (${item.cartonCount} cartons = ${item.totalUnits} pcs) ajouté au panier !`);
    });
    return () => unsubscribe();
  }, [addToCart]);

  const [localCartonTemplates, setLocalCartonTemplates] = useState<CartonTemplate[]>([]);
  useEffect(() => {
    let isMounted = true;
    getCartonTemplates().then(list => {
      if (isMounted && Array.isArray(list)) setLocalCartonTemplates(list);
    });
    return () => { isMounted = false; };
  }, []);

  const effectiveCartonTemplates = cartonTemplatesProp && cartonTemplatesProp.length > 0
    ? cartonTemplatesProp
    : localCartonTemplates;

  const handleExecuteScan = React.useCallback((rawCode: string): boolean => {
    if (!rawCode || !rawCode.trim()) return false;
    const res = resolveBarcodeOrCarton(rawCode, products, effectiveCartonTemplates);
    if (res?.type === 'carton') {
      addToCart({
        productId: res.product.id,
        productName: res.product.name,
        cartonCount: res.cartonCount,
        unitsPerCarton: res.unitsPerCarton,
        cartonCostPrice: res.cartonCostPrice,
        costPrice: res.unitCostPrice,
        cartonPhotoUrl: res.cartonPhotoUrl,
        imageUrl: res.cartonPhotoUrl || res.product.imageUrl
      });
      setSearch('');
      toast.success(`📦 Carton ajouté : ${res.product.name} (${res.cartonCount} ct × ${res.unitsPerCarton} = ${res.cartonCount * res.unitsPerCarton} pcs)`);
      return true;
    } else if (res?.type === 'product') {
      addToCart({ ...res.product, quantity: res.multiplier || 1 });
      setSearch('');
      toast.success(`Produit ajouté : ${res.product.name}`);
      return true;
    }
    return false;
  }, [products, effectiveCartonTemplates, addToCart, setSearch]);

  const scannerBuffer = React.useRef<{ text: string; lastTime: number }>({ text: '', lastTime: 0 });

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target === searchInputRef.current) return;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (isInput && (target?.getAttribute('type') === 'number' || target?.classList.contains('qty-input') || target?.classList.contains('price-input'))) {
        return;
      }

      const now = Date.now();
      const diff = now - scannerBuffer.current.lastTime;
      if (diff > 150) {
        scannerBuffer.current.text = '';
      }
      scannerBuffer.current.lastTime = now;

      if (e.key === 'Enter') {
        if (scannerBuffer.current.text.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          const scanned = scannerBuffer.current.text.trim();
          scannerBuffer.current.text = '';
          const handled = handleExecuteScan(scanned);
          if (!handled) {
            toast.error(`Aucun produit ni carton trouvé pour : ${scanned}`);
          }
        }
      } else if (e.key.length === 1) {
        scannerBuffer.current.text += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [handleExecuteScan, searchInputRef]);

  useEffect(() => {
    if (scannedImageUrl) {
      setLocalPreviewUrl(scannedImageUrl);
      setShowInlineScanViewer(true);
    } else if (file && file.type.startsWith('image/')) {
      const objUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(objUrl);
      setShowInlineScanViewer(true);
      return () => URL.revokeObjectURL(objUrl);
    } else if (!file && !scannedImageUrl) {
      setLocalPreviewUrl('');
    }
  }, [file, scannedImageUrl]);
  return (
        <div className="space-y-6">
          <Card className="p-0 industrial-card overflow-hidden">
            <div className="p-6 bg-industrial-800/50 border-b border-industrial-800">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex bg-industrial-950 p-1 rounded-xl border border-industrial-800 flex-wrap md:flex-nowrap gap-1">
                  <button 
                    type="button"
                    onClick={() => { setMode('manual'); setError(null); }} 
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none", 
                      mode === 'manual' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-300"
                    )}
                  >
                    Saisie Manuelle
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setMode('scan'); setScanMethod('ai'); setError(null); }} 
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none", 
                      (mode === 'scan' && scanMethod === 'ai') ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-industrial-500 hover:text-industrial-100"
                    )}
                  >
                    <Camera size={13} className={cn((mode === 'scan' && scanMethod === 'ai') ? "text-violet-200" : "")} />
                    📸 Scanner Photo Facture (IA / OCR Local)
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setMode('scan'); setScanMethod('ocr'); setError(null); }} 
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none", 
                      (mode === 'scan' && scanMethod === 'ocr') ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-industrial-500 hover:text-industrial-100"
                    )}
                  >
                    <FileText size={12} className={cn((mode === 'scan' && scanMethod === 'ocr') ? "text-emerald-300" : "")} />
                    📂 Importer Fichier (Excel, CSV, PDF)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsCartonMobileModalOpen(true)} 
                    className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30"
                    title="Connecter un smartphone Android pour photographier les cartons physiques et approvisionner directement"
                  >
                    <Package size={13} className="text-amber-400" />
                    <span>📱 Agent Mobile (Réception Cartons)</span>
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">Marge Auto.</span>
                    <button 
                      onClick={() => setAutoMargin(!autoMargin)}
                      className={cn("w-10 h-5 rounded-full relative transition-all shadow-inner", autoMargin ? "bg-emerald-500" : "bg-industrial-700")}
                    >
                      <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-md", autoMargin ? "left-5" : "left-1")} />
                    </button>
                  </div>

                  <Button 
                    type="button"
                    onClick={() => {
                      const lowStockProducts = (products || []).filter(p => {
                        const curStock = p.stock || 0;
                        const min = p.minStock || 5;
                        const matchSupplier = !selectedSupplierId || p.supplier === selectedSupplierId || (p as any).supplierId === selectedSupplierId;
                        return curStock <= min && matchSupplier;
                      });

                      if (lowStockProducts.length === 0) {
                        toast.info("Aucun article en rupture ou alerte de stock pour ce filtre.");
                        return;
                      }

                      let addedCount = 0;
                      lowStockProducts.forEach(p => {
                        const curStock = p.stock || 0;
                        const min = p.minStock || 5;
                        const targetStock = Math.max(min * 2, 10);
                        const neededQty = Math.max(1, targetStock - curStock);
                        addToCart({
                          ...p,
                          quantity: neededQty
                        } as any);
                        addedCount++;
                      });

                      toast.success(`⚡ ${addedCount} articles en alerte de stock ajoutés au bon de commande !`);
                    }}
                    size="sm" 
                    className="industrial-button-primary bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-black py-2 px-3.5 shadow-none text-[10px] flex items-center gap-1.5 cursor-pointer"
                    title="Générer automatiquement le bon de commande pour tous les articles sous leur seuil d'alerte (minStock)"
                  >
                    <Package size={13} />
                    <span>Réapprovisionner Alertes Stock</span>
                  </Button>

                  <Button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} size="sm" className="industrial-button-primary bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-black py-2 px-3.5 shadow-none text-[10px] cursor-pointer">
                    <Plus size={14} className="mr-1.5" /> Nouveau Produit
                  </Button>
                </div>
              </div>

              {/* Mode Selection */}
              {mode === 'scan' ? (
                <PurchaseScanArea 
                  scanMethod={scanMethod}
                  isScanning={isScanning}
                  isOfflineScanning={isOfflineScanning}
                  offlineScanProgress={offlineScanProgress}
                  error={error}
                  showMockOption={showMockOption}
                  file={file}
                  fileInputRef={fileInputRef}
                  handleFileChange={handleFileChange}
                  processFile={processFile}
                  processFileOffline={processFileOffline}
                  simulateInvoiceScanning={simulateInvoiceScanning}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest block mb-2 px-1">Rechercher Article (F3)</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-industrial-500" size={18} />
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="NOM, SKU, CODE BARRE..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          const val = e.currentTarget.value;
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (val.trim() !== '') {
                              const handled = handleExecuteScan(val);
                              if (!handled) {
                                if (filteredProducts.length > 0) {
                                  addToCart(filteredProducts[0]);
                                  setSearch('');
                                } else {
                                  toast.error(`Aucun produit ni carton trouvé pour : ${val}`);
                                }
                              }
                              
                              setTimeout(() => {
                                setSearch('');
                              }, 50);
                            }
                          }
                        }}
                        className="w-full pl-12 pr-12 py-3 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl bg-industrial-950 text-white font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                      />
                      <button 
                        type="button" 
                        onClick={() => setIsPurchaseScannerOpen(true)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-indigo-400 transition-colors"
                      >
                        <Camera size={20} />
                      </button>

                      {/* Search Results Dropdown */}
                      <AnimatePresence>
                        {search && filteredProducts.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute z-[100] left-0 right-0 mt-2 bg-industrial-950 border border-industrial-700 rounded-xl shadow-md overflow-hidden max-h-80 overflow-y-auto"
                          >
                            {filteredProducts.map(p => {
                              const cartonTpl = effectiveCartonTemplates.find(t => t.productId === p.id);
                              return (
                                <div
                                  key={p.id}
                                  className="w-full flex items-center gap-4 p-3.5 hover:bg-industrial-800 transition-colors border-b border-industrial-800 last:border-0 text-left group"
                                >
                                  <div 
                                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                                    onClick={() => {
                                      addToCart(p);
                                      setSearch('');
                                    }}
                                  >
                                    <div className="w-12 h-12 rounded-lg bg-industrial-900 border border-industrial-800 flex items-center justify-center overflow-hidden shrink-0">
                                      {(() => {
                                        const imgSource = (cartonTpl && cartonTpl.cartonPhotoUrl) || p.imageUrl || (p.imageUrls && p.imageUrls[0]) || p.image || '';
                                        return imgSource ? (
                                          <SafeImage 
                                            src={imgSource} 
                                            className="w-full h-full object-cover" 
                                            fallback={<Package size={20} className="text-industrial-600"/>}
                                          />
                                        ) : <Package size={20} className="text-industrial-600"/>;
                                      })()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-black text-white uppercase truncate tracking-tight group-hover:text-indigo-400 transition-colors">{p.name}</p>
                                        {cartonTpl && (
                                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                            📦 Carton ({cartonTpl.unitsPerCarton} pcs)
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] font-mono text-industrial-500 uppercase tracking-widest">
                                        {p.sku || p.id} {cartonTpl?.barcode ? `• Code-barres Carton: ${cartonTpl.barcode}` : (p.barcode ? `• ${p.barcode}` : '')}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="font-black text-indigo-400 font-mono text-xs">{Number(p.costPrice ?? p.price ?? 0).toFixed(2)} {settings?.currency || 'DA'}</p>
                                      <p className="text-[10px] font-black text-industrial-600 uppercase">Stock: {p.stock ?? 0}</p>
                                    </div>
                                  </div>

                                  {cartonTpl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart({
                                          productId: p.id,
                                          productName: p.name,
                                          cartonCount: 1,
                                          unitsPerCarton: cartonTpl.unitsPerCarton,
                                          cartonCostPrice: cartonTpl.cartonCostPrice,
                                          costPrice: cartonTpl.unitCostPrice || p.costPrice || 0,
                                          cartonPhotoUrl: cartonTpl.cartonPhotoUrl,
                                          imageUrl: cartonTpl.cartonPhotoUrl || p.imageUrl
                                        });
                                        setSearch('');
                                        toast.success(`📦 1 Carton ajouté : ${p.name} (${cartonTpl.unitsPerCarton} pcs)`);
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-colors shadow-sm cursor-pointer"
                                      title="Ajouter directement sous forme de Carton complet"
                                    >
                                      📦 +1 Carton
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                        {search && filteredProducts.length === 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute z-[100] left-0 right-0 mt-2 p-5 bg-industrial-950 border border-industrial-700 rounded-xl shadow-md text-center"
                          >
                            <p className="text-industrial-500 font-black uppercase text-xs tracking-normal">Aucun produit trouvé</p>
                            <button 
                              onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                              className="mt-4 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:underline"
                            >
                              + Créer ce produit
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest block mb-2 px-1">Fournisseur</label>
                    <div className="flex items-center gap-2">
                      <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="w-full flex-1 p-3 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl bg-industrial-950 text-white text-sm font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-inner">
                        <option value="">SÉLECTIONNER...</option>
                        {(suppliers || []).filter(Boolean).map(s => (
                          <option key={s.id} value={s.id}>
                            {String(s.name || (s as any).company || (s as any).supplier_name || 'FOURNISSEUR').toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => setIsQuickSupplierModalOpen(true)} className="p-3 bg-industrial-800 text-indigo-400 rounded-xl hover:bg-industrial-700 hover:text-indigo-300 transition-all border border-industrial-800 active:scale-95"><Plus size={20} /></button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-industrial-500 uppercase tracking-widest block mb-2 px-1">Statut Initial</label>
                    <select value={purchaseStatus} onChange={(e) => setPurchaseStatus(e.target.value as any)} className="w-full p-3 border border-industrial-800 hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl bg-industrial-950 text-white text-sm font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-inner">
                      <option value="draft">BROUILLON</option>
                      <option value="ordered">COMMANDÉ</option>
                      <option value="completed">REÇU (MISE EN STOCK)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-industrial-900 p-6 border-b border-industrial-800 flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="font-black flex items-center gap-3 text-sm text-white uppercase tracking-widest">
                  <ShoppingBag size={20} className="text-indigo-500"/> Articles dans le Bon
                </h4>
                {localPreviewUrl && (
                  <button
                    type="button"
                    onClick={() => setShowInlineScanViewer(!showInlineScanViewer)}
                    className={cn(
                      "py-1.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md",
                      showInlineScanViewer
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : "bg-industrial-800 border-industrial-700 text-industrial-300 hover:text-white"
                    )}
                  >
                    <ZoomIn size={13} />
                    {showInlineScanViewer ? "Masquer Photo du Bon" : "🔍 Consulter Photo Scannée sur Place (Zoom)"}
                  </button>
                )}
                {rawOcrText && (
                  <button
                    type="button"
                    onClick={() => setIsOcrInspectorOpen(true)}
                    className="py-1.5 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Eye size={12} className="text-indigo-400 animate-pulse" />
                    Détails du Fichier / Colonnes
                  </button>
                )}
              </div>
              <div className="flex gap-4 items-center">
                <input type="text" placeholder="N° BON" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="p-2 bg-industrial-950 border border-industrial-700 rounded-xl text-white font-mono text-xs w-32 outline-none focus:ring-2 focus:ring-indigo-500/50" />
                <input type="date" value={receptionDate} onChange={(e) => setReceptionDate(e.target.value)} className="p-2 bg-industrial-950 border border-industrial-700 rounded-xl text-white font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
            </div>

            <div className={cn(
              localPreviewUrl && showInlineScanViewer && viewerLayout === 'split'
                ? "grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-industrial-800"
                : "flex flex-col"
            )}>
              {localPreviewUrl && showInlineScanViewer && (
                <div className={cn(
                  "bg-industrial-950/90 flex flex-col border-b border-industrial-800",
                  viewerLayout === 'split' ? "xl:col-span-5 xl:border-b-0" : "w-full"
                )}>
                  {/* Barre d'outils Zoom & Inspection sur place */}
                  <div className="p-3 bg-industrial-900/90 border-b border-industrial-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                        <Camera size={13} /> Visionneuse Facture sur Place
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-black">
                        {zoomLevel}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setZoomLevel(z => Math.max(50, z - 25))}
                        className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-white border border-industrial-700 cursor-pointer"
                        title="Zoom Arrière (-25%)"
                      >
                        <ZoomOut size={14} />
                      </button>
                      {[100, 150, 200, 300].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setZoomLevel(pct)}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-mono font-black border cursor-pointer transition-all",
                            zoomLevel === pct
                              ? "bg-indigo-600 text-white border-indigo-500"
                              : "bg-industrial-800 text-industrial-300 border-industrial-700 hover:text-white"
                          )}
                        >
                          {pct}%
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setZoomLevel(z => Math.min(400, z + 25))}
                        className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-white border border-industrial-700 cursor-pointer"
                        title="Zoom Avant (+25%)"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRotation(r => (r + 90) % 360)}
                        className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-amber-400 border border-industrial-700 cursor-pointer"
                        title="Pivoter l'image de 90°"
                      >
                        <RotateCw size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHighContrast(!highContrast)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[9px] font-black uppercase border cursor-pointer transition-all",
                          highContrast
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-industrial-800 text-industrial-400 border-industrial-700 hover:text-white"
                        )}
                        title="Accentuer la netteté des chiffres, points et virgules"
                      >
                        Netteté N&B
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewerLayout(viewerLayout === 'split' ? 'top' : 'split')}
                        className="px-2 py-1 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-indigo-300 border border-industrial-700 text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer"
                        title="Basculer entre affichage Côte-à-Côte et Pleine Largeur"
                      >
                        <Columns size={12} />
                        {viewerLayout === 'split' ? 'Pleine Largeur' : 'Côte-à-Côte'}
                      </button>
                    </div>
                  </div>

                  {/* Zone scrollable avec Zoom haute précision */}
                  <div
                    className="overflow-auto bg-black/90 p-3 relative select-none"
                    style={{ maxHeight: viewerLayout === 'split' ? '640px' : '480px', minHeight: '340px' }}
                    onWheel={(e) => {
                      if (e.ctrlKey) {
                        e.preventDefault();
                        setZoomLevel(z => Math.min(400, Math.max(50, z + (e.deltaY < 0 ? 20 : -20))));
                      }
                    }}
                  >
                    <div className="inline-block min-w-full text-center">
                      <SafeImage
                        src={localPreviewUrl}
                        alt="Bon d'achat scanné"
                        style={{
                          width: `${zoomLevel}%`,
                          maxWidth: 'none',
                          transform: `rotate(${rotation}deg)`,
                          transformOrigin: 'center center',
                          filter: highContrast ? 'grayscale(100%) contrast(185%) brightness(108%)' : 'none',
                          transition: 'width 0.15s ease-out, filter 0.15s ease'
                        }}
                        className="mx-auto rounded-lg shadow-2xl border border-industrial-800"
                      />
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-industrial-900/60 border-t border-industrial-800 text-[10px] text-industrial-400 flex items-center justify-between">
                    <span>💡 Astuce : Utilisez les boutons <strong>150% / 200% / 300%</strong> ou <strong>Ctrl + Molette</strong> pour zoomer sur les prix et virgules.</span>
                    <span className="text-emerald-400 font-bold">🧠 Liaisons articles mémorisées auto.</span>
                  </div>
                </div>
              )}

              <div className={cn(
                localPreviewUrl && showInlineScanViewer && viewerLayout === 'split' ? "xl:col-span-7" : "w-full"
              )}>
                <PurchaseCartTable
                  cart={cart}
                  products={products}
                  settings={settings}
                  selectedSupplierId={selectedSupplierId}
                  openQuickCreateModal={openQuickCreateModal}
                  setLinkingItem={setLinkingItem}
                  setIsLinkModalOpen={setIsLinkModalOpen}
                  updateItemField={updateItemField}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                  quantityInputRefs={quantityInputRefs}
                  setEditingProduct={setEditingProduct}
                  setIsProductModalOpen={setIsProductModalOpen}
                />
              </div>
            </div>

            {cart.length > 0 && (
              <PurchaseSummaryFooter
                cart={cart}
                settings={settings}
                selectedSupplierId={selectedSupplierId}
                suppliers={suppliers}
                paidAmount={paidAmount}
                setPaidAmount={setPaidAmount}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                resetForm={resetForm}
                globalDiscount={globalDiscount}
                setGlobalDiscount={setGlobalDiscount}
                globalTax={globalTax}
                setGlobalTax={setGlobalTax}
                isProcessing={isProcessing}
                confirmPurchase={confirmPurchase}
                editingPurchaseId={editingPurchaseId}
                purchaseStatus={purchaseStatus}
              />
            )}
          </Card>

        {/* Modale QR Code Agent Mobile (Réception Cartons) */}
        {isCartonMobileModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="relative max-w-md w-full bg-industrial-900 border border-industrial-700 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-industrial-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      Agent Mobile : Réception Cartons
                    </h3>
                    <p className="text-[11px] text-industrial-400">
                      Application smartphone Android pour le dépôt
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartonMobileModalOpen(false)}
                  className="text-industrial-400 hover:text-white p-1 rounded-lg hover:bg-industrial-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center mx-auto shadow-inner w-56 h-56">
                <QRCodeSVG
                  value={`http://${lanIp || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1')}:${typeof window !== 'undefined' ? (window.location.port || '3000') : '3000'}/#carton-reception`}
                  size={192}
                  level="M"
                  includeMargin={true}
                />
              </div>

              {/* URL & Instructions */}
              <div className="space-y-2 text-center">
                <p className="text-xs text-industrial-300 font-medium">
                  Scannez ce QR Code avec l'appareil photo du smartphone Android de l'agent :
                </p>
                <div className="p-2 rounded-lg bg-industrial-950 border border-industrial-800 text-[11px] font-mono text-amber-400 select-all break-all">
                  {`http://${lanIp || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1')}:${typeof window !== 'undefined' ? (window.location.port || '3000') : '3000'}/#carton-reception`}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-industrial-950/70 border border-industrial-800/80 space-y-1.5 text-[11px] text-industrial-400">
                <p className="flex items-center gap-1.5 text-industrial-200 font-bold">
                  <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                  1. Aucun scan de code-barres requis
                </p>
                <p className="flex items-center gap-1.5 text-industrial-200 font-bold">
                  <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                  2. L'agent prend la photo du carton physique (12 pcs)
                </p>
                <p className="flex items-center gap-1.5 text-industrial-200 font-bold">
                  <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                  3. Le produit et son prix sortent directement dans ce panier !
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCartonMobileModalOpen(false);
                    setIsDirectIntakeOpen(true);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-industrial-950 font-black text-xs uppercase tracking-wider transition-all"
                >
                  Tester sur cet écran
                </button>
                <button
                  type="button"
                  onClick={() => setIsCartonMobileModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de test direct Réception Cartons */}
        {isDirectIntakeOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="relative max-w-lg w-full max-h-[92vh] overflow-y-auto rounded-3xl bg-industrial-950 border border-industrial-700 shadow-2xl">
              <MobileCartonReception
                products={products}
                suppliers={suppliers}
                onBackToPos={() => setIsDirectIntakeOpen(false)}
                onAddToCartDirectly={(item) => {
                  addToCart(item);
                  setIsDirectIntakeOpen(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
  );
}
