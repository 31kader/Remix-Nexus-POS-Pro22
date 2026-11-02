import { supabase } from '../../../supabase';
import { TABLE_NAME_MAPPINGS } from '../../../lib/db-converters';
import { isNetworkOrTimeoutError } from '../../networkErrorHandler';
import { SyncPayload } from '../types';
import { 
  sanitizePayloadForSupabase, 
  isAuthOrPermissionError, 
  isDuplicateKeyError,
  isTableMissingError, 
  ADMIN_RESTRICTED_SYNC_TABLES 
} from '../syncSanitizer';
import { SyncContextRefs } from './productSyncWorker';

/**
 * 🗑️ Traitement des suppressions de la file
 */
export async function processDeletions(
  deleteList: SyncPayload[],
  completedKeys: Set<string>,
  processedSnapshots: Map<string, any>,
  updateProgress: (label: string) => void,
  refs: SyncContextRefs
): Promise<void> {
  for (const item of deleteList) {
    try {
      const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
      const targetId = (targetTable === 'online_orders' && !isNaN(Number(item.recordId)) && Number(item.recordId) > 0)
        ? Number(item.recordId)
        : item.recordId;
      const res = await supabase.from(targetTable).delete().eq('id', targetId);
      if (!res.error || isTableMissingError(res.error)) {
        const k = `${item.table}:${item.recordId}`;
        completedKeys.add(k);
        processedSnapshots.set(k, { opId: item.opId });
        updateProgress(targetTable);
      } else if (isNetworkOrTimeoutError(res.error)) {
        refs.hadNetworkError = true;
      }
    } catch (delErr) {
      if (isTableMissingError(delErr)) {
        const k = `${item.table}:${item.recordId}`;
        completedKeys.add(k);
        processedSnapshots.set(k, { opId: item.opId });
        updateProgress(item.table);
      } else if (isNetworkOrTimeoutError(delErr)) {
        refs.hadNetworkError = true;
      } else {
        console.warn(`[SyncService] Delete skipped on ${item.table}/${item.recordId}`);
      }
    }
  }
}

/**
 * 🧾 Traitement des Ventes (Transactions), Commandes en ligne, Achats et autres entités
 */
