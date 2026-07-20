import React, { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Search, Plus, Trash2, ShoppingBag, 
  Upload, RefreshCw, Brain, Camera, ShoppingCart, 
  Wallet, Clock, CheckCircle2, AlertCircle, FileText, 
  Edit, Printer, X, Sparkles, XCircle, Eye
} from 'lucide-react';
import { 
  Product, Supplier, InvoicePattern, Purchase, 
  PurchaseOrder, CompanySettings, SupplierPayment, Category 
} from '../types';
import { 
  cn, generateUniqueId, formatProductStock, logAction, formatSafe
} from '../lib/utils';
import { convertKeysToSnake, enqueueStockAdjustment, localDb } from '../database';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarcodeScanner } from './BarcodeScanner';
import { UpdatePricesView } from './UpdatePricesView';
import { Modal, Button, Card, ConfirmDialog, SafeImage } from './ui';
import { scanInvoice } from '../services/geminiService';
import Tesseract from 'tesseract.js';
import { toast } from 'sonner';
import { 
  extractQtyAndPrice, 
  reconcileOcrLine, 
  normalizeTextForOcr, 
  getLevenshteinDistance, 
  areWordsSimilar, 
  isFuzzyNameMatch, 
  preprocessImageForOcr, 
  cleanAndExtractOcrNumbers 
} from '../utils/ocrUtils';
import { SubTabPurchasesHistory } from './smart-purchase/SubTabPurchasesHistory';
import { SubTabDebts } from './smart-purchase/SubTabDebts';
import { SubTabSuggestions } from './smart-purchase/SubTabSuggestions';
import { SubTabNewPurchase } from './smart-purchase/SubTabNewPurchase';
import { useSmartPurchaseLogic } from './smart-purchase/useSmartPurchaseLogic';
import { SmartPurchaseModals } from './smart-purchase/SmartPurchaseModals';
import { usePurchaseCart, PurchaseCartItem } from './usePurchaseCart';

// Removed module-level AI initialization

interface SmartPurchaseProps {
  products: Product[];
  suppliers: Supplier[];
  patterns: InvoicePattern[];
  purchases: Purchase[];
  purchaseOrders: PurchaseOrder[];
  settings: CompanySettings;
  user: any;
  categories: Category[];
  supplierPayments: SupplierPayment[];
  setIsProductModalOpen: (v: boolean) => void;
  setEditingProduct: (p: Product | null) => void;
  isProductModalOpen: boolean;
  editingProduct: Product | null;
  setViewingPurchaseVoucher: (p: Purchase | null) => void;
}

