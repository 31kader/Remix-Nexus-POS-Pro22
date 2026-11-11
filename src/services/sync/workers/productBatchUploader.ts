import { supabase } from '../../../supabase';
import { isNetworkOrTimeoutError } from '../../networkErrorHandler';
import { SyncContextRefs } from './productSyncWorker';

function markKeysCompleted(
  entry: any,
  completedKeys: Set<string>,
  processedSnapshots: Map<string, any>
) {
  const keys: string[] = entry.allOriginalKeys || [entry.originalKey];
  for (const k of keys) {
    if (k) {
      completedKeys.add(k);
      processedSnapshots.set(k, { opId: entry.opId });
    }
  }
}

export async function uploadNewProductBatches(
  newProductsToInsert: any[],
  completedKeys: Set<string>,
  processedSnapshots: Map<string, any>,
  updateProgress: (label: string, count?: number) => void,
  refs: SyncContextRefs
): Promise<void> {
  const PRODUCT_BATCH_SIZE = 15;

  // 🛡️ ANTI-COLLISION 409 : Déduplication stricte par ID et fusion des opérations
  const dedupMap = new Map<string, any>();
  for (const entry of newProductsToInsert) {
    const id = entry.payload?.id || entry.recordId;
    if (!id) continue;
    if (dedupMap.has(id)) {
      const existing = dedupMap.get(id);
      existing.payload = { ...existing.payload, ...entry.payload };
      existing.opId = entry.opId;
      if (!existing.allOriginalKeys) existing.allOriginalKeys = [existing.originalKey];
      existing.allOriginalKeys.push(entry.originalKey);
    } else {
      dedupMap.set(id, { ...entry, allOriginalKeys: [entry.originalKey] });
    }
  }

  const allItems = Array.from(dedupMap.values());
  const withStockList = allItems.filter(e => 'stock' in e.payload);
  const withoutStockList = allItems.filter(e => !('stock' in e.payload));

  const chunks: any[][] = [];
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
          markKeysCompleted(c, completedKeys, processedSnapshots);
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
            const { error: singleErr, status: singleStatus } = await supabase
              .from('products')
              .upsert(single.payload, { onConflict: 'id' });
            if (!singleErr) {
              markKeysCompleted(single, completedKeys, processedSnapshots);
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
                  const { error: updErr } = await supabase
                    .from('products')
                    .update(updatePayload)
                    .eq('id', single.payload.id);
                  if (!updErr) {
                    markKeysCompleted(single, completedKeys, processedSnapshots);
                    updateProgress('Produits...');
                  }
                }
              } else if (singleStatus === 401 || singleStatus === 403 || singleErr.code === '42501') {
                console.warn(`[SyncService] Insert produit ${single.payload?.id} restreint par RLS:`, singleErr);
                markKeysCompleted(single, completedKeys, processedSnapshots);
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

/**
 * ⚡ Mise à jour directe des produits existants (anti-collision 409)
 * Effectue des requêtes UPDATE ciblées en parallèle par micro-lots pour éviter les faux conflits 409
 * générés par les tentatives d'upsert POST sur les produits déjà présents sur Supabase.
 */
export async function updateExistingProductBatches(
  existingProductsToUpdate: any[],
  completedKeys: Set<string>,
  processedSnapshots: Map<string, any>,
  updateProgress: (label: string, count?: number) => void,
  refs: SyncContextRefs
): Promise<void> {
  const PARALLEL_CONCURRENCY = 5;

  // 🛡️ ANTI-COLLISION 409 : Déduplication stricte par ID et fusion des opérations
  const dedupMap = new Map<string, any>();
  for (const entry of existingProductsToUpdate) {
    const id = entry.payload?.id || entry.recordId;
    if (!id) continue;
    if (dedupMap.has(id)) {
      const existing = dedupMap.get(id);
      existing.payload = { ...existing.payload, ...entry.payload };
      existing.opId = entry.opId;
      if (!existing.allOriginalKeys) existing.allOriginalKeys = [existing.originalKey];
      existing.allOriginalKeys.push(entry.originalKey);
    } else {
      dedupMap.set(id, { ...entry, allOriginalKeys: [entry.originalKey] });
    }
  }

  const dedupedList = Array.from(dedupMap.values());

  // Mise à jour ciblée (UPDATE direct / PATCH) par micro-lots parallèles (5 simultanés)
  for (let i = 0; i < dedupedList.length; i += PARALLEL_CONCURRENCY) {
    if (refs.hadNetworkError) break;
    const batch = dedupedList.slice(i, i + PARALLEL_CONCURRENCY);

    await Promise.all(
      batch.map(async (single) => {
        if (refs.hadNetworkError) return;
        try {
          const updatePayload = { ...single.payload };
          const targetId = single.payload.id || single.recordId;
          delete updatePayload.id;
          delete updatePayload.created_at;

          const { error: updErr, status: updStatus } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', targetId);

          if (!updErr) {
            markKeysCompleted(single, completedKeys, processedSnapshots);
            updateProgress('Produits...');
          } else {
            if (isNetworkOrTimeoutError(updErr)) {
              refs.hadNetworkError = true;
              return;
            }
            if (updStatus === 401 || updStatus === 403 || updErr.code === '42501') {
              console.warn(`[SyncService] Mise à jour produit ${targetId} restreinte par RLS (401/403):`, updErr);
              markKeysCompleted(single, completedKeys, processedSnapshots);
              updateProgress('Produits...');
            } else {
              console.warn(`[SyncService] Échec mise à jour produit existant ${targetId}:`, updErr);
            }
          }
        } catch (singleCatchErr: any) {
          if (isNetworkOrTimeoutError(singleCatchErr)) {
            refs.hadNetworkError = true;
          } else {
            console.error('[SyncService] Exception mise à jour produit existant:', singleCatchErr);
          }
        }
      })
    );
  }
}
