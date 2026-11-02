import { CartItem, Product, normalizeBatches } from '../../types';
import { enqueueStockAdjustment, enqueueSync } from '../../services/SyncService';
import { localDb } from '../../services/LocalDatabase';
import { generateUniqueId } from '../../lib/utils';

export interface ProcessNewSaleStockParams {
  safeCart: CartItem[];
  getProductFromTemp: (id: string) => Product | undefined;
  updateTempProductStock: (id: string, newStock: number, newBatches?: any[]) => void;
}

export function processNewSaleStock({
  safeCart,
  getProductFromTemp,
  updateTempProductStock
}: ProcessNewSaleStockParams) {
  // Parcours sécurisé du panier pour les stocks (Nouvelle Vente)
  // 🛡️ CONSOLIDATION PRÉALABLE DU PANIER :
  // Consolidation des quantités par article pour émettre un ajustement unique
  const consolidatedMap = new Map<string, {
    item: CartItem;
    totalQuantity: number;
  }>();

  for (const item of safeCart) {
    if (!item || !item.id || item.id === 'undefined') continue;
    const existing = consolidatedMap.get(item.id);
    const q = Number(item.quantity) || 1;
    if (existing) {
      existing.totalQuantity += q;
    } else {
      consolidatedMap.set(item.id, {
        item,
        totalQuantity: q
      });
    }
  }

  // 🛡️ Consolidation préalable des composants de bundle pour nouvelle vente
  const consolidatedBundleQuantities = new Map<string, number>();
  for (const { item, totalQuantity } of consolidatedMap.values()) {
    if (item.isBundle && item.bundleItems) {
      const safeBundleItems = Array.isArray(item.bundleItems) ? item.bundleItems : [];
      for (const bundleItem of safeBundleItems) {
        if (!bundleItem || !bundleItem.productId) continue;
        const qtyDeducted = (Number(bundleItem.quantity) || 1) * totalQuantity;
        consolidatedBundleQuantities.set(
          bundleItem.productId,
          (consolidatedBundleQuantities.get(bundleItem.productId) || 0) + qtyDeducted
        );
      }
    }
  }

  for (const [compProdId, totalCompQty] of consolidatedBundleQuantities.entries()) {
    if (totalCompQty <= 0) continue;
    const comp = getProductFromTemp(compProdId);
    if (comp) {
      const newCompStock = comp.stock - totalCompQty;
      enqueueStockAdjustment(comp.id, -totalCompQty);
      updateTempProductStock(comp.id, newCompStock);

      localDb.updateLocalOnly(`products/${comp.id}`, {
        stock: newCompStock,
        updatedAt: new Date().toISOString()
      });

      window.dispatchEvent(new CustomEvent('product-cache-update', {
        detail: getProductFromTemp(comp.id)
      }));
    }
  }

  for (const { item, totalQuantity } of consolidatedMap.values()) {
    if (item.isBundle) continue;
    const product = getProductFromTemp(item.id);
    if (product) {
      let updatedBatches = normalizeBatches(product.batches).map(b => ({ ...b }));
      const newStock = product.stock - totalQuantity;

      if (newStock < 0 && product.autoUnpack && product.parentId && product.unitsPerParent && product.unitsPerParent > 0) {
        const parent = getProductFromTemp(product.parentId);
        if (parent) {
          const parentsNeeded = Math.ceil(-newStock / product.unitsPerParent);
          const newParentStock = parent.stock - parentsNeeded;
          enqueueStockAdjustment(parent.id, -parentsNeeded);
          updateTempProductStock(parent.id, newParentStock);
          
          localDb.updateLocalOnly(`products/${parent.id}`, {
            stock: newParentStock,
            updatedAt: new Date().toISOString()
          });
          
          window.dispatchEvent(new CustomEvent('product-cache-update', {
            detail: getProductFromTemp(parent.id)
          }));
          
          const unpackedUnits = parentsNeeded * product.unitsPerParent;
          const finalStock = product.stock + unpackedUnits - totalQuantity;
          const adjustedQty = -totalQuantity + unpackedUnits;
          enqueueStockAdjustment(item.id, adjustedQty);

          if (product.useMultiExpiry) {
            const parentBatches = normalizeBatches(parent.batches);
            const sourceExpiry = parentBatches[0]?.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
            updatedBatches.push({
              id: generateUniqueId(),
              batchNumber: `UNPACK-${Date.now().toString(36).toUpperCase()}`,
              stock: unpackedUnits,
              expirationDate: sourceExpiry
            });

            let rem = totalQuantity;
            updatedBatches.sort((a, b) => new Date(a.expirationDate || 0).getTime() - new Date(b.expirationDate || 0).getTime());
            for (let b of updatedBatches) {
              if (rem <= 0) break;
              if (b && b.stock > 0) {
                const deduct = Math.min(b.stock, rem);
                b.stock -= deduct;
                rem -= deduct;
              }
            }
            if (rem > 0 && updatedBatches[updatedBatches.length - 1]) {
              updatedBatches[updatedBatches.length - 1].stock -= rem;
            }

            enqueueSync('products', item.id, 'UPSERT', {
              id: item.id,
              batches: updatedBatches,
              updatedAt: new Date().toISOString()
            });
          }

          updateTempProductStock(item.id, finalStock, product.useMultiExpiry ? updatedBatches : product.batches);
          
          localDb.updateLocalOnly(`products/${item.id}`, {
            stock: finalStock,
            updatedAt: new Date().toISOString(),
            batches: product.useMultiExpiry ? updatedBatches : product.batches
          });
          
          window.dispatchEvent(new CustomEvent('product-cache-update', {
            detail: getProductFromTemp(item.id)
          }));
        }
      } else {
        if (product.useMultiExpiry && updatedBatches.length > 0) {
          let rem = totalQuantity;
          updatedBatches.sort((a, b) => new Date(a.expirationDate || 0).getTime() - new Date(b.expirationDate || 0).getTime());
          for (let b of updatedBatches) {
            if (rem <= 0) break;
            if (b && b.stock > 0) {
              const deduct = Math.min(b.stock, rem);
              b.stock -= deduct;
              rem -= deduct;
            }
          }
          if (rem > 0 && updatedBatches[updatedBatches.length - 1]) {
            updatedBatches[updatedBatches.length - 1].stock -= rem;
          }

          enqueueSync('products', item.id, 'UPSERT', {
            id: item.id,
            batches: updatedBatches,
            updatedAt: new Date().toISOString()
          });
        }

        enqueueStockAdjustment(item.id, -totalQuantity);
        updateTempProductStock(item.id, newStock, product.useMultiExpiry ? updatedBatches : product.batches);
        
        localDb.updateLocalOnly(`products/${item.id}`, {
          stock: newStock,
          updatedAt: new Date().toISOString(),
          batches: product.useMultiExpiry ? updatedBatches : product.batches
        });
        
        window.dispatchEvent(new CustomEvent('product-cache-update', {
          detail: getProductFromTemp(item.id)
        }));
      }
    }
  }
}
