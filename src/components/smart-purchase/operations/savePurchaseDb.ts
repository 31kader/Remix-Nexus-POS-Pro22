import { convertKeysToSnake } from '../../../lib/db-converters';
import { localDb } from '../../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../../supabase';
import { generateUniqueId } from '../../../lib/utils';
import { Product, Supplier, InvoicePattern, Purchase } from '../../../types';
import { PurchaseCartItem } from '../../../hooks/usePurchaseCart';
import { toast } from 'sonner';
import { safeOptionalMutation } from '../../../lib/supabase/safeOptional';
import { useFinanceStore } from '../../../store/useFinanceStore';
import { updateSupplierDebtAfterPurchase } from './purchaseSupplierDebtUpdater';
import { updateStockAndProductPricesAfterPurchase } from './purchaseStockUpdater';

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

    // 1. Mettre à jour la dette et solde fournisseur
    await updateSupplierDebtAfterPurchase({
      suppliers,
      selectedSupplierId,
      oldPurchase,
      purchaseStatus,
      totalValue,
      paidAmount
    });

    // 2. Mettre à jour les stocks et prix des produits
    await updateStockAndProductPricesAfterPurchase({
      products,
      purchaseItems,
      oldPurchase,
      purchaseStatus,
      autoMargin,
      purchaseData,
      purchaseId: purchaseId || '',
      autoInvoiceNum
    });

    // 3. Apprentissage OCR / Fournisseur (Local d'abord, réplication cloud non-bloquante)
    try {
      const generateUuid = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      const patternId = existingPattern?.id || generateUuid();
      await localDb.insert(`invoicePatterns/${patternId}`, { ...patternData, id: patternId });

      if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
        if (existingPattern?.id) {
          safeOptionalMutation(
            'invoice_patterns.update',
            () => supabase.from('invoice_patterns').update(snakePattern).eq('id', existingPattern.id),
            { module: 'purchaseDbOperations', action: 'updatePattern' }
          ).catch(() => {});
        } else {
          // Évite tout 409 Conflict : vérifie d'abord si le pattern existe déjà sur Supabase
          const targetQuery = selectedSupplierId
            ? supabase.from('invoice_patterns').select('id').eq('system_supplier_id', selectedSupplierId).maybeSingle()
            : (supplierName && supplierName !== 'Inconnu')
              ? supabase.from('invoice_patterns').select('id').eq('supplier_name', supplierName).maybeSingle()
              : Promise.resolve({ data: null, error: null });

          targetQuery.then(({ data: remotePattern }: any) => {
            if (remotePattern?.id) {
              return safeOptionalMutation(
                'invoice_patterns.update',
                () => supabase.from('invoice_patterns').update(snakePattern).eq('id', remotePattern.id),
                { module: 'purchaseDbOperations', action: 'updatePattern' }
              );
            }
            return safeOptionalMutation(
              'invoice_patterns.insert',
              () => supabase.from('invoice_patterns').insert({ ...snakePattern, id: patternId }),
              { module: 'purchaseDbOperations', action: 'insertPattern' }
            );
          }).catch(() => {});
        }
      }
    } catch (patErr) {
      console.warn('[SmartPurchase] Pattern learning error ignored:', patErr);
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
