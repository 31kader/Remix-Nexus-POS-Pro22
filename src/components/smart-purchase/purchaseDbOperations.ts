import { convertKeysToSnake } from '../../lib/db-converters';
import { enqueueStockAdjustment } from '../../services/SyncService';
import { localDb } from '../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { generateUniqueId, safeGetItems } from '../../lib/utils';
import { Product, Supplier, InvoicePattern, Purchase, PurchaseOrder, CompanySettings } from '../../types';
import { PurchaseCartItem } from '../usePurchaseCart';
import { toast } from 'sonner';
import { safeOptionalMutation } from '../../lib/supabase/safeOptional';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useCoreStore } from '../../store/useCoreStore';
import { usePeopleStore } from '../../store/usePeopleStore';

export interface SavePurchaseParams {
  cart: PurchaseCartItem[];
  selectedSupplierId: string;
  extractedData: any;
  invoiceNumber: string;
  receptionDate: string;
  globalDiscount: number;
  globalTax: number;
  purchaseStatus: 'draft' | 'ordered' | 'completed';
  paidAmount: number;
  editingPurchaseId: string | null;
  autoMargin: boolean;
  suppliers: Supplier[];
  patterns: InvoicePattern[];
  purchases: Purchase[];
  products: Product[];
  setIsProcessing: (v: boolean) => void;
  setLastPurchaseItems: (v: any[]) => void;
  setStep: (v: 'upload' | 'review' | 'confirm' | 'updatePrices') => void;
}

