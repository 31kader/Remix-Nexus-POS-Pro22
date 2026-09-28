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

import { get as idbGet, set as idbSet } from 'idb-keyval';
import { supabase, isSupabaseConfigured } from '../supabase';

// Tables requiring zero-latency immediate IndexedDB flush (no 150ms debounce)
const CRITICAL_IMMEDIATE_TABLES = new Set([
  'transactions', 'returns', 'shifts', 'cash_shifts', 'stock_adjustments',
  'damaged_items', 'purchases', 'supplier_payments', 'supplierPayments',
  'expenses', 'goods_receipt_notes', 'goodsReceiptNotes'
]);

const DELETED_IDS_STORAGE_KEY = 'nexus_deleted_records_v1';

const TABLE_TO_IDB_CACHE_KEY: Record<string, string> = {
  purchases: 'nexus_purchases_cache',
  transactions: 'nexus_transactions_cache',
  returns: 'nexus_returns_cache',
  expenses: 'nexus_expenses_cache',
  supplierPayments: 'nexus_supplier_payments_cache',
  supplier_payments: 'nexus_supplier_payments_cache',
  stockAdjustments: 'nexus_stock_adjustments_cache',
  stock_adjustments: 'nexus_stock_adjustments_cache',
  damagedItems: 'nexus_damaged_items_cache',
  damaged_items: 'nexus_damaged_items_cache',
  auditLogs: 'nexus_audit_logs_cache',
  audit_logs: 'nexus_audit_logs_cache',
  goodsReceiptNotes: 'nexus_goods_receipt_notes_cache',
  goods_receipt_notes: 'nexus_goods_receipt_notes_cache',
  onlineOrders: 'nexus_online_orders_cache',
  online_orders: 'nexus_online_orders_cache',
  customers: 'nexus_customers',
  suppliers: 'nexus_suppliers',
  categories: 'nexus_categories',
  brands: 'nexus_brands',
  promotions: 'nexus_promotions',
  users: 'nexus_users',
  products: 'nexus_products_cache'
};

export function markRecordDeleted(table: string, id: string): void {
  if (!id || typeof localStorage === 'undefined') return;
  try {
    const normalized = TABLE_NAME_MAPPINGS[table] || table;
    const raw = JSON.parse(localStorage.getItem(DELETED_IDS_STORAGE_KEY) || '{}');
    if (!Array.isArray(raw[normalized])) raw[normalized] = [];
    if (!raw[normalized].includes(id)) {
      raw[normalized].push(id);
      if (raw[normalized].length > 1000) {
        raw[normalized] = raw[normalized].slice(-1000);
      }
      localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(raw));
    }
    if (table !== normalized) {
      if (!Array.isArray(raw[table])) raw[table] = [];
      if (!raw[table].includes(id)) {
        raw[table].push(id);
        localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(raw));
      }
    }
  } catch (_) {}
}

export function getDeletedRecordIds(table: string): Set<string> {
  const result = new Set<string>();
  if (typeof localStorage === 'undefined') return result;
  try {
    const normalized = TABLE_NAME_MAPPINGS[table] || table;
    const raw = JSON.parse(localStorage.getItem(DELETED_IDS_STORAGE_KEY) || '{}');
    if (Array.isArray(raw[table])) raw[table].forEach((id: string) => result.add(String(id)));
    if (Array.isArray(raw[normalized])) raw[normalized].forEach((id: string) => result.add(String(id)));
  } catch (_) {}
  return result;
}

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
    }

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
      const targetTable = normalizeSyncTable(table);
      enqueueSync(targetTable, id || '', 'DELETE', null);
      if (id && isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
        supabase.from(targetTable).delete().eq('id', id).then(() => {}).catch(() => {});
      }
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