export async function processTransactionsAndOtherRecords(
  queue: SyncPayload[],
  parentTables: string[],
  completedKeys: Set<string>,
  processedSnapshots: Map<string, any>,
  updateProgress: (label: string, count?: number) => void,
  refs: SyncContextRefs,
  hasActiveSupabaseSession: boolean
): Promise<void> {
  // Pre-pass pour carton_templates et online_orders qui nécessitent un UPDATE direct en cas de collision
  for (const item of queue) {
    const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
    if (item.action === 'DELETE') continue;

    // 🛡️ Élimination des collisions 409 : UPDATE direct pour carton_templates existants
    if ((targetTable === 'carton_templates' || targetTable === 'cartonTemplates') && (item.payload?.id || item.recordId)) {
      const cartonId = item.payload?.id || item.recordId;
      let existsOnSupabase = false;
      try {
        const { data: existingCarton } = await supabase.from('carton_templates').select('id').eq('id', cartonId).maybeSingle();
        if (existingCarton?.id) existsOnSupabase = true;
      } catch (_) {}

      if (existsOnSupabase) {
        const updatePayload = { ...item.payload };
        delete updatePayload.id;
        delete updatePayload.created_at;
        const updateRes = await supabase.from('carton_templates').update(updatePayload).eq('id', cartonId);
        if (!updateRes.error) {
          const parentKey = `${item.table}:${cartonId}`;
          completedKeys.add(parentKey);
          processedSnapshots.set(parentKey, { opId: item.opId });
          updateProgress(targetTable);
          continue;
        }
      }
    }

    // 🛡️ Élimination des collisions 409 : UPDATE direct pour les commandes en ligne
    if (targetTable === 'online_orders' && (item.payload?.id || item.recordId || item.payload?.external_order_id)) {
      const orderId = item.payload?.id || item.recordId;
      const updatePayload = { ...item.payload };
      delete updatePayload.id;
      delete updatePayload.created_at;

      let updateRes: any = null;
      if (orderId) {
        updateRes = await supabase.from('online_orders').update(updatePayload).eq('id', orderId);
      }
      if ((!updateRes || updateRes.error) && item.payload?.external_order_id) {
        updateRes = await supabase.from('online_orders').update(updatePayload).eq('external_order_id', item.payload.external_order_id);
      }

      if (updateRes && !updateRes.error) {
        const parentKey = `${item.table}:${orderId}`;
        completedKeys.add(parentKey);
        processedSnapshots.set(parentKey, { opId: item.opId });
        updateProgress(targetTable);
        continue;
      }
    }

    // 🛡️ Élimination des collisions 409 : UPDATE direct pour les transactions existantes (annulations / retours)
    if (targetTable === 'transactions' && (item.payload?.id || item.recordId)) {
      const txId = item.payload?.id || item.recordId;
      let existsOnSupabase = false;
      try {
        const { data: existingTx } = await supabase.from('transactions').select('id').eq('id', txId).maybeSingle();
        if (existingTx?.id) existsOnSupabase = true;
      } catch (_) {}

      if (existsOnSupabase) {
        const updatePayload = { ...item.payload };
        delete updatePayload.id;
        delete updatePayload.created_at;
        delete updatePayload.timestamp;
        const updateRes = await supabase.from('transactions').update(updatePayload).eq('id', txId);
        if (!updateRes.error) {
          const parentKey = `${item.table}:${txId}`;
          completedKeys.add(parentKey);
          processedSnapshots.set(parentKey, { opId: item.opId });
          updateProgress(targetTable);
          continue;
        }
      }
    }
  }

  const otherItems = queue.filter(item => {
    const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
    return !parentTables.includes(targetTable) && 
      targetTable !== 'products' && 
      targetTable !== 'stock_adjustments' &&
      !completedKeys.has(`${item.table}:${item.recordId || item.payload?.id}`) &&
      item.action !== 'DELETE';
  });

  if (otherItems.length === 0) return;

  const itemsByTable = new Map<string, { payload: any; originalKey: string; opId?: string; rawPayload?: any }[]>();
  for (const item of otherItems) {
    const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
    const rawItemPayload = (item.payload && typeof item.payload === 'object' && !item.payload.id && item.recordId)
      ? { ...item.payload, id: item.recordId }
      : item.payload;
    const payload = sanitizePayloadForSupabase(targetTable, rawItemPayload, item.recordId);
    if (!payload.id && item.recordId) payload.id = item.recordId;
    
    // Garantir les timestamps pour les transactions
    if (targetTable === 'transactions') {
      if (!payload.created_at && payload.timestamp) payload.created_at = payload.timestamp;
      if (!payload.timestamp && payload.created_at) payload.timestamp = payload.created_at;
    }

    if (!itemsByTable.has(targetTable)) {
      itemsByTable.set(targetTable, []);
    }
    itemsByTable.get(targetTable)!.push({ payload, originalKey: `${item.table}:${item.recordId || payload.id}`, opId: item.opId, rawPayload: item.payload });
  }

  const markOtherRecordCompleted = (table: string, r: { originalKey: string; opId?: string; rawPayload?: any }) => {
    completedKeys.add(r.originalKey);
    if (table === 'customers' && r.rawPayload) {
      const dBal = Number(r.rawPayload.deltaBalance ?? r.rawPayload.delta_balance ?? 0);
      const dSpent = Number(r.rawPayload.deltaSpent ?? r.rawPayload.delta_spent ?? 0);
      const dPts = Number(r.rawPayload.deltaPoints ?? r.rawPayload.delta_points ?? 0);
      if (dBal !== 0 || dSpent !== 0 || dPts !== 0) {
        processedSnapshots.set(r.originalKey, { opId: r.opId, sentDeltaBalance: dBal, sentDeltaSpent: dSpent, sentDeltaPoints: dPts });
        updateProgress(table);
        return;
      }
    }
    processedSnapshots.set(r.originalKey, { opId: r.opId });
    updateProgress(table);
  };

  for (const [table, records] of itemsByTable.entries()) {
    if (ADMIN_RESTRICTED_SYNC_TABLES.has(table) && !hasActiveSupabaseSession) {
      continue;
    }
    for (let i = 0; i < records.length; i += 50) {
      const chunk = records.slice(i, i + 50);
      const allKeys = new Set<string>();
      chunk.forEach((r: any) => Object.keys(r.payload).forEach(k => allKeys.add(k)));
      const payloads = chunk.map((r: any) => {
        const harmonized: any = {};
        allKeys.forEach(k => {
          harmonized[k] = r.payload[k] !== undefined ? r.payload[k] : null;
        });
        return harmonized;
      });
      try {
        const res = await supabase.from(table).upsert(payloads, { onConflict: 'id' });
        if (!res?.error) {
          chunk.forEach((r: any) => markOtherRecordCompleted(table, r));
        } else if (isAuthOrPermissionError(res.error)) {
          refs.hadAuthOrPermissionError = true;
          console.warn(`[SyncService] Upsert ${table} refusé (session requise 401/403/RLS). En attente de connexion.`);
          break;
        } else if (isTableMissingError(res.error)) {
          console.warn(`[SyncService] Table distante inexistante sur Supabase pour ${table} (404/PGRST), retrait du lot de la file.`);
          chunk.forEach((r: any) => markOtherRecordCompleted(table, r));
        } else {
          if (isNetworkOrTimeoutError(res.error)) {
            refs.hadNetworkError = true;
            break;
          }
          // Fallback un par un si le lot échoue
          for (const single of chunk) {
            if (refs.hadNetworkError || refs.hadAuthOrPermissionError) break;
            try {
              const sRes = await supabase.from(table).upsert(single.payload, { onConflict: 'id' });
              if (!sRes?.error) {
                markOtherRecordCompleted(table, single);
              } else if (isAuthOrPermissionError(sRes.error)) {
                refs.hadAuthOrPermissionError = true;
                break;
              } else if (isTableMissingError(sRes.error)) {
                markOtherRecordCompleted(table, single);
              } else if (isNetworkOrTimeoutError(sRes.error)) {
                refs.hadNetworkError = true;
                break;
              } else if (isDuplicateKeyError(sRes.error)) {
                if (single.payload?.id) {
                  const updatePayload = { ...single.payload };
                  delete updatePayload.id;
                  delete updatePayload.created_at;
                  if (table === 'products') {
                    delete updatePayload.stock;
                  }
                  const { error: updErr } = await supabase.from(table).update(updatePayload).eq('id', single.payload.id);
                  if (!updErr || isTableMissingError(updErr) || isDuplicateKeyError(updErr)) {
                    markOtherRecordCompleted(table, single);
                  } else if (isAuthOrPermissionError(updErr)) {
                    refs.hadAuthOrPermissionError = true;
                    break;
                  } else if (isNetworkOrTimeoutError(updErr)) {
                    refs.hadNetworkError = true;
                    break;
                  }
                }
              }
            } catch (sErr) {
              if (isAuthOrPermissionError(sErr)) {
                refs.hadAuthOrPermissionError = true;
                break;
              } else if (isTableMissingError(sErr)) {
                markOtherRecordCompleted(table, single);
              } else if (isNetworkOrTimeoutError(sErr)) {
                refs.hadNetworkError = true;
                break;
              }
            }
          }
        }
      } catch (err) {
        if (isAuthOrPermissionError(err)) {
          refs.hadAuthOrPermissionError = true;
          break;
        } else if (isTableMissingError(err)) {
          chunk.forEach((r: any) => markOtherRecordCompleted(table, r));
        } else if (isNetworkOrTimeoutError(err)) {
          refs.hadNetworkError = true;
          break;
        }
      }
    }
  }
}
