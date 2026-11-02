import { set as setIDB } from 'idb-keyval';
import { TABLE_NAME_MAPPINGS } from '../../lib/db-converters';
import { lanSyncService } from '../lanSyncService';
import { SyncAction, SyncPayload } from './types';
import { isLocalOnlyTable } from './syncSanitizer';
import { notifySyncStatus } from './syncTelemetry';
import {
  getMemorySyncQueue,
  setMemorySyncQueue,
  getIsQueueLoadedFromIDB,
  persistQueueToIDB,
  flushSyncQueueImmediate,
} from './syncQueueStorage';

let scheduledTimer: any = null;
let processQueueCallback: (() => Promise<void>) | null = null;

export function registerProcessQueueHandler(fn: () => Promise<void>): void {
  processQueueCallback = fn;
}

export function scheduleQueueProcessing(delayMs = 1000): void {
  if (scheduledTimer) {
    if (delayMs <= 0) {
      clearTimeout(scheduledTimer);
      scheduledTimer = null;
    } else {
      return;
    }
  }
  scheduledTimer = setTimeout(() => {
    scheduledTimer = null;
    if (processQueueCallback) {
      processQueueCallback().catch((err) =>
        console.error('Erreur lors du traitement de la file SyncQueue :', err)
      );
    }
  }, Math.max(0, delayMs));
}

export function enqueueSync(
  table: string,
  recordId: string | null,
  actionOrPayload: SyncAction | any,
  payload?: any
): void {
  if (isLocalOnlyTable(table)) return;
  let action: SyncAction = 'UPSERT';
  let finalPayload = payload;

  if (actionOrPayload === 'DELETE' || actionOrPayload === 'UPSERT') {
    action = actionOrPayload as SyncAction;
  } else {
    finalPayload = actionOrPayload;
  }

  const item: SyncPayload = {
    table,
    recordId: recordId || '',
    action,
    payload: finalPayload,
    opId: 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
  };

  enqueueSyncBatch([item]);
}

