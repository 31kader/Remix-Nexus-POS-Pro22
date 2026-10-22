import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { enqueueStockAdjustment, enqueueSync } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Product, GRNItem, GoodsReceiptNote, CompanySettings, normalizeBatches } from '../types';
import { generateUniqueId } from '../lib/utils';
import { convertKeysToCamel, convertKeysToSnake } from '../lib/db-converters';
import { toast } from 'sonner';
import { printPurchaseVoucher } from '../services/documentPrintService';
import { useCoreStore } from '../store/useCoreStore';

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

  const applyGrnStockAndCostUpdates = (
    grnItems: GRNItem[],
    nowIso: string,
    targetSupplierId?: string,
    grnGlobalDiscount: number = 0,
    grnGlobalVat: number = 0
  ) => {
    // 🛡️ Consolidation préalable par productId (Règle Anti-Écrasement GEMINI.md)
    const groupedByProduct = new Map<string, GRNItem[]>();
    for (const item of (grnItems || [])) {
      if (!item.productId || item.productId === 'undefined') continue;
      const list = groupedByProduct.get(item.productId) || [];
      list.push(item);
      groupedByProduct.set(item.productId, list);
    }

    const globalFactor = (1 - (Number(grnGlobalDiscount) || 0) / 100) * (1 + (Number(grnGlobalVat) || 0) / 100);
    let totalGrnAmount = 0;

    for (const [productId, lines] of groupedByProduct.entries()) {
      const p = products.find(prod => prod.id === productId);
      if (!p) continue;

      const totalAddedQty = lines.reduce((sum, l) => sum + Math.max(0, Number(l.quantity) || 0), 0);
      if (totalAddedQty <= 0) continue;

      enqueueStockAdjustment(productId, totalAddedQty);

      // Calcul du PMP (Prix Moyen Pondéré) intégrant remises et TVA de la ligne et du bon
      const currentStock = Math.max(0, p.stock || 0);
      const currentCost = Math.max(0, p.costPrice || 0);
      const addedValue = lines.reduce((sum, l) => {
        const qty = Math.max(0, Number(l.quantity) || 0);
        const rawUnitCost = Math.max(0, Number(l.newCostPrice) || 0);
        const lineFactor = (1 - (Number(l.discount) || 0) / 100) * (1 + (Number(l.vatRate) || 0) / 100);
        const effectiveUnitCost = rawUnitCost * lineFactor * globalFactor;
        return sum + qty * effectiveUnitCost;
      }, 0);
      totalGrnAmount += addedValue;

      const lastLine = lines[lines.length - 1];
      const fallbackCost = lastLine
        ? Math.max(0, Number(lastLine.newCostPrice) || 0) * (1 - (Number(lastLine.discount) || 0) / 100) * (1 + (Number(lastLine.vatRate) || 0) / 100) * globalFactor
        : currentCost;

      let pmpCost = totalAddedQty > 0 && addedValue > 0 ? Number((addedValue / totalAddedQty).toFixed(2)) : Number(fallbackCost.toFixed(2));
      if (currentStock > 0 && currentCost > 0 && totalAddedQty > 0 && addedValue > 0) {
        const totalValue = (currentStock * currentCost) + addedValue;
        const totalQty = currentStock + totalAddedQty;
        pmpCost = totalQty > 0 ? Number((totalValue / totalQty).toFixed(2)) : pmpCost;
      }

      const nextStock = (Number(p.stock) || 0) + totalAddedQty;
      const prodUpdates: any = {
        stock: nextStock,
        costPrice: pmpCost,
        updatedAt: nowIso
      };

      if (p.useMultiExpiry || lines.some(l => !!l.expirationDate)) {
        let updatedBatches = normalizeBatches(p.batches).map(b => ({ ...b }));
        let useMultiExpiry = p.useMultiExpiry || false;

        if (!useMultiExpiry) {
          const existingBatches = [];
          if ((p.stock || 0) > 0) {
            existingBatches.push({
              id: Math.random().toString(36).substring(2, 9),
              batchNumber: p.batchNumber || 'LOT-INI',
              expirationDate: p.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              stock: p.stock || 0
            });
          }
          updatedBatches = existingBatches;
          useMultiExpiry = true;
        }

        const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        for (const item of lines) {
          const itemQty = Math.max(0, Number(item.quantity) || 0);
          if (itemQty <= 0) continue;
          updatedBatches.push({
            id: Math.random().toString(36).substring(2, 9),
            batchNumber: item.batchNumber || 'LOT-' + nowIso.split('T')[0].replace(/-/g, ''),
            expirationDate: item.expirationDate || defaultExpiry,
            stock: itemQty
          });
        }

        const sorted = [...updatedBatches].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
        prodUpdates.batches = updatedBatches;
        prodUpdates.useMultiExpiry = true;
        if (sorted.length > 0) {
          prodUpdates.expirationDate = sorted[0].expirationDate;
          prodUpdates.batchNumber = sorted[0].batchNumber;
        }
      }

      if (p.isBundle && p.bundleItems && p.bundleItems.length > 0) {
        for (const bItem of p.bundleItems) {
          const compId = bItem.productId || (bItem as any).id;
          const comp = products.find(prod => prod.id === compId);
          if (comp) {
            const compAddedQty = totalAddedQty * Math.max(1, Number(bItem.quantity) || 1);
            const nextCompStock = (Number(comp.stock) || 0) + compAddedQty;
            enqueueStockAdjustment(comp.id, compAddedQty);
            localDb.updateLocalOnly(`products/${comp.id}`, { ...comp, stock: nextCompStock, updatedAt: nowIso });
            useCoreStore.setState(state => ({
              products: (state.products || []).map(prod => prod.id === comp.id ? { ...prod, stock: nextCompStock, updatedAt: nowIso } : prod)
            }));
          }
        }
      }

      localDb.updateLocalOnly(`products/${productId}`, { ...p, ...prodUpdates });
      const { stock: _ignoredStock, ...nonStockUpdates } = prodUpdates;
      enqueueSync('products', productId, 'UPSERT', { id: productId, ...nonStockUpdates });
      useCoreStore.setState(state => ({
        products: (state.products || []).map(prod => prod.id === productId ? { ...prod, ...prodUpdates } : prod)
      }));
    }

    // 🛡️ P1-BIZ-9 : Mise à jour de la dette du fournisseur lors de la validation du GRN
    if (targetSupplierId && totalGrnAmount > 0) {
      import('../store/usePeopleStore').then(({ usePeopleStore }) => {
        const peopleState = usePeopleStore.getState();
        const sup = (peopleState.suppliers || suppliers || []).find((s: any) => s && s.id === targetSupplierId);
        if (sup) {
          const debtToAdd = Number(totalGrnAmount.toFixed(2));
          const updatedSupplier = {
            ...sup,
            balance: (Number(sup.balance) || 0) + debtToAdd,
            updatedAt: nowIso
          };
          localDb.update(`suppliers/${sup.id}`, updatedSupplier).catch(() => {});
          peopleState.setSuppliers(prev => (prev || []).map((s: any) => s.id === sup.id ? updatedSupplier : s));
        }
      }).catch(() => {});
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
      let grnId = generateUniqueId();
      const status = validateImmediately ? 'validated' : 'draft';
      const nowIso = new Date().toISOString();

      if (validateImmediately) {
        applyGrnStockAndCostUpdates(items, nowIso, supplierId, Number(globalDiscount) || 0, Number(globalVat) || 0);
      }

      const grnRecord: GoodsReceiptNote = {
        id: grnId,
        supplierId: supplierId || '',
        date: nowIso,
        items: items || [],
        globalDiscount: Number(globalDiscount) || 0,
        globalVat: Number(globalVat) || 0,
        status: status || 'draft'
      };

      await localDb.insert(`goodsReceiptNotes/${grnId}`, grnRecord);

      // Supabase Direct Sync
      if (isSupabaseConfigured) {
        try {
          const supabasePayload = {
            id: grnId,
            supplier_id: supplierId || null,
            date: nowIso,
            items: items || [],
            global_discount: Number(globalDiscount) || 0,
            global_vat: Number(globalVat) || 0,
            status: status || 'draft'
          };
          const { error: sbErr } = await supabase.from('goods_receipt_notes').upsert(supabasePayload, { onConflict: 'id' });
          if (sbErr) {
            console.warn('[Supabase GRN Insert Error]', sbErr);
            enqueueSync('goods_receipt_notes', grnId, 'UPSERT', supabasePayload);
          }
        } catch (sErr) {
          console.warn('[Supabase GRN Insert Exception]', sErr);
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
      let remoteRows: any[] = [];

      // 1. Fetch from Supabase if configured
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('goods_receipt_notes')
            .select('*')
            .order('date', { ascending: false });

          if (!error && data && Array.isArray(data)) {
            remoteRows = data;
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
      let localList: GoodsReceiptNote[] = [];
      if (snapshot.exists()) {
        const grnsData = snapshot.val() || {};
        localList = Object.keys(grnsData).map(id => ({ id, ...grnsData[id] } as GoodsReceiptNote));
        
        // Merge without duplicates
        const map = new Map<string, GoodsReceiptNote>();
        combinedGrns.forEach(g => map.set(g.id, g));
        localList.forEach(g => map.set(g.id, { ...map.get(g.id), ...g }));
        combinedGrns = Array.from(map.values());
      }

      // 3. Auto-backfill: Si des bons existent localement mais pas dans Supabase, les synchroniser
      if (isSupabaseConfigured && localList.length > 0) {
        const remoteIds = new Set(remoteRows.map((d: any) => d.id));
        const missingFromRemote = localList.filter(l => l.id && !remoteIds.has(l.id));
        if (missingFromRemote.length > 0) {
          const backfillPayloads = missingFromRemote.map(g => ({
            id: g.id,
            supplier_id: g.supplierId || null,
            date: g.date || new Date().toISOString(),
            items: g.items || [],
            global_discount: Number(g.globalDiscount) || 0,
            global_vat: Number(g.globalVat) || 0,
            status: g.status || 'draft'
          }));
          supabase.from('goods_receipt_notes').upsert(backfillPayloads, { onConflict: 'id' })
            .then((res: any) => {
              const bErr = res?.error;
              if (bErr) {
                console.warn('[Supabase GRN Auto-Backfill Error]', bErr);
              } else {
                console.log(`[Supabase GRN Auto-Backfill] ${backfillPayloads.length} bon(s) synchronisé(s) vers Supabase.`);
              }
            })
            .catch(() => {});
        }
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
      applyGrnStockAndCostUpdates(
        grn.items || [],
        nowIso,
        grn.supplierId,
        Number(grn.globalDiscount) || 0,
        Number(grn.globalVat) || 0
      );
      
      await localDb.update(`goodsReceiptNotes/${grn.id}`, { status: 'validated' });

      // Supabase Update
      if (isSupabaseConfigured) {
        try {
          const { error: updErr } = await supabase.from('goods_receipt_notes').update({ status: 'validated' }).eq('id', grn.id);
          if (updErr) {
            console.warn('[Supabase GRN Update Error]', updErr);
            enqueueSync('goods_receipt_notes', grn.id, 'UPSERT', { id: grn.id, status: 'validated' });
          }
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

  const [isSyncingGrns, setIsSyncingGrns] = useState(false);

  const handleSyncAllToSupabase = async () => {
    if (!isSupabaseConfigured) {
      toast.error("Supabase n'est pas configuré.");
      return;
    }
    setIsSyncingGrns(true);
    try {
      const snapshot = await localDb.get('goodsReceiptNotes');
      const grnsData = snapshot.exists() ? snapshot.val() || {} : {};
      const localList: GoodsReceiptNote[] = Object.keys(grnsData).map(id => ({ id, ...grnsData[id] }));

      const allMap = new Map<string, GoodsReceiptNote>();
      grns.forEach(g => allMap.set(g.id, g));
      localList.forEach(g => allMap.set(g.id, { ...allMap.get(g.id), ...g }));
      const allGrns = Array.from(allMap.values());

      if (allGrns.length === 0) {
        toast.info("Aucun bon de réception à synchroniser.");
        return;
      }

      const payloads = allGrns.map(g => ({
        id: g.id,
        supplier_id: g.supplierId || null,
        date: g.date || new Date().toISOString(),
        items: g.items || [],
        global_discount: Number(g.globalDiscount) || 0,
        global_vat: Number(g.globalVat) || 0,
        status: g.status || 'draft'
      }));

      const { error } = await supabase.from('goods_receipt_notes').upsert(payloads, { onConflict: 'id' });
      if (error) {
        console.error('[Supabase GRN Sync Error]', error);
        toast.error("Erreur de synchronisation : " + (error.message || "Erreur"));
      } else {
        toast.success(`${payloads.length} bon(s) de réception synchronisé(s) vers Supabase !`);
        await fetchGrns();
      }
    } catch (err: any) {
      console.error('[Supabase GRN Sync Exception]', err);
      toast.error("Erreur inattendue : " + (err?.message || "Erreur inconnue"));
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
