import { Product } from '../../../types';
import { TABLE_NAME_MAPPINGS } from '../../../lib/db-converters';
import { getDeletedRecordIds } from '../../../services/LocalDatabase';
import { loadPendingSyncQueue } from '../../../services/SyncService';
import { debouncedSaveProductsCache } from './useProductsFetcher';

export function applyProductRealtimeBatch(
  prev: Product[],
  productUpdateQueue: Product[],
  productDeleteQueue: string[]
): Product[] {
  if (productUpdateQueue.length === 0 && productDeleteQueue.length === 0) return prev;
  const deletedIds = getDeletedRecordIds('products');
  const pendingQueue = loadPendingSyncQueue();
  const pendingProdDeletes = new Set<string>();
  const pendingProdUpserts = new Map<string, any>();
  const pendingStockAdjustIds = new Set<string>();

  pendingQueue.forEach(q => {
    const tName = TABLE_NAME_MAPPINGS[q.table] || q.table;
    const recId = String(q.recordId || q.payload?.id || '');
    if (!recId) return;
    if (tName === 'products') {
      if (q.action === 'DELETE') pendingProdDeletes.add(recId);
      else if (q.action === 'UPSERT' && q.payload) {
        pendingProdUpserts.set(recId, { ...(pendingProdUpserts.get(recId) || {}), ...q.payload });
      }
    } else if ((q.action as string) === 'STOCK_ADJUST' || tName === 'stock_adjustments') {
      const pId = String(q.payload?.productId || recId);
      if (pId) pendingStockAdjustIds.add(pId);
    }
  });

  const map = new Map<string, Product>();
  prev.forEach(p => map.set(p.id, p));
  let hasActualChange = false;

  productUpdateQueue.forEach(p => {
    if (!p || !p.id) return;
    const pid = String(p.id);
    if (deletedIds.has(pid) || pendingProdDeletes.has(pid)) {
      if (map.has(pid)) {
        map.delete(pid);
        hasActualChange = true;
      }
      return;
    }

    const existing = map.get(pid);
    if (existing && existing.updatedAt && p.updatedAt) {
      const existingTime = new Date(existing.updatedAt).getTime();
      const incomingTime = new Date(p.updatedAt).getTime();
      if (incomingTime < existingTime) return;
    }

    const pendingUpsert = pendingProdUpserts.get(pid);
    const hasPendingStock = pendingStockAdjustIds.has(pid) || (pendingUpsert && pendingUpsert.stock !== undefined);

    const safeStock = (hasPendingStock && existing)
      ? Number(existing.stock ?? 0)
      : ((p.stock !== undefined && p.stock !== null && !isNaN(Number(p.stock)))
          ? Number(p.stock)
          : (existing?.stock ?? 0));

    const mergedProd = {
      ...existing,
      ...p,
      ...(pendingUpsert || {}),
      stock: safeStock
    } as Product;

    if (!existing || existing.updatedAt !== mergedProd.updatedAt || existing.name !== mergedProd.name || existing.price !== mergedProd.price || existing.stock !== safeStock) {
      map.set(pid, mergedProd);
      hasActualChange = true;
    }
  });

  productDeleteQueue.forEach(id => {
    if (map.has(id)) {
      map.delete(id);
      hasActualChange = true;
    }
  });

  if (!hasActualChange) return prev;

  const newProds = Array.from(map.values());
  debouncedSaveProductsCache(newProds);
  return newProds;
}
