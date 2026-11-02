import { set as idbSet } from 'idb-keyval';
import { TABLE_NAME_MAPPINGS } from '../../../lib/db-converters';
import { getDeletedRecordIds } from '../../../services/LocalDatabase';
import { loadPendingSyncQueue } from '../../../services/SyncService';
import { QueueConfig } from './syncTableFromNetwork';

export function applyTableRealtimeBatch(
  prev: any[],
  config: QueueConfig,
  mappedTable: string,
  tableUpdateQueue: any[],
  tableDeleteQueue: string[]
): any[] {
  if (tableUpdateQueue.length === 0 && tableDeleteQueue.length === 0) return prev;
  const deletedIds = getDeletedRecordIds(mappedTable);
  const pendingQueue = loadPendingSyncQueue();
  const pendingDeletes = new Set<string>();
  const pendingUpserts = new Map<string, any>();
  const pendingCustomerBalanceIds = new Set<string>();

  pendingQueue.forEach(q => {
    const matchesTable = q.table === config.collectionName || q.table === mappedTable || TABLE_NAME_MAPPINGS[q.table] === mappedTable;
    const recId = String(q.recordId || q.payload?.id || '');
    if (matchesTable && recId) {
      if (q.action === 'DELETE') pendingDeletes.add(recId);
      else if (q.action === 'UPSERT' && q.payload) {
        pendingUpserts.set(recId, { ...(pendingUpserts.get(recId) || {}), ...q.payload });
      }
    }
    if (config.collectionName === 'customers') {
      const hasDelta = q.payload && (
        q.payload.deltaBalance !== undefined ||
        q.payload.delta_balance !== undefined ||
        q.payload.deltaSpent !== undefined ||
        q.payload.delta_spent !== undefined ||
        q.payload.deltaPoints !== undefined ||
        q.payload.delta_points !== undefined
      );
      if (hasDelta || (q.action as string) === 'ADJUST_CUSTOMER_BALANCE') {
        const cid = String(q.payload?.customerId || q.payload?.id || recId);
        if (cid) pendingCustomerBalanceIds.add(cid);
      }
    }
  });

  const map = new Map<string, any>();
  (prev || []).forEach(item => {
    if (item && item.id && !deletedIds.has(String(item.id)) && !pendingDeletes.has(String(item.id))) {
      map.set(item.id, item);
    }
  });

  tableUpdateQueue.forEach(item => {
    if (!item || !item.id) return;
    const itemId = String(item.id);
    if (deletedIds.has(itemId) || pendingDeletes.has(itemId)) {
      map.delete(itemId);
      return;
    }
    const existing = map.get(itemId);
    if (existing && existing.updatedAt && item.updatedAt) {
      const existingTime = new Date(existing.updatedAt).getTime();
      const incomingTime = new Date(item.updatedAt).getTime();
      if (incomingTime < existingTime) return;
    }
    const pendingPatch = pendingUpserts.get(itemId);
    let merged = { ...(existing || {}), ...item, ...(pendingPatch || {}) };
    if (config.collectionName === 'customers' && pendingCustomerBalanceIds.has(itemId) && existing) {
      merged.balance = existing.balance;
      merged.totalSpent = existing.totalSpent;
      merged.loyaltyPoints = existing.loyaltyPoints;
    }
    map.set(itemId, merged);
  });

  tableDeleteQueue.forEach(id => map.delete(id));

  let updated = Array.from(map.values());
  if (config.timestampColumn) {
    updated.sort((a, b) => new Date(b[config.timestampColumn!]).getTime() - new Date(a[config.timestampColumn!]).getTime());
  }
  if (config.limit && updated.length > config.limit) {
    updated = updated.slice(0, config.limit);
  }
  setTimeout(() => {
    idbSet(config.cacheKey, updated).catch(err => console.warn('[IDB Error]', err));
  }, 0);
  return updated;
}
