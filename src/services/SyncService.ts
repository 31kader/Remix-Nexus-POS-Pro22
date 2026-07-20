import { get as getIDB, set as setIDB } from 'idb-keyval';
import { supabase, isSupabaseConfigured } from '../supabase';
import { toast } from 'sonner';
import { 
  TABLE_COLUMNS, 
  preparePayload, 
  convertKeysToCamel 
} from '../lib/db-converters';import { setLocalState, saveStateToStorage, triggerObservers } from '../lib/local-db';

let pendingUpserts: Record<string, Record<string, any>> = {};
let pendingDeletes: Record<string, string[]> = {};
let pendingStockAdjustments: Record<string, number> = {};
let syncQueueTimeout: any = null;
let isSyncingQueue = false;
let _isSyncActive = false;
let consecutiveErrorCount = 0;

const syncStatusListeners = new Set<(active: boolean, pendingCount: number) => void>();
const missingTables = new Set<string>();
const lastErrorToasts: Record<string, number> = {};

const TABLE_PROCESS_ORDER = ['categories', 'brands', 'products'];

export function onBackgroundSyncStatus(callback: (status: { active: boolean, pendingChanges: number }) => void) {
  const wrapper = (active: boolean, count: number) => callback({ active, pendingChanges: count });
  syncStatusListeners.add(wrapper as any);
  callback({ active: _isSyncActive, pendingChanges: getPendingCount() });
  return () => {
    syncStatusListeners.delete(wrapper as any);
  };
}

function getPendingCount() {
  let count = 0;
  for (const records of Object.values(pendingUpserts)) {
    count += Object.keys(records).length;
  }
  for (const ids of Object.values(pendingDeletes)) {
    count += ids.length;
  }
  count += Object.keys(pendingStockAdjustments).length;
  return count;
}

function notifySyncStatus() {
  const active = _isSyncActive;
  const count = getPendingCount();
  syncStatusListeners.forEach(cb => (cb as any)(active, count));
}

export async function loadPendingSyncQueue() {
  try {
    const upserts = await getIDB('nexus_pending_sync_upserts');
    const deletes = await getIDB('nexus_pending_sync_deletes');
    const adjustments = await getIDB('nexus_pending_sync_adjustments');
    if (upserts) pendingUpserts = upserts;
    if (deletes) pendingDeletes = deletes;
    if (adjustments) pendingStockAdjustments = adjustments;
    
    // Migration: Push existing local GRNs to Supabase sync queue if not already done
    const grnMigrated = localStorage.getItem('nexus_grn_local_migrated_to_cloud_v2');
    if (grnMigrated !== 'true') {
      const localGrns = await getIDB<any[]>('nexus_goods_receipt_notes_cache').catch(() => null);
      if (localGrns && localGrns.length > 0) {
        console.log(`[GRN Migration] Enqueuing ${localGrns.length} local GRNs for cloud sync...`);
        localGrns.forEach(grn => {
          if (grn && grn.id) {
            enqueueSync('goods_receipt_notes', grn.id, grn);
          }
        });
        localStorage.setItem('nexus_grn_local_migrated_to_cloud_v2', 'true');
      }
    }

    // Migration: Push existing local purchases to Supabase sync queue if not already done
    const purchasesMigrated = localStorage.getItem('nexus_purchases_local_migrated_to_cloud_v2');
    if (purchasesMigrated !== 'true') {
      const localPurchases = await getIDB<any[]>('nexus_purchases_cache').catch(() => null);
      if (localPurchases && localPurchases.length > 0) {
        console.log(`[Purchases Migration] Enqueuing ${localPurchases.length} local purchases for cloud sync...`);
        localPurchases.forEach(p => {
          if (p && p.id) {
            enqueueSync('purchases', p.id, p);
          }
        });
        localStorage.setItem('nexus_purchases_local_migrated_to_cloud_v2', 'true');
      }
    }

    if (hasPendingChanges()) {
      scheduleQueueProcessing(2000);
    }
  } catch (e) {
    console.warn('[Queue Sync] Failed to load pending sync queue', e);
  }
}

function hasPendingChanges() {
  const hasUpserts = Object.values(pendingUpserts).some(records => Object.keys(records).length > 0);
  const hasDeletes = Object.values(pendingDeletes).some(ids => ids.length > 0);
  const hasAdjustments = Object.keys(pendingStockAdjustments).length > 0;
  return hasUpserts || hasDeletes || hasAdjustments;
}

async function savePendingSyncQueue() {
  try {
    await setIDB('nexus_pending_sync_upserts', pendingUpserts);
    await setIDB('nexus_pending_sync_deletes', pendingDeletes);
    await setIDB('nexus_pending_sync_adjustments', pendingStockAdjustments);
  } catch (e) {
    console.warn('[Queue Sync] Failed to save pending sync queue', e);
  }
}