export function SmartPurchase(props: SmartPurchaseProps) {
  const {
    file, setFile, isScanning, setIsScanning,
    extractedData, setExtractedData, step, setStep,
    lastPurchaseItems, setLastPurchaseItems,
    activeSubTab, setActiveSubTab, purchaseStatus, setPurchaseStatus,
    paidAmount, setPaidAmount, paymentMethod, setPaymentMethod,
    autoMargin, setAutoMargin, editingPurchaseId, setEditingPurchaseId,
    isPaymentModalOpen, setIsPaymentModalOpen,
    isPurchaseScannerOpen, setIsPurchaseScannerOpen,
    mode, setMode, scanMethod, setScanMethod,
    cart, setCart, addToCart, removeFromCart, updateQuantity, updateItemField,
    selectedSupplierId, setSelectedSupplierId,
    invoiceNumber, setInvoiceNumber, receptionDate, setReceptionDate,
    globalDiscount, setGlobalDiscount, globalTax, setGlobalTax,
    search, setSearch, deferredSearch,
    isProcessing, setIsProcessing,
    purchaseToDelete, setPurchaseToDelete,
    error, setError, showMockOption, setShowMockOption,
    isOfflineScanning, setIsOfflineScanning,
    offlineScanProgress, setOfflineScanProgress,
    rawOcrText, setRawOcrText,
    isOcrInspectorOpen, setIsOcrInspectorOpen,
    detectedOcrType, setDetectedOcrType,
    draftItemToCreate, setDraftItemToCreate,
    isQuickCreateOpen, setIsQuickCreateOpen,
    linkingItem, setLinkingItem, isLinkModalOpen, setIsLinkModalOpen,
    quickCreateSearchFilter, setQuickCreateSearchFilter,
    quickCreateForm, setQuickCreateForm,
    historySearch, setHistorySearch,
    historyStartDate, setHistoryStartDate,
    historyEndDate, setHistoryEndDate,
    paymentData, setPaymentData,
    isQuickSupplierModalOpen, setIsQuickSupplierModalOpen,
    quickSupplierData, setQuickSupplierData,
    filteredProducts, filteredPurchases,
    fileInputRef, searchInputRef, quantityInputRefs,
    linkDraftToProduct,
    openQuickCreateModal,
    handleQuickCreateSubmit,
    handlePurchaseBarcodeScan,
    handleFileChange,
    processFile,
    processFileOffline,
    simulateInvoiceScanning,
    confirmPurchase,
    resetForm,
    handleSupplierPayment,
    handleQuickSupplierSubmit,
    handleEditPurchaseRequest,
    handleDeletePurchase,
    suggestedProducts,
    addSuggestionsToCart
  } = useSmartPurchaseLogic(props);

  const { products, suppliers, patterns, purchases, purchaseOrders, settings, user, categories, supplierPayments, setIsProductModalOpen, setEditingProduct, isProductModalOpen, editingProduct, setViewingPurchaseVoucher } = props;

  if (step === 'updatePrices') {
    return (
      <div className="relative">
        <div className="blur-[3px] pointer-events-none select-none transition-all duration-500">
          <Card className="p-12 text-center space-y-6 industrial-card">
            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={48} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">Achat enregistré !</h2>
              <p className="text-industrial-500 mt-2 font-mono text-sm uppercase">Le stock a été mis à jour et l'IA a appris vos correspondances.</p>
            </div>
            <Button disabled className="mx-auto industrial-button-primary opacity-40">
              Nouvel achat
            </Button>
          </Card>
        </div>
        <UpdatePricesView 
          items={lastPurchaseItems} 
          onComplete={() => setStep('confirm')} 
          settings={settings} 
          products={products} 
        />
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <Card className="p-12 text-center space-y-6 industrial-card">
        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">Achat enregistré !</h2>
          <p className="text-industrial-500 mt-2 font-mono text-sm uppercase">Le stock a été mis à jour et l'IA a appris vos correspondances.</p>
        </div>
        <Button onClick={() => { resetForm(); setStep('upload'); setFile(null); setExtractedData(null); }} className="mx-auto industrial-button-primary">
          Nouvel achat
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight uppercase">Achats Intelligents</h3>
          <p className="text-sm text-industrial-500 uppercase tracking-widest text-[10px]">Automatisez vos entrées de stock par scan de factures.</p>
        </div>
        <div className="flex bg-industrial-900 p-1 rounded-xl border border-industrial-800 overflow-x-auto shadow-inner">
          <button 
            onClick={() => { resetForm(); setActiveSubTab('new'); }}
            className={cn(
              "px-6 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest",
              activeSubTab === 'new' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-300"
            )}
          >
            {editingPurchaseId ? "Modifier Réception" : "Nouvelle Réception"}
          </button>
          <button 
            onClick={() => setActiveSubTab('purchases')}
            className={cn(
              "px-6 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest border border-transparent",
              activeSubTab === 'purchases' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-300"
            )}
          >
            Historique & Suivi
          </button>
          <button 
            onClick={() => setActiveSubTab('debts')}
            className={cn(
              "px-6 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest border border-transparent",
              activeSubTab === 'debts' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-300"
            )}
          >
            Dettes & Versements
          </button>
          <button 
            onClick={() => setActiveSubTab('suggestions')}
            className={cn(
              "px-6 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest border border-transparent",
              activeSubTab === 'suggestions' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-industrial-500 hover:text-industrial-300"
            )}
          >
            Suggestions IA
          </button>
        </div>
      </div>

      {activeSubTab === 'new' ? (
        <SubTabNewPurchase 
          mode={mode}
          setMode={setMode}
          scanMethod={scanMethod}
          setScanMethod={setScanMethod}
          error={error}
          setError={setError}
          autoMargin={autoMargin}
          setAutoMargin={setAutoMargin}
          setEditingProduct={setEditingProduct}
          setIsProductModalOpen={setIsProductModalOpen}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          isScanning={isScanning}
          isOfflineScanning={isOfflineScanning}
          processFile={processFile}
          processFileOffline={processFileOffline}
          offlineScanProgress={offlineScanProgress}
          showMockOption={showMockOption}
          file={file}
          simulateInvoiceScanning={simulateInvoiceScanning}
          searchInputRef={searchInputRef}
          search={search}
          setSearch={setSearch}
          setIsPurchaseScannerOpen={setIsPurchaseScannerOpen}
          filteredProducts={filteredProducts}
          addToCart={addToCart}
          settings={settings}
          selectedSupplierId={selectedSupplierId}
          setSelectedSupplierId={setSelectedSupplierId}
          suppliers={suppliers}
          setIsQuickSupplierModalOpen={setIsQuickSupplierModalOpen}
          purchaseStatus={purchaseStatus}
          setPurchaseStatus={setPurchaseStatus}
          rawOcrText={rawOcrText}
          setIsOcrInspectorOpen={setIsOcrInspectorOpen}
          detectedOcrType={detectedOcrType}
          invoiceNumber={invoiceNumber}
          setInvoiceNumber={setInvoiceNumber}
          receptionDate={receptionDate}
          setReceptionDate={setReceptionDate}
          cart={cart}
          products={products}
          openQuickCreateModal={openQuickCreateModal}
          setLinkingItem={setLinkingItem}
          setIsLinkModalOpen={setIsLinkModalOpen}
          updateItemField={updateItemField}
          updateQuantity={updateQuantity}
          quantityInputRefs={quantityInputRefs}
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
        />
      ) : activeSubTab === 'purchases' ? (
        <SubTabPurchasesHistory 
          filteredPurchases={filteredPurchases}
          historySearch={historySearch}
          setHistorySearch={setHistorySearch}
          historyStartDate={historyStartDate}
          setHistoryStartDate={setHistoryStartDate}
          historyEndDate={historyEndDate}
          setHistoryEndDate={setHistoryEndDate}
          setViewingPurchaseVoucher={setViewingPurchaseVoucher}
          handleEditPurchaseRequest={handleEditPurchaseRequest}
          setPurchaseToDelete={setPurchaseToDelete}
        />
      ) : activeSubTab === 'debts' ? (
        <SubTabDebts 
          suppliers={suppliers}
          supplierPayments={supplierPayments}
          settings={settings}
          setPaymentData={setPaymentData}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
        />
      ) : activeSubTab === 'suggestions' ? (
        <SubTabSuggestions 
          suggestedProducts={suggestedProducts}
          addSuggestionsToCart={addSuggestionsToCart}
          addToCart={addToCart}
        />
      ) : null}

      <SmartPurchaseModals
        isQuickSupplierModalOpen={isQuickSupplierModalOpen}
        setIsQuickSupplierModalOpen={setIsQuickSupplierModalOpen}
        quickSupplierData={quickSupplierData}
        setQuickSupplierData={setQuickSupplierData}
        handleQuickSupplierSubmit={handleQuickSupplierSubmit}
        isPaymentModalOpen={isPaymentModalOpen}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
        paymentData={paymentData}
        setPaymentData={setPaymentData}
        handleSupplierPayment={handleSupplierPayment}
        purchaseToDelete={purchaseToDelete}
        setPurchaseToDelete={setPurchaseToDelete}
        handleDeletePurchase={handleDeletePurchase}
        isOcrInspectorOpen={isOcrInspectorOpen}
        setIsOcrInspectorOpen={setIsOcrInspectorOpen}
        detectedOcrType={detectedOcrType}
        rawOcrText={rawOcrText}
        isQuickCreateOpen={isQuickCreateOpen}
        setIsQuickCreateOpen={setIsQuickCreateOpen}
        setDraftItemToCreate={setDraftItemToCreate}
        draftItemToCreate={draftItemToCreate}
        quickCreateForm={quickCreateForm}
        setQuickCreateForm={setQuickCreateForm}
        handleQuickCreateSubmit={handleQuickCreateSubmit}
        categories={categories}
        isLinkModalOpen={isLinkModalOpen}
        setIsLinkModalOpen={setIsLinkModalOpen}
        setLinkingItem={setLinkingItem}
        linkingItem={linkingItem}
        quickCreateSearchFilter={quickCreateSearchFilter}
        setQuickCreateSearchFilter={setQuickCreateSearchFilter}
        products={products}
        linkDraftToProduct={linkDraftToProduct}
        isPurchaseScannerOpen={isPurchaseScannerOpen}
        setIsPurchaseScannerOpen={setIsPurchaseScannerOpen}
        handlePurchaseBarcodeScan={handlePurchaseBarcodeScan}
      />
    </div>
  );
}
