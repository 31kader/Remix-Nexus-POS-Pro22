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
  replaceTableState,
} from '../lib/local-db';
import {
  enqueueSync,
  enqueueSyncBatch,
  enqueueStockAdjustment,
} from './SyncService';

import { get as idbGet, set as idbSet } from 'idb-keyval';
import { supabase, isSupabaseConfigured } from '../supabase';
import { setSecureItemAsync, getSecureItemAsync, removeSecureItem } from '../lib/security';
import { SENSITIVE_STORAGE_TABLES } from '../lib/local-db';

// Tables requiring zero-latency immediate IndexedDB flush (no 150ms debounce)
const CRITICAL_IMMEDIATE_TABLES = new Set([
  'transactions', 'returns', 'shifts', 'cash_shifts', 'stock_adjustments',
  'damaged_items', 'purchases', 'supplier_payments', 'supplierPayments',
  'expenses', 'goods_receipt_notes', 'goodsReceiptNotes', 'users', 'employees'
]);

export { SENSITIVE_STORAGE_TABLES };

/**
 * Détermine si une table est classée hautement sensible (chiffrée au repos dans IndexedDB)
 */
export function isSensitiveTable(table: string): boolean {
  const norm = TABLE_NAME_MAPPINGS[table] || table;
  return SENSITIVE_STORAGE_TABLES.has(norm);
}

/**
 * Stocke une valeur sensible de manière asynchrone chiffrée avec AES-256-GCM
 */
export async function storeSensitiveItem(key: string, value: any): Promise<void> {
  await setSecureItemAsync(key, value);
}

/**
 * Récupère une valeur sensible chiffrée avec AES-256-GCM / rétrocompatible
 */
export async function getSensitiveItem<T = any>(key: string): Promise<T | null> {
  return await getSecureItemAsync<T>(key);
}

/**
 * Supprime une valeur sensible du stockage
 */
export function removeSensitiveItem(key: string): void {
  removeSecureItem(key);
}

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
  products: 'nexus_products_cache',
  employees: 'nexus_employees_cache',
  shifts: 'nexus_shifts_cache',
  cash_shifts: 'nexus_shifts_cache',
  purchaseOrders: 'nexus_purchase_orders_cache',
  purchase_orders: 'nexus_purchase_orders_cache',
  advances: 'nexus_advances_cache',
  vouchers: 'nexus_vouchers_cache',
  attendance: 'nexus_attendance_cache',
  audits: 'nexus_audits_cache',
  shortage_items: 'nexus_shortage_items_cache',
  shortageItems: 'nexus_shortage_items_cache',
  custom_replenishment_lists: 'nexus_custom_replenishment_lists_cache',
  customReplenishmentLists: 'nexus_custom_replenishment_lists_cache'
};

// 🛡️ P1-SYNC-04 : Cache mémoire synchrone adossé à IndexedDB pour les IDs supprimés (sans limite de 1 000)
const deletedRecordsCache: Record<string, Set<string>> = {};

// 1. Initialisation synchrone immédiate depuis localStorage (migration douce rétrocompatible)
if (typeof localStorage !== 'undefined') {
  try {
    const raw = JSON.parse(localStorage.getItem(DELETED_IDS_STORAGE_KEY) || '{}');
    if (raw && typeof raw === 'object') {
      for (const [tbl, ids] of Object.entries(raw)) {
        if (Array.isArray(ids)) {
          deletedRecordsCache[tbl] = new Set(ids.map(String));
        }
      }
    }
  } catch (_) {}
}

// 2. Initialisation asynchrone depuis IndexedDB et fusion continue
async function initDeletedRecordsFromIDB(): Promise<void> {
  try {
    if (typeof indexedDB === 'undefined') return;
    const idbData = await idbGet<Record<string, string[]>>(DELETED_IDS_STORAGE_KEY);
    if (idbData && typeof idbData === 'object') {
      for (const [tbl, ids] of Object.entries(idbData)) {
        if (!deletedRecordsCache[tbl]) deletedRecordsCache[tbl] = new Set();
        if (Array.isArray(ids)) {
          ids.forEach(id => deletedRecordsCache[tbl].add(String(id)));
        }
      }
    }
  } catch (_) {}
}
initDeletedRecordsFromIDB().catch(() => {});

let persistDeletedTimeout: any = null;
function persistDeletedRecordsToIDB(): void {
  if (typeof indexedDB === 'undefined') return;
  if (persistDeletedTimeout) clearTimeout(persistDeletedTimeout);
  persistDeletedTimeout = setTimeout(async () => {
    try {
      const serializable: Record<string, string[]> = {};
      for (const [tbl, set] of Object.entries(deletedRecordsCache)) {
        serializable[tbl] = Array.from(set);
      }
      await idbSet(DELETED_IDS_STORAGE_KEY, serializable);
    } catch (_) {}
  }, 100);
}

export function markRecordDeleted(table: string, id: string): void {
  if (!id) return;
  const strId = String(id);
  const normalized = TABLE_NAME_MAPPINGS[table] || table;
  
  if (!deletedRecordsCache[normalized]) deletedRecordsCache[normalized] = new Set();
  deletedRecordsCache[normalized].add(strId);

  if (table !== normalized) {
    if (!deletedRecordsCache[table]) deletedRecordsCache[table] = new Set();
    deletedRecordsCache[table].add(strId);
  }

  // Miroir rétrocompatible dans localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const raw: Record<string, string[]> = {};
      for (const [tbl, set] of Object.entries(deletedRecordsCache)) {
        raw[tbl] = Array.from(set);
      }
      localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(raw));
    } catch (_) {}
  }

  persistDeletedRecordsToIDB();
}

export function getDeletedRecordIds(table: string): Set<string> {
  const normalized = TABLE_NAME_MAPPINGS[table] || table;
  const result = new Set<string>();
  
  const normSet = deletedRecordsCache[normalized];
  if (normSet) {
    normSet.forEach(id => result.add(id));
  }
  if (table !== normalized) {
    const directSet = deletedRecordsCache[table];
    if (directSet) {
      directSet.forEach(id => result.add(id));
    }
  }
  return result;
}

// Tables managed directly via Supabase-First (NOT through SyncService queue)
const SUPABASE_FIRST_TABLES = new Set<string>([]);

// Tables gérées exclusivement en local (IndexedDB) sans persistance distante Supabase
export const LOCAL_ONLY_TABLES = new Set<string>([]);

const normalizeSyncTable = (table: string): string => {
  return TABLE_NAME_MAPPINGS[table] || table;
};

export const isLocalOnlyTable = (table: string): boolean => {
  return LOCAL_ONLY_TABLES.has(table) || LOCAL_ONLY_TABLES.has(normalizeSyncTable(table));
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
      crossTabBc?.postMessage({ type: 'table-updated', detail: { table } });
      
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
    crossTabBc?.postMessage({ type: 'table-updated', detail: { table, path } });
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
    crossTabBc?.postMessage({ type: 'table-updated', detail: { table, path } });
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
      crossTabBc?.postMessage({ type: 'table-updated', detail: { table } });
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
    crossTabBc?.postMessage({ type: 'table-updated', detail: { table, path } });
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
    crossTabBc?.postMessage({ type: 'table-updated', detail: { table, path } });

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
