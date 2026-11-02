import { TABLE_NAME_MAPPINGS } from '../../lib/db-converters';

// Tables requiring zero-latency immediate IndexedDB flush (no 150ms debounce)
export const CRITICAL_IMMEDIATE_TABLES = new Set([
  'transactions', 'returns', 'shifts', 'cash_shifts', 'stock_adjustments',
  'damaged_items', 'purchases', 'supplier_payments', 'supplierPayments',
  'expenses', 'goods_receipt_notes', 'goodsReceiptNotes', 'users', 'employees'
]);

// Tables managed directly via Supabase-First (NOT through SyncService queue)
export const SUPABASE_FIRST_TABLES = new Set<string>([]);

// Tables gérées exclusivement en local (IndexedDB) sans persistance distante Supabase
export const LOCAL_ONLY_TABLES = new Set<string>(['cart_drafts', 'cartDrafts']);

export const normalizeSyncTable = (table: string): string => {
  return TABLE_NAME_MAPPINGS[table] || table;
};

export const isLocalOnlyTable = (table: string): boolean => {
  return LOCAL_ONLY_TABLES.has(table) || LOCAL_ONLY_TABLES.has(normalizeSyncTable(table));
};
