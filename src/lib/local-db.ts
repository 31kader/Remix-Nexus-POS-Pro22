import { get as getIDB, set as setIDB } from 'idb-keyval';

export type ObserverCallback = (snapshot: { exists: () => boolean, val: () => any }) => void;

export let dbState: Record<string, Record<string, any>> = {};
const observers: Record<string, ObserverCallback[]> = {};

const dirtyTables = new Set<string>();
let saveStorageTimeout: any = null;

export async function saveStateToStorage(table?: string) {
  if (table) {
    const normTable = normalizePath(table).split('/')[0];
    dirtyTables.add(normTable);
  }
  
  if (saveStorageTimeout) clearTimeout(saveStorageTimeout);
  saveStorageTimeout = setTimeout(async () => {
    try {
      if (dirtyTables.size > 0) {
        for (const t of dirtyTables) {
          await setIDB(`nexus_db_${t}`, dbState[t] || {});
        }
        dirtyTables.clear();
      } else {
        const tables = Object.keys(dbState);
        for (const t of tables) {
          await setIDB(`nexus_db_${t}`, dbState[t] || {});
        }
      }
      await setIDB('nexus_db_split_v1', true);
    } catch (e) {
      console.warn('[DB] Failed to save state to IndexedDB', e);
    }
  }, 150);
}

export function triggerObservers(path: string) {
  const normPath = normalizePath(path);
  if (observers[normPath]) {
    const val = getLocalValue(normPath);
    observers[normPath].forEach(cb => {
      try {
        cb({
          exists: () => val !== undefined && val !== null,
          val: () => val
        });
      } catch (err) {
        console.warn('Observer callback error:', err);
      }
    });
  }
}

export function normalizePath(path: string): string {
  if (!path) return '';
  const clean = path.replace(/^\/+|\/+$/g, '');
  const parts = clean.split('/');
  let table = parts[0];
  
  // Mapping table names to standardized snake_case
  const mappings: Record<string, string> = {
    'onlineOrders': 'online_orders',
    'goodsReceiptNotes': 'goods_receipt_notes',
    'stockAdjustments': 'stock_adjustments',
    'supplierPayments': 'supplier_payments',
    'supplierSyncs': 'supplier_syncs',
    'damagedItems': 'damaged_items',
    'auditLogs': 'audit_logs',
    'invoicePatterns': 'invoice_patterns',
    'purchaseOrders': 'purchase_orders',
    'shifts': 'cash_shifts',
    'cartDrafts': 'cart_drafts',
    'externalDeliveryRequests': 'external_delivery_requests'
  };
  
  if (mappings[table]) table = mappings[table];
  parts[0] = table;
  return parts.join('/');
}

export function parsePath(path: string) {
  const clean = normalizePath(path);
  const parts = clean.split('/');
  const table = parts[0];
  const id = parts.slice(1).join('/');
  return { table, id };
}

export function getLocalValue(path: string): any {
  const { table, id } = parsePath(path);
  if (!table) return null;
  if (!dbState[table]) return null;
  if (id) return dbState[table][id] || null;
  return dbState[table];
}

export function setLocalState(path: string, value: any) {
  const { table, id } = parsePath(path);
  if (!table) return;
  if (!dbState[table]) dbState[table] = {};
  if (id) dbState[table][id] = value;
  else dbState[table] = value || {};
}

export function updateLocalState(path: string, value: any) {
  const { table, id } = parsePath(path);
  if (!table) return;
  if (!dbState[table]) dbState[table] = {};
  if (id) {
    const existing = dbState[table][id] || {};
    dbState[table][id] = { ...existing, ...value };
  } else {
    dbState[table] = { ...dbState[table], ...value };
  }
}

export function removeLocalState(path: string) {
  const { table, id } = parsePath(path);
  if (!table) return;
  if (id) {
    if (dbState[table]) delete dbState[table][id];
  } else {
    delete dbState[table];
  }
}

export function addObserver(path: string, callback: ObserverCallback) {
  const normPath = normalizePath(path);
  if (!observers[normPath]) observers[normPath] = [];
  observers[normPath].push(callback);
}

export function removeObserver(path: string, callback: ObserverCallback) {
  const normPath = normalizePath(path);
  if (observers[normPath]) {
    observers[normPath] = observers[normPath].filter(cb => cb !== callback);
  }
}

export async function loadInitialState() {
  try {
    const isSplit = await getIDB('nexus_db_split_v1');
    if (isSplit) {
      const tables = [
        'products', 'categories', 'brands', 'promotions', 'patterns',
        'transactions', 'purchase_orders', 'returns', 'online_orders', 'cash_shifts',
        'customers', 'suppliers', 'employees', 'users', 'stock_adjustments',
        'audits', 'damaged_items', 'supplier_syncs', 'attendance', 'purchases',
        'expenses', 'supplier_payments', 'advances', 'audit_logs', 'settings',
        'vouchers', 'cashier_alerts', 'cart_drafts', 'external_delivery_requests',
        'goods_receipt_notes'
      ];
      const loaded = await Promise.all(tables.map(t => getIDB(`nexus_db_${t}`)));
      tables.forEach((t, i) => {
        dbState[t] = loaded[i] || {};
      });
      Object.keys(dbState).forEach(triggerObservers);
    } else {
      const stored = await getIDB('nexus_supabase_emulator_db_v2');
      if (stored) {
        dbState = stored;
        const tables = Object.keys(dbState);
        await Promise.all(tables.map(t => setIDB(`nexus_db_${t}`, dbState[t])));
        await setIDB('nexus_db_split_v1', true);
        Object.keys(dbState).forEach(triggerObservers);
      } else {
        const legacy = localStorage.getItem('nexus_supabase_emulator_db');
        if (legacy) {
          dbState = JSON.parse(legacy);
          const tables = Object.keys(dbState);
          await Promise.all(tables.map(t => setIDB(`nexus_db_${t}`, dbState[t])));
          await setIDB('nexus_db_split_v1', true);
          localStorage.removeItem('nexus_supabase_emulator_db');
          Object.keys(dbState).forEach(triggerObservers);
        }
      }
    }
  } catch (e) {
    console.warn('[DB] Failed to load local state', e);
  }
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filter?: (item: any) => boolean;
}

export function queryLocalState(path: string, options: QueryOptions = {}) {
  const { table } = parsePath(path);
  if (!table || !dbState[table]) return [];

  let results = Object.values(dbState[table]);

  if (options.filter) {
    results = results.filter(options.filter);
  }

  if (options.orderBy) {
    results.sort((a: any, b: any) => {
      const valA = a[options.orderBy!];
      const valB = b[options.orderBy!];
      if (valA < valB) return options.orderDirection === 'desc' ? 1 : -1;
      if (valA > valB) return options.orderDirection === 'desc' ? -1 : 1;
      return 0;
    });
  }

  if (options.offset !== undefined) {
    results = results.slice(options.offset);
  }

  if (options.limit !== undefined) {
    results = results.slice(0, options.limit);
  }

  return results;
}
