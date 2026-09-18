import { supabase, isSupabaseConfigured } from '../../supabase';
import { convertKeysToCamel, TABLE_COLUMNS } from '../../lib/db-converters';
import { Product } from '../../types';
import { isNetworkOrTimeoutError, notifyNetworkIssue } from '../../services/networkErrorHandler';

let lastFetchTime = 0;
let consecutiveFailures = 0;

export async function fetchProductsFromSupabase(limit?: number, isLightweight: boolean = true, sinceUpdatedAt?: string): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null;

  const PAGE_SIZE = 500;
  const allProducts: any[] = [];
  let from = 0;
  let hasMore = true;

  // Essential columns that exist across all schema versions (exclude heavy image_url by default to avoid 75MB base64 transfer)
  const CORE_COLUMNS = [
    'id', 'name', 'barcode', 'sku', 'reference', 
    ...(isLightweight ? [] : ['image_url']),
    'price', 'online_price', 'cost_price', 'wholesale_price', 'tax_rate', 'stock', 'min_stock', 'category_id', 'brand_id', 'supplier', 'unit', 'status', 'is_bundle', 'show_in_pos', 'damaged_stock', 'expiration_date', 'batch_number', 'location', 'created_at', 'updated_at', 'use_multi_expiry', 'batches', 'auto_unpack', 'units_per_parent', 'parent_id', 'is_quick_select'
  ];
  let activeCols = [...CORE_COLUMNS];

  try {
    while (hasMore) {
      const currentBatchSize = limit ? Math.min(PAGE_SIZE, limit - allProducts.length) : PAGE_SIZE;
      if (currentBatchSize <= 0) break;

      const to = from + currentBatchSize - 1;
      let attempts = 0;
      let batchResult: any = null;

      while (attempts < 4) {
        attempts++;
        const selectQueryStr = activeCols.length > 0 ? activeCols.join(',') : '*';

        let query = supabase
          .from('products')
          .select(selectQueryStr)
          .order('id', { ascending: true })
          .range(from, to);

        if (sinceUpdatedAt) {
          query = query.gt('updated_at', sinceUpdatedAt);
        }

        batchResult = await query;

        if (!batchResult.error) break;

        // Si c'est une erreur réseau ou de timeout, ne pas réessayer inutilement
        if (isNetworkOrTimeoutError(batchResult.error)) {
          notifyNetworkIssue(batchResult.error, 'Produits');
          hasMore = false;
          break;
        }

        const errMsg = batchResult.error.message || '';
        const isColumnError = batchResult.error.code === '42703' || 
                              batchResult.error.code === 'PGRST204' || 
                              errMsg.includes('column') || 
                              errMsg.includes('schema cache');

        if (isColumnError && activeCols.length > 0) {
          const columnsToPrune = activeCols.filter(col => {
            const escaped = col.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`(?:\\b|\\.|\'|\")${escaped}(?:\\b|\'|\")`, 'i');
            return regex.test(errMsg);
          });

          if (columnsToPrune.length > 0) {
            console.warn('[Supabase Products Auto-Prune] Pruning missing columns:', columnsToPrune);
            activeCols = activeCols.filter(c => !columnsToPrune.includes(c));
            continue;
          }
        }

        // Fallback to safe basic select if column pruning didn't work
        if (activeCols.length > 10) {
          console.warn('[Supabase Products Fallback] Falling back to core columns select');
          activeCols = [
            'id', 'name', 'barcode', 'sku', 'price', 'cost_price', 'stock', 'category_id', 'unit', 'status',
            ...(isLightweight ? [] : ['image_url'])
          ];
          continue;
        }

        break;
      }

      if (batchResult && !batchResult.error && batchResult.data) {
        const data = batchResult.data;
        if (data.length === 0) {
          hasMore = false;
          break;
        }

        allProducts.push(...data);
        if (data.length < currentBatchSize || (limit && allProducts.length >= limit)) {
          hasMore = false;
        } else {
          from += currentBatchSize;
        }
      } else {
        console.warn('[Supabase Products Fetch Batch Failed]', batchResult?.error);
        hasMore = false;
        break;
      }
    }

    consecutiveFailures = 0;
    const finalCamelProducts = allProducts
      .map(p => convertKeysToCamel(p) as Product)
      .filter(p => p && p.id);
    return finalCamelProducts;
  } catch (err: any) {
    if (isNetworkOrTimeoutError(err)) {
      notifyNetworkIssue(err, 'Produits');
    }
    console.error('[Supabase Fetch Products Exception]', err);
    return null;
  }
}

