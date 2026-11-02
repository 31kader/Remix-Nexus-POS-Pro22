import React from 'react';
import { toast } from 'sonner';
import { localDb } from '../../services/LocalDatabase';
import { generateUniqueId } from '../../lib/utils';
import { Product, Supplier, InvoicePattern, Purchase, PurchaseOrder, CompanySettings } from '../../types';
import {
  savePurchaseDb,
  handleSupplierPaymentDb,
  handleReceiveOrderDb,
  handleDeletePurchaseDb,
  handleQuickSupplierSubmitDb
} from './purchaseDbOperations';
import { buildCartFromPurchaseItems } from './purchaseHelpers';
import { clearPurchaseDraft } from './usePurchaseDraftStorage';

interface UseSmartPurchaseExecutionProps {
  cart: any[];
  setCart: (cart: any[]) => void;
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  invoiceNumber: string;
  setInvoiceNumber: (num: string) => void;
  receptionDate: string;
  setReceptionDate: (date: string) => void;
  globalDiscount: number;
  setGlobalDiscount: (val: number) => void;
  globalTax: number;
  setGlobalTax: (val: number) => void;
  purchaseStatus: 'draft' | 'ordered' | 'completed';
  setPurchaseStatus: (status: 'draft' | 'ordered' | 'completed') => void;
  paidAmount: number;
  setPaidAmount: (amount: number) => void;
  editingPurchaseId: string | null;
  setEditingPurchaseId: (id: string | null) => void;
  setMode: (mode: 'manual' | 'scan') => void;
  setStep: (step: 'upload' | 'review' | 'confirm' | 'updatePrices') => void;
  setLastPurchaseItems: (items: any[]) => void;
  setActiveSubTab: (tab: any) => void;
  setIsProcessing: (val: boolean) => void;
  setPurchaseToDelete: (id: string | null) => void;
  setIsPaymentModalOpen: (val: boolean) => void;
  setPaymentData: React.Dispatch<React.SetStateAction<{ supplierId: string; amount: number; method: 'cash'; note: string; date: string }>>;
  quickSupplierData: { name: string; phone: string; email: string };
  setQuickSupplierData: React.Dispatch<React.SetStateAction<{ name: string; phone: string; email: string }>>;
  setIsQuickSupplierModalOpen: (val: boolean) => void;
  suppliers: Supplier[];
  products: Product[];
  patterns: InvoicePattern[];
  purchases: Purchase[];
  settings: CompanySettings;
  extractedData: any;
  autoMargin: boolean;
}

export function useSmartPurchaseExecution({
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
}: UseSmartPurchaseExecutionProps) {
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
    clearPurchaseDraft();
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
    let effectiveSuppliersList = suppliers;
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
        const { usePeopleStore } = await import('../../store/usePeopleStore');
        usePeopleStore.getState().setSuppliers(prev => [autoSupplier, ...(prev || [])]);
        effectiveSuppliersList = [autoSupplier, ...suppliers];
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
        supplierName: effectiveSuppliersList.find(s => s.id === effectiveSupplierId)?.name || extractedData?.supplierName || 'Fournisseur Standard', 
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
      suppliers: effectiveSuppliersList,
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

  return {
    resetForm,
    handleEditPurchaseRequest,
    handleQuickSupplierSubmit,
    confirmPurchase,
    handleSupplierPayment,
    handleReceiveOrder,
    handleDeletePurchase
  };
}
