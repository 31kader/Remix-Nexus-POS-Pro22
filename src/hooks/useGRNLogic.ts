import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { localDb } from '../services/LocalDatabase';
import { Product, GRNItem, GoodsReceiptNote, CompanySettings } from '../types';
import { generateUniqueId } from '../lib/utils';
import { toast } from 'sonner';
import { fetchGrnsFromDatabase } from './grn';
import { executeSyncGrnsToSupabase } from './grn/grnSupabaseSync';
import { executeCreateGrn, executeValidateGrn } from './grn/grnCreationOperations';

export interface UseGRNLogicProps {
  products: Product[];
  suppliers: any[];
  setIsProductModalOpen: (isOpen: boolean) => void;
  setEditingProduct: (product: Product | null) => void;
  settings: CompanySettings;
}

export function useGRNLogic({
  products,
  suppliers,
  setIsProductModalOpen: _setIsProductModalOpen,
  setEditingProduct: _setEditingProduct,
  settings
}: UseGRNLogicProps) {
  const [grns, setGrns] = useState<GoodsReceiptNote[]>([]);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [search, setSearch] = useState('');
  const [grnSearch, setGrnSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<GRNItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalVat, setGlobalVat] = useState(0);
  const [validateImmediately, setValidateImmediately] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncingGrns, setIsSyncingGrns] = useState(false);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const quantityInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addItem = (product: Product) => {
    setItems((prevItems) => {
      const existingIdx = prevItems.findIndex(
        item => item.productId === product.id && (item.expirationDate || '') === (product.expirationDate || '')
      );
      if (existingIdx >= 0) {
        const next = [...prevItems];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: (next[existingIdx].quantity || 0) + 1
        };
        return next;
      }
      return [
        ...prevItems,
        { 
          lineId: generateUniqueId(),
          productId: product.id, 
          quantity: 1, 
          oldCostPrice: product.costPrice || 0, 
          newCostPrice: product.costPrice || 0, 
          vatRate: product.taxRate || 0, 
          discount: 0,
          expirationDate: product.expirationDate || '',
          batchNumber: product.batchNumber || ''
        }
      ];
    });
    setSearch('');
  };

  const refreshGrns = async () => {
    try {
      const combinedGrns = await fetchGrnsFromDatabase();
      setGrns(combinedGrns);
    } catch (err) {
      console.warn("Error fetching GRNs:", err);
    }
  };

  const handleCreate = async (shouldPrint: any = false) => {
    if (isProcessing) return;
    if (!supplierId || items.length === 0) {
      toast.error("Veuillez sélectionner un fournisseur et ajouter au moins un produit.");
      return;
    }
    
    setIsProcessing(true);
    try {
      await executeCreateGrn({
        supplierId,
        items,
        validateImmediately,
        globalDiscount,
        globalVat,
        shouldPrint,
        products,
        suppliers,
        settings
      });
      
      const updatedGrns = await fetchGrnsFromDatabase();
      setGrns(updatedGrns);
      setItems([]);
      setSupplierId('');
      setGlobalDiscount(0);
      setGlobalVat(0);
      setSearch('');
    } catch (error) {
      console.error("Error creating GRN:", error);
      toast.error("Erreur lors de la création du bon");
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard listeners for GRN shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        handleCreate(false);
      }
      if (e.key === 'F9') {
        e.preventDefault();
        handleCreate(true);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [items, supplierId, validateImmediately, globalDiscount, globalVat]);

  const filteredProducts = useMemo(() => {
    if (!deferredSearch) return [];
    const s = deferredSearch.toLowerCase();
    return products.filter(p => 
      (p.name?.toLowerCase().includes(s)) || 
      (p.sku?.toLowerCase().includes(s)) || 
      (p.barcode?.toLowerCase().includes(s)) || 
      (p.reference?.toLowerCase().includes(s))
    ).slice(0, 15);
  }, [products, deferredSearch]);

  const filteredGRNs = useMemo(() => {
    if (!grnSearch) return grns;
    const s = grnSearch.toLowerCase();
    return grns.filter(g => {
      if (!g) return false;
      const supplierName = suppliers.find(sup => sup.id === g.supplierId)?.name || '';
      return (
        (g.id || '').toLowerCase().includes(s) ||
        supplierName.toLowerCase().includes(s) ||
        (g.date && g.date.toLowerCase().includes(s))
      );
    });
  }, [grns, grnSearch, suppliers]);

  const getImmediateMatch = (searchTerm: string) => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return null;
    return products.find(p => 
      p?.sku?.toLowerCase() === s || 
      p?.barcode?.toLowerCase() === s ||
      p?.reference?.toLowerCase() === s ||
      p?.id?.toLowerCase() === s ||
      p?.name?.toLowerCase() === s
    );
  };

  useEffect(() => {
    refreshGrns();
    const unsub = localDb.subscribe('goodsReceiptNotes', () => {
      refreshGrns();
    });
    return () => unsub();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search.trim()) {
      e.preventDefault();
      const searchTerm = search.trim();
      const exactMatch = getImmediateMatch(searchTerm);
      
      if (exactMatch) {
        addItem(exactMatch);
      } else {
        const s = searchTerm.toLowerCase();
        const immediateFiltered = products.filter(p => 
          (p.name?.toLowerCase().includes(s)) || 
          (p.sku?.toLowerCase().includes(s))
        );
        if (immediateFiltered.length > 0) {
          addItem(immediateFiltered[0]);
        }
      }
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName) return;
    await localDb.push('suppliers', { name: newSupplierName });
    setNewSupplierName('');
    setIsAddingSupplier(false);
  };

  const updateItem = (index: number, field: keyof GRNItem, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleValidate = async (grn: GoodsReceiptNote) => {
    if (grn.status === 'validated' || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await executeValidateGrn(grn, products, suppliers, refreshGrns);
    } catch (error) {
      console.error("Error validating GRN:", error);
      toast.error("Erreur lors de la validation");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncAllToSupabase = async () => {
    setIsSyncingGrns(true);
    try {
      await executeSyncGrnsToSupabase(grns, refreshGrns);
    } finally {
      setIsSyncingGrns(false);
    }
  };

  const handleBarcodeScan = (scannedCode: string) => {
    setIsScannerOpen(false);
    if (!scannedCode) return;
    const match = getImmediateMatch(scannedCode);
    if (match) {
      addItem(match);
      toast.success(`Article "${match.name}" ajouté`);
    } else {
      toast.error(`Aucun produit trouvé pour le code : ${scannedCode}`);
    }
  };

  return {
    grns,
    newSupplierName,
    setNewSupplierName,
    isAddingSupplier,
    setIsAddingSupplier,
    search,
    setSearch,
    grnSearch,
    setGrnSearch,
    isScannerOpen,
    setIsScannerOpen,
    supplierId,
    setSupplierId,
    items,
    setItems,
    globalDiscount,
    setGlobalDiscount,
    globalVat,
    setGlobalVat,
    validateImmediately,
    setValidateImmediately,
    isProcessing,
    searchRef,
    quantityInputRefs,
    filteredProducts,
    filteredGRNs,
    handleBarcodeScan,
    addItem,
    handleCreate,
    handleKeyDown,
    handleAddSupplier,
    updateItem,
    handleValidate,
    handleSyncAllToSupabase,
    isSyncingGrns
  };
}
