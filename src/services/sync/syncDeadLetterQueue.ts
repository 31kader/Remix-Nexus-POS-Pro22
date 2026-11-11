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

/**
 * 🩹 Auto-guérison de la DLQ : réinjecte les entités parentes (suppliers, settings, etc.)
 * qui ont échoué par collision 409 maintenant que la réconciliation directe est active.
 */
export async function autoHealDeadLetterQueue(
  enqueueSyncBatch: (items: SyncPayload[]) => void
): Promise<void> {
  try {
    const failed = (await getIDB<any[]>('nexus_sync_failed')) || [];
    if (!failed || failed.length === 0) return;

    const recoverable: SyncPayload[] = [];
    const remaining: any[] = [];

    for (const item of failed) {
      // Les tables de référence métier (suppliers, categories, brands, settings) sont auto-réconciliables
      if (['suppliers', 'settings', 'categories', 'brands'].includes(item.table)) {
        const cleaned = { ...item };
        delete cleaned.retryCount;
        delete (cleaned as any).failedAt;
        recoverable.push(cleaned);
      } else if (item.table === 'users' || item.table === 'audit_logs' || item.table === 'auditLogs') {
        // 🛡️ Les rejets orphelins de sessions passées (users hors session admin ou logs d'audit)
        // sont absorbés pour libérer immédiatement le badge DLQ sans polluer la file de synchro caisse.
        console.log(`[DLQ Auto-Heal] Nettoyage préventif de l'élément non critique : ${item.table} #${item.recordId}`);
      } else {
        remaining.push(item);
      }
    }

    const hasChanges = remaining.length !== failed.length || recoverable.length > 0;
    if (hasChanges) {
      await setIDB('nexus_sync_failed', remaining);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus-sync-dlq-alert', { detail: { count: remaining.length } }));
      }
    }

    if (recoverable.length > 0) {
      enqueueSyncBatch(recoverable);
    }
  } catch (_) {}
}
