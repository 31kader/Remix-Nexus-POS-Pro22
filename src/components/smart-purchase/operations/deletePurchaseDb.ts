import { convertKeysToSnake } from '../../../lib/db-converters';
import { enqueueStockAdjustment } from '../../../services/SyncService';
import { localDb } from '../../../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../../../supabase';
import { generateUniqueId, safeGetItems } from '../../../lib/utils';
import { Product, Supplier, InvoicePattern, Purchase, PurchaseOrder, CompanySettings } from '../../../types';
import { PurchaseCartItem } from '../../../hooks/usePurchaseCart';
import { toast } from 'sonner';
import { safeOptionalMutation } from '../../../lib/supabase/safeOptional';
import { useFinanceStore } from '../../../store/useFinanceStore';
import { useCoreStore } from '../../../store/useCoreStore';
import { usePeopleStore } from '../../../store/usePeopleStore';


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
    if (!targetPurchase) {
      try {
        const { get: idbGet } = await import('idb-keyval');
        const cachedPurchases = await idbGet<any[]>('nexus_purchases_cache');
        if (Array.isArray(cachedPurchases)) {
          targetPurchase = cachedPurchases.find(p => p && String(p.id) === String(purchaseId));
        }
      } catch (_) {}
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
        const rawProdId = item?.productId || item?.product_id || item?.id;
        const qty = Number(item?.quantity) || 0;
        if (qty <= 0) return;

        let product = rawProdId ? allProducts.find(p => p && String(p.id) === String(rawProdId)) : undefined;
        if (!product && item?.name) {
          const normalizedItemName = String(item.name).trim().toLowerCase();
          product = allProducts.find(p => p && String(p.name || '').trim().toLowerCase() === normalizedItemName);
        }
        if (!product && item?.barcode) {
          const normalizedBarcode = String(item.barcode).trim();
          product = allProducts.find(p => p && String(p.barcode || '').trim() === normalizedBarcode);
        }

        const prodId = product?.id || rawProdId;
        if (prodId) {
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

          const fullUpdatedProduct = { ...product, ...updates };
          await (localDb.updateLocalOnly ?? localDb.update)(`products/${prodId}`, fullUpdatedProduct);
          useCoreStore.setState(state => {
            const nextProducts = (state.products || []).map(p => p.id === prodId ? fullUpdatedProduct : p);
            import('idb-keyval').then(({ set: idbSet }) => {
              idbSet('nexus_products_cache', nextProducts).catch(() => {});
            }).catch(() => {});
            return { products: nextProducts };
          });
          window.dispatchEvent(new CustomEvent('product-cache-update', { detail: fullUpdatedProduct }));

          // 🛡️ Déstockage atomique Supabase via delta négatif uniquement
          if (delta !== 0) {
            enqueueStockAdjustment(prodId, delta);
          }

          const { enqueueSync } = await import('../../../services/SyncService');
          enqueueSync('products', prodId, 'UPSERT', {
            id: prodId,
            costPrice: updates.costPrice ?? product.costPrice,
            priceHistory: filteredHistory,
            updatedAt: updates.updatedAt
          });
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
          const newBalance = (Number(supplier.balance) || 0) - debtToReverse;
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
