import { supabase } from '../supabase';
import { notifyNetworkIssue } from './networkErrorHandler';

import { SyncAction, SyncPayload, SyncStatusCallback } from './sync/types';
import { onBackgroundSyncStatus as telemetryOnBackgroundSyncStatus, notifySyncStatus } from './sync/syncTelemetry';
import {
  saveToDeadLetterQueue,
  getFailedSyncQueue as dlqGetFailedSyncQueue,
  clearFailedSyncQueue as dlqClearFailedSyncQueue,
  retryFailedSyncItem as dlqRetryFailedSyncItem,
  retryAllFailedSyncItems as dlqRetryAllFailedSyncItems,
  autoHealDeadLetterQueue
} from './sync/syncDeadLetterQueue';

import {
  LOCAL_ONLY_TABLES,
  ADMIN_RESTRICTED_SYNC_TABLES,
  isLocalOnlyTable,
  isTableMissingError,
  sanitizePayloadForSupabase,
  TABLE_PRIORITY
} from './sync/syncSanitizer';

import { processProductBatch, processStockAdjustments, SyncContextRefs } from './sync/workers/productSyncWorker';
import { processParentEntities, processCustomerBalances } from './sync/workers/peopleSyncWorker';
import { processDeletions, processTransactionsAndOtherRecords } from './sync/workers/transactionSyncWorker';

import {
  getMemorySyncQueue,
  setMemorySyncQueue,
  ensureQueueLoaded,
  flushSyncQueueImmediate,
  persistQueueToIDB,
  setupStorageLifecycleListeners
} from './sync/syncQueueStorage';

import {
  scheduleQueueProcessing,
  enqueueSync,
  enqueueSyncBatch,
  enqueueStockAdjustment,
  enqueueCustomerBalanceAdjustment,
  loadPendingSyncQueue,
  getSyncQueue,
  clearSyncQueue,
  registerProcessQueueHandler,
  EnqueueStockOptions
} from './sync/syncQueueEnqueue';

export type { SyncAction, SyncPayload, SyncStatusCallback, EnqueueStockOptions };
export { 
  notifySyncStatus, LOCAL_ONLY_TABLES, ADMIN_RESTRICTED_SYNC_TABLES, 
  isLocalOnlyTable, isTableMissingError, sanitizePayloadForSupabase, 
  TABLE_PRIORITY, ensureQueueLoaded, flushSyncQueueImmediate,
  scheduleQueueProcessing, enqueueSync, enqueueSyncBatch,
  enqueueStockAdjustment, enqueueCustomerBalanceAdjustment,
  loadPendingSyncQueue, getSyncQueue, clearSyncQueue
};

let isProcessingQueue = false;

// Enregistrement du gestionnaire de traitement asynchrone auprès du module d'enqueue
registerProcessQueueHandler(processSyncQueue);

// Configuration des listeners de cycle de vie (persistance automatique, reprise en ligne)
setupStorageLifecycleListeners(
  (delay) => scheduleQueueProcessing(delay),
  () => { 
    autoHealDeadLetterQueue(enqueueSyncBatch).catch(() => {});
    retryAllFailedSyncItems().catch(() => {}); 
  }
);

export function onBackgroundSyncStatus(callback: SyncStatusCallback): () => void {
  return telemetryOnBackgroundSyncStatus(callback, () => ({
    isSyncing: isProcessingQueue,
    pendingCount: getMemorySyncQueue().length
  }));
}

/**
 * 🚀 MOTEUR PRINCIPAL DE SYNCHRONISATION TRANSACTIONNEL SÉCURISÉ (Zero Data Loss)
 */
