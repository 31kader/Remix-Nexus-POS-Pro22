import { supabase } from '../../../supabase';
import { TABLE_NAME_MAPPINGS } from '../../../lib/db-converters';
import { isNetworkOrTimeoutError } from '../../networkErrorHandler';
import { SyncPayload } from '../types';
import { isTableMissingError } from '../syncSanitizer';
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
