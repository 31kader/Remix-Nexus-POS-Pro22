import { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { usePurchaseCart } from '../../hooks/usePurchaseCart';
import { Product, Supplier, InvoicePattern, Purchase, PurchaseOrder, CompanySettings, SupplierPayment, Category } from '../../types';
import { useSmartPurchaseScanner } from './useSmartPurchaseScanner';
import { useSmartPurchaseQuickCreate } from './useSmartPurchaseQuickCreate';
import { useSmartPurchaseHistoryState } from './useSmartPurchaseHistoryState';
import { usePurchaseShortcuts } from './usePurchaseShortcuts';
import { getCartonTemplates, CartonTemplate } from '../../services/cartonIntakeService';
import { loadPurchaseDraft, usePurchaseDraftAutoSave } from './usePurchaseDraftStorage';
import { useFilteredPurchaseProducts } from './useFilteredPurchaseProducts';
import { handlePurchaseBarcodeResolution } from './handlePurchaseBarcodeResolution';
import { useSmartPurchaseExecution } from './useSmartPurchaseExecution';

interface UseSmartPurchaseLogicProps {
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
  setViewingPurchaseVoucher: (p: Purchase | null) => void;
}

export function useSmartPurchaseLogic({
  products, suppliers, patterns, purchases, purchaseOrders, settings, user,
  categories, supplierPayments, setIsProductModalOpen, setEditingProduct,
  setViewingPurchaseVoucher
}: UseSmartPurchaseLogicProps) {
  const draft = useMemo(() => loadPurchaseDraft(), []);

  const { cart, setCart, addToCart, removeFromCart, updateQuantity, updateItemField } = usePurchaseCart(draft?.cart || []);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(draft?.selectedSupplierId || '');
  const [invoiceNumber, setInvoiceNumber] = useState(draft?.invoiceNumber || '');
  const [receptionDate, setReceptionDate] = useState<string>(draft?.receptionDate || new Date().toISOString().split('T')[0]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(draft?.globalDiscount !== undefined ? draft.globalDiscount : 0);
  const [globalTax, setGlobalTax] = useState<number>(draft?.globalTax !== undefined ? draft.globalTax : 0);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);
  const initialStep = (draft?.step === 'review' && Array.isArray(draft?.cart) && draft.cart.length > 0) ? 'review' : 'upload';
  const [step, setStep] = useState<'upload' | 'review' | 'confirm' | 'updatePrices'>(initialStep);
  const [lastPurchaseItems, setLastPurchaseItems] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'new' | 'purchases' | 'debts' | 'payments' | 'shortages'>((draft?.activeSubTab === 'suggestions' ? 'new' : draft?.activeSubTab) || 'new');
  const [purchaseStatus, setPurchaseStatus] = useState<'draft' | 'ordered' | 'completed'>(draft?.purchaseStatus || 'completed');
  const [paidAmount, setPaidAmount] = useState<number>(draft?.paidAmount !== undefined ? draft.paidAmount : 0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'check'>(draft?.paymentMethod || 'cash');
  const [autoMargin, setAutoMargin] = useState(true);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(draft?.editingPurchaseId || null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPurchaseScannerOpen, setIsPurchaseScannerOpen] = useState(false);
  const [mode, setMode] = useState<'manual' | 'scan'>(draft?.mode || 'manual');
  const [scanMethod, setScanMethod] = useState<'ai' | 'ocr'>(draft?.scanMethod || 'ai');
  const [cartonTemplates, setCartonTemplates] = useState<CartonTemplate[]>([]);

  useEffect(() => {
    let isMounted = true;
    getCartonTemplates().then(list => {
      if (isMounted && Array.isArray(list)) {
        setCartonTemplates(list);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Scanner sub-hook integration
  const scanner = useSmartPurchaseScanner({
    products,
    suppliers,
    patterns,
    user,
    setCart,
    setSelectedSupplierId,
    setInvoiceNumber,
    setReceptionDate,
    setMode,
    scanMethod,
    selectedSupplierId,
    invoiceNumber,
  });

  // Quick create sub-hook integration
  const quickCreate = useSmartPurchaseQuickCreate({
    categories,
    user,
    setCart,
  });

  // History sub-hook integration
  const historyState = useSmartPurchaseHistoryState(purchases);

  const {
    file, setFile,
    isScanning, setIsScanning,
    extractedData, setExtractedData,
    error, setError,
    showMockOption, setShowMockOption,
    isOfflineScanning, setIsOfflineScanning,
    offlineScanProgress, setOfflineScanProgress,
    rawOcrText, setRawOcrText,
    isOcrInspectorOpen, setIsOcrInspectorOpen,
    detectedOcrType, setDetectedOcrType,
    fileInputRef,
    handleFileChange,
    processFile,
    processFileOffline,
    simulateInvoiceScanning,
  } = scanner;

  const {
    draftItemToCreate, setDraftItemToCreate,
    isQuickCreateOpen, setIsQuickCreateOpen,
    linkingItem, setLinkingItem,
    isLinkModalOpen, setIsLinkModalOpen,
    quickCreateSearchFilter, setQuickCreateSearchFilter,
    quickCreateForm, setQuickCreateForm,
    linkDraftToProduct,
    openQuickCreateModal,
    handleQuickCreateSubmit,
  } = quickCreate;

  const quantityInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Auto-save draft hook
  usePurchaseDraftAutoSave({
    step, activeSubTab, purchaseStatus, paidAmount, paymentMethod,
    editingPurchaseId, mode, scanMethod, cart, selectedSupplierId, invoiceNumber,
    receptionDate, globalDiscount, globalTax
  });

  const [paymentData, setPaymentData] = useState({ supplierId: '', amount: 0, method: 'cash' as const, note: '', date: new Date().toISOString() });
  const [isQuickSupplierModalOpen, setIsQuickSupplierModalOpen] = useState(false);
  const [quickSupplierData, setQuickSupplierData] = useState({ name: '', phone: '', email: '' });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useFilteredPurchaseProducts(products, deferredSearch, cartonTemplates);

  const handlePurchaseBarcodeScan = (barcode: string) => {
    handlePurchaseBarcodeResolution(barcode, products, cartonTemplates, addToCart, setIsPurchaseScannerOpen);
  };

  // Execution actions sub-hook
  const {
    resetForm,
    handleEditPurchaseRequest,
    handleQuickSupplierSubmit,
    confirmPurchase,
    handleSupplierPayment,
    handleReceiveOrder,
    handleDeletePurchase
  } = useSmartPurchaseExecution({
    cart,
    setCart,
    selectedSupplierId,
    setSelectedSupplierId,
    invoiceNumber,
    setInvoiceNumber,
    receptionDate,
    setReceptionDate,
    globalDiscount,
    setGlobalDiscount,
    globalTax,
    setGlobalTax,
    purchaseStatus,
    setPurchaseStatus,
    paidAmount,
    setPaidAmount,
    editingPurchaseId,
    setEditingPurchaseId,
    setMode,
    setStep,
    setLastPurchaseItems,
    setActiveSubTab,
    setIsProcessing,
    setPurchaseToDelete,
    setIsPaymentModalOpen,
    setPaymentData,
    quickSupplierData,
    setQuickSupplierData,
    setIsQuickSupplierModalOpen,
    suppliers,
    products,
    patterns,
    purchases,
    settings,
    extractedData,
    autoMargin,
  });

  // Shortcuts
  usePurchaseShortcuts({
    activeSubTab,
    setActiveSubTab,
    mode,
    setMode,
    searchInputRef,
    cart,
    quantityInputRefs,
    confirmPurchase
  });

  return {
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
    
    // History delegate
    historySearch: historyState.historySearch,
    setHistorySearch: historyState.setHistorySearch,
    historyStartDate: historyState.historyStartDate,
    setHistoryStartDate: historyState.setHistoryStartDate,
    historyEndDate: historyState.historyEndDate,
    setHistoryEndDate: historyState.setHistoryEndDate,
    historySupplierId: historyState.historySupplierId,
    setHistorySupplierId: historyState.setHistorySupplierId,
    historyPaymentStatus: historyState.historyPaymentStatus,
    setHistoryPaymentStatus: historyState.setHistoryPaymentStatus,
    historyReceiptStatus: historyState.historyReceiptStatus,
    setHistoryReceiptStatus: historyState.setHistoryReceiptStatus,
    historyQuickDate: historyState.historyQuickDate,
    setHistoryQuickDate: historyState.setHistoryQuickDate,
    historyMinAmount: historyState.historyMinAmount,
    setHistoryMinAmount: historyState.setHistoryMinAmount,
    historyMaxAmount: historyState.historyMaxAmount,
    setHistoryMaxAmount: historyState.setHistoryMaxAmount,
    historySortBy: historyState.historySortBy,
    setHistorySortBy: historyState.setHistorySortBy,
    isAdvancedFiltersOpen: historyState.isAdvancedFiltersOpen,
    setIsAdvancedFiltersOpen: historyState.setIsAdvancedFiltersOpen,
    setQuickDatePeriod: historyState.setQuickDatePeriod,
    resetHistoryFilters: historyState.resetHistoryFilters,
    activeHistoryFiltersCount: historyState.activeHistoryFiltersCount,
    purchasesSummary: historyState.purchasesSummary,
    filteredPurchases: historyState.filteredPurchases,
    
    paymentData, setPaymentData,
    isQuickSupplierModalOpen, setIsQuickSupplierModalOpen,
    quickSupplierData, setQuickSupplierData,
    
    filteredProducts, cartonTemplates,
    
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
    handleDeletePurchase
  };
}
