function isAuthOrPermissionError(err: any): boolean {
  if (!err) return false;
  const status = Number(err?.status || err?.statusCode || 0);
  const code = String(err?.code || '');
  const str = String(err?.message || err?.details || err?.hint || code || status || '').toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    code === '42501' ||
    str.includes('401') ||
    str.includes('403') ||
    str.includes('jwt') ||
    str.includes('unauthorized') ||
    str.includes('forbidden') ||
    str.includes('permission') ||
    str.includes('row-level security') ||
    str.includes('policy')
  );
}

function isDuplicateKeyError(err: any): boolean {
  if (!err) return false;
  const code = String(err?.code || '');
  const status = Number(err?.status || err?.statusCode || 0);
  const str = String(err?.message || err?.details || '').toLowerCase();
  return (
    code === '23505' ||
    status === 409 ||
    str.includes('duplicate key') ||
    str.includes('already exists') ||
    str.includes('unique constraint')
  );
}
import { get as getIDB, set as setIDB, del } from 'idb-keyval';
import { supabase } from '../supabase';
import { convertKeysToSnake, preparePayload, TABLE_COLUMNS, TABLE_NAME_MAPPINGS } from '../lib/db-converters';
import { useCoreStore } from '../store/useCoreStore';
import { isNetworkOrTimeoutError, notifyNetworkIssue } from './networkErrorHandler';

export type SyncAction = 'UPSERT' | 'DELETE';

export interface SyncPayload {
  table: string;
  recordId: string;
  action: SyncAction;
  payload: any;
  retryCount?: number;
  opId?: string;
}

export type SyncStatusCallback = (status: {
  isSyncing: boolean;
  pendingCount: number;
  progress?: number;
  currentTable?: string;
}) => void;
const syncStatusListeners: Set<SyncStatusCallback> = new Set();

// Tables gérées exclusivement en local (IndexedDB) sans persistance distante Supabase
export const LOCAL_ONLY_TABLES = new Set<string>(['cart_drafts', 'cartDrafts']);

// Tables protégées par RLS exigeant une session Supabase active (évite le spam 403 Forbidden hors connexion)
export const ADMIN_RESTRICTED_SYNC_TABLES = new Set<string>(['employees', 'settings', 'audit_logs', 'users']);

export function isLocalOnlyTable(table: string): boolean {
  if (!table) return false;
  const norm = TABLE_NAME_MAPPINGS[table] || table;
  return LOCAL_ONLY_TABLES.has(table) || LOCAL_ONLY_TABLES.has(norm);
}

export function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const status = Number(err?.status || err?.statusCode || 0);
  const code = String(err?.code || '');
  const msg = String(err?.message || err?.details || '');
  return (
    status === 404 ||
    code === '42P01' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('Not Found') ||
    msg.includes('could not find the table')
  );
}

let memorySyncQueue: SyncPayload[] = [];
let isQueueLoadedFromIDB = false;
let initQueuePromise: Promise<void> | null = null;

export function ensureQueueLoaded(): Promise<void> {
  if (isQueueLoadedFromIDB) return Promise.resolve();
  if (!initQueuePromise) {
    initQueuePromise = initSyncQueueFromStorage().finally(() => {
      initQueuePromise = null;
    });
  }
  return initQueuePromise;
}

// 🟢 Initialisation asynchrone depuis IndexedDB (avec miroir d'urgence de secours anti-crash)
async function initSyncQueueFromStorage() {
  if (isQueueLoadedFromIDB) return;
  try {
    let loadedItems: SyncPayload[] = [];
    if (typeof indexedDB !== 'undefined') {
      const idbData = await getIDB<SyncPayload[]>('nexus_sync_queue');
      if (idbData && Array.isArray(idbData)) {
        loadedItems = idbData;
      }
    } else if (typeof localStorage !== 'undefined') {
      const legacy = localStorage.getItem('sync_queue');
      if (legacy) {
        try { loadedItems = JSON.parse(legacy); } catch (_) {}
      }
    }

    // 🛡️ Restauration de sécurité d'urgence (Crash / Fermeture brusque du navigateur)
    if (typeof localStorage !== 'undefined') {
      const emergencyRaw = localStorage.getItem('nexus_emergency_sync_queue');
      if (emergencyRaw) {
        try {
          const emergencyQueue = JSON.parse(emergencyRaw);
          if (Array.isArray(emergencyQueue) && emergencyQueue.length > 0) {
            console.log(`[SyncService] 🛡️ Restauration d'urgence de ${emergencyQueue.length} élément(s) après fermeture subite.`);
            const mergedMap = new Map<string, SyncPayload>();
            loadedItems.forEach(i => {
              if (i) mergedMap.set(`${i.table}:${i.recordId}`, i);
            });
            emergencyQueue.forEach((i: SyncPayload) => {
              if (!i) return;
              const key = `${i.table}:${i.recordId}`;
              const existing = mergedMap.get(key);
              if (!existing) {
                mergedMap.set(key, i);
              } else {
                // emergencyQueue est synchrone et plus récent que nexus_sync_queue (debounced 100ms) en cas de fermeture brusque
                mergedMap.set(key, {
                  ...existing,
                  ...i,
                  payload: (existing.payload && typeof existing.payload === 'object' && i.payload && typeof i.payload === 'object')
                    ? { ...existing.payload, ...i.payload }
                    : (i.payload ?? existing.payload)
                });
              }
            });
            loadedItems = Array.from(mergedMap.values());
            // Nettoyage après consolidation réussie
            localStorage.removeItem('nexus_emergency_sync_queue');
            if (typeof indexedDB !== 'undefined') {
              setIDB('nexus_sync_queue', loadedItems).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('[SyncService] Erreur parsing emergency queue:', e);
        }
      }
    }

    // 🛡️ P1-SYNC-9 : Consolider avec les items en vol arrivés pendant le chargement sans doubler les deltas
    const filteredLoaded = loadedItems.filter(item => item && !isLocalOnlyTable(item.table));
    if (memorySyncQueue.length > 0) {
      const existingKeys = new Set(memorySyncQueue.map(i => `${i.table}:${i.recordId}`));
      const nonDuplicateLoaded = filteredLoaded.filter(i => !existingKeys.has(`${i.table}:${i.recordId}`));
      memorySyncQueue = [...nonDuplicateLoaded, ...memorySyncQueue];
    } else {
      memorySyncQueue = filteredLoaded;
    }
  } catch (err) {
    // Silent in testing environments
  } finally {
    isQueueLoadedFromIDB = true;
  }
}

/**
 * 🛡️ Sauvegarde synchrone garantie anti-crash (avant fermeture ou extinction)
 */
export function flushSyncQueueImmediate(): void {
  if (typeof window === 'undefined') return;
  if (saveQueueTimeout) {
    clearTimeout(saveQueueTimeout);
    saveQueueTimeout = null;
  }
  try {
    if (memorySyncQueue.length > 0) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nexus_emergency_sync_queue', JSON.stringify(memorySyncQueue));
      }
      if (typeof indexedDB !== 'undefined') {
        setIDB('nexus_sync_queue', memorySyncQueue).catch(() => {});
      }
    } else {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('nexus_emergency_sync_queue');
      }
    }
  } catch (e) {
    console.warn('[SyncService] Erreur flushSyncQueueImmediate:', e);
  }
}