export function scheduleQueueProcessing(delayMs = 1500) {
  if (syncQueueTimeout) clearTimeout(syncQueueTimeout);
  const backoffDelay = consecutiveErrorCount > 0 
    ? Math.min(delayMs * Math.pow(2, consecutiveErrorCount), 120000) 
    : delayMs;
  syncQueueTimeout = setTimeout(processSyncQueue, backoffDelay);
}

export function enqueueSync(table: string, id: string | null, value: any, isDelete = false) {
  if (!isSupabaseConfigured || !TABLE_COLUMNS[table]) return;

  if (isDelete) {
    if (id) {
      if (pendingUpserts[table]) delete pendingUpserts[table][id];
      if (!pendingDeletes[table]) pendingDeletes[table] = [];
      if (!pendingDeletes[table].includes(id)) pendingDeletes[table].push(id);
    } else {
      pendingUpserts[table] = {};
      pendingDeletes[table] = ['none_placeholder_delete_all'];
    }
  } else if (id) {
    if (pendingDeletes[table]) {
      pendingDeletes[table] = pendingDeletes[table].filter(x => x !== id);
    }
    if (!pendingUpserts[table]) pendingUpserts[table] = {};
    pendingUpserts[table][id] = value;
  }

  savePendingSyncQueue();
  scheduleQueueProcessing(1500);
  notifySyncStatus();
}

export function enqueueSyncBatch(table: string, records: Record<string, any>) {
  if (!isSupabaseConfigured || !TABLE_COLUMNS[table]) return;

  if (!pendingUpserts[table]) pendingUpserts[table] = {};
  for (const [id, value] of Object.entries(records)) {
    if (pendingDeletes[table]) {
      pendingDeletes[table] = pendingDeletes[table].filter(x => x !== id);
    }
    pendingUpserts[table][id] = value;
  }

  savePendingSyncQueue();
  scheduleQueueProcessing(1500);
  notifySyncStatus();
}

export function enqueueStockAdjustment(productId: string, adjustment: number) {
  if (!isSupabaseConfigured || isNaN(adjustment)) return;

  if (!pendingStockAdjustments[productId]) pendingStockAdjustments[productId] = 0;
  pendingStockAdjustments[productId] += adjustment;

  savePendingSyncQueue();
  scheduleQueueProcessing(1500);
  notifySyncStatus();
}

