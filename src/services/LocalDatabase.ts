import {
  generateLocalId,
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
} from '../lib/local-db';
import {
  enqueueSync,
  enqueueSyncBatch,
  enqueueStockAdjustment,
} from './SyncService';

const normalizeSyncTable = (table: string): string => {
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
  return mappings[table] || table;
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

  insert: async (pathOrRef: any, value: any): Promise<void> => {
    const path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    setLocalState(path, value);
    const parts = path.split('/');
    const table = parts[0];
    const id = parts.slice(1).join('/');

    saveStateToStorage(table);
    triggerObservers(table);
    if (id) triggerObservers(path);

    if (table === 'transactions' && value) {
      window.dispatchEvent(new CustomEvent('offline-transaction-created', { detail: value }));
    }
    if (table === 'returns' && value) {
      window.dispatchEvent(new CustomEvent('offline-return-created', { detail: value }));
    }
    enqueueSync(normalizeSyncTable(table), id || null, value);
  },

  insertBatch: async (table: string, records: Record<string, any>): Promise<void> => {
    for (const [id, value] of Object.entries(records)) {
      setLocalState(`${table}/${id}`, value);
    }
    saveStateToStorage(table);
    triggerObservers(table);
    for (const id of Object.keys(records)) {
      triggerObservers(`${table}/${id}`);
    }
    enqueueSyncBatch(normalizeSyncTable(table), records);
  },

  update: async (pathOrRef: any, value: any): Promise<void> => {
    const path = typeof pathOrRef === 'string' ? pathOrRef : (pathOrRef.path || pathOrRef);
    updateLocalState(path, value);
    const parts = path.split('/');
    const table = parts[0];
    const id = parts.slice(1).join('/');

    saveStateToStorage(table);
    triggerObservers(table);
    if (id) triggerObservers(path);

    const newValue = getLocalValue(path);
    if (table === 'transactions' && newValue) {
      window.dispatchEvent(new CustomEvent('offline-transaction-created', { detail: newValue }));
    }
    if (table === 'returns' && newValue) {
      window.dispatchEvent(new CustomEvent('offline-return-created', { detail: newValue }));
    }
    enqueueSync(normalizeSyncTable(table), id || null, newValue);
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

    saveStateToStorage(table);
    triggerObservers(table);
    if (id) triggerObservers(path);
    enqueueSync(normalizeSyncTable(table), id || null, null, true);
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
