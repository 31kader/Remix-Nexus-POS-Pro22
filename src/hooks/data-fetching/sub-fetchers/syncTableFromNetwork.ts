import { get as idbGet, set as idbSet } from 'idb-keyval';
import { isSupabaseConfigured } from '../../../supabase';
import { fetchTableFromSupabase } from '../supabaseFetchHelper';
import { TABLE_NAME_MAPPINGS } from '../../../lib/db-converters';
import { localDb, getDeletedRecordIds } from '../../../services/LocalDatabase';
import { getArchivedTransactionsFromStorage } from '../../../lib/local-db';
import { loadPendingSyncQueue } from '../../../services/SyncService';

export type QueueConfig = {
  cacheKey: string;
  collectionName: string;
  setState: (data: any) => void;
  limit?: number;
  startDate?: string;
  timestampColumn?: string;
  enableRealtime?: boolean;
};

export async function syncTableFromNetwork<T>(
  config: QueueConfig, 
  isSubscribedRef: { current: boolean }, 
  unsubscribes: (() => void)[]
): Promise<void> {
  const { cacheKey, collectionName, setState, limit, startDate, timestampColumn } = config;
  try {
    const deletedIds = getDeletedRecordIds(collectionName);
    const rawCached = await idbGet<T[]>(cacheKey) || [];
    const cached = rawCached.filter((r: any) => r && r.id && !deletedIds.has(String(r.id)));
    if (isSupabaseConfigured) {
      const useDelta = Boolean(timestampColumn && timestampColumn !== 'date');
      const lastSyncTime = (useDelta && cached.length > 0) ? localStorage.getItem(`last_sync_${collectionName}`) : null;
      const camelData = await fetchTableFromSupabase<T>(collectionName, limit, startDate, lastSyncTime || undefined, timestampColumn);
      
      if (camelData && isSubscribedRef.current) {
        const mergedMap = new Map<string, any>();
        if (collectionName === 'transactions') {
          const localDbTxs = await idbGet<Record<string, any>>('nexus_db_transactions').catch(() => ({}));
          const archivedTxs = await getArchivedTransactionsFromStorage().catch(() => []);
          if (Array.isArray(archivedTxs)) {
            archivedTxs.forEach((t: any) => t && t.id && !deletedIds.has(String(t.id)) && mergedMap.set(t.id, t));
          }
          if (localDbTxs) {
            Object.values(localDbTxs).forEach((t: any) => t && t.id && !deletedIds.has(String(t.id)) && mergedMap.set(t.id, t));
          }
        } else if (collectionName === 'purchases') {
          const localDbPurchases = await idbGet<Record<string, any>>('nexus_db_purchases').catch(() => ({}));
          if (localDbPurchases) {
            Object.values(localDbPurchases).forEach((p: any) => p && p.id && !deletedIds.has(String(p.id)) && mergedMap.set(p.id, p));
          }
        } else if (collectionName === 'advances') {
          const localDbAdvances = await idbGet<Record<string, any>>('nexus_db_advances').catch(() => ({}));
          if (localDbAdvances) {
            Object.values(localDbAdvances).forEach((a: any) => a && a.id && !deletedIds.has(String(a.id)) && mergedMap.set(a.id, a));
          }
        }

        if (lastSyncTime) {
          cached.forEach((r: any) => r && r.id && !deletedIds.has(String(r.id)) && mergedMap.set(r.id, r));
        }
        camelData.forEach((newRow: any) => newRow && newRow.id && !deletedIds.has(String(newRow.id)) && mergedMap.set(newRow.id, newRow));

        const pendingQueue = loadPendingSyncQueue();
        const pendingRecords = pendingQueue.filter(item => 
          (item.table === collectionName || TABLE_NAME_MAPPINGS[item.table] === collectionName) && item.payload
        );
        pendingRecords.forEach(item => {
          const recId = item.recordId || item.payload?.id;
          if (recId && !deletedIds.has(String(recId))) {
            if (item.action === 'UPSERT') {
              const existing = mergedMap.get(recId) || {};
              const merged = { ...existing, ...item.payload };
              if (collectionName === 'customers') {
                const localCust = ((Array.isArray(cached) ? cached : []) as any[]).find((c: any) => c && c.id === recId);
                if (localCust && (item.payload?.deltaBalance !== undefined || item.payload?.delta_balance !== undefined)) {
                  merged.balance = (localCust as any).balance;
                  merged.totalSpent = (localCust as any).totalSpent;
                  merged.loyaltyPoints = (localCust as any).loyaltyPoints;
                }
              }
              mergedMap.set(recId, merged);
            } else if (item.action === 'DELETE') {
              mergedMap.delete(recId);
            }
          }
        });

        let updatedCache = Array.from(mergedMap.values());
        if (timestampColumn) {
          updatedCache.sort((a: any, b: any) => 
            new Date(b[timestampColumn] || b.timestamp || b.created_at || 0).getTime() - 
            new Date(a[timestampColumn] || a.timestamp || a.created_at || 0).getTime()
          );
        }

        setState(updatedCache);
        idbSet(cacheKey, updatedCache).catch(err => console.warn('[IDB Error]', err));
        localStorage.setItem(`last_sync_${collectionName}`, new Date().toISOString());
      }

      const unsubLocal = localDb.subscribe(collectionName, (snapshot) => {
        if (!isSubscribedRef.current) return;
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data && typeof data === 'object') {
            const deletedSet = getDeletedRecordIds(collectionName);
            setState((prev: any[]) => {
              const map = new Map<string, any>();
              (Array.isArray(prev) ? prev : []).forEach(r => {
                if (r && r.id && !deletedSet.has(String(r.id))) map.set(r.id, r);
              });
              Object.keys(data).forEach(id => {
                if (!deletedSet.has(String(id)) && data[id]) {
                  map.set(id, { ...(map.get(id) || {}), id, ...data[id] });
                }
              });
              let next = Array.from(map.values());
              if (timestampColumn) {
                next.sort((a: any, b: any) =>
                  new Date(b[timestampColumn] || b.timestamp || b.created_at || 0).getTime() -
                  new Date(a[timestampColumn] || a.timestamp || a.created_at || 0).getTime()
                );
              }
              idbSet(cacheKey, next).catch(() => {});
              return next;
            });
          }
        }
      });
      unsubscribes.push(unsubLocal);
    } else {
      const unsub = localDb.subscribe(collectionName, (snapshot) => {
        if (isSubscribedRef.current) {
          if (snapshot.exists()) {
            const data = snapshot.val();
            if (data) {
              const docs = Object.keys(data).map(id => ({ id, ...data[id] } as T));
              setState(docs);
              idbSet(cacheKey, docs).catch(err => console.warn('[IDB Error]', err));
            } else {
              setState([]);
              idbSet(cacheKey, []).catch(err => console.warn('[IDB Error]', err));
            }
          } else {
            setState([]);
            idbSet(cacheKey, []).catch(err => console.warn('[IDB Error]', err));
          }
        }
      });
      unsubscribes.push(unsub);
    }
  } catch (err: any) {
    const errMessage = err?.message || String(err);
    if (!errMessage.includes('Quota') && !errMessage.includes('PERMISSION_DENIED') && !errMessage.includes('resource-exhausted')) {
      console.error(`Fetch failed for ${collectionName}:`, err);
    }
  }
}