if (typeof window !== 'undefined') {
  initSyncQueueFromStorage();

  // Écouteurs de sécurité sur les événements critiques de cycle de vie
  window.addEventListener('beforeunload', () => flushSyncQueueImmediate());
  window.addEventListener('pagehide', () => flushSyncQueueImmediate());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushSyncQueueImmediate();
    } else if (document.visibilityState === 'visible') {
      // ⚡ REPRISE AU PREMIER PLAN (T9) : Relancer immédiatement le vidage de la file d'attente
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        scheduleQueueProcessing(0);
      }
    }
  });
  let onlineDebounceTimer: any = null;
  window.addEventListener('online', () => {
    if (onlineDebounceTimer) clearTimeout(onlineDebounceTimer);
    onlineDebounceTimer = setTimeout(() => {
      scheduleQueueProcessing(0);
      retryAllFailedSyncItems().catch(() => {});
    }, 300);
  });
}

let saveQueueTimeout: any = null;
function persistQueueToIDB() {
  // Miroir d'urgence synchrone immédiat (ne dépend d'aucun timer)
  if (typeof localStorage !== 'undefined' && memorySyncQueue.length > 0) {
    try {
      localStorage.setItem('nexus_emergency_sync_queue', JSON.stringify(memorySyncQueue));
    } catch (_) {}
  }

  if (typeof indexedDB === 'undefined') return;
  if (saveQueueTimeout) clearTimeout(saveQueueTimeout);
  saveQueueTimeout = setTimeout(async () => {
    try {
      await setIDB('nexus_sync_queue', memorySyncQueue);
      if (typeof localStorage !== 'undefined' && memorySyncQueue.length === 0) {
        localStorage.removeItem('nexus_emergency_sync_queue');
      }
    } catch (e) {
      // Handled
    }
  }, 100);
}

let scheduledTimer: any = null;

/**
 * 🟢 Planifie le traitement de la file d'attente (avec debounce et exécution asynchrone pour laisser les boucles synchrones se terminer)
 */
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
    processSyncQueue().catch((err) =>
      console.error('Erreur lors du traitement de la file SyncQueue :', err)
    );
  }, Math.max(0, delayMs));
}

/**
 * 🟢 Ajoute une entrée unique à la file de synchro
 */
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

/**
 * 🟢 Ajoute un lot d'entrées en mémoire et persiste en IndexedDB (Zéro blocage UI, zéro limite 5Mo)
 */
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
  memorySyncQueue.forEach(item => {
    const key = `${item.table}:${item.recordId}`;
    if (!item.opId) item.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    dedupMap.set(key, item);
  });
  newItems.forEach(item => {
    const key = `${item.table}:${item.recordId}`;
    if (!item.opId) item.opId = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

    // 🛡️ P0-SYNC-4 : Un DELETE annule tout UPSERT antérieur en file d'attente pour la même clé
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
    // Préserve les deltas financiers même si la mise à jour courante n'est qu'un changement de coordonnées
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

    // 🛡️ P0-SYNC-4 : Fusionner les payloads des mises à jour partielles successives au lieu d'écraser
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

  memorySyncQueue = Array.from(dedupMap.values());
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
    // ⚡ Envoi immédiat 0ms sans minuteur si le terminal est en ligne
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

/**
 * 🟢 Ajoute un ajustement de stock atomique et idempotent (diffusion immédiate si en ligne)
 */
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
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    scheduleQueueProcessing(0);
  }
}

/**
 * 🟢 Ajoute un ajustement atomique de solde et points client
 */
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
}

/**
 * 🟢 Charge la file d'attente en attente depuis la mémoire ou IndexedDB
 */
