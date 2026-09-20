import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Product, GRNItem, GoodsReceiptNote, CompanySettings } from '../types';
import { generateUniqueId } from '../lib/utils';
import { convertKeysToCamel, convertKeysToSnake } from '../lib/db-converters';
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
      toast.error("Veuillez sélectionner un fournisseur et ajouter au moins un produit.");
      return;
    }
    
    setIsProcessing(true);
    try {
      let grnId = generateUniqueId();
      const status = validateImmediately ? 'validated' : 'draft';
      const nowIso = new Date().toISOString();

      if (validateImmediately) {
        for (const item of items) {
          if (!item.productId || item.productId === 'undefined') continue;
          
          const p = products.find(prod => prod.id === item.productId);
          if (p) {
            enqueueStockAdjustment(item.productId, item.quantity);
            
            // Calcul du PMP (Prix Moyen Pondéré)
            const currentStock = Math.max(0, p.stock || 0);
            const currentCost = Math.max(0, p.costPrice || 0);
            const addedQty = Math.max(0, item.quantity || 0);
            const addedCost = Math.max(0, item.newCostPrice || 0);

            let pmpCost = addedCost;
            if (currentStock > 0 && currentCost > 0 && addedQty > 0 && addedCost > 0) {
              const totalValue = (currentStock * currentCost) + (addedQty * addedCost);
              const totalQty = currentStock + addedQty;
              pmpCost = totalQty > 0 ? Number((totalValue / totalQty).toFixed(2)) : addedCost;
            }

            const prodUpdates: any = {
              costPrice: pmpCost,
              updatedAt: nowIso
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
                batchNumber: item.batchNumber || 'LOT-' + nowIso.split('T')[0].replace(/-/g, ''),
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
      }

      const grnRecord: GoodsReceiptNote = {
        id: grnId,
        supplierId,
        date: nowIso,
        items,
        globalDiscount,
        globalVat,
        status
      };

      await localDb.insert(`goodsReceiptNotes/${grnId}`, grnRecord);

      // Supabase Direct Sync
      if (isSupabaseConfigured) {
        try {
          await supabase.from('goods_receipt_notes').upsert({
            id: grnId,
            supplier_id: supplierId,
            date: nowIso,
            items: items,
            global_discount: globalDiscount,
            global_vat: globalVat,
            status
          });
        } catch (sErr) {
          console.warn('[Supabase GRN Insert]', sErr);
        }
      }

      if (validateImmediately) {
        toast.success("Bon de réception créé et stock mis à jour avec succès !");
      } else {
        toast.success("Bon de réception créé en brouillon.");
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

  const fetchGrns = async () => {
    try {
      let combinedGrns: GoodsReceiptNote[] = [];

      // 1. Fetch from Supabase if configured
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('goods_receipt_notes')
            .select('*')
            .order('date', { ascending: false });

          if (!error && data && Array.isArray(data)) {
            combinedGrns = data.map((item: any) => {
              if (typeof item.items === 'string') {
                try { item.items = JSON.parse(item.items); } catch(e) {}
              }
              return convertKeysToCamel(item) as GoodsReceiptNote;
            });
          }
        } catch (sErr) {
          console.warn('[Supabase GRN Fetch Error]', sErr);
        }
      }

      // 2. Fetch localDb snapshot
      const snapshot = await localDb.get('goodsReceiptNotes');
      if (snapshot.exists()) {
        const grnsData = snapshot.val();
        const localList = Object.keys(grnsData).map(id => ({ id, ...grnsData[id] } as GoodsReceiptNote));
        
        // Merge without duplicates
        const map = new Map<string, GoodsReceiptNote>();
        combinedGrns.forEach(g => map.set(g.id, g));
        localList.forEach(g => map.set(g.id, { ...map.get(g.id), ...g }));
        combinedGrns = Array.from(map.values());
      }

      combinedGrns.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setGrns(combinedGrns);
    } catch (err) {
      console.warn("Error fetching GRNs:", err);
    }
  };

  useEffect(() => {
    fetchGrns();
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
      const nowIso = new Date().toISOString();
      for (const item of (grn.items || [])) {
        if (!item.productId || item.productId === 'undefined') continue;
        
        const p = products.find(prod => prod.id === item.productId);
        if (p) {
          enqueueStockAdjustment(item.productId, item.quantity);

          // Calcul du PMP (Prix Moyen Pondéré)
          const currentStock = Math.max(0, p.stock || 0);
          const currentCost = Math.max(0, p.costPrice || 0);
          const addedQty = Math.max(0, item.quantity || 0);
          const addedCost = Math.max(0, item.newCostPrice || 0);

          let pmpCost = addedCost;
          if (currentStock > 0 && currentCost > 0 && addedQty > 0 && addedCost > 0) {
            const totalValue = (currentStock * currentCost) + (addedQty * addedCost);
            const totalQty = currentStock + addedQty;
            pmpCost = totalQty > 0 ? Number((totalValue / totalQty).toFixed(2)) : addedCost;
          }

          const prodUpdates: any = {
            costPrice: pmpCost,
            updatedAt: nowIso
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
              batchNumber: item.batchNumber || 'LOT-' + nowIso.split('T')[0].replace(/-/g, ''),
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

      // Supabase Update
      if (isSupabaseConfigured) {
        try {
          await supabase.from('goods_receipt_notes').update({ status: 'validated' }).eq('id', grn.id);
        } catch (sErr) {
          console.warn('[Supabase GRN Update Error]', sErr);
        }
      }

      await fetchGrns();
      toast.success("Bon de réception validé et stock mis à jour avec succès !");
    } catch (error) {
      console.error("Error validating GRN:", error);
      toast.error("Erreur lors de la validation");
    } finally {
      setIsProcessing(false);
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
    handleValidate
  };
}
