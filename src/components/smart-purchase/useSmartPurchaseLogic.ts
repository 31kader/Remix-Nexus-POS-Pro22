import { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { toast } from 'sonner';
import { convertKeysToSnake } from '../../lib/db-converters';
import { enqueueStockAdjustment } from '../../services/SyncService';
import { localDb } from '../../services/LocalDatabase';
import { supabase } from '../../supabase';
import { generateUniqueId, logAction } from '../../lib/utils';
import { usePurchaseCart, PurchaseCartItem } from '../usePurchaseCart';
import { Product, Supplier, InvoicePattern, Purchase, PurchaseOrder, CompanySettings, SupplierPayment, Category } from '../../types';
import { useSmartPurchaseScanner } from './useSmartPurchaseScanner';
import { useSmartPurchaseQuickCreate } from './useSmartPurchaseQuickCreate';
import {
  savePurchaseDb,
  handleSupplierPaymentDb,
  handleReceiveOrderDb,
  handleDeletePurchaseDb,
  handleQuickSupplierSubmitDb
} from './purchaseDbOperations';
import { usePurchaseShortcuts } from './usePurchaseShortcuts';
import {
  filterPurchases,
  filterProducts,
  buildCartFromPurchaseItems
} from './purchaseHelpers';

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
  const draft = useMemo(() => {
    try {
      const saved = localStorage.getItem('nexus_purchase_draft');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // 🛡️ Sécurité : Si le draft est dans une étape de finalisation, le purger pour ne jamais bloquer l'UI
      if (parsed?.step === 'updatePrices' || parsed?.step === 'confirm') {
        localStorage.removeItem('nexus_purchase_draft');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

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
  const [activeSubTab, setActiveSubTab] = useState<'new' | 'purchases' | 'debts' | 'payments'>((draft?.activeSubTab === 'suggestions' ? 'new' : draft?.activeSubTab) || 'new');
  const [purchaseStatus, setPurchaseStatus] = useState<'draft' | 'ordered' | 'completed'>(draft?.purchaseStatus || 'completed');
  const [paidAmount, setPaidAmount] = useState<number>(draft?.paidAmount !== undefined ? draft.paidAmount : 0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'check'>(draft?.paymentMethod || 'cash');
  const [autoMargin, setAutoMargin] = useState(true);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(draft?.editingPurchaseId || null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPurchaseScannerOpen, setIsPurchaseScannerOpen] = useState(false);
  const [mode, setMode] = useState<'manual' | 'scan'>(draft?.mode || 'manual');
  const [scanMethod, setScanMethod] = useState<'ai' | 'ocr'>(draft?.scanMethod || 'ai');

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

  useEffect(() => {
    // Ne jamais sauvegarder d'étapes terminales de mise à jour des prix dans le draft
    if (step === 'updatePrices' || step === 'confirm') {
      try {
        localStorage.removeItem('nexus_purchase_draft');
      } catch (e) {
        console.error("Error removing purchase draft:", e);
      }
      return;
    }

    const draftData = {
      step: step === 'review' ? 'review' : 'upload',
      activeSubTab,
      purchaseStatus,
      paidAmount,
      paymentMethod,
      editingPurchaseId,
      mode,
      scanMethod,
      cart,
      selectedSupplierId,
      invoiceNumber,
      receptionDate,
      globalDiscount,
      globalTax
    };
    try {
      localStorage.setItem('nexus_purchase_draft', JSON.stringify(draftData));
    } catch (e) {
      console.error("Error saving purchase draft:", e);
    }
  }, [
    step, activeSubTab, purchaseStatus, paidAmount, paymentMethod,
    editingPurchaseId, mode, scanMethod, cart, selectedSupplierId, invoiceNumber,
    receptionDate, globalDiscount, globalTax
  ]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [paymentData, setPaymentData] = useState({ supplierId: '', amount: 0, method: 'cash' as const, note: '', date: new Date().toISOString() });
  const [isQuickSupplierModalOpen, setIsQuickSupplierModalOpen] = useState(false);
  const [quickSupplierData, setQuickSupplierData] = useState({ name: '', phone: '', email: '' });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resetForm = () => {
    setCart([]);
    setSelectedSupplierId('');
    setInvoiceNumber('');
    setReceptionDate(new Date().toISOString().split('T')[0]);
    setGlobalDiscount(0);
    setGlobalTax(0);
    setPurchaseStatus('completed');
    setPaidAmount(0);
    setEditingPurchaseId(null);
    setMode('manual');
    setStep('upload');
    setLastPurchaseItems([]);
    try {
      localStorage.removeItem('nexus_purchase_draft');
    } catch (_) {}
  };

  const handleEditPurchaseRequest = (purchase: Purchase) => {
    setEditingPurchaseId(purchase.id);
    setSelectedSupplierId(purchase.supplierId || '');
    setInvoiceNumber(purchase.invoiceNumber || '');
    setReceptionDate(purchase.date ? purchase.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setGlobalDiscount(purchase.globalDiscount || 0);
    setGlobalTax(purchase.globalTax || 0);
    setPurchaseStatus(purchase.status as any);
    setPaidAmount(purchase.paidAmount || 0);
    
    const newCart = buildCartFromPurchaseItems(purchase.items, products);
    setCart(newCart);
    setActiveSubTab('new');
    setMode('manual');
  };

  const filteredPurchases = useMemo(() => {
    return filterPurchases(purchases, historySearch, historyStartDate, historyEndDate);
  }, [purchases, historySearch, historyStartDate, historyEndDate]);

  const handleQuickSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleQuickSupplierSubmitDb({
      quickSupplierData,
      suppliers,
      setSelectedSupplierId,
      setIsQuickSupplierModalOpen,
      setQuickSupplierData
    });
  };

  const filteredProducts = useMemo(() => {
    return filterProducts(products, deferredSearch);
  }, [deferredSearch, products]);

  const handlePurchaseBarcodeScan = (barcode: string) => {
    const foundProduct = products.find((p: Product) => 
      (p.barcode && p.barcode.trim() === barcode.trim()) ||
      (p.sku && p.sku.trim() === barcode.trim())
    );

    if (foundProduct) {
      addToCart(foundProduct);
      toast.success(`Produit ajouté : ${foundProduct.name}`);
    } else {
      toast.error(`Aucun produit trouvé avec le code-barres : ${barcode}`);
    }
    setIsPurchaseScannerOpen(false);
  };

  const confirmPurchase = async (shouldPrint: any = false) => {
    if (!cart || cart.length === 0) {
      toast.error("Veuillez d'abord ajouter ou scanner au moins un article dans le bon d'achat.");
      return;
    }

    const hasDrafts = cart.some(item => !item.productId || item.isDraft);
    if (hasDrafts) {
      toast.error("Veuillez d'abord ajouter les produits brouillons à l'inventaire ou les associer à un produit existant.");
      return;
    }

    let effectiveSupplierId = selectedSupplierId;
    if (!effectiveSupplierId) {
      const candidateName = (extractedData?.supplierName || 'Fournisseur Standard (Scan)').trim();
      const matched = suppliers.find(s => (s?.name || '').toLowerCase() === candidateName.toLowerCase());
      if (matched) {
        effectiveSupplierId = matched.id;
        setSelectedSupplierId(matched.id);
      } else {
        const autoId = generateUniqueId();
        const autoSupplier: Supplier = {
          id: autoId,
          name: candidateName,
          phone: '',
          email: '',
          balance: 0
        };
        await localDb.insert(`suppliers/${autoId}`, autoSupplier);
        effectiveSupplierId = autoId;
        setSelectedSupplierId(autoId);
      }
    }

    const actualShouldPrint = shouldPrint === true;
    if (actualShouldPrint) {
      const { printPurchaseOrder } = await import('../../services/printService');
      printPurchaseOrder({ 
        id: 'DRAFT', 
        items: cart, 
        supplierName: suppliers.find(s => s.id === effectiveSupplierId)?.name || extractedData?.supplierName || 'Fournisseur Standard', 
        total: cart.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0), 
        date: new Date().toISOString() 
      }, settings);
    }

    await savePurchaseDb({
      cart,
      selectedSupplierId: effectiveSupplierId,
      extractedData,
      invoiceNumber,
      receptionDate,
      globalDiscount,
      globalTax,
      purchaseStatus,
      paidAmount,
      editingPurchaseId,
      autoMargin,
      suppliers,
      patterns,
      purchases,
      products,
      setIsProcessing,
      setLastPurchaseItems,
      setStep
    });
  };

  const handleSupplierPayment = async (data: { supplierId: string, amount: number, method: string, note: string, date: string }) => {
    await handleSupplierPaymentDb({
      supplierId: data.supplierId,
      amount: data.amount,
      method: data.method,
      note: data.note,
      date: data.date,
      suppliers,
      setIsProcessing,
      setIsPaymentModalOpen,
      setPaymentData
    });
  };

  const handleReceiveOrder = async (order: PurchaseOrder) => {
    await handleReceiveOrderDb({
      order,
      suppliers,
      products,
      setIsProcessing,
      setActiveSubTab
    });
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    await handleDeletePurchaseDb({
      purchaseId,
      setIsProcessing,
      setPurchaseToDelete
    });
  };

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
    historySearch, setHistorySearch,
    historyStartDate, setHistoryStartDate,
    historyEndDate, setHistoryEndDate,
    paymentData, setPaymentData,
    isQuickSupplierModalOpen, setIsQuickSupplierModalOpen,
    quickSupplierData, setQuickSupplierData,
    
    // Derived
    filteredProducts, filteredPurchases,
    
    // Refs
    fileInputRef, searchInputRef, quantityInputRefs,
    
    // Handlers
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