async function processSyncQueue() {
  if (!isSupabaseConfigured || isSyncingQueue) return;
  if (!hasPendingChanges()) return;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    scheduleQueueProcessing(10000);
    return;
  }

  isSyncingQueue = true;
  _isSyncActive = true;
  notifySyncStatus();

  let hadError = false;

  try {
    const upsertsToProcess = { ...pendingUpserts };
    const deletesToProcess = { ...pendingDeletes };
    const adjustmentsToProcess = { ...pendingStockAdjustments };

    pendingUpserts = {};
    pendingDeletes = {};
    pendingStockAdjustments = {};
    await savePendingSyncQueue();

    // 1. Process stock adjustments
    for (const [productId, delta] of Object.entries(adjustmentsToProcess)) {
      if (delta === 0) continue;
      try {
        const { error } = await supabase.rpc('increment_stock', { p_product_id: productId, p_delta: delta });
        if (error) {
          hadError = true;
          if (isRetryableError(error)) {
            pendingStockAdjustments[productId] = (pendingStockAdjustments[productId] || 0) + delta;
          }
        }
      } catch (err) {
        hadError = true;
        if (isRetryableError(err)) {
          pendingStockAdjustments[productId] = (pendingStockAdjustments[productId] || 0) + delta;
        }
      }
    }

    // 2. Process deletes
    for (const [mappedTable, ids] of Object.entries(deletesToProcess)) {
      if (ids.length === 0 || missingTables.has(mappedTable)) continue;
      try {
        if (ids.includes('none_placeholder_delete_all')) {
          const { error } = await supabase.from(mappedTable).delete().neq('id', 'none_placeholder_delete_all');
          if (error) {
            hadError = true;
            handleSupabaseError(mappedTable, 'Delete', error);
            if (isRetryableError(error)) requeueDeletes(mappedTable, ids);
          }
        } else {
          if (mappedTable === 'users') {
            for (const id of ids) {
              const { error } = await supabase.from(mappedTable).delete().eq('id', id);
              if (!error) continue;

              if (isUsersDeleteBlockedByTransactions(error)) {
                notifyBlockedUserDelete(id);
                continue;
              }

              hadError = true;
              handleSupabaseError(mappedTable, 'Delete', error);
              if (isRetryableError(error)) {
                requeueDeletes(mappedTable, [id]);
              }
            }
          } else {
            const chunkSize = 100;
            for (let i = 0; i < ids.length; i += chunkSize) {
              const chunk = ids.slice(i, i + chunkSize);
              const { error } = await supabase.from(mappedTable).delete().in('id', chunk);
              if (error) {
                hadError = true;
                handleSupabaseError(mappedTable, 'Delete', error);
                if (isRetryableError(error)) requeueDeletes(mappedTable, chunk);
                if (!isRetryableError(error)) break;
              }
            }
          }
        }
      } catch (err) {
        hadError = true;
        if (isRetryableError(err)) {
          requeueDeletes(mappedTable, ids);
        }
      }
    }

    // 3. Process upserts
    const allTables = new Set(Object.keys(upsertsToProcess));
    const orderedTables = [...TABLE_PROCESS_ORDER.filter(t => allTables.has(t)), ...Array.from(allTables).filter(t => !TABLE_PROCESS_ORDER.includes(t))];

    for (const mappedTable of orderedTables) {
      if (missingTables.has(mappedTable)) continue;
      const records = upsertsToProcess[mappedTable];
      if (!records || Object.keys(records).length === 0) continue;

      try {
        const payloads = Object.entries(records).map(([id, value]) => preparePayload(mappedTable, id, value));
        
        if (mappedTable === 'users' && payloads.length > 0) {
          try {
            const { data: dbUsers } = await supabase.from('users').select('id, uid, email');
            if (dbUsers) {
              payloads.forEach(p => {
                const matched = dbUsers.find((du: any) => 
                  (du.uid && p.uid && du.uid === p.uid) || 
                  (du.email && p.email && du.email.toLowerCase() === p.email.toLowerCase())
                );
                if (matched) {
                  p.id = matched.id;
                  if (matched.uid) {
                    p.uid = matched.uid;
                  }
                }
              });
            }
          } catch (fetchErr) {
            console.warn('[Sync Service] Could not pre-fetch existing users to align IDs:', fetchErr);
          }
        }

        const chunkSize = 150;
        for (let i = 0; i < payloads.length; i += chunkSize) {
          const chunk = payloads.slice(i, i + chunkSize);
          
          let chunkToUpsert = [...chunk];
          const hasUpdatedAt = TABLE_COLUMNS[mappedTable]?.includes('updated_at');
          if (hasUpdatedAt) {
            try {
              const ids = chunk.map(p => p.id);
              const { data: remoteRecords } = await supabase.from(mappedTable).select('id, updated_at').in('id', ids);
              if (remoteRecords && remoteRecords.length > 0) {
                const conflicts: string[] = [];
                const remoteMap = new Map<string, string>(remoteRecords.map((r: any) => [r.id, r.updated_at]));
                
                chunkToUpsert = chunk.filter(localItem => {
                  const remoteUpdated = remoteMap.get(localItem.id);
                  if (remoteUpdated && localItem.updated_at) {
                    const remoteTime = new Date(remoteUpdated).getTime();
                    const localTime = new Date(localItem.updated_at as string).getTime();
                    
                    if (remoteTime > localTime) {
                      conflicts.push(localItem.id);
                      return false; // Exclude from push
                    }
                  }
                  return true;
                });

                if (conflicts.length > 0) {
                  const { data: fullRemotes } = await supabase.from(mappedTable).select('*').in('id', conflicts);
                  if (fullRemotes) {
                    for (const remoteRecord of fullRemotes) {
                      const remoteCamel = convertKeysToCamel(remoteRecord);
                      const localCamel = records[remoteRecord.id] || {};
                      
                      // Perform smart field-level null-coalescing merge
                      const mergedCamel = { ...localCamel };
                      for (const key of Object.keys(remoteCamel)) {
                        const remoteVal = remoteCamel[key];
                        const localVal = localCamel[key];
                        
                        if (remoteVal !== null && remoteVal !== undefined && remoteVal !== '') {
                          mergedCamel[key] = remoteVal;
                        } else if (localVal !== null && localVal !== undefined && localVal !== '') {
                          mergedCamel[key] = localVal;
                        } else {
                          mergedCamel[key] = remoteVal;
                        }
                      }
                      
                      setLocalState(`${mappedTable}/${remoteRecord.id}`, mergedCamel);
                      triggerObservers(`${mappedTable}/${remoteRecord.id}`);
                    }
                    await saveStateToStorage(mappedTable);
                  }
                  toast.warning(`${conflicts.length} conflit(s) de synchronisation résolu(s) sur "${mappedTable}" : la version du serveur Supabase, plus récente, a été conservée.`);
                }
              }
            } catch (conflictErr) {
              console.warn(`[Sync Conflict] Failed to perform conflict checks on ${mappedTable}:`, conflictErr);
            }
          }

          if (chunkToUpsert.length > 0) {
            const conflictColumn = 'id';
            const { error } = await supabase.from(mappedTable).upsert(chunkToUpsert, { onConflict: conflictColumn });
            if (error) {
              hadError = true;
              handleSupabaseError(mappedTable, 'Upsert', error);
              if (isRetryableError(error)) {
                const failedIds = chunkToUpsert.map(p => p.id);
                const failedRecords: Record<string, any> = {};
                failedIds.forEach(id => records[id] && (failedRecords[id] = records[id]));
                requeueUpserts(mappedTable, failedRecords);
              }
              if (!isRetryableError(error)) break;
            }
          }
        }
      } catch (err) {
        hadError = true;
        console.error('[processSyncQueue] error in table sync loop for table:', mappedTable, err);
        if (isRetryableError(err)) {
          requeueUpserts(mappedTable, records);
        }
      }
    }
  } catch (globalErr) {
    hadError = true;
    console.error("[SyncService] Uncaught general error in background sync queue:", globalErr);
  } finally {
    if (hadError) {
      consecutiveErrorCount++;
    } else {
      consecutiveErrorCount = 0;
    }

    isSyncingQueue = false;
    _isSyncActive = false;
    notifySyncStatus();
    await savePendingSyncQueue();
    if (hasPendingChanges()) scheduleQueueProcessing(hadError ? 6000 : 3000);
  }
}

