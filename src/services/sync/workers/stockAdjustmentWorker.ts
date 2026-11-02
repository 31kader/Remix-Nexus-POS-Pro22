import { supabase } from '../../../supabase';
import { isNetworkOrTimeoutError } from '../../networkErrorHandler';
import { SyncPayload } from '../types';
import { isAuthOrPermissionError } from '../syncSanitizer';
import type { SyncContextRefs } from './productSyncWorker';

/**
 * ⚡ Traitement atomique et idempotent des ajustements de stock
 */
export async function processStockAdjustments(
  stockItems: SyncPayload[],
  completedKeys: Set<string>,
  processedSnapshots: Map<string, any>,
  updateProgress: (label: string, count?: number) => void,
  refs: SyncContextRefs
): Promise<void> {
  if (stockItems.length === 0) return;

  for (const item of stockItems) {
    const prodId = item.payload?.productId || (item.recordId?.startsWith('adj_') ? null : item.recordId);
    const delta = Number(item.payload?.adjustment ?? item.payload?.delta) || 0;
    const originalKey = `${item.table}:${item.recordId || prodId}`;
    const adjId = item.payload?.id || item.payload?.adjustmentId || item.recordId;
    const mode = item.payload?.mode || 'delta';
    const targetValue = mode === 'set' ? Number(item.payload?.newQuantity ?? item.payload?.value ?? delta) : delta;

    if (!prodId || (mode === 'delta' && delta === 0)) {
      completedKeys.add(originalKey);
      processedSnapshots.set(originalKey, { opId: item.opId, sentAdjustment: 0 });
      updateProgress('Stocks...');
      continue;
    }

    try {
      const rpcRes = await supabase.rpc('apply_stock_adjustment', {
        p_id: String(prodId),
        p_value: targetValue,
        p_mode: mode,
        p_adj_id: adjId && String(adjId).startsWith('adj_') ? String(adjId) : null,
        p_reason: item.payload?.reason || (delta < 0 ? 'Vente / Déstockage' : 'Réapprovisionnement'),
        p_user_id: item.payload?.userId || null,
        p_user_name: item.payload?.userName || null,
        p_is_loss: Boolean(item.payload?.isLoss)
      });
      const rpcErr = rpcRes?.error;

      if (!rpcErr) {
        completedKeys.add(originalKey);
        processedSnapshots.set(originalKey, { opId: item.opId, sentAdjustment: mode === 'set' ? undefined : delta });
        updateProgress('Stocks...');
        continue;
      }

      if (isAuthOrPermissionError(rpcErr)) {
        refs.hadAuthOrPermissionError = true;
        console.warn(`[SyncService] RPC apply_stock_adjustment refusé (non authentifié ou RLS 401/403) pour ${prodId}. En attente de session.`);
        break;
      }

      if (rpcErr.message && rpcErr.message.includes('apply_stock_adjustment')) {
        const { error: legacyErr } = await supabase.rpc('adjust_product_stock', {
          p_id: String(prodId),
          delta: delta
        });
        if (!legacyErr) {
          completedKeys.add(originalKey);
          processedSnapshots.set(originalKey, { opId: item.opId, sentAdjustment: mode === 'set' ? undefined : delta });
          updateProgress('Stocks...');
          continue;
        }
        if (isAuthOrPermissionError(legacyErr)) {
          refs.hadAuthOrPermissionError = true;
          break;
        }
      }

      if (isNetworkOrTimeoutError(rpcErr)) {
        refs.hadNetworkError = true;
      } else {
        console.error(`[SyncService] Erreur permanente ajustement stock pour ${prodId}:`, rpcErr);
        if (String(rpcErr?.message || '').includes('introuvable')) {
          completedKeys.add(originalKey);
          processedSnapshots.set(originalKey, { opId: item.opId, sentAdjustment: mode === 'set' ? undefined : delta });
          updateProgress('Stocks...');
        }
      }
    } catch (stkErr) {
      if (isAuthOrPermissionError(stkErr)) {
        refs.hadAuthOrPermissionError = true;
        break;
      }
      if (isNetworkOrTimeoutError(stkErr)) refs.hadNetworkError = true;
      console.warn(`[SyncService] Erreur ajustement stock atomique pour ${prodId}:`, stkErr);
    }
  }
}
