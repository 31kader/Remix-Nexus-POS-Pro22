import { get as getIDB, set as setIDB } from 'idb-keyval';
import { SyncPayload } from './types';

export async function saveToDeadLetterQueue(item: SyncPayload): Promise<void> {
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

export async function getFailedSyncQueue(isLocalOnlyTable?: (table: string) => boolean): Promise<any[]> {
  try {
    const raw = (await getIDB<any[]>('nexus_sync_failed')) || [];
    return raw.filter((item: any) => item && !(isLocalOnlyTable && isLocalOnlyTable(item.table)));
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

export async function retryFailedSyncItem(
  index: number,
  enqueueSyncBatch: (items: SyncPayload[]) => void
): Promise<void> {
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

export async function retryAllFailedSyncItems(
  enqueueSyncBatch: (items: SyncPayload[]) => void
): Promise<void> {
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
