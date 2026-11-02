import { CartItem, Product, Transaction, normalizeBatches } from '../../types';
import { enqueueStockAdjustment, enqueueSync } from '../../services/SyncService';
import { localDb } from '../../services/LocalDatabase';
import { generateUniqueId } from '../../lib/utils';

export interface ProcessEditingStockParams {
  safeCart: CartItem[];
  editingTransaction?: Transaction | null;
  getProductFromTemp: (id: string) => Product | undefined;
  updateTempProductStock: (id: string, newStock: number, newBatches?: any[]) => void;
}

export function processEditingStock({
  safeCart,
  editingTransaction,
  getProductFromTemp,
  updateTempProductStock
}: ProcessEditingStockParams) {
  let oldItems: CartItem[] = [];
  if (editingTransaction && editingTransaction.items) {
    if (typeof editingTransaction.items === 'string') {
      try { oldItems = JSON.parse(editingTransaction.items); } catch { oldItems = []; }
    } else if (Array.isArray(editingTransaction.items)) {
      oldItems = editingTransaction.items;
    }
  }

  const oldQtyMap = new Map<string, { qty: number; isBundle?: boolean; bundleItems?: any[] }>();
  for (const item of oldItems) {
    if (!item || !item.id || item.id === 'undefined') continue;
    const ex = oldQtyMap.get(item.id);
    const q = Number(item.quantity || 1);
    if (ex) {
      ex.qty += q;
    } else {
      oldQtyMap.set(item.id, { qty: q, isBundle: item.isBundle, bundleItems: item.bundleItems });
    }
  }

  const newQtyMap = new Map<string, { qty: number; isBundle?: boolean; bundleItems?: any[] }>();
  for (const item of safeCart) {
    if (!item || !item.id || item.id === 'undefined') continue;
    const ex = newQtyMap.get(item.id);
    const q = Number(item.quantity || 1);
    if (ex) {
      ex.qty += q;
    } else {
      newQtyMap.set(item.id, { qty: q, isBundle: item.isBundle, bundleItems: item.bundleItems });
    }
  }

  const allItemIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
  // 🛡️ Consolidation préalable des composants de bundle pour l'édition de vente
  const consolidatedBundleDeltas = new Map<string, number>();
  for (const itemId of allItemIds) {
    const oldInfo = oldQtyMap.get(itemId);
    const newInfo = newQtyMap.get(itemId);
    const oldQty = oldInfo ? oldInfo.qty : 0;
    const newQty = newInfo ? newInfo.qty : 0;
    const delta = newQty - oldQty;
    if (delta === 0) continue;
    const isBundle = (newInfo && newInfo.isBundle) || (oldInfo && oldInfo.isBundle);
    const bundleItems = (newInfo && newInfo.bundleItems) || (oldInfo && oldInfo.bundleItems);
    if (isBundle && bundleItems) {
      const safeBundleItems = Array.isArray(bundleItems) ? bundleItems : [];
      for (const bundleItem of safeBundleItems) {
        if (!bundleItem || !bundleItem.productId) continue;
        const compDelta = bundleItem.quantity * delta;
        consolidatedBundleDeltas.set(
          bundleItem.productId,
          (consolidatedBundleDeltas.get(bundleItem.productId) || 0) + compDelta
        );
      }
    }
  }

  for (const [compProdId, totalCompDelta] of consolidatedBundleDeltas.entries()) {
    if (totalCompDelta === 0) continue;
    const comp = getProductFromTemp(compProdId);
    if (comp) {
      const newCompStock = comp.stock - totalCompDelta;
      enqueueStockAdjustment(comp.id, -totalCompDelta);
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

  for (const itemId of allItemIds) {
    const oldInfo = oldQtyMap.get(itemId);
    const newInfo = newQtyMap.get(itemId);
    const oldQty = oldInfo ? oldInfo.qty : 0;
    const newQty = newInfo ? newInfo.qty : 0;
    const delta = newQty - oldQty; // > 0 : plus d'articles vendus (déduire du stock), < 0 : articles réintégrés

    if (delta === 0) continue;

    const isBundle = (newInfo && newInfo.isBundle) || (oldInfo && oldInfo.isBundle);
    const bundleItems = (newInfo && newInfo.bundleItems) || (oldInfo && oldInfo.bundleItems);

    if (isBundle && bundleItems) {
      continue; // Déjà traité de façon consolidée ci-dessus
    } else {
      const product = getProductFromTemp(itemId);
      if (product) {
        let updatedBatches = normalizeBatches(product.batches).map(b => ({ ...b }));
        const newStock = product.stock - delta;

        if (delta > 0 && newStock < 0 && product.autoUnpack && product.parentId && product.unitsPerParent && product.unitsPerParent > 0) {
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
            const finalStock = product.stock + unpackedUnits - delta;
            const adjustedQty = -delta + unpackedUnits;
            enqueueStockAdjustment(itemId, adjustedQty);

            if (product.useMultiExpiry) {
              const parentBatches = normalizeBatches(parent.batches);
              const sourceExpiry = parentBatches[0]?.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
              updatedBatches.push({
                id: generateUniqueId(),
                batchNumber: `UNPACK-${Date.now().toString(36).toUpperCase()}`,
                stock: unpackedUnits,
                expirationDate: sourceExpiry
              });

              let rem = delta;
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

              enqueueSync('products', itemId, 'UPSERT', {
                id: itemId,
                batches: updatedBatches,
                updatedAt: new Date().toISOString()
              });
            }

            updateTempProductStock(itemId, finalStock, product.useMultiExpiry ? updatedBatches : product.batches);
            
            localDb.updateLocalOnly(`products/${itemId}`, {
              stock: finalStock,
              updatedAt: new Date().toISOString(),
              batches: product.useMultiExpiry ? updatedBatches : product.batches
            });
            
            window.dispatchEvent(new CustomEvent('product-cache-update', {
              detail: getProductFromTemp(itemId)
            }));
          }
        } else {
          if (product.useMultiExpiry && updatedBatches.length > 0) {
            if (delta > 0) {
              let rem = delta;
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
            } else if (delta < 0) {
              const restoreQty = -delta;
              if (updatedBatches.length > 0) {
                updatedBatches[updatedBatches.length - 1].stock += restoreQty;
              } else {
                updatedBatches.push({
                  id: generateUniqueId(),
                  batchNumber: `RESTORE-${Date.now().toString(36).toUpperCase()}`,
                  stock: restoreQty,
                  expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                });
              }
            }

            enqueueSync('products', itemId, 'UPSERT', {
              id: itemId,
              batches: updatedBatches,
              updatedAt: new Date().toISOString()
            });
          }

          enqueueStockAdjustment(itemId, -delta);
          updateTempProductStock(itemId, newStock, product.useMultiExpiry ? updatedBatches : product.batches);

          localDb.updateLocalOnly(`products/${itemId}`, {
            stock: newStock,
            updatedAt: new Date().toISOString(),
            batches: product.useMultiExpiry ? updatedBatches : product.batches
          });

          window.dispatchEvent(new CustomEvent('product-cache-update', {
            detail: getProductFromTemp(itemId)
          }));
        }
      }
    }
  }
}
