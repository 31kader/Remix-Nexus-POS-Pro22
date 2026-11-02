import { generateLocalId } from '../lib/db-converters';
import {
  getLocalValue,
  setLocalState,
  updateLocalState,
  removeLocalState,
  addObserver,
  removeObserver,
  triggerObservers,
  saveStateToStorage,
  saveStateToStorageImmediate,
  replaceTableState,
} from '../lib/local-db';
import {
  enqueueSync,
  enqueueSyncBatch,
  enqueueStockAdjustment,
} from './SyncService';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  SENSITIVE_STORAGE_TABLES,
  isSensitiveTable,
  storeSensitiveItem,
  getSensitiveItem,
  removeSensitiveItem,
  TABLE_TO_IDB_CACHE_KEY,
  markRecordDeleted,
  getDeletedRecordIds
} from './local-database/deletedRecordsManager';
import {
  CRITICAL_IMMEDIATE_TABLES,
  SUPABASE_FIRST_TABLES,
  LOCAL_ONLY_TABLES,
  normalizeSyncTable,
  isLocalOnlyTable
} from './local-database/localDbConfig';
import {
  broadcastTableUpdated,
  broadcastOfflineTransaction,
  broadcastOfflineReturn
} from './local-database/localCrossTabSync';

export {
  SENSITIVE_STORAGE_TABLES,
  isSensitiveTable,
  storeSensitiveItem,
  getSensitiveItem,
  removeSensitiveItem,
  TABLE_TO_IDB_CACHE_KEY,
  markRecordDeleted,
  getDeletedRecordIds,
  LOCAL_ONLY_TABLES,
  isLocalOnlyTable
};