export async function processSyncQueue(): Promise<void> {
  if (!navigator.onLine || !supabase || isProcessingQueue) return;
  await ensureQueueLoaded();
  isProcessingQueue = true;

  const completedKeys = new Set<string>();
  const processedSnapshots = new Map<string, any>();
  let watchdog: any = null;
  const refs: SyncContextRefs = { hadNetworkError: false, hadAuthOrPermissionError: false };

  try {
    const queueItems = loadPendingSyncQueue();
    if (queueItems.length === 0) {
      notifySyncStatus(false, 0, 100, '');
      isProcessingQueue = false;
      return;
    }

    const totalItems = queueItems.length;
    const watchdogDuration = Math.max(60000, queueItems.length * 500);
    watchdog = setTimeout(() => {
      if (isProcessingQueue) {
        console.warn(`[SyncService] Watchdog expiré après ${watchdogDuration / 1000}s`);
        isProcessingQueue = false;
        notifySyncStatus(false, getMemorySyncQueue().length, 100, '');
      }
    }, watchdogDuration);

    notifySyncStatus(true, totalItems, 0, 'Démarrage...');

    // 1. Déduplication en mémoire de la file
    const dedupMap = new Map<string, SyncPayload>();
    const deleteList: SyncPayload[] = [];

    for (const item of queueItems) {
      if (isLocalOnlyTable(item.table)) continue;
      if (!item.opId) item.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      const idFallback = item.payload?.barcode || item.payload?.sku || (item.payload ? `${item.table}_${item.payload.name || 'item'}` : 'unknown');
      const key = `${item.table}:${item.recordId || item.payload?.id || idFallback}`;

      if (item.action === 'DELETE') {
        dedupMap.delete(key);
        const existingDelIdx = deleteList.findIndex(d => `${d.table}:${d.recordId || d.payload?.id}` === key);
        if (existingDelIdx !== -1) deleteList[existingDelIdx] = item;
        else deleteList.push(item);
      } else {
        const existingDelIdx = deleteList.findIndex(d => `${d.table}:${d.recordId || d.payload?.id}` === key);
        if (existingDelIdx !== -1) deleteList.splice(existingDelIdx, 1);
        const existing = dedupMap.get(key);

        if (existing && (item.table === 'stock_adjustments' || item.table === 'stockAdjustments')) {
          const mergedAdjId = `adj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
          const isItemSet = item.payload?.mode === 'set';
          const isExistingSet = existing.payload?.mode === 'set';

          if (isItemSet) {
            existing.payload = { ...existing.payload, ...item.payload, id: mergedAdjId, adjustmentId: mergedAdjId, mode: 'set' };
            existing.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            continue;
          } else if (isExistingSet) {
            const baseQty = Number(existing.payload?.newQuantity ?? existing.payload?.value) || 0;
            const delta = Number(item.payload?.adjustment ?? item.payload?.delta) || 0;
            const updatedQty = baseQty + delta;
            existing.payload = { ...existing.payload, ...item.payload, id: mergedAdjId, adjustmentId: mergedAdjId, mode: 'set', newQuantity: updatedQty, value: updatedQty };
            existing.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            continue;
          }

          const totalDelta = (Number(existing.payload?.adjustment ?? existing.payload?.delta) || 0) + (Number(item.payload?.adjustment ?? item.payload?.delta) || 0);
          existing.payload = { ...existing.payload, ...item.payload, id: mergedAdjId, adjustmentId: mergedAdjId, mode: 'delta', adjustment: totalDelta, delta: totalDelta };
          existing.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
          continue;
        }

        const existingHasDeltas = Boolean(
          existing?.payload && (
            existing.payload.deltaBalance !== undefined || existing.payload.deltaSpent !== undefined || existing.payload.deltaPoints !== undefined ||
            existing.payload.delta_balance !== undefined || existing.payload.delta_spent !== undefined || existing.payload.delta_points !== undefined
          )
        );
        const itemHasDeltas = Boolean(
          item.payload && (
            item.payload.deltaBalance !== undefined || item.payload.deltaSpent !== undefined || item.payload.deltaPoints !== undefined ||
            item.payload.delta_balance !== undefined || item.payload.delta_spent !== undefined || item.payload.delta_points !== undefined
          )
        );

        if (existing && item.table === 'customers' && (existingHasDeltas || itemHasDeltas)) {
          existing.payload = {
            ...existing.payload,
            ...item.payload,
            deltaBalance: (Number(existing.payload?.deltaBalance ?? existing.payload?.delta_balance ?? 0)) + (Number(item.payload?.deltaBalance ?? item.payload?.delta_balance ?? 0)),
            deltaSpent: (Number(existing.payload?.deltaSpent ?? existing.payload?.delta_spent ?? 0)) + (Number(item.payload?.deltaSpent ?? item.payload?.delta_spent ?? 0)),
            deltaPoints: (Number(existing.payload?.deltaPoints ?? existing.payload?.delta_points ?? 0)) + (Number(item.payload?.deltaPoints ?? item.payload?.delta_points ?? 0))
          };
          existing.opId = item.opId || ('op_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
          continue;
        }

        if (existing && existing.payload && typeof existing.payload === 'object' && item.payload && typeof item.payload === 'object') {
          existing.payload = { ...existing.payload, ...item.payload };
          existing.opId = item.opId || existing.opId;
          continue;
        }

        dedupMap.set(key, item);
      }
    }

    const queue = [...deleteList, ...Array.from(dedupMap.values())].filter(item => item && !isLocalOnlyTable(item.table));
    queue.sort((a, b) => (TABLE_PRIORITY[a.table] || 50) - (TABLE_PRIORITY[b.table] || 50));

    const totalOps = Math.max(1, queue.length);
    let completedOps = 0;

    const updateProgress = (tableName: string, count: number = 1) => {
      completedOps = Math.min(totalOps, completedOps + count);
      const progress = Math.min(99, Math.round((completedOps / totalOps) * 100));
      notifySyncStatus(true, Math.max(0, queue.length - completedOps), progress, tableName);
    };

    let hasActiveSupabaseSession = false;
    try {
      const { data: sessData } = await supabase.auth.getSession();
      hasActiveSupabaseSession = Boolean(sessData?.session?.user);
    } catch (_) {}

    // 2. Traitement des suppressions (Worker Transactions)
    await processDeletions(deleteList, completedKeys, processedSnapshots, updateProgress, refs);

    // 3. Traitement des entités parentes (Worker People & Config)
    const parentTables = ['settings', 'categories', 'brands', 'suppliers', 'users', 'employees'];
    await processParentEntities(queue, completedKeys, processedSnapshots, updateProgress, refs, hasActiveSupabaseSession);

    // 4. Moteur Produits & Ajustements de stock (Worker Produits)
    const productItems = queue.filter(item => item.table === 'products' && item.action !== 'DELETE');
    await processProductBatch(queue, productItems, completedKeys, processedSnapshots, updateProgress, refs);

    const stockItems = queue.filter(item => (item.table === 'stock_adjustments' || item.table === 'stockAdjustments') && item.action !== 'DELETE');
    await processStockAdjustments(stockItems, completedKeys, processedSnapshots, updateProgress, refs);

    // 5. Moteur Solde Clients (Worker People)
    await processCustomerBalances(queue, completedKeys, processedSnapshots, updateProgress, refs);

    // 6. Transactions & autres entités (Worker Transactions)
    await processTransactionsAndOtherRecords(queue, parentTables, completedKeys, processedSnapshots, updateProgress, refs, hasActiveSupabaseSession);

  } catch (err: any) {
    if (refs.hadNetworkError) {
      notifyNetworkIssue(err, 'Synchronisation');
    }
    console.warn('[SyncService] Erreur globale file synchronisation:', err);
  } finally {
    if (watchdog) clearTimeout(watchdog);
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const isNetworkIssue = refs.hadNetworkError || isOffline;

    // 🛡️ Retrait sélectif et protection DLQ
    let currentQueue = getMemorySyncQueue();
    currentQueue = currentQueue.filter(item => {
      if (!item || isLocalOnlyTable(item.table)) return false;
      const key = `${item.table}:${item.recordId || item.payload?.id}`;
      if (completedKeys.has(key)) {
        const snap = processedSnapshots.get(key);

        if (snap && (item.table === 'stock_adjustments' || item.table === 'stockAdjustments') && snap.sentAdjustment !== undefined) {
          const currentDelta = Number(item.payload?.adjustment ?? item.payload?.delta) || 0;
          const remainingDelta = currentDelta - snap.sentAdjustment;
          if (Math.abs(remainingDelta) > 0.0001) {
            const nextAdjId = `adj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
            item.payload.adjustment = remainingDelta;
            item.payload.delta = remainingDelta;
            item.payload.id = nextAdjId;
            item.payload.adjustmentId = nextAdjId;
            item.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            return true;
          }
          return false;
        }

        if (snap && item.table === 'customers' && (snap.sentDeltaBalance !== undefined || snap.sentDeltaSpent !== undefined || snap.sentDeltaPoints !== undefined)) {
          const curBal = Number(item.payload?.deltaBalance ?? item.payload?.delta_balance ?? 0);
          const curSpent = Number(item.payload?.deltaSpent ?? item.payload?.delta_spent ?? 0);
          const curPts = Number(item.payload?.deltaPoints ?? item.payload?.delta_points ?? 0);
          const remBal = curBal - (snap.sentDeltaBalance || 0);
          const remSpent = curSpent - (snap.sentDeltaSpent || 0);
          const remPts = curPts - (snap.sentDeltaPoints || 0);
          if (Math.abs(remBal) > 0.01 || Math.abs(remSpent) > 0.01 || Math.abs(remPts) > 0.01) {
            item.payload.deltaBalance = remBal;
            item.payload.deltaSpent = remSpent;
            item.payload.deltaPoints = remPts;
            item.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            return true;
          }
          if (snap.opId && item.opId && item.opId !== snap.opId) {
            delete item.payload.deltaBalance;
            delete item.payload.deltaSpent;
            delete item.payload.deltaPoints;
            delete item.payload.delta_balance;
            delete item.payload.delta_spent;
            delete item.payload.delta_points;
            return true;
          }
          return false;
        }

        if (snap && snap.opId && item.opId && item.opId !== snap.opId) {
          return true;
        }

        return false;
      }

      if (isNetworkIssue || refs.hadAuthOrPermissionError) {
        return true;
      }

      item.retryCount = (item.retryCount || 0) + 1;
      if (item.retryCount > 6) {
        console.warn(`[SyncService] Échec persistant après 6 essais pour : ${key}. Sauvegarde dans la DLQ.`);
        saveToDeadLetterQueue(item).catch(() => {});
        return false;
      }
      return true;
    });

    setMemorySyncQueue(currentQueue);
    persistQueueToIDB();
    notifySyncStatus(false, currentQueue.length, currentQueue.length === 0 ? 100 : 0, '');
    isProcessingQueue = false;

    if (currentQueue.length > 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
      const maxRetry = Math.max(1, ...currentQueue.map(i => i.retryCount || 1));
      const baseDelay = refs.hadAuthOrPermissionError ? 30000 : (isNetworkIssue ? 5000 : 1000);
      const backoffDelay = Math.min(baseDelay * Math.pow(2, Math.min(maxRetry - 1, 5)), 60000);
      scheduleQueueProcessing(backoffDelay);
    }
  }
}

export async function getFailedSyncQueue(): Promise<any[]> {
  return dlqGetFailedSyncQueue(isLocalOnlyTable);
}

export async function clearFailedSyncQueue(): Promise<void> {
  return dlqClearFailedSyncQueue();
}

export async function retryFailedSyncItem(index: number): Promise<void> {
  return dlqRetryFailedSyncItem(index, enqueueSyncBatch);
}

export async function retryAllFailedSyncItems(): Promise<void> {
  return dlqRetryAllFailedSyncItems(enqueueSyncBatch);
}
