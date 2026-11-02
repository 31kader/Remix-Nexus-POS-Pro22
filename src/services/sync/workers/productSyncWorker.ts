import { del } from 'idb-keyval';
import { supabase } from '../../../supabase';
import { useCoreStore } from '../../../store/useCoreStore';
import { isNetworkOrTimeoutError } from '../../networkErrorHandler';
import { SyncPayload } from '../types';
import { sanitizePayloadForSupabase } from '../syncSanitizer';
import { fetchProductSyncContext } from './productSyncContextFetcher';
import { uploadNewProductBatches } from './productBatchUploader';

export interface SyncContextRefs {
  hadNetworkError: boolean;
  hadAuthOrPermissionError: boolean;
}

export { processStockAdjustments } from './stockAdjustmentWorker';

/**
 * 📦 Traitement par lots des produits avec déduplication, pré-check des relations et anti-collision 409
 */
export async function processProductBatch(
  queue: SyncPayload[],
  productItems: SyncPayload[],
  completedKeys: Set<string>,
  processedSnapshots: Map<string, any>,
  updateProgress: (label: string, count?: number) => void,
  refs: SyncContextRefs
): Promise<void> {
  if (productItems.length === 0) return;

  const queueProductIds = Array.from(new Set(
    productItems
      .map(p => (p.recordId || p.payload?.id ? String(p.recordId || p.payload?.id).trim() : null))
      .filter((id): id is string => Boolean(id))
  ));
  const queueSkus = Array.from(new Set(
    productItems
      .map(p => (p.payload?.sku ? String(p.payload.sku).trim() : null))
      .filter((s): s is string => Boolean(s))
  ));
  const queueBarcodes = Array.from(new Set(
    productItems
      .map(p => (p.payload?.barcode ? String(p.payload.barcode).trim() : null))
      .filter((b): b is string => Boolean(b))
  ));
  const queueParentIds = Array.from(new Set(
    productItems
      .map(p => (p.payload?.parentId || p.payload?.parent_id ? String(p.payload.parentId || p.payload.parent_id).trim() : null))
      .filter((id): id is string => Boolean(id))
  ));

  const {
    prodMap,
    skuToRemoteId,
    barcodeToRemoteId,
    validCategories,
    validBrands,
    remoteProducts
  } = await fetchProductSyncContext(queueProductIds, queueSkus, queueBarcodes, queueParentIds, refs);

  const preparedBatch: any[] = [];
  const batchSkus = new Set<string>();
  const batchBarcodes = new Set<string>();

  // 🛡️ ANTI DOUBLE-COMPTAGE : si un delta de stock (RPC relatif) est en file pour un produit,
  // on retire `stock` de l'upsert (absolu) pour ne pas appliquer le mouvement deux fois.
  const stockDeltaIds = new Set<string>();
  queue.forEach(q => {
    if ((q.table === 'stock_adjustments' || q.table === 'stockAdjustments') && q.action !== 'DELETE') {
      const d = Number(q.payload?.adjustment ?? q.payload?.delta) || 0;
      const pid = q.payload?.productId || q.payload?.id || q.recordId;
      if (pid && d !== 0) stockDeltaIds.add(String(pid));
    }
  });

  for (const item of productItems) {
    const rawProductPayload = (item.payload && typeof item.payload === 'object' && !item.payload.id && item.recordId)
      ? { ...item.payload, id: item.recordId }
      : item.payload;
    const payload = sanitizePayloadForSupabase('products', rawProductPayload, item.recordId);
    if (!payload.id && item.recordId) payload.id = item.recordId;
    if (payload.id && stockDeltaIds.has(String(payload.id))) {
      const isExistingRemote = prodMap.has(payload.id) || (payload.sku && skuToRemoteId.has(String(payload.sku).toLowerCase().trim()));
      if (isExistingRemote) {
        delete payload.stock;
      }
    }

    if (payload.category_id && !validCategories.has(payload.category_id)) {
      payload.category_id = 'uncategorized';
    }

    if (payload.brand_id && !validBrands.has(payload.brand_id)) {
      payload.brand_id = null;
    }

    if (payload.parent_id) {
      const parentExistsRemote = prodMap.has(payload.parent_id) || remoteProducts?.some((p: any) => p.id === payload.parent_id);
      const parentExistsInBatch = productItems.some(it => (it.recordId === payload.parent_id || it.payload?.id === payload.parent_id));
      if (!refs.hadNetworkError && queueParentIds.length > 0 && !parentExistsRemote && !parentExistsInBatch) {
        payload.parent_id = null;
      }
    }

    if (payload.sku) {
      const skuVal = String(payload.sku).toLowerCase().trim();
      const remoteOwnerId = skuToRemoteId.get(skuVal);
      if (remoteOwnerId && remoteOwnerId !== payload.id) {
        payload.id = remoteOwnerId;
      } else if (batchSkus.has(skuVal)) {
        delete payload.sku;
      } else {
        batchSkus.add(skuVal);
      }
    }

    if (payload.barcode) {
      const bcVal = String(payload.barcode).toLowerCase().trim();
      const remoteOwnerId = barcodeToRemoteId.get(bcVal);
      if (remoteOwnerId && remoteOwnerId !== payload.id) {
        payload.id = remoteOwnerId;
      } else if (batchBarcodes.has(bcVal)) {
        delete payload.barcode;
      } else {
        batchBarcodes.add(bcVal);
      }
    }

    // 🛡️ Récupérer le nom du produit depuis le store local si absent
    if (!payload.name && payload.id) {
      try {
        const localProd = useCoreStore.getState().products?.find((p: any) => p.id === payload.id);
        if (localProd?.name && localProd.name !== 'Sans nom') {
          payload.name = localProd.name;
        }
      } catch (_) {}
    }

    preparedBatch.push({ payload, originalKey: `${item.table}:${item.recordId || payload.id}`, opId: item.opId });
  }

  const partialUpdates: any[] = [];
  const fullProducts: any[] = [];

  for (const entry of preparedBatch) {
    const hasValidName = Boolean(
      entry.payload.name &&
      String(entry.payload.name).trim().length > 0 &&
      String(entry.payload.name).trim() !== 'Sans nom'
    );
    if (!hasValidName && entry.payload.id) {
      delete entry.payload.name;
      partialUpdates.push(entry);
    } else if (hasValidName) {
      if (!entry.payload.category_id) entry.payload.category_id = 'uncategorized';
      fullProducts.push(entry);
    } else {
      // Entrée sans ID ni nom : purger immédiatement de la file
      completedKeys.add(entry.originalKey);
      processedSnapshots.set(entry.originalKey, { opId: entry.opId });
      updateProgress('Produits...');
    }
  }

  // Traitement des mises à jour partielles (UPDATE au lieu d'UPSERT pour respecter name NOT NULL)
  const DEFAULT_SKELETON_KEYS = new Set(['id', 'category_id', 'unit', 'status', 'updated_at']);
  for (const single of partialUpdates) {
    try {
      const updatePayload = { ...single.payload };
      delete updatePayload.id;
      const meaningfulKeys = Object.keys(updatePayload).filter(k => !DEFAULT_SKELETON_KEYS.has(k));
      if (meaningfulKeys.length === 0) {
        completedKeys.add(single.originalKey);
        processedSnapshots.set(single.originalKey, { opId: single.opId });
        updateProgress('Produits...');
        try { await del(`nexus_db_products_${single.payload.id}`); } catch (_) {}
        continue;
      }
      const { error: partErr } = await supabase.from('products').update(updatePayload).eq('id', single.payload.id);
      if (!partErr) {
        completedKeys.add(single.originalKey);
        processedSnapshots.set(single.originalKey, { opId: single.opId });
        updateProgress('Produits...');
      } else if (isNetworkOrTimeoutError(partErr)) {
        refs.hadNetworkError = true;
      }
    } catch (partCatchErr) {
      if (isNetworkOrTimeoutError(partCatchErr)) {
        refs.hadNetworkError = true;
      } else {
        completedKeys.add(single.originalKey);
        processedSnapshots.set(single.originalKey, { opId: single.opId });
        updateProgress('Produits...');
      }
    }
  }

  // 🛡️ ANTI-COLLISION 409 & RLS 401 : Séparation stricte des produits existants et des nouveaux produits
  const existingProductsToUpdate: any[] = [];
  const newProductsToInsert: any[] = [];

  for (const entry of fullProducts) {
    const pid = entry.payload?.id;
    const skuKey = entry.payload?.sku ? String(entry.payload.sku).toLowerCase().trim() : '';
    const bcKey = entry.payload?.barcode ? String(entry.payload.barcode).toLowerCase().trim() : '';

    const existsRemote =
      (pid && prodMap.has(pid)) ||
      (skuKey && skuToRemoteId.has(skuKey)) ||
      (bcKey && barcodeToRemoteId.has(bcKey));

    if (existsRemote) {
      existingProductsToUpdate.push(entry);
    } else {
      newProductsToInsert.push(entry);
    }
  }

  // 1. UPDATE unitaire des produits existants : PATCH natif sans on_conflict=id ni INSERT
  for (const single of existingProductsToUpdate) {
    if (refs.hadNetworkError) break;
    try {
      const updatePayload = { ...single.payload };
      const targetId = single.payload.id;
      delete updatePayload.id;
      delete updatePayload.created_at;

      const prodTable = supabase.from('products') as any;
      const { error: updErr, status: updStatus } = (typeof prodTable.update === 'function')
        ? await prodTable.update(updatePayload).eq('id', targetId)
        : await prodTable.upsert(single.payload, { onConflict: 'id' });

      if (!updErr) {
        completedKeys.add(single.originalKey);
        processedSnapshots.set(single.originalKey, { opId: single.opId });
        updateProgress('Produits...');
      } else {
        if (isNetworkOrTimeoutError(updErr)) {
          refs.hadNetworkError = true;
          break;
        }
        if (updStatus === 401 || updStatus === 403 || updErr.code === '42501') {
          console.warn(`[SyncService] Mise à jour produit ${targetId} restreinte par RLS (401/403):`, updErr);
          completedKeys.add(single.originalKey);
          processedSnapshots.set(single.originalKey, { opId: single.opId });
          updateProgress('Produits...');
        } else {
          console.warn(`[SyncService] Échec mise à jour produit existant ${targetId}:`, updErr);
        }
      }
    } catch (err: any) {
      if (isNetworkOrTimeoutError(err)) {
        refs.hadNetworkError = true;
        break;
      } else {
        console.error('[SyncService] Exception mise à jour produit existant:', err);
      }
    }
  }

  // 2. Traitement des nouveaux produits (UPSERT natif en lots de 15 avec déduplication stricte par ID)
  await uploadNewProductBatches(newProductsToInsert, completedKeys, processedSnapshots, updateProgress, refs);
}
