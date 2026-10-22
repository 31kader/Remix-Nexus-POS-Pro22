export function cleanupLegacyStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    const legacyKeys = [
      'nexus_supabase_emulator_db',
      'sync_queue',
      'nexus_local_db_cache',
      'nexus_offline_sync_backup',
      'nexus_old_cache'
    ];
    legacyKeys.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });
  } catch (_) {}
}
import { get as getIDB, set as setIDB } from 'idb-keyval';
import { encryptLocalData, decryptLocalData } from './security';

export type ObserverCallback = (snapshot: { exists: () => boolean, val: () => any }) => void;

export let dbState: Record<string, Record<string, any>> = {};
const observers: Record<string, ObserverCallback[]> = {};

const dirtyTables = new Set<string>();
let saveStorageTimeout: any = null;

/**
 * Tables à haute sensibilité protégées par chiffrement AES-256-GCM au repos dans IndexedDB
 */
export const SENSITIVE_STORAGE_TABLES = new Set([
  'users',
  'employees',
  'cash_shifts'
]);

/**
 * Persiste l'état d'une table dans IndexedDB (chiffré pour les tables sensibles, brut pour le catalogue/transactions)
 */
export async function persistTableState(table: string): Promise<void> {
  const normTable = normalizePath(table).split('/')[0];
  const data = dbState[normTable] || {};
  if (SENSITIVE_STORAGE_TABLES.has(normTable)) {
    try {
      const json = JSON.stringify(data);
      const encrypted = await encryptLocalData(json);
      await setIDB(`nexus_db_${normTable}`, {
        __encrypted: true,
        __version: 2,
        data: encrypted
      });
      return;
    } catch (err) {
      console.warn(`[LocalDB] Erreur chiffrement table sensible ${normTable}:`, err);
    }
  }
  await setIDB(`nexus_db_${normTable}`, data);
}

/**
 * Restaure l'état d'une table depuis IndexedDB (déchiffre si __encrypted = true, rétrocompatible avec données brutes)
 */
export async function restoreTableState(table: string, storedValue: any): Promise<any> {
  if (storedValue && typeof storedValue === 'object' && storedValue.__encrypted && typeof storedValue.data === 'string') {
    try {
      const decrypted = await decryptLocalData(storedValue.data);
      return JSON.parse(decrypted);
    } catch (err) {
      console.warn(`[LocalDB] Erreur déchiffrement table sensible ${table}:`, err);
      return {};
    }
  }
  return storedValue || {};
}

export async function saveStateToStorage(table?: string) {
  if (table) {
    const normTable = normalizePath(table).split('/')[0];
    dirtyTables.add(normTable);
  }
  
  if (saveStorageTimeout) clearTimeout(saveStorageTimeout);
  saveStorageTimeout = setTimeout(async () => {
    try {
      if (dirtyTables.size > 0) {
        // 🛡️ VULN-08 : Copier le Set et le vider AVANT la boucle asynchrone pour ne pas perdre les mutations survenues pendant l'écriture
        const tablesToSave = Array.from(dirtyTables);
        dirtyTables.clear();
        for (const t of tablesToSave) {
          await persistTableState(t);
        }
      } else {
        const tables = Object.keys(dbState);
        for (const t of tables) {
          await persistTableState(t);
        }
      }
      await setIDB('nexus_db_split_v1', true);
    } catch (e) {
      console.warn('[DB] Failed to save state to IndexedDB', e);
    }
  }, 150);
}

/**
 * ⚡ Sauvegarde immédiate sans délai (Zero-latency flush) pour les transactions et clôtures critiques
 */
export async function saveStateToStorageImmediate(table?: string): Promise<void> {
  if (table) {
    const normTable = normalizePath(table).split('/')[0];
    dirtyTables.add(normTable);
  }
  if (saveStorageTimeout) {
    clearTimeout(saveStorageTimeout);
    saveStorageTimeout = null;
  }
  try {
    if (dirtyTables.size > 0) {
      const tablesToSave = Array.from(dirtyTables);
      dirtyTables.clear();
      for (const t of tablesToSave) {
        await persistTableState(t);
      }
    } else {
      const tables = Object.keys(dbState);
      for (const t of tables) {
        await persistTableState(t);
      }
    }
    await setIDB('nexus_db_split_v1', true);
  } catch (e) {
    console.warn('[DB] Failed immediate save state to IndexedDB', e);
  }
}

const notifyingPaths = new Set<string>();

export function triggerObservers(path: string) {
  const normPath = normalizePath(path);
  if (notifyingPaths.has(normPath)) return;
  if (observers[normPath]) {
    notifyingPaths.add(normPath);
    try {
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
    } finally {
      notifyingPaths.delete(normPath);
    }
  }
}

import { TABLE_NAME_MAPPINGS } from './db-converters';

