import { supabase } from '../../../supabase';
import { isNetworkOrTimeoutError } from '../../networkErrorHandler';
import { SyncContextRefs } from './productSyncWorker';

export async function uploadNewProductBatches(
  newProductsToInsert: any[],
  completedKeys: Set<string>,
  processedSnapshots: Map<string, any>,
  updateProgress: (label: string, count?: number) => void,
  refs: SyncContextRefs
): Promise<void> {
  const PRODUCT_BATCH_SIZE = 15;
  const chunks: any[][] = [];

  const dedupStockMap = new Map<string, any>();
  newProductsToInsert.filter(e => 'stock' in e.payload).forEach(e => {
    const id = e.payload?.id || e.recordId;
    if (id) dedupStockMap.set(id, e);
  });
  const withStockList = Array.from(dedupStockMap.values());

  const dedupNoStockMap = new Map<string, any>();
  newProductsToInsert.filter(e => !('stock' in e.payload)).forEach(e => {
    const id = e.payload?.id || e.recordId;
    if (id) dedupNoStockMap.set(id, e);
  });
  const withoutStockList = Array.from(dedupNoStockMap.values());

  for (const list of [withStockList, withoutStockList]) {
    for (let i = 0; i < list.length; i += PRODUCT_BATCH_SIZE) {
      chunks.push(list.slice(i, i + PRODUCT_BATCH_SIZE));
    }
  }

  for (const chunk of chunks) {
    if (refs.hadNetworkError) break;
    const allKeys = new Set<string>();
    chunk.forEach(c => Object.keys(c.payload).forEach(k => allKeys.add(k)));
    const payloads = chunk.map(c => {
      const harmonized: any = {};
      allKeys.forEach(k => {
        harmonized[k] = c.payload[k] !== undefined ? c.payload[k] : null;
      });
      return harmonized;
    });

    try {
      const { error } = await supabase.from('products').upsert(payloads, { onConflict: 'id' });
      if (!error) {
        chunk.forEach(c => {
          completedKeys.add(c.originalKey);
          processedSnapshots.set(c.originalKey, { opId: c.opId });
        });
        updateProgress('Produits...', chunk.length);
      } else {
        if (isNetworkOrTimeoutError(error)) {
          refs.hadNetworkError = true;
          break;
        }
        for (const single of chunk) {
          if (refs.hadNetworkError) break;
          try {
            const { error: singleErr, status: singleStatus } = await supabase.from('products').upsert(single.payload, { onConflict: 'id' });
            if (!singleErr) {
              completedKeys.add(single.originalKey);
              processedSnapshots.set(single.originalKey, { opId: single.opId });
              updateProgress('Produits...');
            } else {
              if (isNetworkOrTimeoutError(singleErr)) {
                refs.hadNetworkError = true;
                break;
              }
              if (singleStatus === 409 || singleErr.code === '23505') {
                const updatePayload = { ...single.payload };
                delete updatePayload.id;
                delete updatePayload.created_at;
                if (single.payload.id) {
                  const { error: updErr } = await supabase.from('products').update(updatePayload).eq('id', single.payload.id);
                  if (!updErr) {
                    completedKeys.add(single.originalKey);
                    processedSnapshots.set(single.originalKey, { opId: single.opId });
                    updateProgress('Produits...');
                  }
                }
              } else if (singleStatus === 401 || singleStatus === 403 || singleErr.code === '42501') {
                console.warn(`[SyncService] Insert produit ${single.payload?.id} restreint par RLS:`, singleErr);
                completedKeys.add(single.originalKey);
                processedSnapshots.set(single.originalKey, { opId: single.opId });
                updateProgress('Produits...');
              }
            }
          } catch (singleCatchErr: any) {
            if (isNetworkOrTimeoutError(singleCatchErr)) {
              refs.hadNetworkError = true;
              break;
            } else {
              console.error('[SyncService] Échec persistant insert produit:', singleCatchErr);
            }
          }
        }
      }
    } catch (batchErr) {
      if (isNetworkOrTimeoutError(batchErr)) {
        refs.hadNetworkError = true;
        break;
      }
    }
  }
}
