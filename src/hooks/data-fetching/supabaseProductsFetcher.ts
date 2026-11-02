import { supabase, isSupabaseConfigured } from '../../supabase';
import { convertKeysToCamel } from '../../lib/db-converters';
import { Product } from '../../types';
import { isNetworkOrTimeoutError, notifyNetworkIssue, withNetworkTimeout } from '../../services/networkErrorHandler';

export async function fetchProductsFromSupabase(
  limit?: number, 
  isLightweight: boolean = true, 
  sinceUpdatedAt?: string
): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

  const PAGE_SIZE = 500;
  const allProducts: any[] = [];
  let from = 0;
  let hasMore = true;
  let hadFetchError = false;

  // Colonnes complètes pour préserver packs, remises, multi-lots, déconditionnement, galerie et historique
  const CORE_COLUMNS = [
    'id', 'name', 'barcode', 'sku', 'reference', 'image_url', 'image_urls', 'video_url',
    'price', 'online_price', 'cost_price', 'wholesale_price', 'tax_rate', 'stock', 'min_stock', 
    'category_id', 'brand_id', 'supplier', 'unit', 'status', 'description',
    'is_bundle', 'bundle_items', 'quantity_discounts', 'tags', 'show_in_pos', 
    'expiration_date', 'batch_number', 'location', 'damaged_stock',
    'use_multi_expiry', 'batches', 'auto_unpack', 'units_per_parent', 'parent_id',
    'created_at', 'updated_at', 'is_quick_select', 'price_history'
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

        batchResult = await withNetworkTimeout(
          query,
          6000,
          { error: { message: 'ERR_TIMED_OUT' }, data: null },
          'Produits'
        );

        if (!batchResult.error) break;

        // Si c'est une erreur réseau ou de timeout, ne pas réessayer inutilement
        if (isNetworkOrTimeoutError(batchResult.error)) {
          notifyNetworkIssue(batchResult.error, 'Produits');
          hadFetchError = true;
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
          activeCols = ['id', 'name', 'barcode', 'sku', 'price', 'cost_price', 'stock', 'category_id', 'unit', 'status', 'image_url'];
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
        hadFetchError = true;
        hasMore = false;
        break;
      }
    }

    // 🛡️ SÉCURITÉ ABSOLUE : Si une erreur est survenue pendant la pagination, ne JAMAIS retourner un tableau partiel !
    if (hadFetchError) {
      console.warn(`[Supabase Fetch Products] Récupération interrompue par erreur (${allProducts.length} reçus), abandon pour préserver le cache local.`);
      return null;
    }

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