export function enqueueSyncBatch(
  tableOrItems: string | SyncPayload[],
  records?: Record<string, any>
): void {
  let newItems: SyncPayload[] = [];
  if (Array.isArray(tableOrItems)) {
    newItems = tableOrItems
      .filter(item => item && !isLocalOnlyTable(item.table))
      .map(item => ({
        ...item,
        table: TABLE_NAME_MAPPINGS[item.table] || item.table,
        opId: item.opId || ('op_' + Math.random().toString(36).slice(2) + Date.now().toString(36))
      }));
  } else if (typeof tableOrItems === 'string' && records) {
    if (isLocalOnlyTable(tableOrItems)) return;
    const normTable = TABLE_NAME_MAPPINGS[tableOrItems] || tableOrItems;
    newItems = Object.entries(records).map(([id, val]) => ({
      table: normTable,
      recordId: id,
      action: 'UPSERT' as const,
      payload: val,
      opId: 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
    }));
  }

  if (newItems.length === 0) return;

  const dedupMap = new Map<string, SyncPayload>();
  getMemorySyncQueue().forEach(item => {
    const key = `${item.table}:${item.recordId}`;
    if (!item.opId) item.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    dedupMap.set(key, item);
  });
  newItems.forEach(item => {
    const key = `${item.table}:${item.recordId}`;
    if (!item.opId) item.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

    if (item.action === 'DELETE') {
      dedupMap.set(key, item);
      return;
    }

    const existing = dedupMap.get(key);
    if (existing && existing.action === 'DELETE') {
      dedupMap.set(key, item);
      return;
    }

    // 🛡️ CUMUL INTELLIGENT DES DELTAS DE STOCK : Ne jamais écraser les ajustements successifs
    if (existing && (item.table === 'stock_adjustments' || item.table === 'stockAdjustments')) {
      const mergedAdjId = `adj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      const isItemSet = item.payload?.mode === 'set';
      const isExistingSet = existing.payload?.mode === 'set';

      if (isItemSet) {
        existing.payload = {
          ...existing.payload,
          ...item.payload,
          id: mergedAdjId,
          adjustmentId: mergedAdjId,
          mode: 'set'
        };
        existing.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        return;
      } else if (isExistingSet) {
        const baseQty = Number(existing.payload?.newQuantity ?? existing.payload?.value) || 0;
        const delta = Number(item.payload?.adjustment ?? item.payload?.delta) || 0;
        const updatedQty = baseQty + delta;
        existing.payload = {
          ...existing.payload,
          ...item.payload,
          id: mergedAdjId,
          adjustmentId: mergedAdjId,
          mode: 'set',
          newQuantity: updatedQty,
          value: updatedQty
        };
        existing.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        return;
      }

      const existingDelta = Number(existing.payload?.adjustment ?? existing.payload?.delta) || 0;
      const newDelta = Number(item.payload?.adjustment ?? item.payload?.delta) || 0;
      const totalDelta = existingDelta + newDelta;
      existing.payload = {
        ...existing.payload,
        ...item.payload,
        id: mergedAdjId,
        adjustmentId: mergedAdjId,
        mode: 'delta',
        adjustment: totalDelta,
        delta: totalDelta
      };
      existing.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      return;
    }

    // 🛡️ P0-SYNC-03 : CUMUL INTELLIGENT DES DELTAS CLIENTS (Solde & Points)
    const existingHasDeltas = Boolean(
      existing?.payload && (
        existing.payload.deltaBalance !== undefined ||
        existing.payload.deltaSpent !== undefined ||
        existing.payload.deltaPoints !== undefined ||
        existing.payload.delta_balance !== undefined ||
        existing.payload.delta_spent !== undefined ||
        existing.payload.delta_points !== undefined
      )
    );
    const itemHasDeltas = Boolean(
      item.payload && (
        item.payload.deltaBalance !== undefined ||
        item.payload.deltaSpent !== undefined ||
        item.payload.deltaPoints !== undefined ||
        item.payload.delta_balance !== undefined ||
        item.payload.delta_spent !== undefined ||
        item.payload.delta_points !== undefined
      )
    );

    if (existing && item.table === 'customers' && (existingHasDeltas || itemHasDeltas)) {
      const exBal = Number(existing.payload?.deltaBalance ?? existing.payload?.delta_balance ?? 0);
      const newBal = Number(item.payload?.deltaBalance ?? item.payload?.delta_balance ?? 0);
      const exSpent = Number(existing.payload?.deltaSpent ?? existing.payload?.delta_spent ?? 0);
      const newSpent = Number(item.payload?.deltaSpent ?? item.payload?.delta_spent ?? 0);
      const exPts = Number(existing.payload?.deltaPoints ?? existing.payload?.delta_points ?? 0);
      const newPts = Number(item.payload?.deltaPoints ?? item.payload?.delta_points ?? 0);

      existing.payload = {
        ...existing.payload,
        ...item.payload,
        deltaBalance: exBal + newBal,
        deltaSpent: exSpent + newSpent,
        deltaPoints: exPts + newPts
      };
      existing.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      return;
    }

    if (existing && existing.payload && typeof existing.payload === 'object' && item.payload && typeof item.payload === 'object') {
      existing.payload = {
        ...existing.payload,
        ...item.payload
      };
      existing.opId = item.opId;
      return;
    }

    dedupMap.set(key, item);
  });

  const updatedQueue = Array.from(dedupMap.values());
  setMemorySyncQueue(updatedQueue);

  const hasCriticalItem = newItems.some(i => 
    i.table === 'transactions' || 
    i.table === 'shifts' || 
    i.table === 'cash_shifts' || 
    i.table === 'returns' ||
    i.table === 'stock_adjustments' ||
    i.table === 'stockAdjustments'
  );
  if (hasCriticalItem) {
    flushSyncQueueImmediate();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      scheduleQueueProcessing(0);
    } else {
      scheduleQueueProcessing(150);
    }
  } else {
    persistQueueToIDB();
    scheduleQueueProcessing(300);
  }
}

export interface EnqueueStockOptions {
  mode?: 'delta' | 'set';
  adjustmentId?: string;
  reason?: string;
  userId?: string;
  userName?: string;
  isLoss?: boolean;
  newQuantity?: number;
}

export function enqueueStockAdjustment(
  productId: string, 
  adjustment: number,
  options?: EnqueueStockOptions
): void {
  const adjId = options?.adjustmentId || `adj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  const recordKey = productId;
  enqueueSync('stock_adjustments', recordKey, 'UPSERT', {
    id: adjId,
    adjustmentId: adjId,
    productId,
    adjustment,
    delta: adjustment,
    mode: options?.mode || 'delta',
    reason: options?.reason,
    userId: options?.userId,
    userName: options?.userName,
    isLoss: options?.isLoss ?? (adjustment < 0),
    newQuantity: options?.newQuantity,
    timestamp: new Date().toISOString()
  });

  try {
    lanSyncService.broadcastStockAdjustment(productId, adjustment, options);
  } catch (_) {}

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    scheduleQueueProcessing(0);
  }
}

export function enqueueCustomerBalanceAdjustment(
  customerId: string,
  deltaBalance: number,
  deltaSpent: number = 0,
  deltaPoints: number = 0,
  fallbackData?: any
): void {
  enqueueSync('customers', customerId, 'UPSERT', {
    id: customerId,
    deltaBalance,
    deltaSpent,
    deltaPoints,
    ...fallbackData
  });

  try {
    lanSyncService.broadcastCustomerBalance(customerId, deltaBalance, deltaSpent, deltaPoints);
  } catch (_) {}
}

export function loadPendingSyncQueue(): SyncPayload[] {
  const mem = getMemorySyncQueue();
  if (!getIsQueueLoadedFromIDB() && typeof localStorage !== 'undefined') {
    try {
      const legacy = localStorage.getItem('sync_queue');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => item && !isLocalOnlyTable(item.table));
        }
      }
    } catch (_) {}
  }
  return mem.filter(item => item && !isLocalOnlyTable(item.table));
}

export function getSyncQueue(): SyncPayload[] {
  return loadPendingSyncQueue();
}

export function clearSyncQueue(): void {
  setMemorySyncQueue([]);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('sync_queue');
      localStorage.removeItem('nexus_emergency_sync_queue');
    }
  } catch (_) {}
  if (typeof indexedDB !== 'undefined') {
    try {
      setIDB('nexus_sync_queue', []).catch(() => {});
    } catch (_) {}
  }
  notifySyncStatus(false, 0);
}