export function normalizePath(path: string): string {
  if (!path) return '';
  const clean = path.replace(/^\/+|\/+$/g, '');
  const parts = clean.split('/');
  let table = parts[0];
  
  if (TABLE_NAME_MAPPINGS[table]) table = TABLE_NAME_MAPPINGS[table];
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

const TRANSIENT_DELTA_KEYS = [
  'deltaBalance', 'deltaSpent', 'deltaPoints',
  'delta_balance', 'delta_spent', 'delta_points',
  'idempotencyKey', 'idempotency_key'
];

function stripTransientFields(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  let cloned: any = null;
  for (const k of TRANSIENT_DELTA_KEYS) {
    if (k in obj) {
      if (!cloned) cloned = { ...obj };
      delete cloned[k];
    }
  }
  return cloned || obj;
}

export function setLocalState(path: string, value: any) {
  const { table, id } = parsePath(path);
  if (!table) return;
  if (!dbState[table]) dbState[table] = {};
  const cleanVal = stripTransientFields(value);
  if (id) dbState[table][id] = cleanVal;
  else dbState[table] = cleanVal || {};
}

export function updateLocalState(path: string, value: any) {
  const { table, id } = parsePath(path);
  if (!table) return;
  if (!dbState[table]) dbState[table] = {};
  const cleanVal = stripTransientFields(value);
  if (id) {
    const existing = stripTransientFields(dbState[table][id] || {});
    dbState[table][id] = { ...existing, ...cleanVal };
  } else {
    dbState[table] = { ...dbState[table], ...cleanVal };
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

/**
 * 🛡️ Remplace intégralement l'état d'une table dans dbState avec persistance IndexedDB.
 * Permet de purger les enregistrements orphelins/supprimés lors de la synchronisation avec Supabase.
 */
export function replaceTableState(path: string, items: any[] | Record<string, any>) {
  const normTable = normalizePath(path).split('/')[0];
  if (!normTable) return;
  const newMap: Record<string, any> = {};
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item && item.id !== undefined && item.id !== null) {
        newMap[String(item.id)] = item;
      }
    }
  } else if (items && typeof items === 'object') {
    Object.assign(newMap, items);
  }
  dbState[normTable] = newMap;
  saveStateToStorage(normTable);
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
      // Produits exclus : gérés directement et sans duplication par nexus_products_cache et useCoreStore
      const tables = [
        'categories', 'brands', 'promotions', 'invoice_patterns',
        'transactions', 'purchase_orders', 'returns', 'online_orders', 'cash_shifts',
        'customers', 'suppliers', 'employees', 'users', 'stock_adjustments',
        'audits', 'damaged_items', 'supplier_syncs', 'attendance', 'purchases',
        'expenses', 'supplier_payments', 'advances', 'audit_logs', 'settings',
        'vouchers', 'cashier_alerts', 'cart_drafts', 'external_delivery_requests',
        'goods_receipt_notes', 'shortage_items', 'custom_replenishment_lists'
      ];
      const loaded = await Promise.all(tables.map(t => getIDB(`nexus_db_${t}`)));
      for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        dbState[t] = await restoreTableState(t, loaded[i]);
      }
      // Partitionner les anciennes transactions pour alléger la RAM
      partitionOldTransactions().catch(() => {});
      Object.keys(dbState).forEach(triggerObservers);
    } else {
      const stored = await getIDB('nexus_supabase_emulator_db_v2');
      if (stored) {
        dbState = stored;
        const tables = Object.keys(dbState);
        await Promise.all(tables.map(t => persistTableState(t)));
        await setIDB('nexus_db_split_v1', true);
        partitionOldTransactions().catch(() => {});
        Object.keys(dbState).forEach(triggerObservers);
      } else {
        const legacy = localStorage.getItem('nexus_supabase_emulator_db');
        if (legacy) {
          dbState = JSON.parse(legacy);
          const tables = Object.keys(dbState);
          await Promise.all(tables.map(t => persistTableState(t)));
          await setIDB('nexus_db_split_v1', true);
          localStorage.removeItem('nexus_supabase_emulator_db');
          partitionOldTransactions().catch(() => {});
          Object.keys(dbState).forEach(triggerObservers);
        }
      }
    }
  } catch (e) {
    console.warn('[DB] Failed to load local state', e);
  }
}

/**
 * ⚡ OPTIMISATION MÉMOIRE : Décharge les transactions >90 jours de la RAM vers un stockage IndexedDB archivé
 */
let isPartitioning = false;

export async function partitionOldTransactions() {
  if (isPartitioning) return;
  isPartitioning = true;
  try {
    const rawTxs = dbState['transactions'];
    if (!rawTxs || typeof rawTxs !== 'object') return;
    
    const txList = Object.values(rawTxs);
    if (txList.length < 200) return;

    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const activeTxs: Record<string, any> = {};
    const archiveTxs: Record<string, any> = (await getIDB('nexus_archived_transactions')) || {};
    let movedCount = 0;

    for (const tx of txList) {
      if (!tx || !tx.id) continue;
      const txTime = new Date(tx.timestamp || tx.created_at || tx.date || 0).getTime();
      if (txTime > 0 && txTime < ninetyDaysAgo) {
        archiveTxs[tx.id] = tx;
        movedCount++;
      } else {
        activeTxs[tx.id] = tx;
      }
    }

    if (movedCount > 0) {
      dbState['transactions'] = activeTxs;
      await setIDB('nexus_archived_transactions', archiveTxs);
      await setIDB('nexus_db_transactions', activeTxs);
      console.log(`[MemoryOptimizer] ${movedCount} transaction(s) anciennes (>90j) déchargées de la RAM vers le stockage archive.`);
    }
  } catch (err) {
    console.warn('[MemoryOptimizer] Erreur partitionnement des transactions:', err);
  } finally {
    isPartitioning = false;
  }
}

/**
 * 🔍 Récupère à la demande les transactions archivées depuis IndexedDB
 */
export async function getArchivedTransactionsFromStorage(): Promise<any[]> {
  try {
    const archived = await getIDB<Record<string, any>>('nexus_archived_transactions');
    return archived ? Object.values(archived) : [];
  } catch {
    return [];
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
