import { supabase, isSupabaseConfigured } from '../../supabase';
import { convertKeysToCamel, TABLE_COLUMNS } from '../../lib/db-converters';
import { Product } from '../../types';

let lastFetchTime = 0;
let consecutiveFailures = 0;

export async function fetchProductsFromSupabase(limit?: number, isLightweight: boolean = true, sinceUpdatedAt?: string): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null;

  // Implement progressive cooldown / backoff to entirely prevent infinite loop request saturation under throttled 3G
  const now = Date.now();
  if (consecutiveFailures > 0) {
    const cooldownMs = Math.min(1000 * Math.pow(2, consecutiveFailures), 45000);
    if (now - lastFetchTime < cooldownMs) {
      console.warn(`[Supabase Fetch Products Cooldown] Skipping request to prevent network loop saturation (cooldown active: ${Math.round((cooldownMs - (now - lastFetchTime))/1000)}s left, consecutive failures: ${consecutiveFailures}).`);
      return null;
    }
  } else {
    // Normal rate limiting
    if (now - lastFetchTime < 2000) {
      console.warn('[Supabase Fetch Products RateLimit] Throttled multiple rapid calls within 2s.');
      return null;
    }
  }

  lastFetchTime = now;
  
  const PAGE_SIZE = 100;
  const allProducts: any[] = [];
  let hasMore = true;
  let cursor: { updatedAt: string; id: string } | null = null;
  
  // Excluded heavy description/JSON fields to prevent 500s and save bandwidth
  const baseColumns = 'id, name, barcode, price, online_price, cost_price, tax_rate, stock, min_stock, category_id, brand_id, supplier, unit, sku, status, image_url, is_bundle, wholesale_price, location, reference, show_in_pos, created_at, updated_at, damaged_stock, expiration_date, batch_number, use_multi_expiry, batches, is_quick_select';
  const selectColumns = isLightweight ? baseColumns : `${baseColumns}, bundle_items, quantity_discounts, tags`;

  try {
    while (hasMore) {
      const currentLimit = limit ? Math.min(PAGE_SIZE, limit - allProducts.length) : PAGE_SIZE;
      if (currentLimit <= 0) {
        break;
      }

      let query = supabase
        .from('products')
        .select(selectColumns)
        .order('updated_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(currentLimit);

      if (sinceUpdatedAt) {
        query = query.gt('updated_at', sinceUpdatedAt);
      }

      if (cursor) {
        query = query.or(
          `updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`
        );
      }

      let result = await query;

      if (result.error) {
        console.warn('[Supabase Paginated Product Fetch Page Error] Retrying with select(*)...', result.error);
        let fallbackQuery = supabase
          .from('products')
          .select('*')
          .order('updated_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(currentLimit);

        if (sinceUpdatedAt) {
          fallbackQuery = fallbackQuery.gt('updated_at', sinceUpdatedAt);
        }

        if (cursor) {
          fallbackQuery = fallbackQuery.or(
            `updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`
          );
        }

        result = await fallbackQuery;
      }

      if (result.error) {
        console.warn('[Supabase Paginated Product Fetch Fallback Failed]', result.error);
        throw result.error;
      }

      const data = result.data;

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allProducts.push(...data);

      if (limit && allProducts.length >= limit) {
        hasMore = false;
        break;
      }

      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        const lastItem = data[data.length - 1];
        if (lastItem) {
          cursor = {
            updatedAt: lastItem.updated_at,
            id: lastItem.id
          };
        } else {
          hasMore = false;
        }
      }
    }

    consecutiveFailures = 0; // successfully loaded all products

    return allProducts.map((item: any) => {
      const jsonFields = ['image_urls', 'bundle_items', 'quantity_discounts', 'batches', 'tags'];
      jsonFields.forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          try { item[field] = JSON.parse(item[field]); } catch (e) {}
        }
      });
      return convertKeysToCamel(item) as Product;
    });
  } catch (e) {
    consecutiveFailures++;
    console.warn('[Supabase Direct Product Fetch Failed (Paginated)]', e);
  }
  return null;
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
      'damagedItems': 'damaged_items',
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
      'goodsReceiptNotes': 'goods_receipt_notes'
    };
    
    const mappedTable = collectionName === 'shifts' ? 'cash_shifts' : 
                        collectionName === 'onlineOrders' ? 'online_orders' :
                        collectionName === 'purchaseOrders' ? 'purchase_orders' :
                        collectionName === 'stockAdjustments' ? 'stock_adjustments' :
                        collectionName === 'supplierPayments' ? 'supplier_payments' :
                        collectionName === 'damagedItems' ? 'damaged_items' :
                        collectionName === 'goodsReceiptNotes' ? 'goods_receipt_notes' :
                        collectionName === 'auditLogs' ? 'audit_logs' : collectionName;
                        
    const key = TABLE_TO_KEY[collectionName] || collectionName;
    
    let activeCols = TABLE_COLUMNS[key] ? [...TABLE_COLUMNS[key]] : [];
    let attempts = 0;
    let result = null;

    while (attempts < 5) {
      attempts++;
      let cols = activeCols.length > 0 ? activeCols.join(',') : '*';

      // Use dynamic sort column based on what columns actually exist in activeCols list
      let sortCol: string | null = null;
      if (timestampColumn && (activeCols.includes(timestampColumn) || activeCols.length === 0)) {
        sortCol = timestampColumn;
      } else if (activeCols.length === 0) {
        sortCol = 'updated_at';
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
      
      if (limit) {
        query = query.limit(limit);
      }

      result = await query;

      if (!result.error) {
        break; // Success! No error occurred!
      }

      // If an error occurred, check if we can prune missing columns dynamically
      const errMsg = result.error.message || '';
      const isColumnError = result.error.code === '42703' || 
                            result.error.code === 'PGRST204' || 
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
        console.warn(`[Supabase Fetch Fallback] Query failed for ${collectionName}. Falling back to select('*')`, result.error);
        activeCols = [];
        continue;
      }

      break; // Stop retrying if we fail even with select('*')
    }
      
    if (!result.error && result.data) {
      return result.data.map((item: any) => {
        const jsonFields = ['items', 'status_history', 'metadata', 'details', 'documents', 'bundle_items', 'quantity_discounts', 'usage_logs', 'batches', 'alerts', 'favorite_items', 'conditions', 'discrepancies', 'notifications', 'role_kpis', 'role_permissions', 'favorite_category_ids', 'quick_select_groups'];
        jsonFields.forEach(field => {
          if (item[field] && typeof item[field] === 'string') {
            try { item[field] = JSON.parse(item[field]); } catch (e) {}
          }
        });
        return convertKeysToCamel(item) as T;
      });
    } else if (result.error) {
      throw result.error;
    }
  } catch (e) {
    console.warn(`[Supabase Direct Fetch Failed for ${collectionName}]`, e);
  }
  return null;
}
