import {
  generateLocalId,
  TABLE_NAME_MAPPINGS,
} from '../lib/db-converters';
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
} from '../lib/local-db';
import {
  enqueueSync,
  enqueueSyncBatch,
  enqueueStockAdjustment,
} from './SyncService';

// Tables requiring zero-latency immediate IndexedDB flush (no 150ms debounce)
const CRITICAL_IMMEDIATE_TABLES = new Set(['transactions', 'returns', 'shifts', 'cash_shifts', 'stock_adjustments', 'damaged_items']);

// Tables managed directly via Supabase-First (NOT through SyncService queue)
// online_orders is handled directly in useOrderActions.ts and useOrdersLogic.tsx
const SUPABASE_FIRST_TABLES = new Set(['onlineOrders', 'online_orders']);

const normalizeSyncTable = (table: string): string => {
  return TABLE_NAME_MAPPINGS[table] || table;
};

// ⚡ Canal de synchronisation inter-onglets et multi-fenêtres (BroadcastChannel natif 0ms de latence)
let crossTabBc: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    crossTabBc = new BroadcastChannel('nexus_crosstab_sync');
    crossTabBc.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'offline-transaction-created' && data.detail) {
        window.dispatchEvent(new CustomEvent('offline-transaction-created', { detail: data.detail }));
      } else if (data.type === 'offline-return-created' && data.detail) {
        window.dispatchEvent(new CustomEvent('offline-return-created', { detail: data.detail }));
      } else if (data.type === 'table-updated' && data.detail?.table) {
        triggerObservers(data.detail.table);
        if (data.detail.path) triggerObservers(data.detail.path);
      }
    };
  } catch (err) {
    console.warn('[LocalDatabase] BroadcastChannel init error:', err);
  }
}

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
    crossTabBc?.postMessage({ type: 'table-updated', detail: { table, path } });

    if (table === 'transactions' && val) {
      window.dispatchEvent(new CustomEvent('offline-transaction-created', { detail: val }));
      crossTabBc?.postMessage({ type: 'offline-transaction-created', detail: val });
    }
    if (table === 'returns' && val) {
      window.dispatchEvent(new CustomEvent('offline-return-created', { detail: val }));
      crossTabBc?.postMessage({ type: 'offline-return-created', detail: val });
    }

    // Skip SyncService queue for Supabase-First tables (handled directly)
    if (!SUPABASE_FIRST_TABLES.has(table)) {
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
      crossTabBc?.postMessage({ type: 'table-updated', detail: { table } });
      
      // Skip SyncService queue for Supabase-First tables
      if (!SUPABASE_FIRST_TABLES.has(table)) {
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
    crossTabBc?.postMessage({ type: 'table-updated', detail: { table, path } });

    const newValue = getLocalValue(path);
    if (table === 'transactions' && newValue) {
      window.dispatchEvent(new CustomEvent('offline-transaction-created', { detail: newValue }));
      crossTabBc?.postMessage({ type: 'offline-transaction-created', detail: newValue });
    }
    if (table === 'returns' && newValue) {
      window.dispatchEvent(new CustomEvent('offline-return-created', { detail: newValue }));
      crossTabBc?.postMessage({ type: 'offline-return-created', detail: newValue });
    }

    // Skip SyncService queue for Supabase-First tables (handled directly)
    if (!SUPABASE_FIRST_TABLES.has(table)) {
      enqueueSync(normalizeSyncTable(table), id || '', 'UPSERT', newValue);
    }
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

  delete: async (pathOrRef: any): Promise<void> => {
    const path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    removeLocalState(path);
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
    crossTabBc?.postMessage({ type: 'table-updated', detail: { table, path } });

    // Skip SyncService queue for Supabase-First tables (handled directly)
    if (!SUPABASE_FIRST_TABLES.has(table)) {
      enqueueSync(normalizeSyncTable(table), id || '', 'DELETE', null);
    }
  },

  subscribe: (pathOrRef: any, callback: (snapshot: any) => void) => {
    const path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    addObserver(path, callback);
    localDb.get(path).then(callback);
    return () => removeObserver(path, callback);
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
