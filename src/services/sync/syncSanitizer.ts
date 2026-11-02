import { TABLE_NAME_MAPPINGS, preparePayload } from '../../lib/db-converters';

// Tables gérées exclusivement en local (IndexedDB) sans persistance distante Supabase
export const LOCAL_ONLY_TABLES = new Set<string>(['cart_drafts', 'cartDrafts']);

// Tables protégées par RLS exigeant une session Supabase active (évite le spam 403 Forbidden hors connexion)
export const ADMIN_RESTRICTED_SYNC_TABLES = new Set<string>(['employees', 'settings', 'audit_logs', 'users']);

export function isLocalOnlyTable(table: string): boolean {
  if (!table) return false;
  const norm = TABLE_NAME_MAPPINGS[table] || table;
  return LOCAL_ONLY_TABLES.has(table) || LOCAL_ONLY_TABLES.has(norm);
}

export function isAuthOrPermissionError(err: any): boolean {
  if (!err) return false;
  const status = Number(err?.status || err?.statusCode || 0);
  const code = String(err?.code || '');
  const str = String(err?.message || err?.details || err?.hint || code || status || '').toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    code === '42501' ||
    str.includes('401') ||
    str.includes('403') ||
    str.includes('jwt') ||
    str.includes('unauthorized') ||
    str.includes('forbidden') ||
    str.includes('permission') ||
    str.includes('row-level security') ||
    str.includes('policy')
  );
}

export function isDuplicateKeyError(err: any): boolean {
  if (!err) return false;
  const code = String(err?.code || '');
  const status = Number(err?.status || err?.statusCode || 0);
  const str = String(err?.message || err?.details || '').toLowerCase();
  return (
    code === '23505' ||
    status === 409 ||
    str.includes('duplicate key') ||
    str.includes('already exists') ||
    str.includes('unique constraint')
  );
}

export function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const status = Number(err?.status || err?.statusCode || 0);
  const code = String(err?.code || '');
  const msg = String(err?.message || err?.details || '');
  return (
    status === 404 ||
    code === '42P01' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('Not Found') ||
    msg.includes('could not find the table')
  );
}

export function sanitizePayloadForSupabase(table: string, payload: any, fallbackId?: string): any {
  if (!payload || typeof payload !== 'object') return payload;
  const normTable = TABLE_NAME_MAPPINGS[table] || table;
  const recordId = payload.id || fallbackId || '';
  const cleaned = preparePayload(normTable, recordId, payload);

  // Handle specific product constraints (avoid unique constraint violations on empty strings)
  if (table === 'products') {
    if (typeof cleaned.name === 'string') {
      cleaned.name = cleaned.name.trim();
    }
    if (typeof cleaned.sku === 'string') {
      cleaned.sku = cleaned.sku.trim();
      if (!cleaned.sku) cleaned.sku = null;
    }
    if (typeof cleaned.barcode === 'string') {
      cleaned.barcode = cleaned.barcode.trim();
      if (!cleaned.barcode) cleaned.barcode = null;
    }
    if (typeof cleaned.reference === 'string') {
      cleaned.reference = cleaned.reference.trim();
      if (!cleaned.reference) cleaned.reference = null;
    }
    if (typeof cleaned.parent_id === 'string') {
      cleaned.parent_id = cleaned.parent_id.trim();
      if (!cleaned.parent_id) cleaned.parent_id = null;
    }
  }

  return cleaned;
}

export const TABLE_PRIORITY: Record<string, number> = {
  settings: 0,
  categories: 1,
  carton_templates: 12,
  cartonTemplates: 12,
  brands: 2,
  suppliers: 3,
  users: 4,
  employees: 5,
  products: 10,
  customers: 15,
  online_orders: 18,
  onlineOrders: 18,
  transactions: 20,
  returns: 21,
  goods_receipt_notes: 22,
  goodsReceiptNotes: 22,
  purchases: 23,
  purchase_orders: 24,
  purchaseOrders: 24,
  supplier_payments: 25,
  supplierPayments: 25,
  expenses: 26,
  damaged_items: 27,
  damagedItems: 27,
  vouchers: 28,
  stock_adjustments: 30,
  stockAdjustments: 30,
};
