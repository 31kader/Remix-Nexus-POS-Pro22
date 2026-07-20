import { dbState } from '../lib/local-db';
import * as DexieModule from '../lib/dexie-db';

// Support flexible du nom d'export de Dexie (db, dexieDb ou default)
const dexieInstance: any = (DexieModule as any).db || (DexieModule as any).dexieDb || (DexieModule as any).default;

export interface PendingSyncItem {
  id: string;
  table: string;
  recordId: string;
  action: 'UPSERT' | 'DELETE';
  payload: any;
  timestamp: string;
  attempts: number;
}

// File d'attente en mémoire pour le suivi local
const pendingSyncQueue: Map<string, PendingSyncItem> = new Map();

/**
 * Vérifie si un enregistrement spécifique est en attente de synchronisation.
 */
export function isRecordPendingSync(table: string, recordId: string): boolean {
  const key = `${table}:${recordId}`;
  return pendingSyncQueue.has(key);
}

/**
 * Marque un enregistrement comme en attente de synchronisation.
 */
export function markRecordPendingSync(table: string, recordId: string, action: 'UPSERT' | 'DELETE', payload: any): void {
  const key = `${table}:${recordId}`;
  pendingSyncQueue.set(key, {
    id: key,
    table,
    recordId,
    action,
    payload,
    timestamp: new Date().toISOString(),
    attempts: 0
  });
}

/**
 * Retire un enregistrement de la file d'attente après synchronisation réussie.
 */
export function clearRecordPendingSync(table: string, recordId: string): void {
  const key = `${table}:${recordId}`;
  pendingSyncQueue.delete(key);
}

/**
 * RESOLUTION DU RISQUE DE CONFLIT (Last-Write-Wins)
 * Réinjecte des mutations échouées dans la file d'attente uniquement si
 * la donnée locale actuelle n'a pas été modifiée plus récemment entre-temps.
 */
export async function requeueUpsertsWithConflictCheck(failedItems: PendingSyncItem[]): Promise<void> {
  for (const item of failedItems) {
    try {
      // 1. Récupération du record actuel dans dbState
      const tableData = dbState[item.table];
      const localRecord = tableData ? tableData[item.recordId] : null;

      if (localRecord && localRecord.updatedAt) {
        const localDate = new Date(localRecord.updatedAt).getTime();
        const failedItemDate = new Date(item.timestamp).getTime();

        // Si l'utilisateur a modifié la donnée localement PENDANT l'échec de la requête,
        // la donnée locale est plus récente : on annule la réinjection de l'ancienne valeur.
        if (localDate > failedItemDate) {
          console.warn(
            `[SyncService] Rejet de l'ancienne tentative pour ${item.table}/${item.recordId} (Donnée locale plus récente).`
          );
          clearRecordPendingSync(item.table, item.recordId);
          continue;
        }
      }

      // 2. Si la donnée est toujours valide, on conserve/réinjecte l'élément
      markRecordPendingSync(item.table, item.recordId, item.action, item.payload);

      // Persistance secondaire dans Dexie si disponible
      if (dexieInstance && dexieInstance.sync_queue) {
        await dexieInstance.sync_queue.put(item);
      }
    } catch (err) {
      console.error(`[SyncService] Erreur lors de la vérification de conflit pour ${item.table}:`, err);
    }
  }
}

/**
 * Récupère la liste de tous les éléments en attente de synchronisation.
 */
export function getPendingSyncItems(): PendingSyncItem[] {
  return Array.from(pendingSyncQueue.values());
}