export const localDb = {
  get: async (pathOrRef: any): Promise<{ exists: () => boolean, val: () => any }> => {
    const path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    const val = getLocalValue(path);
    return {
      exists: () => val !== undefined && val !== null,
      val: () => val
    };
  },

  insert: async (pathOrRef: any, value: any, possibleThirdArg?: any): Promise<void> => {
    let path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    let val = value;
    if (possibleThirdArg !== undefined && typeof path === 'string' && !path.includes('/')) {
      path = `${path}/${value}`;
      val = possibleThirdArg;
    } else if (typeof path === 'string' && !path.includes('/') && val && typeof val === 'object' && val.id) {
      path = `${path}/${val.id}`;
    }

    setLocalState(path, val);
    const parts = path.split('/');
    const table = parts[0];
    const id = parts.slice(1).join('/');

    if (CRITICAL_IMMEDIATE_TABLES.has(table)) {
      await saveStateToStorageImmediate(table);
    } else {
      saveStateToStorage(table);
    }
    triggerObservers(table);
    if (id) triggerObservers(path);
    broadcastTableUpdated(table, path);

    if (table === 'transactions' && val) {
      broadcastOfflineTransaction(val);
    }
    if (table === 'returns' && val) {
      broadcastOfflineReturn(val);
    }

    // Skip SyncService queue for Supabase-First tables (handled directly) and Local-Only tables
    if (!SUPABASE_FIRST_TABLES.has(table) && !isLocalOnlyTable(table)) {
      enqueueSync(normalizeSyncTable(table), id || '', 'UPSERT', val);
    }
  },

  insertBatch: async (table: string, records: Record<string, any>): Promise<void> => {
    try {
      for (const [id, value] of Object.entries(records)) {
        setLocalState(`${table}/${id}`, value);
      }
      saveStateToStorage(table);
      triggerObservers(table);
      broadcastTableUpdated(table);
      
      // Skip SyncService queue for Supabase-First tables and Local-Only tables
      if (!SUPABASE_FIRST_TABLES.has(table) && !isLocalOnlyTable(table)) {
        enqueueSyncBatch(
          Object.entries(records).map(([id, val]) => ({
            table: normalizeSyncTable(table),
            recordId: id,
            action: 'UPSERT' as const,
            payload: val
          }))
        );
      }
    } catch (err) {
      console.warn(`[LocalDatabase] insertBatch error on ${table}:`, err);
    }
  },

  update: async (pathOrRef: any, value: any, possibleThirdArg?: any): Promise<void> => {
    let path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    let val = value;
    if (possibleThirdArg !== undefined && typeof path === 'string' && !path.includes('/')) {
      path = `${path}/${value}`;
      val = possibleThirdArg;
    } else if (typeof path === 'string' && !path.includes('/') && val && typeof val === 'object' && val.id) {
      path = `${path}/${val.id}`;
    }

    updateLocalState(path, val);
    const parts = path.split('/');
    const table = parts[0];
    const id = parts.slice(1).join('/');

    if (CRITICAL_IMMEDIATE_TABLES.has(table)) {
      await saveStateToStorageImmediate(table);
    } else {
      saveStateToStorage(table);
    }
    triggerObservers(table);
    if (id) triggerObservers(path);
    broadcastTableUpdated(table, path);

    const newValue = getLocalValue(path);
    if (table === 'transactions' && newValue) {
      broadcastOfflineTransaction(newValue);
    }
    if (table === 'returns' && newValue) {
      broadcastOfflineReturn(newValue);
    }

    // Skip SyncService queue for Supabase-First tables (handled directly) and Local-Only tables
    if (!SUPABASE_FIRST_TABLES.has(table) && !isLocalOnlyTable(table)) {
      const syncPayload = (val && typeof val === 'object' && newValue && typeof newValue === 'object')
        ? { ...newValue, ...val }
        : (newValue ?? val);
      enqueueSync(normalizeSyncTable(table), id || '', 'UPSERT', syncPayload);
    }
  },

  updateLocalOnly: async (pathOrRef: any, value: any): Promise<void> => {
    let path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    let val = value;
    if (typeof path === 'string' && !path.includes('/') && val && typeof val === 'object' && val.id) {
      path = `${path}/${val.id}`;
    }

    updateLocalState(path, val);
    const parts = path.split('/');
    const table = parts[0];
    const id = parts.slice(1).join('/');

    if (CRITICAL_IMMEDIATE_TABLES.has(table)) {
      await saveStateToStorageImmediate(table);
    } else {
      saveStateToStorage(table);
    }
    triggerObservers(table);
    if (id) triggerObservers(path);
    broadcastTableUpdated(table, path);
  },

  insertLocalOnly: async (pathOrRef: any, value: any): Promise<void> => {
    let path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    let val = value;
    if (typeof path === 'string' && !path.includes('/') && val && typeof val === 'object' && val.id) {
      path = `${path}/${val.id}`;
    }

    setLocalState(path, val);
    const parts = path.split('/');
    const table = parts[0];
    const id = parts.slice(1).join('/');

    if (CRITICAL_IMMEDIATE_TABLES.has(table)) {
      await saveStateToStorageImmediate(table);
    } else {
      saveStateToStorage(table);
    }
    triggerObservers(table);
    if (id) triggerObservers(path);
    broadcastTableUpdated(table, path);
  },

  push: (pathOrRef: any, value?: any) => {
    const id = generateLocalId();
    const parentPath = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    const path = `${parentPath}/${id}`;
    if (value !== undefined) {
      localDb.insert(path, value);
    }
    return { key: id, path };
  },

  insertBatchLocalOnly: async (table: string, records: Record<string, any>): Promise<void> => {
    try {
      for (const [id, value] of Object.entries(records)) {
        setLocalState(`${table}/${id}`, value);
      }
      saveStateToStorage(table);
      triggerObservers(table);
      broadcastTableUpdated(table);
    } catch (err) {
      console.warn(`[LocalDatabase] insertBatchLocalOnly error on ${table}:`, err);
    }
  },

  deleteLocalOnly: async (pathOrRef: any): Promise<void> => {
    const path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    removeLocalState(path);
    const parts = path.split('/');
    const table = parts[0];
    const id = parts.slice(1).join('/');
    if (!id) {
      replaceTableState(table, {});
    }
    if (CRITICAL_IMMEDIATE_TABLES.has(table)) {
      await saveStateToStorageImmediate(table);
    } else {
      saveStateToStorage(table);
    }
    triggerObservers(table);
    if (id) triggerObservers(path);
    broadcastTableUpdated(table, path);
  },

  delete: async (pathOrRef: any): Promise<void> => {
    const path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    removeLocalState(path);
    const parts = path.split('/');
    const table = parts[0];
    const id = parts.slice(1).join('/');

    if (id) {
      markRecordDeleted(table, id);
      const cacheKey = TABLE_TO_IDB_CACHE_KEY[table] || TABLE_TO_IDB_CACHE_KEY[normalizeSyncTable(table)];
      if (cacheKey) {
        try {
          const cachedArr = await idbGet<any[]>(cacheKey);
          if (Array.isArray(cachedArr)) {
            const filtered = cachedArr.filter(item => item && String(item.id) !== String(id));
            await idbSet(cacheKey, filtered);
          }
        } catch (_) {}
      }
    } else {
      replaceTableState(table, {});
      const cacheKey = TABLE_TO_IDB_CACHE_KEY[table] || TABLE_TO_IDB_CACHE_KEY[normalizeSyncTable(table)];
      if (cacheKey) {
        try {
          await idbSet(cacheKey, []);
        } catch (_) {}
      }
    }

    if (CRITICAL_IMMEDIATE_TABLES.has(table)) {
      await saveStateToStorageImmediate(table);
    } else {
      saveStateToStorage(table);
    }
    triggerObservers(table);
    if (id) triggerObservers(path);
    broadcastTableUpdated(table, path);

    // Skip SyncService queue for Supabase-First tables, Local-Only tables, or whole-table clear without recordId
    if (id && !SUPABASE_FIRST_TABLES.has(table) && !isLocalOnlyTable(table)) {
      const targetTable = normalizeSyncTable(table);
      enqueueSync(targetTable, id, 'DELETE', null);
    }
  },

  subscribe: (pathOrRef: any, callback: (snapshot: any) => void) => {
    const path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    addObserver(path, callback);
    localDb.get(path).then(callback);
    return () => removeObserver(path, callback);
  },

  replaceTable: (table: string, items: any[] | Record<string, any>) => {
    replaceTableState(table, items);
    triggerObservers(table);
  }
};

export const incrementStock = async (productId: string, adjustment: number): Promise<void> => {
  const path = `products/${productId}`;
  const current = getLocalValue(path);
  if (current) {
    const newStock = (Number(current.stock) || 0) + adjustment;
    updateLocalState(path, { stock: newStock });
    triggerObservers('products');
    triggerObservers(path);
    saveStateToStorage('products');
  }
  enqueueStockAdjustment(productId, adjustment);
};