export async function savePurchaseDb({
  cart,
  selectedSupplierId,
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
}: SavePurchaseParams) {
  setIsProcessing(true);
  try {
    const purchaseItems = cart.map((item: PurchaseCartItem) => ({
      lineId: item.lineId || generateUniqueId(),
      productId: item.productId || '',
      name: item.productName || 'Produit sans nom',
      quantity: item.quantity || 0,
      costPrice: item.costPrice || 0,
      discount: item.discount || 0,
      taxRate: item.taxRate || 0
    }));
    
    const supplierName = suppliers.find(s => s.id === selectedSupplierId)?.name || extractedData?.supplierName || 'Inconnu';
    const finalInvoiceNumber = invoiceNumber || extractedData?.invoiceNumber || ''; 
    
    const existingPattern = patterns.find(p => 
      (p.supplierName && p.supplierName.toLowerCase() === supplierName.toLowerCase()) || 
      (selectedSupplierId && p.systemSupplierId === selectedSupplierId)
    );
    
    const newMappings: Record<string, string> = { ...(existingPattern?.itemMappings || {}) };
    cart.forEach(item => {
      if (item.productId && item.productName) {
        newMappings[item.productName] = item.productId;
      }
    });
    
    const patternData = {
      type: 'ocr',
      supplierName,
      systemSupplierId: selectedSupplierId || '',
      itemMappings: newMappings
    };

    const snakePattern = convertKeysToSnake(patternData);

    if (existingPattern) {
      await safeOptionalMutation(
        'invoice_patterns.update',
        () => supabase
          .from('invoice_patterns')
          .update(snakePattern)
          .eq('id', existingPattern.id),
        { module: 'purchaseDbOperations', action: 'updatePattern' }
      );
    } else {
      const newPatternId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
      await safeOptionalMutation(
        'invoice_patterns.upsert',
        () => supabase
          .from('invoice_patterns')
          .upsert({
            ...snakePattern,
            id: newPatternId
          }, { onConflict: 'id' }),
        { module: 'purchaseDbOperations', action: 'insertPattern' }
      );
    }

    const totalValue = purchaseItems.reduce((sum: number, item: any) => {
      const subtotal = (item.costPrice || 0) * (item.quantity || 0);
      const discounted = subtotal * (1 - (item.discount || 0) /100);
      const totalWithVat = discounted * (1 + (item.taxRate || 0) / 100);
      return sum + totalWithVat;
    }, 0) * (1 - (globalDiscount || 0) / 100) * (1 + (globalTax || 0) / 100);

    const computedPaymentStatus = paidAmount >= totalValue ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
    const scannedImageUrl = extractedData?.scannedImageUrl || '';
    const autoInvoiceNum = finalInvoiceNumber || ('BON-SCAN-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900));

    const todayStr = new Date().toISOString().split('T')[0];
    const effectiveIsoDate = (!receptionDate || receptionDate === todayStr)
      ? new Date().toISOString()
      : new Date(receptionDate).toISOString();

    const purchaseData: any = {
      supplierId: selectedSupplierId || '',
      supplierName: supplierName || 'Inconnu',
      items: purchaseItems,
      invoiceNumber: autoInvoiceNum,
      total: totalValue,
      totalAmount: totalValue,
      date: effectiveIsoDate,
      updatedAt: new Date().toISOString(),
      status: purchaseStatus,
      paymentStatus: computedPaymentStatus,
      paidAmount: paidAmount || 0,
      globalDiscount: globalDiscount || 0,
      globalTax: globalTax || 0,
      notes: scannedImageUrl ? 'Bon scanné par photo (Achat Intelligent)' : 'Réception enregistrée',
      documents: scannedImageUrl
        ? [{ name: `Photo Bon ${autoInvoiceNum}`, url: scannedImageUrl, type: 'image', date: new Date().toISOString() }]
        : []
    };

    let purchaseId = editingPurchaseId;
    let oldPurchase: Purchase | undefined;
    
    const snakePurchase: any = convertKeysToSnake(purchaseData);
    snakePurchase.total_amount = snakePurchase.total;
    delete snakePurchase.total;

    if (editingPurchaseId) {
       oldPurchase = purchases.find(p => p.id === editingPurchaseId);
       await localDb.update(`purchases/${editingPurchaseId}`, purchaseData);
    } else {
       purchaseId = Math.random().toString(36).substring(2, 11);
       purchaseData.id = purchaseId;
       await localDb.insert(`purchases/${purchaseId}`, purchaseData);
    }

    // Sauvegarder la photo scannée dans un cache local dédié par ID d'achat pour accès immédiat hors-ligne
    if (scannedImageUrl && purchaseId) {
      try {
        const rawCache = localStorage.getItem('nexus_scanned_vouchers_v1');
        const parsedCache = rawCache ? JSON.parse(rawCache) : {};
        parsedCache[purchaseId] = scannedImageUrl;
        if (autoInvoiceNum) parsedCache[autoInvoiceNum] = scannedImageUrl;
        // Garder les 30 derniers bons scannés en cache rapide
        const keys = Object.keys(parsedCache);
        if (keys.length > 60) {
          delete parsedCache[keys[0]];
        }
        localStorage.setItem('nexus_scanned_vouchers_v1', JSON.stringify(parsedCache));
      } catch (_) {}
    }

    // Instantly update Zustand store AND IndexedDB cache (nexus_purchases_cache) so the UI and reloads are 100% synced
    useFinanceStore.setState(state => {
      const idx = state.purchases.findIndex(p => p.id === purchaseId);
      let updated;
      if (idx > -1) {
        updated = [...state.purchases];
        updated[idx] = { ...updated[idx], ...purchaseData, id: purchaseId };
      } else {
        updated = [{ ...purchaseData, id: purchaseId }, ...state.purchases];
      }
      import('idb-keyval').then(({ set: idbSet }) => {
        idbSet('nexus_purchases_cache', updated).catch(() => {});
      }).catch(() => {});
      return { purchases: updated };
    });

    let oldDebt = 0;
    if (oldPurchase && oldPurchase.status === 'completed') {
       oldDebt = oldPurchase.total - (oldPurchase.paidAmount || 0);
       if (oldDebt < 0) oldDebt = 0;
    }
    
    let newDebt = 0;
    if (purchaseStatus === 'completed') {
       newDebt = purchaseData.total - (purchaseData.paidAmount || 0);
       if (newDebt < 0) newDebt = 0;
    }

    const debtDelta = newDebt - oldDebt;
    if (debtDelta !== 0) {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      if (supplier) {
        await localDb.update(`suppliers/${supplier.id}`, {
          ...supplier,
          balance: (supplier.balance || 0) + debtDelta
        });
      }
    }

    const stockDeltas: Record<string, number> = {};
    if (oldPurchase && oldPurchase.status === 'completed') {
       safeGetItems(oldPurchase).forEach((item: any) => {
         if (item && item.productId) {
           const product = products.find(p => p.id === item.productId);
           if (product?.isBundle && product.bundleItems) {
             product.bundleItems.forEach(bi => {
               stockDeltas[bi.productId] = (stockDeltas[bi.productId] || 0) - (item.quantity * bi.quantity);
             });
           } else {
             stockDeltas[item.productId] = (stockDeltas[item.productId] || 0) - (item.quantity || 0);
           }
         }
       });
    }
    if (purchaseStatus === 'completed') {
       purchaseItems.forEach(item => {
         if (item.productId) {
           const product = products.find(p => p.id === item.productId);
           if (product?.isBundle && product.bundleItems) {
             product.bundleItems.forEach(bi => {
               stockDeltas[bi.productId] = (stockDeltas[bi.productId] || 0) + (item.quantity * bi.quantity);
             });
           } else {
             stockDeltas[item.productId] = (stockDeltas[item.productId] || 0) + (item.quantity || 0);
           }
         }
       });
    }

    for (const productId of Object.keys(stockDeltas)) {
       const delta = stockDeltas[productId];
       const product = products.find(p => p.id === productId);
       if (product) {
          const newStockVal = (Number(product.stock) || 0) + delta;
          const updates: any = {
             stock: newStockVal,
             updatedAt: new Date().toISOString()
          };
          
          const newItem = purchaseItems.find(i => i.productId === productId);
          if (purchaseStatus === 'completed' && newItem && newItem.costPrice !== undefined) {
             updates.costPrice = newItem.costPrice;
             let newSellPrice = product.price || 0;
             if (autoMargin && newItem.costPrice > (product.costPrice || 0)) {
                const oldCost = product.costPrice || 0;
                const oldPrice = product.price || 0;
                if (oldCost > 0) {
                  const marginPercent = (oldPrice - oldCost) / oldCost;
                  newSellPrice = parseFloat((newItem.costPrice * (1 + marginPercent)).toFixed(2));
                  updates.price = newSellPrice;
                }
             }
             const prevHistory = Array.isArray(product.priceHistory) ? product.priceHistory : [];
             updates.priceHistory = [
               {
                 date: purchaseData.date,
                 price: newSellPrice,
                 costPrice: Number(newItem.costPrice) || 0,
                 supplierName: purchaseData.supplierName,
                 invoiceNumber: autoInvoiceNum,
                 purchaseId
               },
               ...prevHistory.slice(0, 29)
             ];
          }
          if (productId && productId !== 'undefined') {
            await localDb.update(`products/${productId}`, updates);
            window.dispatchEvent(new CustomEvent('product-cache-update', { detail: { ...product, ...updates } }));
          }
       }
    }

    try {
      localStorage.removeItem('nexus_purchase_draft');
    } catch (_) {}

    setLastPurchaseItems(purchaseItems);
    setStep('updatePrices');
    toast.success(`Bon d'achat (${autoInvoiceNum}) enregistré avec succès dans l'historique produit !`);
  } catch (error: any) {
    console.error("Confirmation error:", error);
    toast.error(`Erreur lors de l'enregistrement de l'achat : ${error?.message || error}`);
  } finally {
    setIsProcessing(false);
  }
}

export interface SupplierPaymentParams {
  supplierId: string;
  amount: number;
  method: string;
  note: string;
  date: string;
  suppliers: Supplier[];
  setIsProcessing: (v: boolean) => void;
  setIsPaymentModalOpen: (v: boolean) => void;
  setPaymentData: (v: any) => void;
}

export async function handleSupplierPaymentDb({
  supplierId,
  amount,
  method,
  note,
  date,
  suppliers,
  setIsProcessing,
  setIsPaymentModalOpen,
  setPaymentData
}: SupplierPaymentParams) {
  if (!supplierId || amount <= 0) return;
  setIsProcessing(true);
  try {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) throw new Error('Fournisseur introuvable');

    let paymentDate = new Date().toISOString();
    if (date) {
        paymentDate = new Date(date).toISOString();
    }

    const paymentId = Math.random().toString(36).substring(2, 11);
    const payment = {
      id: paymentId,
      supplierId,
      supplierName: supplier.name,
      amount,
      date: paymentDate,
      method,
      note
    };
    
    await localDb.insert(`supplierPayments/${paymentId}`, payment);

    await localDb.update(`suppliers/${supplierId}`, {
      ...supplier,
      balance: (supplier.balance || 0) - amount
    });

    toast.success("Paiement fournisseur enregistré avec succès !");
    setIsPaymentModalOpen(false);
    setPaymentData({ supplierId: '', amount: 0, method: 'cash', note: '', date: new Date().toISOString() });
  } catch (error: any) {
     console.error("Error submitting supplier payment:", error);
     toast.error("Erreur: " + (error?.message || "Erreur inconnue"));
  } finally {
    setIsProcessing(false);
  }
}

