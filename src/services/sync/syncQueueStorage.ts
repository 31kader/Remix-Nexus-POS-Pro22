import { get as getIDB, set as setIDB } from 'idb-keyval';
import { SyncPayload } from './types';
import { isLocalOnlyTable } from './syncSanitizer';

let memorySyncQueue: SyncPayload[] = [];
let isQueueLoadedFromIDB = false;
let initQueuePromise: Promise<void> | null = null;
let saveQueueTimeout: any = null;

export function getMemorySyncQueue(): SyncPayload[] {
  return memorySyncQueue;
}

export function setMemorySyncQueue(queue: SyncPayload[]): void {
  memorySyncQueue = queue;
}

export function getIsQueueLoadedFromIDB(): boolean {
  return isQueueLoadedFromIDB;
}

export function ensureQueueLoaded(): Promise<void> {
  if (isQueueLoadedFromIDB) return Promise.resolve();
  if (!initQueuePromise) {
    initQueuePromise = initSyncQueueFromStorage().finally(() => {
      initQueuePromise = null;
    });
  }
  return initQueuePromise;
}

export async function initSyncQueueFromStorage(): Promise<void> {
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

    if (typeof localStorage !== 'undefined') {
      const emergencyRaw = localStorage.getItem('nexus_emergency_sync_queue');
      if (emergencyRaw) {
        try {
          const emergencyQueue = JSON.parse(emergencyRaw);
          if (Array.isArray(emergencyQueue) && emergencyQueue.length > 0) {
            console.log(`[SyncService] 🛡️ Restauration d'urgence de ${emergencyQueue.length} élément(s)`);
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

    const filteredLoaded = loadedItems.filter(item => item && !isLocalOnlyTable(item.table));
    if (memorySyncQueue.length > 0) {
      const existingKeys = new Set(memorySyncQueue.map(i => `${i.table}:${i.recordId}`));
      const nonDuplicateLoaded = filteredLoaded.filter(i => !existingKeys.has(`${i.table}:${i.recordId}`));
      memorySyncQueue = [...nonDuplicateLoaded, ...memorySyncQueue];
    } else {
      memorySyncQueue = filteredLoaded;
    }
  } catch (_) {
  } finally {
    isQueueLoadedFromIDB = true;
  }
}

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

export function persistQueueToIDB(): void {
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
    } catch (_) {}
  }, 100);
}

export function setupStorageLifecycleListeners(
  onScheduleProcessing: (delayMs: number) => void,
  onRetryFailedItems: () => void
): void {
  if (typeof window === 'undefined') return;
  initSyncQueueFromStorage();
  window.addEventListener('beforeunload', () => flushSyncQueueImmediate());
  window.addEventListener('pagehide', () => flushSyncQueueImmediate());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushSyncQueueImmediate();
    } else if (document.visibilityState === 'visible') {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        onScheduleProcessing(0);
      }
    }
  });
  let onlineDebounceTimer: any = null;
  window.addEventListener('online', () => {
    if (onlineDebounceTimer) clearTimeout(onlineDebounceTimer);
    onlineDebounceTimer = setTimeout(() => {
      onScheduleProcessing(0);
      onRetryFailedItems();
    }, 300);
  });
}
