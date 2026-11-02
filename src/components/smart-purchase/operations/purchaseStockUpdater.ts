import { enqueueStockAdjustment } from '../../../services/SyncService';
import { localDb } from '../../../services/LocalDatabase';
import { safeGetItems } from '../../../lib/utils';
import { Product, Purchase } from '../../../types';
import { useCoreStore } from '../../../store/useCoreStore';

interface UpdateStockParams {
  products: Product[];
  purchaseItems: any[];
  oldPurchase: Purchase | undefined;
  purchaseStatus: 'draft' | 'ordered' | 'completed';
  autoMargin: boolean;
  purchaseData: any;
  purchaseId: string;
  autoInvoiceNum: string;
}

export async function updateStockAndProductPricesAfterPurchase({
  products,
  purchaseItems,
  oldPurchase,
  purchaseStatus,
  autoMargin,
  purchaseData,
  purchaseId,
  autoInvoiceNum
}: UpdateStockParams) {
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
    if (!product) continue;

    const newStockVal = (Number(product.stock) || 0) + delta;
    const updates: any = {
      stock: newStockVal,
      updatedAt: new Date().toISOString()
    };
    
    const newItem = purchaseItems.find(i => i.productId === productId);
    if (purchaseStatus === 'completed' && newItem && newItem.costPrice !== undefined) {
      const incomingCost = Number(newItem.costPrice) || 0;
      const currentStock = Number(product.stock) || 0;
      const currentCost = Number(product.costPrice) || 0;
      let calculatedPmp = incomingCost;
      if (currentStock > 0 && currentCost > 0 && delta > 0 && incomingCost > 0) {
        const totalVal = (currentStock * currentCost) + (delta * incomingCost);
        const totalQty = currentStock + delta;
        calculatedPmp = totalQty > 0 ? Number((totalVal / totalQty).toFixed(2)) : incomingCost;
      }
      updates.costPrice = incomingCost;
      updates.pmp = calculatedPmp;
      let newSellPrice = product.price || 0;
      if (autoMargin && incomingCost > (product.costPrice || 0)) {
        const oldCost = product.costPrice || 0;
        const oldPrice = product.price || 0;
        if (oldCost > 0) {
          const marginPercent = (oldPrice - oldCost) / oldCost;
          newSellPrice = parseFloat((incomingCost * (1 + marginPercent)).toFixed(2));
          updates.price = newSellPrice;
        }
      }
      const prevHistory = Array.isArray(product.priceHistory) ? product.priceHistory : [];
      updates.priceHistory = [
        {
          date: purchaseData.date,
          price: newSellPrice,
          costPrice: incomingCost,
          supplierName: purchaseData.supplierName,
          invoiceNumber: autoInvoiceNum,
          purchaseId
        },
        ...prevHistory.slice(0, 29)
      ];
    }

    if (productId && productId !== 'undefined') {
      const fullUpdatedProduct = { ...product, ...updates };
      await (localDb.updateLocalOnly ?? localDb.update)(`products/${productId}`, fullUpdatedProduct);
      useCoreStore.setState(state => ({
        products: (state.products || []).map(p => p.id === productId ? fullUpdatedProduct : p)
      }));
      window.dispatchEvent(new CustomEvent('product-cache-update', { detail: fullUpdatedProduct }));

      // 🛡️ Synchronisation atomique du stock avec Supabase via delta relatif uniquement
      if (delta !== 0) {
        enqueueStockAdjustment(productId, delta);
      }

      // Propager uniquement les colonnes hors-stock (prix/historique) via la file de synchro
      const { stock: _ignoredStock, ...nonStockUpdates } = updates;
      if (Object.keys(nonStockUpdates).some(k => k !== 'updatedAt')) {
        const { enqueueSync } = await import('../../../services/SyncService');
        enqueueSync('products', productId, 'UPSERT', { id: productId, ...nonStockUpdates });
      }
    }
  }
}