function requeueDeletes(table: string, ids: string[]) {
  if (!pendingDeletes[table]) pendingDeletes[table] = [];
  ids.forEach(id => !pendingDeletes[table].includes(id) && pendingDeletes[table].push(id));
}

function requeueUpserts(table: string, records: Record<string, any>) {
  if (!pendingUpserts[table]) pendingUpserts[table] = {};
  for (const [id, val] of Object.entries(records)) {
    if (pendingUpserts[table][id] === undefined) {
      pendingUpserts[table][id] = val;
    }
  }
}

function isUsersDeleteBlockedByTransactions(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();

  return (
    code === '23503' &&
    (message.includes('transactions_user_id_fkey') ||
      details.includes('transactions_user_id_fkey') ||
      (message.includes('foreign key constraint') && message.includes('transactions')))
  );
}

function notifyBlockedUserDelete(userId: string) {
  const key = `users_delete_blocked_${userId}`;
  const now = Date.now();
  if (lastErrorToasts[key] && now - lastErrorToasts[key] < 60000) {
    return;
  }
  lastErrorToasts[key] = now;
  toast.warning(`Suppression ignorée pour l'utilisateur "${userId}" : ce compte est lié à des transactions.`);
}

function isRetryableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  
  const isConstraintOrClientError =
    code === '23502' || // NOT NULL violation
    code === '23503' || // Foreign key violation
    code === '23505' || // Unique key violation
    code === '22001' || // Value too long
    code === 'PGRST204' || // Column not found
    code === 'PGRST205' || // Relation not found
    message.toLowerCase().includes('violates not-null constraint') ||
    message.toLowerCase().includes('null value in column') ||
    message.toLowerCase().includes('foreign key constraint') ||
    message.toLowerCase().includes('duplicate key') ||
    message.toLowerCase().includes('violates unique constraint');

  return !(
    code === '42P01' || 
    code === '42501' || 
    isConstraintOrClientError ||
    message.includes("Could not find the table") || 
    message.includes("row-level security")
  );
}

export function handleSupabaseError(table: string, actionType: string, error: any) {
  if (!error) return;
  const message = error.message || '';
  const code = error.code || '';
  const isMissingTable = message.includes("Could not find the table") || code === '42P01' || (message.includes("relation") && message.includes("does not exist"));
  
  const now = Date.now();
  if (lastErrorToasts[table] && now - lastErrorToasts[table] < 60000) {
    return;
  }
  lastErrorToasts[table] = now;

  if (isMissingTable) {
    missingTables.add(table);
    toast.error(`La table "${table}" n'existe pas dans Supabase.`);
  } else {
    toast.error(`Erreur de synchronisation (${actionType}) sur "${table}": ${message}`);
  }
}

export function isRecordPendingSync(table: string, id: string): boolean {
  if (pendingUpserts[table] && pendingUpserts[table][id] !== undefined) {
    return true;
  }
  if (pendingDeletes[table] && pendingDeletes[table].includes(id)) {
    return true;
  }
  return false;
}