export async function fetchTableFromSupabase<T>(
  collectionName: string, 
  limit?: number, 
  startDate?: string, 
  deltaSyncTime?: string,
  timestampColumn?: string // Use undefined to disable incremental sync
): Promise<T[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const TABLE_TO_KEY: Record<string, string> = {
      'shifts': 'cash_shifts',
      'onlineOrders': 'online_orders',
      'purchaseOrders': 'purchase_orders',
      'stockAdjustments': 'stock_adjustments',
      'supplierPayments': 'supplier_payments',
      'supplier_payments': 'supplier_payments',
      'damagedItems': 'damaged_items',
      'damaged_items': 'damaged_items',
      'auditLogs': 'audit_logs',
      'transactions': 'transactions',
      'customers': 'customers',
      'suppliers': 'suppliers',
      'categories': 'categories',
      'brands': 'brands',
      'users': 'users',
      'settings': 'settings',
      'promotions': 'promotions',
      'returns': 'returns',
      'vouchers': 'vouchers',
      'employees': 'employees',
      'attendance': 'attendance',
      'invoice_patterns': 'invoice_patterns',
      'goodsReceiptNotes': 'goods_receipt_notes',
      'goods_receipt_notes': 'goods_receipt_notes'
    };
    
    const mappedTable = collectionName === 'shifts' ? 'cash_shifts' : 
                        collectionName === 'onlineOrders' ? 'online_orders' :
                        collectionName === 'purchaseOrders' ? 'purchase_orders' :
                        collectionName === 'stockAdjustments' ? 'stock_adjustments' :
                        collectionName === 'supplierPayments' || collectionName === 'supplier_payments' ? 'supplier_payments' :
                        collectionName === 'damagedItems' || collectionName === 'damaged_items' ? 'damaged_items' :
                        collectionName === 'goodsReceiptNotes' || collectionName === 'goods_receipt_notes' ? 'goods_receipt_notes' :
                        collectionName === 'auditLogs' || collectionName === 'audit_logs' ? 'audit_logs' : collectionName;
                        
    const key = TABLE_TO_KEY[collectionName] || collectionName;
    
    let activeCols = TABLE_COLUMNS[key] ? [...TABLE_COLUMNS[key]] : [];

    // 🚀 PAGINATION UNIVERSELLE PAR TRANCHES DE 500 (Zéro plafond arbitraire pour les clients et gros volumes)
    const PAGE_SIZE = 500;
    const allRecords: any[] = [];
    let from = 0;
    let hasMore = true;

    // Si limit est spécifié (ex: transactions 500, expenses 50), on le respecte
    // Pour customers et suppliers sans limit : plafond de sécurité à 2000 pour éviter OOM
    const smallStaticTables = ['categories', 'brands', 'settings', 'promotions', 'users', 'employees', 'vouchers', 'invoice_patterns'];
    const maxTarget = limit !== undefined 
      ? limit 
      : (smallStaticTables.includes(collectionName) ? 500 : (collectionName === 'customers' || collectionName === 'suppliers' ? 2000 : 100));

    while (hasMore) {
      const currentBatchSize = Math.min(PAGE_SIZE, maxTarget - allRecords.length);
      if (currentBatchSize <= 0) break;

      const to = from + currentBatchSize - 1;
      let attempts = 0;
      let batchResult: any = null;

      while (attempts < 5) {
        attempts++;
        let cols = activeCols.length > 0 ? activeCols.join(',') : '*';

        // Use dynamic sort column based on what columns actually exist in activeCols list
        let sortCol: string | null = null;
        if (timestampColumn && activeCols.includes(timestampColumn)) {
          sortCol = timestampColumn;
        } else if (activeCols.length === 0) {
          sortCol = 'id';
        } else {
          const candidates = ['updated_at', 'created_at', 'timestamp', 'date', 'id'];
          for (const candidate of candidates) {
            if (activeCols.includes(candidate)) {
              sortCol = candidate;
              break;
            }
          }
        }

        let query = supabase
          .from(mappedTable)
          .select(cols);

        if (sortCol) {
          query = query.order(sortCol, { ascending: false });
        }

        if (startDate) {
          query = query.gte('created_at', startDate);
        }
        
        // Only add incremental filter if deltaSyncTime AND timestampColumn exist and are in activeCols
        if (deltaSyncTime && timestampColumn && (activeCols.includes(timestampColumn) || activeCols.length === 0)) {
          query = query.gt(timestampColumn, deltaSyncTime);
        }
        
        query = query.range(from, to);

        batchResult = await query;

        if (!batchResult.error) {
          break; // Success! No error occurred!
        }

        // Si c'est une erreur réseau ou de timeout, ne pas boucler inutilement
        if (isNetworkOrTimeoutError(batchResult.error)) {
          notifyNetworkIssue(batchResult.error, collectionName);
          hasMore = false;
          break;
        }

        // If an error occurred, check if we can prune missing columns dynamically
        const errMsg = batchResult.error.message || '';
        const isColumnError = batchResult.error.code === '42703' || 
                              batchResult.error.code === 'PGRST204' || 
                              errMsg.includes('column') || 
                              errMsg.includes('schema cache');

        if (isColumnError && activeCols.length > 0) {
          const columnsToPrune = activeCols.filter(col => {
            const escaped = col.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`(?:\\b|\\.|\'|\")${escaped}(?:\\b|\'|\")`, 'i');
            return regex.test(errMsg);
          });

          if (columnsToPrune.length > 0) {
            console.warn(`[Supabase Fetch Auto-Prune] Pruning columns from ${collectionName} due to schema mismatch:`, columnsToPrune, errMsg);
            activeCols = activeCols.filter(c => !columnsToPrune.includes(c));
            continue; // Try again with fewer columns!
          }
        }

        // If we couldn't prune any more, or it is a different kind of error, try fallback to '*'
        if (activeCols.length > 0) {
          console.warn(`[Supabase Fetch Fallback] Query failed for ${collectionName}. Falling back to select('*')`, batchResult.error);
          activeCols = [];
          continue;
        }

        break; // Stop retrying if we fail even with select('*')
      }

      if (batchResult && !batchResult.error && batchResult.data) {
        const data = batchResult.data;
        if (data.length === 0) {
          hasMore = false;
          break;
        }

        allRecords.push(...data);
        if (data.length < currentBatchSize || (maxTarget !== Infinity && allRecords.length >= maxTarget)) {
          hasMore = false;
        } else {
          from += currentBatchSize;
        }
      } else {
        if (batchResult?.error) {
          console.warn(`[Supabase Batch Fetch Error on ${collectionName}]`, batchResult.error);
        }
        hasMore = false;
        break;
      }
    }
      
    if (allRecords.length > 0) {
      return allRecords.map((item: any) => {
        const jsonFields = ['items', 'status_history', 'metadata', 'details', 'documents', 'bundle_items', 'quantity_discounts', 'usage_logs', 'batches', 'alerts', 'favorite_items', 'conditions', 'discrepancies', 'notifications', 'role_kpis', 'role_permissions', 'favorite_category_ids', 'quick_select_groups'];
        jsonFields.forEach(field => {
          if (item[field] && typeof item[field] === 'string') {
            try { item[field] = JSON.parse(item[field]); } catch (e) {}
          }
        });
        return convertKeysToCamel(item) as T;
      });
    }

    return [];
  } catch (e) {
    if (isNetworkOrTimeoutError(e)) {
      notifyNetworkIssue(e, collectionName);
    }
    console.warn(`[Supabase Direct Fetch Failed for ${collectionName}]`, e);
  }
  return null;
}
