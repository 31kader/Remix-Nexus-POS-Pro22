import { supabase } from '../../../supabase';
import { TABLE_COLUMNS, convertKeysToSnake } from '../../../lib/db-converters';
import { isNetworkOrTimeoutError } from '../../networkErrorHandler';
import { SyncPayload } from '../types';
import { isAuthOrPermissionError } from '../syncSanitizer';
import { SyncContextRefs } from './productSyncWorker';

/**
 * 💳 Traitement atomique du solde et des points fidélité clients
 */
export async function processCustomerBalances(
  queue: SyncPayload[],
  completedKeys: Set<string>,
  processedSnapshots: Map<string, any>,
  updateProgress: (label: string, count?: number) => void,
  refs: SyncContextRefs
): Promise<void> {
  const customerItems = queue.filter(item => item.table === 'customers' && item.action !== 'DELETE');
  for (const item of customerItems) {
    const custId = item.payload?.id || item.recordId;
    const deltaBal = Number(item.payload?.deltaBalance ?? item.payload?.delta_balance) || 0;
    const deltaSpent = Number(item.payload?.deltaSpent ?? item.payload?.delta_spent) || 0;
    const deltaPts = Number(item.payload?.deltaPoints ?? item.payload?.delta_points) || 0;
    const originalKey = `${item.table}:${item.recordId || custId}`;

    if (custId && (deltaBal !== 0 || deltaSpent !== 0 || deltaPts !== 0)) {
      try {
        const idempotencyKey = item.payload?.idempotencyKey || 
                               item.payload?.idempotency_key || 
                               `adj_${item.opId || item.recordId || custId}_${custId}`;

        let { error: rpcErr } = await supabase.rpc('adjust_customer_balance', {
          p_id: String(custId),
          delta_balance: deltaBal,
          delta_spent: deltaSpent,
          delta_points: Math.round(deltaPts),
          p_idempotency_key: idempotencyKey
        });

        if (rpcErr && (rpcErr.code === 'PGRST202' || rpcErr.message?.includes('p_idempotency_key') || rpcErr.message?.includes('404') || rpcErr.code === '42883')) {
          const { error: legacyErr } = await supabase.rpc('adjust_customer_balance', {
            p_id: String(custId),
            delta_balance: deltaBal,
            delta_spent: deltaSpent,
            delta_points: Math.round(deltaPts)
          });
          rpcErr = legacyErr;
        }

        if (isAuthOrPermissionError(rpcErr)) {
          refs.hadAuthOrPermissionError = true;
          console.warn(`[SyncService] RPC adjust_customer_balance refusé (non authentifié ou RLS 401/403) pour ${custId}. En attente de session.`);
          break;
        }

        if (!rpcErr) {
          try {
            const rawExtraKeys = Object.keys(item.payload || {}).filter(k =>
              ![
                'id', 'balance', 'totalSpent', 'total_spent', 'loyaltyPoints', 'loyalty_points',
                'deltaBalance', 'delta_balance', 'deltaSpent', 'delta_spent', 'deltaPoints', 'delta_points',
                'idempotencyKey', 'idempotency_key'
              ].includes(k)
            );
            if (rawExtraKeys.length > 0) {
              const rawSubPayload: Record<string, any> = {};
              for (const k of rawExtraKeys) {
                rawSubPayload[k] = item.payload[k];
              }
              const snakeSubPayload = convertKeysToSnake(rawSubPayload);
              const validCols = new Set(TABLE_COLUMNS.customers || []);
              const extraPayload: Record<string, any> = {};
              for (const [col, val] of Object.entries(snakeSubPayload)) {
                if (validCols.has(col) && col !== 'id' && col !== 'balance' && col !== 'total_spent' && col !== 'loyalty_points') {
                  extraPayload[col] = val;
                }
              }
              if (Object.keys(extraPayload).length > 0) {
                await supabase.from('customers').update(extraPayload).eq('id', String(custId));
              }
            }
          } catch (_) {}

          completedKeys.add(originalKey);
          processedSnapshots.set(originalKey, { opId: item.opId, sentDeltaBalance: deltaBal, sentDeltaSpent: deltaSpent, sentDeltaPoints: deltaPts });
          updateProgress('Clients...');
        } else {
          if (isNetworkOrTimeoutError(rpcErr)) {
            refs.hadNetworkError = true;
          } else {
            console.warn(`[SyncService] Ajustement solde client ${custId} reporté à l'étape upsert:`, rpcErr);
          }
        }
      } catch (cErr) {
        if (isAuthOrPermissionError(cErr)) {
          refs.hadAuthOrPermissionError = true;
          break;
        }
        if (isNetworkOrTimeoutError(cErr)) refs.hadNetworkError = true;
        console.warn('[SyncService] adjust_customer_balance error, fallback to upsert:', cErr);
      }
    }
  }
}
