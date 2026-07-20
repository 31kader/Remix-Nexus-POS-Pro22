import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { Product, GRNItem, GoodsReceiptNote, CompanySettings } from '../types';
import { generateUniqueId } from '../lib/utils';
import { toast } from 'sonner';
import { printPurchaseVoucher } from '../services/documentPrintService';

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
  setIsProductModalOpen,
  setEditingProduct,
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
  
  const searchRef = useRef<HTMLInputElement>(null);
  const quantityInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addItem = (product: Product) => {
    setItems((prevItems) => [
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
    ]);
    setSearch('');
  };

  const handleCreate = async (shouldPrint: any = false) => {
    if (!supplierId || items.length === 0) {
      alert("Veuillez sélectionner un fournisseur et ajouter au moins un produit.");
      return;
    }
    
    setIsProcessing(true);
    try {
      let grnId = '';
      if (validateImmediately) {
        for (const item of items) {
          if (!item.productId || item.productId === 'undefined') continue;
          
          const p = products.find(prod => prod.id === item.productId);
          if (p) {
            enqueueStockAdjustment(item.productId, item.quantity);
            
            const prodUpdates: any = {
              costPrice: item.newCostPrice,
              updatedAt: new Date().toISOString()
            };

            if (item.expirationDate) {
              let updatedBatches = p.batches ? [...p.batches] : [];
              let useMultiExpiry = p.useMultiExpiry || false;
              
              if (!useMultiExpiry) {
                const existingBatches = [];
                if ((p.stock || 0) > 0) {
                  existingBatches.push({
                    id: Math.random().toString(36).substring(2, 9),
                    batchNumber: p.batchNumber || 'LOT-INI',
                    expirationDate: p.expirationDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
                    stock: p.stock || 0
                  });
                }
                updatedBatches = existingBatches;
                useMultiExpiry = true;
              }
              
              const newBatch = {
                id: Math.random().toString(36).substring(2, 9),
                batchNumber: item.batchNumber || 'LOT-' + new Date().toISOString().split('T')[0].replace(/-/g, ''),
                expirationDate: item.expirationDate,
                stock: item.quantity
              };
              updatedBatches = [...updatedBatches, newBatch];
              
              const sorted = [...updatedBatches].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
              prodUpdates.batches = updatedBatches;
              prodUpdates.useMultiExpiry = true;
              prodUpdates.expirationDate = sorted[0].expirationDate;
              prodUpdates.batchNumber = sorted[0].batchNumber;
            }
            
            localDb.update(`products/${item.productId}`, prodUpdates);
          }
        }
        
        const result = await localDb.push('goodsReceiptNotes', {
          supplierId,
          date: new Date().toISOString(),
          items,
          globalDiscount,
          globalVat,
          status: 'validated'
        });
        grnId = result.key;
        alert("Bon de réception créé et stock mis à jour avec succès !");
      } else {
        const result = await localDb.push('goodsReceiptNotes', {
          supplierId,
          date: new Date().toISOString(),
          items,
          globalDiscount,
          globalVat,
          status: 'draft'
        });
        grnId = result.key;
        alert("Bon de réception créé en brouillon.");
      }

      const actualShouldPrint = shouldPrint === true;
      if (actualShouldPrint && grnId) {
        const total = items.reduce((sum, item) => {
          const subtotal = item.quantity * item.newCostPrice;
          const discounted = subtotal * (1 - item.discount / 100);
          const totalWithVat = discounted * (1 + item.vatRate / 100);
          return sum + totalWithVat;
        }, 0) * (1 - globalDiscount / 100) * (1 + globalVat / 100);

        printPurchaseVoucher({
          id: grnId,
          items: items.map(item => ({
            name: products.find(p => p.id === item.productId)?.name || 'Article',
            quantity: item.quantity,
            costPrice: item.newCostPrice
          })),
          total: total
        }, settings);
      }
      
      await fetchGrns();
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
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === 'F11') {
        e.preventDefault();
        if (items.length > 0) {
          const lastItem = items[items.length - 1];
          setTimeout(() => {
            const input = quantityInputRefs.current[lastItem.lineId];
            if (input) {
              input.focus();
              input.select();
            }
          }, 10);
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        handleCreate(false);
      } else if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        handleCreate(true);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts, true);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts, true);
  }, [items, supplierId, globalDiscount, globalVat, validateImmediately, products]);

  const handleBarcodeScan = (barcode: string) => {
    const foundProduct = products.find((p: Product) => 
      (p.barcode && p.barcode.trim() === barcode.trim()) ||
      (p.sku && p.sku.trim() === barcode.trim())
    );

    if (foundProduct) {
      const existingItemIndex = items.findIndex(item => item.productId === foundProduct.id);
      if (existingItemIndex > -1) {
        const updatedItems = [...items];
        updatedItems[existingItemIndex].quantity += 1;
        setItems(updatedItems);
        toast.success(`Quantité augmentée pour ${foundProduct.name} (+1)`);
      } else {
        addItem(foundProduct);
        toast.success(`Produit ajouté : ${foundProduct.name}`);
      }
    } else {
      toast.error(`Aucun produit trouvé avec le code-barres : ${barcode}`);
    }
    setIsScannerOpen(false);
  };

  const filteredProducts = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return [];
    const searchTerms = s.split(' ').filter(Boolean);
    return products.filter((p: Product) => 
      searchTerms.every(term =>
        (p.name?.toLowerCase().includes(term)) || 
        (p.sku?.toLowerCase().includes(term)) ||
        (p.barcode?.toLowerCase().includes(term)) ||
        (p.reference?.toLowerCase().includes(term))
      )
    );
  }, [search, products]);

  const filteredGRNs = useMemo(() => {
    const s = grnSearch.toLowerCase().trim();
    if (!s) return grns;
    const searchTerms = s.split(' ').filter(Boolean);
    return grns.filter(g => {
      const supplier = suppliers.find(sup => sup.id === g.supplierId);
      const hasMatchingProduct = g.items.some(item => {
        const product = products.find(p => p.id === item.productId);
        return searchTerms.every(term =>
          product?.name?.toLowerCase().includes(term) || 
          product?.sku?.toLowerCase().includes(term) ||
          product?.barcode?.toLowerCase().includes(term) ||
          product?.reference?.toLowerCase().includes(term)
        );
      });
      return searchTerms.every(term =>
        g.id.toLowerCase().includes(term) || 
        supplier?.name?.toLowerCase().includes(term) ||
        hasMatchingProduct
      );
    });
  }, [grnSearch, grns, suppliers, products]);

  // For immediate response to barcode scans or rapid typing in Enter handle
  const getImmediateMatch = (searchTerm: string) => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return null;
    return products.find(p => 
      p.sku?.toLowerCase() === s || 
      p.barcode?.toLowerCase() === s ||
      p.reference?.toLowerCase() === s ||
      p.id.toLowerCase() === s ||
      p.name?.toLowerCase() === s
    );
  };

  const fetchGrns = async () => {
    try {
      const snapshot = await localDb.get('goodsReceiptNotes');
      if (snapshot.exists()) {
        const grnsData = snapshot.val();
        const mapped = Object.keys(grnsData).map(id => ({ id, ...grnsData[id] } as GoodsReceiptNote));
        mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setGrns(mapped);
      } else {
        setGrns([]);
      }
    } catch (err) {
      console.warn("RTDB error in GRNManager:", err);
    }
  };

  useEffect(() => {
    const unsub = localDb.subscribe('goodsReceiptNotes', () => {
      fetchGrns();
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
      for (const item of grn.items) {
        if (!item.productId || item.productId === 'undefined') continue;
        
        const p = products.find(prod => prod.id === item.productId);
        if (p) {
          enqueueStockAdjustment(item.productId, item.quantity);
          
          const prodUpdates: any = {
            costPrice: item.newCostPrice,
            updatedAt: new Date().toISOString()
          };

          if (item.expirationDate) {
            let updatedBatches = p.batches ? [...p.batches] : [];
            let useMultiExpiry = p.useMultiExpiry || false;
            
            if (!useMultiExpiry) {
              const existingBatches = [];
              if ((p.stock || 0) > 0) {
                existingBatches.push({
                  id: Math.random().toString(36).substring(2, 9),
                  batchNumber: p.batchNumber || 'LOT-INI',
                  expirationDate: p.expirationDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
                  stock: p.stock || 0
                });
              }
              updatedBatches = existingBatches;
              useMultiExpiry = true;
            }
            
            const newBatch = {
              id: Math.random().toString(36).substring(2, 9),
              batchNumber: item.batchNumber || 'LOT-' + new Date().toISOString().split('T')[0].replace(/-/g, ''),
              expirationDate: item.expirationDate,
              stock: item.quantity
            };
            updatedBatches = [...updatedBatches, newBatch];
            
            const sorted = [...updatedBatches].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
            prodUpdates.batches = updatedBatches;
            prodUpdates.useMultiExpiry = true;
            prodUpdates.expirationDate = sorted[0].expirationDate;
            prodUpdates.batchNumber = sorted[0].batchNumber;
          }
          
          localDb.update(`products/${item.productId}`, prodUpdates);
        }
      }
      
      await localDb.update(`goodsReceiptNotes/${grn.id}`, { status: 'validated' });
      await fetchGrns();
      alert("Le stock a été mis à jour avec succès !");
    } catch (error) {
      console.error("Error validating GRN:", error);
      toast.error("Erreur lors de la validation");
    } finally {
      setIsProcessing(false);
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
    handleKeyDown,
    handleAddSupplier,
    addItem,
    updateItem,
    handleCreate,
    handleValidate
  };
}
