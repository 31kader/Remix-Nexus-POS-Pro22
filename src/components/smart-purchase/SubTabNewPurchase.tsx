import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Eye, Camera, ShoppingBag, ZoomIn, Smartphone, QrCode
} from 'lucide-react';
import { Card, Button } from '../ui';
import { Product, Supplier, CompanySettings } from '../../types';
import { PurchaseCartItem } from '../../hooks/usePurchaseCart';
import { cn } from '../../lib/utils';
import { PurchaseCartTable } from './PurchaseCartTable';
import { PurchaseScanArea } from './components/PurchaseScanArea';
import { PurchaseSummaryFooter } from './components/PurchaseSummaryFooter';
import { CartonTemplate } from '../../services/cartonIntakeService';
import { 
  useNewPurchaseHardware, 
  CartonReceptionModal, 
  InvoiceSplitViewer, 
  PurchaseProductSearchBar, 
  PurchaseHeaderSection 
} from './new-purchase';

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
  const [isCartonMobileModalOpen, setIsCartonMobileModalOpen] = useState<boolean>(false);
  const [isDirectIntakeOpen, setIsDirectIntakeOpen] = useState<boolean>(false);

  // Hook matériel pour douchette et cartons mobile
  const { lanIp, effectiveCartonTemplates, handleExecuteScan } = useNewPurchaseHardware({
    products,
    cartonTemplatesProp,
    addToCart,
    setSearch,
    searchInputRef
  });

  // Gestion du preview image pour facture scannée
  useEffect(() => {
    if (scannedImageUrl) {
      setLocalPreviewUrl(scannedImageUrl);
      setShowInlineScanViewer(true);
    } else if (file && file.type.startsWith('image/')) {
      const objUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(objUrl);
      setShowInlineScanViewer(true);
      return () => URL.revokeObjectURL(objUrl);
    }
  }, [scannedImageUrl, file]);

  return (
    <div className="space-y-6">
      {/* Barre de Mode & Options Rapides */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-industrial-900/60 p-4 rounded-2xl border border-industrial-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              mode === 'manual'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-industrial-800 text-industrial-400 hover:text-white"
            )}
          >
            Saisie Manuelle
          </button>
          <button
            type="button"
            onClick={() => setMode('scan')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
              mode === 'scan'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-industrial-800 text-industrial-400 hover:text-white"
            )}
          >
            <Sparkles size={14} className="text-amber-400" />
            Scanner Facture IA / OCR
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCartonMobileModalOpen(true)}
            className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Smartphone size={15} />
            <span className="hidden sm:inline">Réception Cartons</span> Mobile
          </button>

          <label className="flex items-center gap-2 cursor-pointer bg-industrial-950 px-3 py-2 rounded-xl border border-industrial-800 text-xs font-bold text-industrial-300">
            <input
              type="checkbox"
              checked={autoMargin}
              onChange={(e) => setAutoMargin(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-industrial-800 border-industrial-700"
            />
            Marge Automatique
          </label>
        </div>
      </div>

      {/* Zone de scan ou Saisie Produits */}
      <Card className="bg-industrial-900 border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6">
          {mode === 'scan' ? (
            <PurchaseScanArea
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              isScanning={isScanning}
              isOfflineScanning={isOfflineScanning}
              processFile={processFile}
              processFileOffline={processFileOffline}
              offlineScanProgress={offlineScanProgress}
              showMockOption={showMockOption}
              simulateInvoiceScanning={simulateInvoiceScanning}
              file={file}
              scanMethod={scanMethod}
              error={error}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <PurchaseProductSearchBar
                  searchInputRef={searchInputRef}
                  search={search}
                  setSearch={setSearch}
                  filteredProducts={filteredProducts}
                  effectiveCartonTemplates={effectiveCartonTemplates}
                  handleExecuteScan={handleExecuteScan}
                  addToCart={addToCart}
                  setIsPurchaseScannerOpen={setIsPurchaseScannerOpen}
                  setEditingProduct={setEditingProduct}
                  setIsProductModalOpen={setIsProductModalOpen}
                  settings={settings}
                />
              </div>

              <PurchaseHeaderSection
                selectedSupplierId={selectedSupplierId}
                setSelectedSupplierId={setSelectedSupplierId}
                suppliers={suppliers}
                setIsQuickSupplierModalOpen={setIsQuickSupplierModalOpen}
                purchaseStatus={purchaseStatus}
                setPurchaseStatus={setPurchaseStatus}
              />
            </div>
          )}
        </div>

        {/* En-tête des articles & Visionneuse Facture */}
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
            <input 
              type="text" 
              placeholder="N° BON" 
              value={invoiceNumber} 
              onChange={(e) => setInvoiceNumber(e.target.value)} 
              className="p-2 bg-industrial-950 border border-industrial-700 rounded-xl text-white font-mono text-xs w-32 outline-none focus:ring-2 focus:ring-indigo-500/50" 
            />
            <input 
              type="date" 
              value={receptionDate} 
              onChange={(e) => setReceptionDate(e.target.value)} 
              className="p-2 bg-industrial-950 border border-industrial-700 rounded-xl text-white font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500/50" 
            />
          </div>
        </div>

        {/* Zone de tableau d'achats avec visionneuse split */}
        <div className={cn(
          localPreviewUrl && showInlineScanViewer && viewerLayout === 'split'
            ? "grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-industrial-800"
            : "flex flex-col"
        )}>
          <InvoiceSplitViewer
            localPreviewUrl={localPreviewUrl}
            showInlineScanViewer={showInlineScanViewer}
            viewerLayout={viewerLayout}
            setViewerLayout={setViewerLayout}
          />

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

        {/* Footer Résumé Financier */}
        <PurchaseSummaryFooter
          cart={cart}
          settings={settings}
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
          selectedSupplierId={selectedSupplierId}
          suppliers={suppliers}
          purchaseStatus={purchaseStatus}
        />
      </Card>

      {/* Modal Réception Cartons Mobile */}
      <CartonReceptionModal
        isOpen={isCartonMobileModalOpen}
        onClose={() => setIsCartonMobileModalOpen(false)}
        isDirectIntakeOpen={isDirectIntakeOpen}
        setIsDirectIntakeOpen={setIsDirectIntakeOpen}
        lanIp={lanIp}
        products={products}
        suppliers={suppliers}
        addToCart={addToCart}
      />
    </div>
  );
}
