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

    // 🛡️ Consolidation préalable par productId (Règle Anti-Écrasement GEMINI.md)
    const consolidatedStockDeltas = new Map<string, number>();
    const consolidatedCostPrices = new Map<string, number>();
    const consolidatedPmpPrices = new Map<string, number>();

    for (const item of safeGetItems(order)) {
      if (item.productId) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const incomingCost = Number(item.price) || 0;
          const currentStock = Number(product.stock) || 0;
          const currentCost = Number(product.costPrice) || 0;
          const deltaQty = Number(item.quantity) || 0;
          let calculatedCost = incomingCost;
          if (currentStock > 0 && currentCost > 0 && deltaQty > 0 && incomingCost > 0) {
            const totalVal = (currentStock * currentCost) + (deltaQty * incomingCost);
            const totalQty = currentStock + deltaQty;
            calculatedCost = totalQty > 0 ? Number((totalVal / totalQty).toFixed(2)) : incomingCost;
          }
          consolidatedCostPrices.set(item.productId, incomingCost);
          consolidatedPmpPrices.set(item.productId, calculatedCost);
          if (product.isBundle && product.bundleItems) {
            for (const bi of product.bundleItems) {
              if (bi.productId && bi.productId !== 'undefined') {
                const targetProd = products.find(p => p.id === bi.productId);
                if (targetProd) {
                  const delta = (item.quantity || 0) * bi.quantity;
                  consolidatedStockDeltas.set(bi.productId, (consolidatedStockDeltas.get(bi.productId) || 0) + delta);
                }
              }
            }
          } else {
            const delta = item.quantity || 0;
            consolidatedStockDeltas.set(item.productId, (consolidatedStockDeltas.get(item.productId) || 0) + delta);
          }
        }
      }
    }

    const nowIso = new Date().toISOString();
    const touchedProductIds = new Set<string>([
      ...Array.from(consolidatedStockDeltas.keys()),
      ...Array.from(consolidatedCostPrices.keys())
    ]);

    for (const prodId of touchedProductIds) {
      const targetProd = products.find(p => p.id === prodId);
      if (!targetProd) continue;
      const delta = consolidatedStockDeltas.get(prodId) || 0;
      const newCost = consolidatedCostPrices.get(prodId);
      const newPmp = consolidatedPmpPrices.get(prodId);
      const nextStock = (Number(targetProd.stock) || 0) + delta;

      const prodUpdates: Record<string, any> = {
        updatedAt: nowIso
      };
      if (delta !== 0) prodUpdates.stock = nextStock;
      if (newCost !== undefined) prodUpdates.costPrice = newCost;
      if (newPmp !== undefined) prodUpdates.pmp = newPmp;

      if (delta !== 0) {
        enqueueStockAdjustment(prodId, delta);
      }
      await localDb.updateLocalOnly(`products/${prodId}`, { ...targetProd, ...prodUpdates });
      if (newCost !== undefined) {
        const { enqueueSync } = await import('../../../services/SyncService');
        enqueueSync('products', prodId, 'UPSERT', { id: prodId, costPrice: newCost, updatedAt: nowIso });
      }
      useCoreStore.setState(state => ({
        products: (state.products || []).map(p => p.id === prodId ? { ...p, ...prodUpdates } : p)
      }));
    }

    // 🛡️ Mise à jour de la dette fournisseur pour le bon de commande réceptionné
    if (order.supplierId && (order.total || 0) > 0) {
      const supplier = suppliers.find(s => s.id === order.supplierId);
      if (supplier) {
        const debtToAdd = order.total || 0;
        const updatedSupplier = {
          ...supplier,
          balance: (supplier.balance || 0) + debtToAdd,
          updatedAt: nowIso
        };
        await localDb.update(`suppliers/${supplier.id}`, updatedSupplier);
        usePeopleStore.setState(state => ({
          suppliers: (state.suppliers || []).map(s => s.id === supplier.id ? updatedSupplier : s)
        }));
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
