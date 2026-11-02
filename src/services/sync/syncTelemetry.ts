import { SyncStatusCallback } from './types';

export type { SyncStatusCallback };

const syncStatusListeners: Set<SyncStatusCallback> = new Set();

/**
 * 🟢 Abonnement au statut de synchronisation en arrière-plan
 */
export function onBackgroundSyncStatus(
  callback: SyncStatusCallback,
  getCurrentStatus?: () => { isSyncing: boolean; pendingCount: number }
): () => void {
  syncStatusListeners.add(callback);
  if (getCurrentStatus) {
    try {
      const current = getCurrentStatus();
      callback({
        isSyncing: current.isSyncing,
        pendingCount: current.pendingCount,
        progress: current.isSyncing ? 0 : 100,
        currentTable: ''
      });
    } catch (_) {}
  }
  return () => {
    syncStatusListeners.delete(callback);
  };
}

/**
 * 🟢 Émission du statut de synchronisation à tous les écouteurs actifs
 */
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