export function loadPendingSyncQueue(): SyncPayload[] {
  if (!isQueueLoadedFromIDB && typeof localStorage !== 'undefined') {
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
  return memorySyncQueue.filter(item => item && !isLocalOnlyTable(item.table));
}

/**
 * 🟢 Alias d'accès direct à la file d'attente mémoire pour réconciliation locale
 */
export function getSyncQueue(): SyncPayload[] {
  return loadPendingSyncQueue();
}

/**
 * 🟢 Abonnement au statut de synchronisation
 */
export function onBackgroundSyncStatus(callback: SyncStatusCallback): () => void {
  syncStatusListeners.add(callback);
  try {
    callback({
      isSyncing: isProcessingQueue,
      pendingCount: memorySyncQueue.length,
      progress: isProcessingQueue ? 0 : 100,
      currentTable: ''
    });
  } catch (_) {}
  return () => {
    syncStatusListeners.delete(callback);
  };
}

export function notifySyncStatus(
  isSyncing: boolean,
  pendingCount: number,
  progress: number = 0,
  currentTable: string = ''
): void {
  syncStatusListeners.forEach((listener) => {
    try {
      listener({ isSyncing, pendingCount, progress, currentTable });
    } catch (_) {}
  });
}

/**
 * 🟢 Vide entièrement la file de synchronisation
 */
export function clearSyncQueue(): void {
  memorySyncQueue = [];
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

export function sanitizePayloadForSupabase(table: string, payload: any, fallbackId?: string): any {
  if (!payload || typeof payload !== 'object') return payload;
  const normTable = TABLE_NAME_MAPPINGS[table] || table;
  const recordId = payload.id || fallbackId || '';
  const cleaned = preparePayload(normTable, recordId, payload);

  // Handle specific product constraints (avoid unique constraint violations on empty strings)
  if (table === 'products') {
    if (typeof cleaned.name === 'string') {
      cleaned.name = cleaned.name.trim();
    }
    if (typeof cleaned.sku === 'string') {
      cleaned.sku = cleaned.sku.trim();
      if (!cleaned.sku) cleaned.sku = null;
    }
    if (typeof cleaned.barcode === 'string') {
      cleaned.barcode = cleaned.barcode.trim();
      if (!cleaned.barcode) cleaned.barcode = null;
    }
    if (typeof cleaned.reference === 'string') {
      cleaned.reference = cleaned.reference.trim();
      if (!cleaned.reference) cleaned.reference = null;
    }
    if (typeof cleaned.parent_id === 'string') {
      cleaned.parent_id = cleaned.parent_id.trim();
      if (!cleaned.parent_id) cleaned.parent_id = null;
    }
  }

  return cleaned;
}

export const TABLE_PRIORITY: Record<string, number> = {
  settings: 0,
  categories: 1,
  brands: 2,
  suppliers: 3,
  users: 4,
  employees: 5,
  products: 10,
  customers: 15,
  online_orders: 18,
  onlineOrders: 18,
  transactions: 20,
  returns: 21,
  goods_receipt_notes: 22,
  goodsReceiptNotes: 22,
  purchases: 23,
  purchase_orders: 24,
  purchaseOrders: 24,
  supplier_payments: 25,
  supplierPayments: 25,
  expenses: 26,
  damaged_items: 27,
  damagedItems: 27,
  vouchers: 28,
  stock_adjustments: 30,
  stockAdjustments: 30,
};

let isProcessingQueue = false;

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
  let hadNetworkError = false;
  let hadAuthOrPermissionError = false;

  try {
    const queueItems = loadPendingSyncQueue();
    if (queueItems.length === 0) {
      notifySyncStatus(false, 0, 100, '');
      isProcessingQueue = false;
      return;
    }

    const totalItems = queueItems.length;

    // 🛡️ Watchdog dynamique : minimum 60 secondes, +500ms par élément pour résister aux réseaux 3G/4G lents
    const watchdogDuration = Math.max(60000, queueItems.length * 500);
    watchdog = setTimeout(() => {
      if (isProcessingQueue) {
        console.warn(`[SyncService] Watchdog de synchronisation expiré après ${watchdogDuration / 1000}s`);
        isProcessingQueue = false;
        notifySyncStatus(false, memorySyncQueue.length, 100, '');
      }
    }, watchdogDuration);

    notifySyncStatus(true, totalItems, 0, 'Démarrage...');

    // 1. Déduplication en mémoire de la file de synchronisation
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
        if (existingDelIdx !== -1) {
          deleteList[existingDelIdx] = item;
        } else {
          deleteList.push(item);
        }
      } else {
        const existingDelIdx = deleteList.findIndex(d => `${d.table}:${d.recordId || d.payload?.id}` === key);
        if (existingDelIdx !== -1) {
          deleteList.splice(existingDelIdx, 1);
        }
        const existing = dedupMap.get(key);

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
            continue;
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
            continue;
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
          continue;
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
          existing.opId = item.opId || ('op_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
          continue;
        }

        if (existing && existing.payload && typeof existing.payload === 'object' && item.payload && typeof item.payload === 'object') {
          existing.payload = {
            ...existing.payload,
            ...item.payload
          };
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

    // 2. Traitement des suppressions
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
          hadNetworkError = true;
        }
      } catch (delErr) {
        if (isTableMissingError(delErr)) {
          const k = `${item.table}:${item.recordId}`;
          completedKeys.add(k);
          processedSnapshots.set(k, { opId: item.opId });
          updateProgress(item.table);
        } else if (isNetworkOrTimeoutError(delErr)) {
          hadNetworkError = true;
        } else {
          console.warn(`[SyncService] Delete skipped on ${item.table}/${item.recordId}`);
        }
      }
    }

    // 3. Traitement des entités parentes (Réglages, Catégories, Marques, Fournisseurs, Utilisateurs, Employés)
    const parentTables = ['settings', 'categories', 'brands', 'suppliers', 'users', 'employees'];
    const parentItems = queue.filter(item => {
      const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
      return parentTables.includes(targetTable) && item.action !== 'DELETE';
    });
    
    for (const item of parentItems) {
      const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
      if (ADMIN_RESTRICTED_SYNC_TABLES.has(targetTable) && !hasActiveSupabaseSession) {
        continue;
      }
      try {
        const rawParentPayload = (item.payload && typeof item.payload === 'object' && !item.payload.id && item.recordId)
          ? { ...item.payload, id: item.recordId }
          : item.payload;
        const payload = sanitizePayloadForSupabase(targetTable, rawParentPayload, item.recordId);
        if (!payload.id && item.recordId) payload.id = item.recordId;
        if (targetTable === 'users') {
          delete (payload as any).employeeId;
          delete (payload as any).employee_id;

          // Aligner l'ID si l'utilisateur existe déjà par email ou uid pour éviter l'erreur 409
          let existingId: string | null = null;
          try {
            if (payload.email) {
              const { data: existingUser } = await supabase.from('users').select('id').eq('email', payload.email).maybeSingle();
              if (existingUser?.id) {
                existingId = existingUser.id;
                payload.id = existingUser.id;
              }
            }
            if (!existingId && payload.uid) {
              const { data: existingUser } = await supabase.from('users').select('id').eq('uid', payload.uid).maybeSingle();
              if (existingUser?.id) {
                existingId = existingUser.id;
                payload.id = existingUser.id;
              }
            }
          } catch (_) {}

          // Si l'utilisateur existe déjà sur Supabase, UPDATE direct sans passer par POST onConflict (évite le 409 Conflict)
          if (existingId) {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            const updateRes = await supabase.from('users').update(updatePayload).eq('id', existingId);
            if (!updateRes.error) {
              const parentKey = `${item.table}:${item.recordId || payload.id}`;
              completedKeys.add(parentKey);
              if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
              if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
              processedSnapshots.set(parentKey, { opId: item.opId });
              updateProgress(targetTable);
              continue;
            }
          }
        }

        // 🛡️ Élimination des collisions 409 : UPDATE direct pour les commandes en ligne existantes
        if (targetTable === 'online_orders' && (payload.id || item.recordId || payload.external_order_id)) {
          const orderId = payload.id || item.recordId;
          const updatePayload = { ...payload };
          delete updatePayload.id;
          delete updatePayload.created_at;

          let updateRes: any = null;
          if (orderId) {
            updateRes = await supabase.from('online_orders').update(updatePayload).eq('id', orderId);
          }
          if ((!updateRes || updateRes.error) && payload.external_order_id) {
            updateRes = await supabase.from('online_orders').update(updatePayload).eq('external_order_id', payload.external_order_id);
          }

          if (updateRes && !updateRes.error) {
            const parentKey = `${item.table}:${item.recordId || payload.id}`;
            completedKeys.add(parentKey);
            if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
            if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
            processedSnapshots.set(parentKey, { opId: item.opId });
            updateProgress(targetTable);
            continue;
          }
        }

        // 🛡️ Élimination des collisions 409 : UPDATE direct pour les transactions existantes (annulations / retours / modifications)
        if (targetTable === 'transactions' && (payload.id || item.recordId)) {
          const txId = payload.id || item.recordId;
          let existsOnSupabase = false;
          try {
            const { data: existingTx } = await supabase.from('transactions').select('id').eq('id', txId).maybeSingle();
            if (existingTx?.id) existsOnSupabase = true;
          } catch (_) {}

          if (existsOnSupabase) {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            delete updatePayload.created_at;
            delete updatePayload.timestamp;
            const updateRes = await supabase.from('transactions').update(updatePayload).eq('id', txId);
            if (!updateRes.error) {
              const parentKey = `${item.table}:${item.recordId || payload.id}`;
              completedKeys.add(parentKey);
              if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
              if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
              processedSnapshots.set(parentKey, { opId: item.opId });
              updateProgress(targetTable);
              continue;
            }
          }
        }

        // 🛡️ Élimination des collisions 409 / 403 : UPDATE direct pour les réglages (settings) existants
        if (targetTable === 'settings' && (payload.id || item.recordId)) {
          const settingsId = payload.id || item.recordId;
          let existsOnSupabase = false;
          try {
            if (settingsId === 'company' || settingsId === 'default' || settingsId === 'remote_label_queue_v1') {
              existsOnSupabase = true;
            } else {
              const { data: existingSet } = await supabase.from('settings').select('id').eq('id', settingsId).maybeSingle();
              if (existingSet?.id) existsOnSupabase = true;
            }
          } catch (_) {}

          if (existsOnSupabase) {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            delete updatePayload.created_at;
            const updateRes = await supabase.from('settings').update(updatePayload).eq('id', settingsId);
            if (!updateRes.error) {
              const parentKey = `${item.table}:${item.recordId || payload.id}`;
              completedKeys.add(parentKey);
              if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
              if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
              processedSnapshots.set(parentKey, { opId: item.opId });
              updateProgress(targetTable);
              continue;
            } else if (isAuthOrPermissionError(updateRes.error)) {
              console.warn(`[SyncService] Écriture settings réservée aux administrateurs (401/403). Réglage conservé localement.`);
              const parentKey = `${item.table}:${item.recordId || payload.id}`;
              completedKeys.add(parentKey);
              if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
              if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
              processedSnapshots.set(parentKey, { opId: item.opId });
              updateProgress(targetTable);
              continue;
            }
          }
        }

        // 🛡️ Élimination des collisions 409 / 403 : UPDATE direct pour les employés existants
        if (targetTable === 'employees' && (payload.id || item.recordId)) {
          const empId = payload.id || item.recordId;
          let existsOnSupabase = false;
          try {
            const { data: existingEmp } = await supabase.from('employees').select('id').eq('id', empId).maybeSingle();
            if (existingEmp?.id) existsOnSupabase = true;
          } catch (_) {}

          if (existsOnSupabase) {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            delete updatePayload.created_at;
            const updateRes = await supabase.from('employees').update(updatePayload).eq('id', empId);
            if (!updateRes.error) {
              const parentKey = `${item.table}:${item.recordId || payload.id}`;
              completedKeys.add(parentKey);
              if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
              if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
              processedSnapshots.set(parentKey, { opId: item.opId });
              updateProgress(targetTable);
              continue;
            } else if (isAuthOrPermissionError(updateRes.error)) {
              console.warn(`[SyncService] Écriture employees réservée aux administrateurs (401/403). Fiche conservée localement.`);
              const parentKey = `${item.table}:${item.recordId || payload.id}`;
              completedKeys.add(parentKey);
              if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
              if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
              processedSnapshots.set(parentKey, { opId: item.opId });
              updateProgress(targetTable);
              continue;
            }
          }
        }

        if (targetTable === 'cart_drafts' || targetTable === 'cartDrafts') {
          const parentKey = `${item.table}:${item.recordId || payload.id}`;
          completedKeys.add(parentKey);
          if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
          if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
          processedSnapshots.set(parentKey, { opId: item.opId });
          updateProgress(targetTable);
          continue;
        }

        let res = await supabase.from(targetTable).upsert(payload, { onConflict: 'id' });
        const parentKey = `${item.table}:${item.recordId || payload.id}`;
        const markParentCompleted = () => {
          completedKeys.add(parentKey);
          if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
          if (payload.id) completedKeys.add(`${item.table}:${payload.id}`);
          processedSnapshots.set(parentKey, { opId: item.opId });
          updateProgress(targetTable);
        };

        if (!res?.error) {
          markParentCompleted();
        } else if (isAuthOrPermissionError(res.error)) {
          hadAuthOrPermissionError = true;
          console.warn(`[SyncService] Accès refusé ou session requise (401/403) sur ${targetTable}. En attente de session.`);
          break;
        } else if (isTableMissingError(res.error)) {
          console.warn(`[SyncService] Table distante inexistante sur Supabase pour ${targetTable} (404/PGRST), retrait de la file.`);
          markParentCompleted();
        } else if (isNetworkOrTimeoutError(res.error)) {
          hadNetworkError = true;
          break;
        } else {
          // 🛡️ Fallback UPDATE si l'upsert échoue (ex: erreur 400/23502 NOT NULL lors d'un update partiel de balance)
          let recovered = false;
          if (payload.id) {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            const { error: updErr } = await supabase.from(targetTable).update(updatePayload).eq('id', payload.id);
            if (!updErr || isTableMissingError(updErr)) {
              recovered = true;
              markParentCompleted();
            } else if (isNetworkOrTimeoutError(updErr)) {
              hadNetworkError = true;
            }
          }

          // En cas de conflit (ex: 409 sur email ou uid déjà existant pour users), mettre à jour la ligne existante
          if (!recovered && targetTable === 'users') {
            if (payload.uid) {
              const updatePayload = { ...payload };
              delete updatePayload.id;
              const { error: updErr } = await supabase.from('users').update(updatePayload).eq('uid', payload.uid);
              if (!updErr) recovered = true;
              else if (isNetworkOrTimeoutError(updErr)) hadNetworkError = true;
            }
            if (!recovered && payload.email) {
              const updatePayload = { ...payload };
              delete updatePayload.id;
              const { error: updErr } = await supabase.from('users').update(updatePayload).eq('email', payload.email);
              if (!updErr) recovered = true;
              else if (isNetworkOrTimeoutError(updErr)) hadNetworkError = true;
            }
            if (recovered) {
              markParentCompleted();
            }
          }
        }
      } catch (pErr) {
        if (isTableMissingError(pErr)) {
          const parentKey = `${item.table}:${item.recordId || item.payload?.id}`;
          completedKeys.add(parentKey);
          if (item.recordId) completedKeys.add(`${item.table}:${item.recordId}`);
          processedSnapshots.set(parentKey, { opId: item.opId });
          updateProgress(item.table);
        } else if (isNetworkOrTimeoutError(pErr)) {
          hadNetworkError = true;
        } else {
          console.warn(`[SyncService] Parent upsert on ${item.table} error:`, pErr);
        }
      }
    }

    // 4. MOTEUR BATCH & PRE-CHECK POUR LES PRODUITS
    const productItems = queue.filter(item => item.table === 'products' && item.action !== 'DELETE');
    
    if (productItems.length > 0) {
      let remoteProducts: any = null;
      let remoteCategories: any = null;
      let remoteBrands: any = null;
      const prodMap = new Map<string, any>();
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

      try {
        const promises: Promise<any>[] = [];

        // 🛡️ P1-SYNC-01 : Requêtes ciblées par lots de 50 pour éviter limit(10000) et les URLs géantes
        if (queueProductIds.length > 0) {
          for (let i = 0; i < queueProductIds.length; i += 50) {
            promises.push(
              supabase.from('products').select('id, sku, barcode').in('id', queueProductIds.slice(i, i + 50))
            );
          }
        }
        if (queueSkus.length > 0) {
          for (let i = 0; i < queueSkus.length; i += 50) {
            promises.push(
              supabase.from('products').select('id, sku, barcode').in('sku', queueSkus.slice(i, i + 50))
            );
          }
        }
        if (queueBarcodes.length > 0) {
          for (let i = 0; i < queueBarcodes.length; i += 50) {
            promises.push(
              supabase.from('products').select('id, sku, barcode').in('barcode', queueBarcodes.slice(i, i + 50))
            );
          }
        }
        if (queueParentIds.length > 0) {
          for (let i = 0; i < queueParentIds.length; i += 50) {
            promises.push(
              supabase.from('products').select('id, sku, barcode').in('id', queueParentIds.slice(i, i + 50))
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
              hadNetworkError = true;
            }
          }
        }
        remoteProducts = Array.from(prodMap.values());
      } catch (err) {
        if (isNetworkOrTimeoutError(err)) hadNetworkError = true;
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
      const validBrands = new Set<string>((remoteBrands || []).map((b: any) => b.id));

      if (!validCategories.has('uncategorized')) {
        try {
          await supabase.from('categories').upsert({ id: 'uncategorized', name: 'Général', level: 1 }, { onConflict: 'id' });
          validCategories.add('uncategorized');
        } catch (_) {}
      }

      if (remoteProducts && Array.isArray(remoteProducts)) {
        for (const rp of remoteProducts) {
          if (rp.sku) skuToRemoteId.set(String(rp.sku).toLowerCase().trim(), rp.id);
          if (rp.barcode) barcodeToRemoteId.set(String(rp.barcode).toLowerCase().trim(), rp.id);
        }
      }

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
          if (!hadNetworkError && queueParentIds.length > 0 && !parentExistsRemote && !parentExistsInBatch) {
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
            // Produit fantôme orphelin contenant uniquement les valeurs par défaut : purger sans appel réseau
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
            hadNetworkError = true;
          }
        } catch (partCatchErr) {
          if (isNetworkOrTimeoutError(partCatchErr)) {
            hadNetworkError = true;
          } else {
            completedKeys.add(single.originalKey);
            processedSnapshots.set(single.originalKey, { opId: single.opId });
            updateProgress('Produits...');
          }
        }
      }

      // 🛡️ ANTI-COLLISION 409 & RLS 401 : Séparation stricte des produits existants et des nouveaux produits
      // Les produits existants sur Supabase exécutent directement un UPDATE (PATCH), garantissant 0 erreur 409.
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
        if (hadNetworkError) break;
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
              hadNetworkError = true;
              break;
            }
            if (updStatus === 401 || updStatus === 403 || updErr.code === '42501') {
              // RLS restriction (session locale sans JWT admin) : marquer synchronisé localement
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
            hadNetworkError = true;
            break;
          } else {
            console.error('[SyncService] Exception mise à jour produit existant:', err);
          }
        }
      }

      // 2. Traitement des nouveaux produits (INSERT en lots de 15)
      const PRODUCT_BATCH_SIZE = 15;
      const chunks: any[][] = [];
      const withStockList = newProductsToInsert.filter(e => 'stock' in e.payload);
      const withoutStockList = newProductsToInsert.filter(e => !('stock' in e.payload));
      for (const list of [withStockList, withoutStockList]) {
        for (let i = 0; i < list.length; i += PRODUCT_BATCH_SIZE) chunks.push(list.slice(i, i + PRODUCT_BATCH_SIZE));
      }
      for (const chunk of chunks) {
        if (hadNetworkError) break;
        // Harmonisation stricte des clés pour PostgREST (évite le rejet HTTP 400 'All object keys must match')
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
          const prodTable = supabase.from('products') as any;
          const { error } = (typeof prodTable.insert === 'function')
            ? await prodTable.insert(payloads)
            : await prodTable.upsert(payloads, { onConflict: 'id' });
          if (!error) {
            chunk.forEach(c => {
              completedKeys.add(c.originalKey);
              processedSnapshots.set(c.originalKey, { opId: c.opId });
            });
            updateProgress('Produits...', chunk.length);
          } else {
            if (isNetworkOrTimeoutError(error)) {
              hadNetworkError = true;
              break;
            }
            // Fallback un par un : si doublon concurrent (409), bascule vers UPDATE direct
            for (const single of chunk) {
              if (hadNetworkError) break;
              try {
                const singleProdTable = supabase.from('products') as any;
                const { error: singleErr, status: singleStatus } = (typeof singleProdTable.insert === 'function')
                  ? await singleProdTable.insert(single.payload)
                  : await singleProdTable.upsert(single.payload, { onConflict: 'id' });
                if (!singleErr) {
                  completedKeys.add(single.originalKey);
                  processedSnapshots.set(single.originalKey, { opId: single.opId });
                  updateProgress('Produits...');
                } else {
                  if (isNetworkOrTimeoutError(singleErr)) {
                    hadNetworkError = true;
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
                  hadNetworkError = true;
                  break;
                } else {
                  console.error('[SyncService] Échec persistant insert produit:', singleCatchErr);
                }
              }
            }
          }
        } catch (batchErr) {
          if (isNetworkOrTimeoutError(batchErr)) {
            hadNetworkError = true;
            break;
          }
        }
      }
    }

    // 4.5. TRAITEMENT ATOMIQUE & IDEMPOTENT DES AJUSTEMENTS DE STOCK (T7 - Zéro double décompte)
    const stockItems = queue.filter(item => (item.table === 'stock_adjustments' || item.table === 'stockAdjustments') && item.action !== 'DELETE');
    if (stockItems.length > 0) {
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
          // Tentative RPC PostgreSQL Atomique et Idempotent
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

          // 🛡️ Détection d'accès refusé ou utilisateur non authentifié (401/403/RLS)
          if (isAuthOrPermissionError(rpcErr)) {
            hadAuthOrPermissionError = true;
            console.warn(`[SyncService] RPC apply_stock_adjustment refusé (non authentifié ou RLS 401/403) pour ${prodId}. En attente de session.`);
            break;
          }

          // Fallback rétro-compatible vers adjust_product_stock si apply_stock_adjustment indisponible
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
              hadAuthOrPermissionError = true;
              break;
            }
          }

          if (isNetworkOrTimeoutError(rpcErr)) {
            hadNetworkError = true;
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
            hadAuthOrPermissionError = true;
            break;
          }
          if (isNetworkOrTimeoutError(stkErr)) hadNetworkError = true;
          console.warn(`[SyncService] Erreur ajustement stock atomique pour ${prodId}:`, stkErr);
        }
      }
    }

    // 4.8. TRAITEMENT ATOMIQUE DU SOLDE ET POINTS CLIENTS (Zéro écrasement multi-caisses, Idempotent)
    const customerItems = queue.filter(item => item.table === 'customers' && item.action !== 'DELETE');
    for (const item of customerItems) {
      const custId = item.payload?.id || item.recordId;
      const deltaBal = Number(item.payload?.deltaBalance ?? item.payload?.delta_balance) || 0;
      const deltaSpent = Number(item.payload?.deltaSpent ?? item.payload?.delta_spent) || 0;
      const deltaPts = Number(item.payload?.deltaPoints ?? item.payload?.delta_points) || 0;
      const originalKey = `${item.table}:${item.recordId || custId}`;

      if (custId && (deltaBal !== 0 || deltaSpent !== 0 || deltaPts !== 0)) {
        try {
          // 🛡️ P0-SYNC-1 : Clé d'idempotence liée à l'opération (item.opId) et non statique par client
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

          // Fallback rétrocompatible à 4 paramètres si la fonction distante n'accepte pas p_idempotency_key
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
            hadAuthOrPermissionError = true;
            console.warn(`[SyncService] RPC adjust_customer_balance refusé (non authentifié ou RLS 401/403) pour ${custId}. En attente de session.`);
            break;
          }

          if (!rpcErr) {
            // 🛡️ P0-SYNC-2 : Propager également les colonnes non-financières modifiées (ex: cashier_notes, last_visit, phone, credit_limit)
            try {
              const rawExtraKeys = Object.keys(item.payload || {}).filter(k =>
                ![
                  'id', 'balance', 'totalSpent', 'total_spent', 'loyaltyPoints', 'loyalty_points',
                  'deltaBalance', 'delta_balance', 'deltaSpent', 'delta_spent', 'deltaPoints', 'delta_points',
                  'idempotencyKey', 'idempotency_key'
                ].includes(k)
              );
              if (rawExtraKeys.length > 0) {
                // 🛡️ VULN-01 : Mise à jour partielle stricte sans injection de valeurs par défaut synthétiques (ex: name: 'Client')
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
              hadNetworkError = true;
            } else {
              console.warn(`[SyncService] Ajustement solde client ${custId} reporté à l'étape 5 (upsert):`, rpcErr);
              // Si le client a été créé hors-ligne et n'existe pas encore sur Supabase ('introuvable' / 'P0001'),
              // on NE l'ajoute PAS à completedKeys pour que l'étape 5 effectue l'upsert complet de création.
            }
          }
        } catch (cErr) {
          if (isAuthOrPermissionError(cErr)) {
            hadAuthOrPermissionError = true;
            break;
          }
          if (isNetworkOrTimeoutError(cErr)) hadNetworkError = true;
          console.warn('[SyncService] adjust_customer_balance error, fallback to upsert:', cErr);
        }
      }
    }

    // 5. Traitement des Ventes (Transactions) et autres entités
    const otherItems = queue.filter(item => {
      const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
      return !parentTables.includes(targetTable) && 
        targetTable !== 'products' && 
        targetTable !== 'stock_adjustments' &&
        !(targetTable === 'customers' && completedKeys.has(`${item.table}:${item.recordId || item.payload?.id}`)) &&
        item.action !== 'DELETE';
    });

    if (otherItems.length > 0) {
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
              hadAuthOrPermissionError = true;
              console.warn(`[SyncService] Upsert ${table} refusé (session requise 401/403/RLS). En attente de connexion.`);
              break;
            } else if (isTableMissingError(res.error)) {
              console.warn(`[SyncService] Table distante inexistante sur Supabase pour ${table} (404/PGRST), retrait du lot de la file.`);
              chunk.forEach((r: any) => markOtherRecordCompleted(table, r));
            } else {
              if (isNetworkOrTimeoutError(res.error)) {
                hadNetworkError = true;
                break;
              }
              // Fallback un par un si le lot échoue (erreur métier / contrainte)
              for (const single of chunk) {
                if (hadNetworkError || hadAuthOrPermissionError) break;
                try {
                  const sRes = await supabase.from(table).upsert(single.payload, { onConflict: 'id' });
                  if (!sRes?.error) {
                    markOtherRecordCompleted(table, single);
                  } else if (isAuthOrPermissionError(sRes.error)) {
                    hadAuthOrPermissionError = true;
                    break;
                  } else if (isTableMissingError(sRes.error)) {
                    markOtherRecordCompleted(table, single);
                  } else if (isNetworkOrTimeoutError(sRes.error)) {
                    hadNetworkError = true;
                    break;
                  } else if (isDuplicateKeyError(sRes.error)) {
                    // Fallback UPDATE si la ligne existe déjà (ex: conflit d'unicité sur l'id suite au retrait de l'en-tête Prefer)
                    if (single.payload?.id) {
                      const updatePayload = { ...single.payload };
                      delete updatePayload.id;
                      if (table === 'products') {
                        delete updatePayload.created_at;
                        delete updatePayload.stock;
                      }
                      const { error: updErr } = await supabase.from(table).update(updatePayload).eq('id', single.payload.id);
                      if (!updErr || isTableMissingError(updErr)) {
                        markOtherRecordCompleted(table, single);
                      } else if (isAuthOrPermissionError(updErr)) {
                        hadAuthOrPermissionError = true;
                        break;
                      } else if (isNetworkOrTimeoutError(updErr)) {
                        hadNetworkError = true;
                        break;
                      }
                    }
                  }
                } catch (sErr) {
                  if (isAuthOrPermissionError(sErr)) {
                    hadAuthOrPermissionError = true;
                    break;
                  } else if (isTableMissingError(sErr)) {
                    markOtherRecordCompleted(table, single);
                  } else if (isNetworkOrTimeoutError(sErr)) {
                    hadNetworkError = true;
                    break;
                  }
                }
              }
            }
          } catch (err) {
            if (isAuthOrPermissionError(err)) {
              hadAuthOrPermissionError = true;
              break;
            } else if (isTableMissingError(err)) {
              chunk.forEach((r: any) => markOtherRecordCompleted(table, r));
            } else if (isNetworkOrTimeoutError(err)) {
              hadNetworkError = true;
              break;
            } else {
              // Fallback un par un
              for (const single of chunk) {
                if (hadNetworkError) break;
                try {
                  const sRes = await supabase.from(table).upsert(single.payload, { onConflict: 'id' });
                  if (!sRes?.error || isTableMissingError(sRes.error)) {
                    markOtherRecordCompleted(table, single);
                  } else if (isAuthOrPermissionError(sRes.error)) {
                    hadAuthOrPermissionError = true;
                    break;
                  } else if (isNetworkOrTimeoutError(sRes.error)) {
                    hadNetworkError = true;
                    break;
                  } else if (isDuplicateKeyError(sRes.error)) {
                    if (single.payload?.id) {
                      const updatePayload = { ...single.payload };
                      delete updatePayload.id;
                      if (table === 'products') {
                        delete updatePayload.created_at;
                        delete updatePayload.stock;
                      }
                      const { error: updErr } = await supabase.from(table).update(updatePayload).eq('id', single.payload.id);
                      if (!updErr || isTableMissingError(updErr)) {
                        markOtherRecordCompleted(table, single);
                      }
                    }
                  }
                } catch (sErr) {
                  if (isAuthOrPermissionError(sErr)) {
                    hadAuthOrPermissionError = true;
                    break;
                  } else if (isTableMissingError(sErr)) {
                    markOtherRecordCompleted(table, single);
                  } else if (isNetworkOrTimeoutError(sErr)) {
                    hadNetworkError = true;
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (err: any) {
    if (isNetworkOrTimeoutError(err)) {
      hadNetworkError = true;
      notifyNetworkIssue(err, 'Synchronisation');
    }
    console.warn('[SyncService] Global queue processing encountered error:', err);
  } finally {
    if (watchdog) clearTimeout(watchdog);
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const isNetworkIssue = hadNetworkError || isOffline;

    // 🛡️ RETRAIT SÉLECTIF & PROTECTION DLQ (Zero In-Flight Loss)
    // On ne retire de la file QUE les éléments confirmés par Supabase, en soustrayant uniquement les deltas envoyés
    memorySyncQueue = memorySyncQueue.filter(item => {
      if (!item || isLocalOnlyTable(item.table)) return false;
      const key = `${item.table}:${item.recordId || item.payload?.id}`;
      if (completedKeys.has(key)) {
        const snap = processedSnapshots.get(key);

        // Cas 1 : Ajustements de stock relatifs
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
            return true; // Conservé car un nouveau mouvement est arrivé pendant l'envoi réseau !
          }
          return false;
        }

        // Cas 2 : Deltas financiers clients
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
            return true; // Conservé car un nouveau delta client est arrivé pendant l'envoi réseau !
          }
          if (snap.opId && item.opId && item.opId !== snap.opId) {
            delete item.payload.deltaBalance;
            delete item.payload.deltaSpent;
            delete item.payload.deltaPoints;
            delete item.payload.delta_balance;
            delete item.payload.delta_spent;
            delete item.payload.delta_points;
            return true; // Conservé car une colonne non-financière a été modifiée pendant l'envoi réseau !
          }
          return false;
        }

        // Cas 3 : Entités régulières (produits, transactions, catégories, etc.)
        if (snap && snap.opId && item.opId && item.opId !== snap.opId) {
          return true; // Conservé car modifié à nouveau pendant l'envoi réseau !
        }

        return false;
      }

      // 🛡️ P0-SYNC-01 : Ne JAMAIS incrémenter retryCount ni purger en DLQ lors d'une défaillance réseau ou d'attente d'authentification
      if (isNetworkIssue || hadAuthOrPermissionError) {
        return true; // Conservé intact dans la file active
      }

      // Seuls les échecs logiques / applicatifs incrémentent retryCount
      item.retryCount = (item.retryCount || 0) + 1;
      if (item.retryCount > 6) {
        console.warn(`[SyncService] Échec persistant après 6 essais pour : ${key}. Sauvegarde dans la Dead Letter Queue.`);
        saveToDeadLetterQueue(item).catch(() => {});
        return false;
      }
      return true;
    });
    persistQueueToIDB();
    notifySyncStatus(false, memorySyncQueue.length, memorySyncQueue.length === 0 ? 100 : 0, '');
    isProcessingQueue = false;

    // 🚀 Retry avec backoff exponentiel si des éléments restent dans la file et que le réseau est disponible
    if (memorySyncQueue.length > 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
      const maxRetry = Math.max(1, ...memorySyncQueue.map(i => i.retryCount || 1));
      const baseDelay = hadAuthOrPermissionError ? 30000 : (isNetworkIssue ? 5000 : 1000);
      const backoffDelay = Math.min(baseDelay * Math.pow(2, Math.min(maxRetry - 1, 5)), 60000);
      scheduleQueueProcessing(backoffDelay);
    }
  }
}