export interface ReceiveOrderParams {
  order: PurchaseOrder;
  suppliers: Supplier[];
  products: Product[];
  setIsProcessing: (v: boolean) => void;
  setActiveSubTab: (v: any) => void;
}

export async function handleReceiveOrderDb({
  order,
  suppliers,
  products,
  setIsProcessing,
  setActiveSubTab
}: ReceiveOrderParams) {
  setIsProcessing(true);
  try {
    const newPurchaseId = 'pur_' + Math.random().toString(36).substring(2, 11);
    const purchaseData: any = {
      supplierId: order.supplierId || '',
      supplierName: suppliers.find(s => s.id === order.supplierId)?.name || 'Unknown',
      items: safeGetItems(order).map((item: any) => ({
        productId: item.productId || '',
        name: item.productName || item.name || 'Unknown Product',
        quantity: Number(item.quantity) || 0,
        costPrice: Number(item.price || item.costPrice) || 0
      })),
      total: order.total || 0,
      invoiceNumber: order.orderNumber || '',
      date: new Date().toISOString(),
      status: 'completed',
      paymentStatus: 'unpaid',
      paidAmount: 0
    };

    await localDb.insert(`purchases/${newPurchaseId}`, { ...purchaseData, id: newPurchaseId });

    // Instantly update Zustand store so the UI is updated immediately
    useFinanceStore.setState(state => {
      const purchaseItem = { ...purchaseData, id: newPurchaseId };
      const idx = state.purchases.findIndex(p => p.id === newPurchaseId);
      let updated;
      if (idx > -1) {
        updated = [...state.purchases];
        updated[idx] = { ...updated[idx], ...purchaseItem };
      } else {
        updated = [purchaseItem, ...state.purchases];
      }
      return { purchases: updated };
    });

    for (const item of order.items) {
      if (item.productId) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          if (product.isBundle && product.bundleItems) {
            for (const bi of product.bundleItems) {
              if (bi.productId && bi.productId !== 'undefined') {
                const targetProd = products.find(p => p.id === bi.productId);
                if (targetProd) {
                  enqueueStockAdjustment(bi.productId, (item.quantity || 0) * bi.quantity);
                  localDb.update(`products/${bi.productId}`, { updatedAt: new Date().toISOString() });
                }
              }
            }
            localDb.update(`products/${item.productId}`, {
              costPrice: item.price || 0,
              updatedAt: new Date().toISOString()
            });
          } else {
            enqueueStockAdjustment(item.productId, item.quantity || 0);
            localDb.update(`products/${item.productId}`, {
              costPrice: item.price || 0,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    }

    await localDb.update(`purchaseOrders/${order.id}`, {
      status: 'received'
    });

    setActiveSubTab('purchases');
    toast.success('Commande reçue avec succès.');
  } catch (error) {
    console.error("Error receiving order:", error);
    toast.error("Erreur lors de la réception de la commande.");
  } finally {
    setIsProcessing(false);
  }
}

export interface DeletePurchaseParams {
  purchaseId: string;
  setIsProcessing: (v: boolean) => void;
  setPurchaseToDelete: (v: string | null) => void;
}

export async function handleDeletePurchaseDb({
  purchaseId,
  setIsProcessing,
  setPurchaseToDelete
}: DeletePurchaseParams) {
  setIsProcessing(true);
  try {
    // 1. Récupérer les détails du bon d'achat avant suppression pour inverser le stock et la dette fournisseur
    const financeState = useFinanceStore.getState();
    let targetPurchase: any = (financeState.purchases || []).find(p => p && String(p.id) === String(purchaseId));
    if (!targetPurchase) {
      const snap = await localDb.get(`purchases/${purchaseId}`);
      if (snap.exists()) {
        targetPurchase = snap.val();
      }
    }

    const allProducts: Product[] = useCoreStore.getState().products || [];
    const allSuppliers: Supplier[] = usePeopleStore.getState().suppliers || [];
    let adjustedProductsCount = 0;
    let totalUnitsDeducted = 0;

    // 2. Si le bon avait été réceptionné (status 'completed' ou par défaut hors 'draft'/'ordered'), déduire les quantités du stock
    if (targetPurchase && targetPurchase.status !== 'draft' && targetPurchase.status !== 'ordered') {
      const purchaseItems = safeGetItems(targetPurchase);
      const stockDeltas: Record<string, number> = {};

      purchaseItems.forEach((item: any) => {
        const prodId = item?.productId || item?.product_id || item?.id;
        const qty = Number(item?.quantity) || 0;
        if (prodId && qty > 0) {
          const product = allProducts.find(p => p && String(p.id) === String(prodId));
          if (product?.isBundle && Array.isArray(product.bundleItems) && product.bundleItems.length > 0) {
            product.bundleItems.forEach(bi => {
              if (bi.productId) {
                stockDeltas[bi.productId] = (stockDeltas[bi.productId] || 0) - (qty * (Number(bi.quantity) || 1));
              }
            });
          } else {
            stockDeltas[prodId] = (stockDeltas[prodId] || 0) - qty;
          }
        }
      });

      const invNum = targetPurchase.invoiceNumber || targetPurchase.invoice_number || '';

      for (const [prodId, delta] of Object.entries(stockDeltas)) {
        if (!prodId || delta === 0) continue;
        const product = allProducts.find(p => p && String(p.id) === String(prodId));
        if (product) {
          const currentStock = Number(product.stock) || 0;
          const newStockVal = Math.max(0, currentStock + delta);
          totalUnitsDeducted += Math.abs(delta);
          adjustedProductsCount++;

          // Nettoyer l'entrée correspondante dans priceHistory et restaurer l'ancien prix d'achat si disponible
          const prevHistory = Array.isArray(product.priceHistory) ? product.priceHistory : [];
          const filteredHistory = prevHistory.filter((entry: any) => {
            if (entry?.purchaseId && String(entry.purchaseId) === String(purchaseId)) return false;
            if (invNum && entry?.invoiceNumber && String(entry.invoiceNumber) === String(invNum)) return false;
            return true;
          });

          const updates: any = {
            stock: newStockVal,
            priceHistory: filteredHistory,
            updatedAt: new Date().toISOString()
          };

          if (filteredHistory.length > 0 && filteredHistory[0]?.costPrice !== undefined) {
            updates.costPrice = Number(filteredHistory[0].costPrice) || product.costPrice;
          }

          await localDb.update(`products/${prodId}`, updates);
          window.dispatchEvent(new CustomEvent('product-cache-update', { detail: { ...product, ...updates } }));

          if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
            supabase
              .from('products')
              .update({
                stock: newStockVal,
                cost_price: updates.costPrice ?? product.costPrice,
                price_history: filteredHistory,
                updated_at: updates.updatedAt
              })
              .eq('id', prodId)
              .then(() => {})
              .catch(() => {});
          }
        }
      }

      // 3. Réajuster automatiquement la dette du fournisseur (supplier.balance)
      const supplierId = targetPurchase.supplierId || targetPurchase.supplier_id;
      const totalVal = Number(targetPurchase.total ?? targetPurchase.totalAmount ?? targetPurchase.total_amount ?? 0);
      const paidVal = Number(targetPurchase.paidAmount ?? targetPurchase.paid_amount ?? 0);
      const debtToReverse = Math.max(0, totalVal - paidVal);

      if (supplierId && debtToReverse > 0) {
        const supplier = allSuppliers.find(s => s && String(s.id) === String(supplierId));
        if (supplier) {
          const newBalance = Math.max(0, (Number(supplier.balance) || 0) - debtToReverse);
          const updatedSupplier = {
            ...supplier,
            balance: newBalance,
            updatedAt: new Date().toISOString()
          };
          await localDb.update(`suppliers/${supplier.id}`, updatedSupplier);
          usePeopleStore.setState(state => ({
            suppliers: (state.suppliers || []).map(s => s.id === supplier.id ? updatedSupplier : s)
          }));
          if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
            supabase
              .from('suppliers')
              .update({ balance: newBalance, updated_at: updatedSupplier.updatedAt })
              .eq('id', supplier.id)
              .then(() => {})
              .catch(() => {});
          }
        }
      }
    }

    // 4. Supprimer le bon d'achat de la base locale (purge nexus_db_purchases + nexus_purchases_cache + tombstone)
    await localDb.delete(`purchases/${purchaseId}`);
    try {
      await localDb.delete(`goodsReceiptNotes/${purchaseId}`);
    } catch (_) {}

    if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
      await Promise.allSettled([
        supabase.from('purchases').delete().eq('id', purchaseId),
        supabase.from('goods_receipt_notes').delete().eq('id', purchaseId)
      ]);
    }
    
    // 5. Mettre à jour immédiatement le store Zustand
    useFinanceStore.setState(state => ({
      purchases: state.purchases.filter(p => p.id !== purchaseId)
    }));
    
    setPurchaseToDelete(null);
    if (adjustedProductsCount > 0) {
      toast.success(`Bon d'achat supprimé et stock réajusté automatiquement (-${totalUnitsDeducted} u. sur ${adjustedProductsCount} article(s)) !`);
    } else {
      toast.success("Bon d'achat supprimé définitivement (Local + Cloud).");
    }
  } catch (error: any) {
    console.error("Error deleting purchase:", error);
    toast.error("Erreur de suppression : " + error.message);
  } finally {
    setIsProcessing(false);
  }
}

