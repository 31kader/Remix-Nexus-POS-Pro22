import { TABLE_NAME_MAPPINGS } from '../../lib/db-converters';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { setSecureItemAsync, getSecureItemAsync, removeSecureItem } from '../../lib/security';
import { SENSITIVE_STORAGE_TABLES } from '../../lib/local-db';

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

export const DELETED_IDS_STORAGE_KEY = 'nexus_deleted_records_v1';

export const TABLE_TO_IDB_CACHE_KEY: Record<string, string> = {
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