async function saveToDeadLetterQueue(item: SyncPayload): Promise<void> {
  try {
    const existing = (await getIDB<any[]>('nexus_sync_failed')) || [];
    existing.push({
      ...item,
      failedAt: new Date().toISOString()
    });
    await setIDB('nexus_sync_failed', existing);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus-sync-dlq-alert', { detail: { count: existing.length } }));
    }
  } catch (err) {
    console.warn('[SyncService] Impossible d\'ajouter l\'élément au Dead Letter Queue:', err);
  }
}

export async function getFailedSyncQueue(): Promise<any[]> {
  try {
    const raw = (await getIDB<any[]>('nexus_sync_failed')) || [];
    return raw.filter((item: any) => item && !isLocalOnlyTable(item.table));
  } catch {
    return [];
  }
}

export async function clearFailedSyncQueue(): Promise<void> {
  try {
    await setIDB('nexus_sync_failed', []);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus-sync-dlq-alert', { detail: { count: 0 } }));
    }
  } catch (_) {}
}

export async function retryFailedSyncItem(index: number): Promise<void> {
  try {
    const failed = (await getIDB<any[]>('nexus_sync_failed')) || [];
    if (index >= 0 && index < failed.length) {
      const [item] = failed.splice(index, 1);
      await setIDB('nexus_sync_failed', failed);
      if (item) {
        delete item.retryCount;
        delete (item as any).failedAt;
        enqueueSyncBatch([item]);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus-sync-dlq-alert', { detail: { count: failed.length } }));
      }
    }
  } catch (err) {
    console.warn('[SyncService] Erreur lors de la réimpression de l\'élément échoué:', err);
  }
}

export async function retryAllFailedSyncItems(): Promise<void> {
  try {
    const failed = (await getIDB<any[]>('nexus_sync_failed')) || [];
    if (failed.length > 0) {
      await setIDB('nexus_sync_failed', []);
      const itemsToRetry = failed.map(item => {
        const cleaned = { ...item };
        delete cleaned.retryCount;
        delete (cleaned as any).failedAt;
        return cleaned;
      });
      enqueueSyncBatch(itemsToRetry);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus-sync-dlq-alert', { detail: { count: 0 } }));
      }
    }
  } catch (err) {
    console.warn('[SyncService] Erreur lors de la tentative globale de retry:', err);
  }
}