export interface QuickSupplierParams {
  quickSupplierData: {
    name: string;
    contactName?: string;
    phone: string;
    email: string;
    address?: string;
    balance?: string | number;
    deliveryDays?: string[];
    paymentDays?: string[];
    planningNotes?: string;
  };
  suppliers: Supplier[];
  setSelectedSupplierId: (v: string) => void;
  setIsQuickSupplierModalOpen: (v: boolean) => void;
  setQuickSupplierData: (v: any) => void;
}

export async function handleQuickSupplierSubmitDb({
  quickSupplierData,
  suppliers,
  setSelectedSupplierId,
  setIsQuickSupplierModalOpen,
  setQuickSupplierData
}: QuickSupplierParams) {
  const trimmedName = (quickSupplierData.name || '').trim();
  if (!trimmedName) {
    toast.error("Le nom du fournisseur est obligatoire.");
    return;
  }

  const duplicate = suppliers.find(s => (s?.name || '').toLowerCase() === trimmedName.toLowerCase());
  if (duplicate) {
    toast.warning(`Un fournisseur nommé "${duplicate.name}" existe déjà.`);
    setSelectedSupplierId(duplicate.id);
    setIsQuickSupplierModalOpen(false);
    setQuickSupplierData({ name: '', contactName: '', phone: '', email: '', address: '', balance: 0, deliveryDays: [], paymentDays: [], planningNotes: '' });
    return;
  }

  try {
    const supplierId = generateUniqueId();
    const newSupplier: any = {
      id: supplierId,
      name: trimmedName,
      contactName: (quickSupplierData.contactName || '').trim(),
      phone: (quickSupplierData.phone || '').trim(),
      email: (quickSupplierData.email || '').trim().toLowerCase(),
      address: (quickSupplierData.address || '').trim(),
      balance: parseFloat(String(quickSupplierData.balance || '0')) || 0,
      deliveryDays: Array.isArray(quickSupplierData.deliveryDays) ? quickSupplierData.deliveryDays : [],
      paymentDays: Array.isArray(quickSupplierData.paymentDays) ? quickSupplierData.paymentDays : [],
      planningNotes: (quickSupplierData.planningNotes || '').trim(),
      updatedAt: new Date().toISOString()
    };

    await localDb.insert(`suppliers/${supplierId}`, newSupplier);
    try {
      const { usePeopleStore } = await import('../../store/usePeopleStore');
      usePeopleStore.setState(state => ({
        suppliers: [newSupplier, ...(state.suppliers || [])]
      }));
    } catch (_) {}

    setSelectedSupplierId(supplierId);
    setIsQuickSupplierModalOpen(false);
    setQuickSupplierData({ name: '', contactName: '', phone: '', email: '', address: '', balance: 0, deliveryDays: [], paymentDays: [], planningNotes: '' });
    toast.success(`Fournisseur "${trimmedName}" créé et sélectionné avec succès !`);
  } catch (error: any) {
     console.error("Error creating supplier:", error);
     toast.error("Erreur de création: " + (error?.message || "Erreur inconnue"));
  }
}
