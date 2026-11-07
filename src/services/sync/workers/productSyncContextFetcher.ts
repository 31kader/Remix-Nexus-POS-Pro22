import { supabase } from '../../../supabase';
import { isNetworkOrTimeoutError } from '../../networkErrorHandler';
import { SyncContextRefs } from './productSyncWorker';

export interface ProductSyncContext {
  prodMap: Map<string, any>;
  skuToRemoteId: Map<string, string>;
  barcodeToRemoteId: Map<string, string>;
  validCategories: Set<string>;
  validBrands: Set<string>;
  remoteProducts: any[];
}

export async function fetchProductSyncContext(
  queueProductIds: string[],
  queueSkus: string[],
  queueBarcodes: string[],
  queueParentIds: string[],
  refs: SyncContextRefs
): Promise<ProductSyncContext> {
  const prodMap = new Map<string, any>();
  let remoteProducts: any = null;
  let remoteCategories: any = null;
  let remoteBrands: any = null;

  try {
    const promises: Promise<any>[] = [];

    // 🛡️ P1-SYNC-01 : Requêtes ciblées par lots de 100 avec déduplication des IDs
    const uniqueIds = Array.from(new Set([...queueProductIds, ...queueParentIds])).filter(Boolean);
    if (uniqueIds.length > 0) {
      for (let i = 0; i < uniqueIds.length; i += 100) {
        promises.push(
          supabase.from('products').select('id, sku, barcode').in('id', uniqueIds.slice(i, i + 100))
        );
      }
    }
    const uniqueSkus = Array.from(new Set(queueSkus)).filter(Boolean);
    if (uniqueSkus.length > 0) {
      for (let i = 0; i < uniqueSkus.length; i += 100) {
        promises.push(
          supabase.from('products').select('id, sku, barcode').in('sku', uniqueSkus.slice(i, i + 100))
        );
      }
    }
    const uniqueBarcodes = Array.from(new Set(queueBarcodes)).filter(Boolean);
    if (uniqueBarcodes.length > 0) {
      for (let i = 0; i < uniqueBarcodes.length; i += 100) {
        promises.push(
          supabase.from('products').select('id, sku, barcode').in('barcode', uniqueBarcodes.slice(i, i + 100))
        );
      }
    }

    if (promises.length > 0) {
      const results = await Promise.allSettled(promises);
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value?.data && Array.isArray(res.value.data)) {
          for (const p of res.value.data) {
            prodMap.set(p.id, p);
          }
        } else if (res.status === 'rejected' && isNetworkOrTimeoutError(res.reason)) {
          refs.hadNetworkError = true;
        }
      }
    }
    remoteProducts = Array.from(prodMap.values());
  } catch (err) {
    if (isNetworkOrTimeoutError(err)) refs.hadNetworkError = true;
    console.warn('[SyncService] Avertissement: récupération remoteProducts ciblée incomplète:', err);
  }

  try {
    const cRes = await supabase.from('categories').select('id');
    remoteCategories = cRes?.data;
  } catch (err) {
    console.warn('[SyncService] Avertissement: récupération remoteCategories impossible:', err);
  }
  try {
    const bRes = await supabase.from('brands').select('id');
    remoteBrands = bRes?.data;
  } catch (err) {
    console.warn('[SyncService] Avertissement: récupération remoteBrands impossible:', err);
  }

  const skuToRemoteId = new Map<string, string>();
  const barcodeToRemoteId = new Map<string, string>();
  const validCategories = new Set<string>((remoteCategories || []).map((c: any) => c.id));
  validCategories.add('uncategorized');
  const validBrands = new Set<string>((remoteBrands || []).map((b: any) => b.id));

  if (remoteProducts && Array.isArray(remoteProducts)) {
    for (const rp of remoteProducts) {
      if (rp.sku) skuToRemoteId.set(String(rp.sku).toLowerCase().trim(), rp.id);
      if (rp.barcode) barcodeToRemoteId.set(String(rp.barcode).toLowerCase().trim(), rp.id);
    }
  }

  return {
    prodMap,
    skuToRemoteId,
    barcodeToRemoteId,
    validCategories,
    validBrands,
    remoteProducts: remoteProducts || []
  };
}
