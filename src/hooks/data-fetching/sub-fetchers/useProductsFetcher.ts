import { useRef, useEffect } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { Product, Category } from '../../../types';
import { fetchProductsFromSupabase } from '../supabaseFetchHelper';
import { isSupabaseConfigured } from '../../../supabase';
import { loadPendingSyncQueue } from '../../../services/SyncService';

let productsSaveTimeout: any = null;
export function debouncedSaveProductsCache(products: Product[], delay = 300) {
  if (productsSaveTimeout) clearTimeout(productsSaveTimeout);
  productsSaveTimeout = setTimeout(() => {
    idbSet('nexus_products_cache', products).catch(err => console.warn('[IDB Error]', err));
  }, delay);
}

let categoriesSaveTimeout: any = null;
export function debouncedSaveCategoriesCache(categories: Category[], delay = 300) {
  if (categoriesSaveTimeout) clearTimeout(categoriesSaveTimeout);
  categoriesSaveTimeout = setTimeout(() => {
    idbSet('nexus_categories', categories).catch(err => console.warn('[IDB Error]', err));
  }, delay);
}

interface UseProductsFetcherParams {
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setIsDataLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isSubscribedRef: { current: boolean };
}

export function useProductsFetcher({
  setProducts,
  setCategories,
  setIsDataLoading,
  isSubscribedRef
}: UseProductsFetcherParams) {
  const isFetching = useRef(false);

  const syncProducts = async (forceFull = false) => {
    if (!isSubscribedRef.current || isFetching.current) return;
    isFetching.current = true;
    try {
      const cachedProducts = await idbGet<Product[]>('nexus_products_cache');
      const hasCache = cachedProducts && cachedProducts.length > 0;

      if (isSupabaseConfigured) {
        if (hasCache && !forceFull) {
          const lastSyncTimestamp = localStorage.getItem('last_sync_timestamp');
          let fetchSince = lastSyncTimestamp;
          if (!fetchSince) {
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            fetchSince = yesterdayDate.toISOString();
          }

          const modifiedProducts = await fetchProductsFromSupabase(undefined, true, fetchSince);
          if (isSubscribedRef.current && modifiedProducts && modifiedProducts.length > 0) {
            const mergedMap = new Map<string, Product>();
            cachedProducts.forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });
            modifiedProducts.forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });

            const pendingQueue = loadPendingSyncQueue();
            pendingQueue
              .filter(i => (i.table === 'products' || i.table === 'nexus_products') && i.payload)
              .forEach(i => {
                const pId = i.recordId || i.payload?.id;
                if (pId) {
                  if (i.action === 'UPSERT') {
                    const existing = mergedMap.get(pId) || ({} as Product);
                    mergedMap.set(pId, { ...existing, ...i.payload });
                  } else if (i.action === 'DELETE') {
                    mergedMap.delete(pId);
                  }
                }
              });

            const pendingStockDeltas = new Map<string, number>();
            const pendingStockSets = new Map<string, number>();
            pendingQueue
              .filter(i => (i.table === 'stock_adjustments' || i.table === 'stockAdjustments') && i.payload)
              .forEach(i => {
                const pId = String(i.payload?.productId || i.payload?.id || i.recordId || '');
                if (!pId) return;
                if (i.payload?.mode === 'set') {
                  pendingStockSets.set(pId, Number(i.payload?.newQuantity ?? i.payload?.value) || 0);
                } else {
                  const delta = Number(i.payload?.adjustment ?? i.payload?.delta) || 0;
                  pendingStockDeltas.set(pId, (pendingStockDeltas.get(pId) || 0) + delta);
                }
              });

            for (const [pId, setVal] of pendingStockSets.entries()) {
              const prod = mergedMap.get(pId);
              if (prod) {
                const extraDelta = pendingStockDeltas.get(pId) || 0;
                prod.stock = setVal + extraDelta;
                pendingStockDeltas.delete(pId);
              }
            }
            for (const [pId, delta] of pendingStockDeltas.entries()) {
              const prod = mergedMap.get(pId);
              if (prod) {
                prod.stock = (Number(prod.stock) || 0) + delta;
              }
            }

            const mergedProducts = Array.from(mergedMap.values()).filter(p => p && p.name && p.name !== 'Sans nom' && p.name !== 'Article Sans Nom');
            setProducts(mergedProducts);
            await idbSet('nexus_products_cache', mergedProducts).catch(err => console.warn('[IDB Error]', err));
            
            let maxUpdatedAt: string | null = null;
            modifiedProducts.forEach(p => {
              if (p?.updatedAt && (!maxUpdatedAt || p.updatedAt > maxUpdatedAt)) {
                maxUpdatedAt = p.updatedAt;
              }
            });
            const safeSyncTimestamp = maxUpdatedAt 
              ? new Date(new Date(maxUpdatedAt).getTime() - 2 * 60 * 1000).toISOString()
              : new Date(Date.now() - 2 * 60 * 1000).toISOString();
            localStorage.setItem('last_sync_timestamp', safeSyncTimestamp);
          } else if (isSubscribedRef.current) {
            const safeSyncTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            localStorage.setItem('last_sync_timestamp', safeSyncTimestamp);
          }
        } else {
          const fullDocs = await fetchProductsFromSupabase();
          if (fullDocs && fullDocs.length > 0 && isSubscribedRef.current) {
            const mergedMap = new Map<string, Product>();
            fullDocs.forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });

            const pendingQueue = loadPendingSyncQueue();
            pendingQueue
              .filter(i => (i.table === 'products' || i.table === 'nexus_products') && i.payload)
              .forEach(i => {
                const pId = i.recordId || i.payload?.id;
                if (pId) {
                  if (i.action === 'UPSERT') {
                    const existing = mergedMap.get(pId) || ({} as Product);
                    mergedMap.set(pId, { ...existing, ...i.payload });
                  } else if (i.action === 'DELETE') {
                    mergedMap.delete(pId);
                  }
                }
              });

            const mergedProducts = Array.from(mergedMap.values()).filter(p => p && p.name && p.name !== 'Sans nom');
            setProducts(mergedProducts);
            await idbSet('nexus_products_cache', mergedProducts).catch(err => console.warn('[IDB Error]', err));
            localStorage.setItem('nexus_has_cached_products', 'true');
            const safeSyncTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            localStorage.setItem('last_sync_timestamp', safeSyncTimestamp);
          }
        }
      } else if (hasCache) {
        setProducts(cachedProducts);
      }
    } catch (err) {
      console.warn('[SyncProducts Error]', err);
    } finally {
      isFetching.current = false;
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    const handleProductCacheUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Product>;
      if (customEvent.detail && customEvent.detail.id) {
        const updatedProduct = customEvent.detail;
        setProducts(prev => {
          const index = prev.findIndex(p => p.id === updatedProduct.id);
          let newProducts;
          if (index > -1) {
            newProducts = [...prev];
            newProducts[index] = { ...newProducts[index], ...updatedProduct };
          } else {
            newProducts = [updatedProduct, ...prev];
          }
          debouncedSaveProductsCache(newProducts);
          return newProducts;
        });
      }
    };

    const handleProductCacheDelete = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail && customEvent.detail.id) {
        const idToDelete = customEvent.detail.id;
        setProducts(prev => {
          const newProducts = prev.filter(p => p.id !== idToDelete);
          debouncedSaveProductsCache(newProducts);
          return newProducts;
        });
      }
    };

    const handleProductsBatchDelete = (e: Event) => {
      const customEvent = e as CustomEvent<{ ids: string[] }>;
      if (customEvent.detail && customEvent.detail.ids) {
        const idsToDelete = customEvent.detail.ids;
        setProducts(prev => {
          const newProducts = prev.filter(p => !idsToDelete.includes(p.id));
          debouncedSaveProductsCache(newProducts);
          return newProducts;
        });
      }
    };

    const handleCategoryCacheUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Category>;
      if (customEvent.detail && customEvent.detail.id) {
        const updatedCat = customEvent.detail;
        setCategories(prev => {
          const index = prev.findIndex(c => c.id === updatedCat.id);
          let newCats;
          if (index > -1) {
            newCats = [...prev];
            newCats[index] = { ...newCats[index], ...updatedCat };
          } else {
            newCats = [...prev, updatedCat];
          }
          debouncedSaveCategoriesCache(newCats);
          return newCats;
        });
      }
    };

    const handleCategoryCacheDelete = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail && customEvent.detail.id) {
        const idToDelete = customEvent.detail.id;
        setCategories(prev => {
          const newCats = prev.filter(c => c.id !== idToDelete);
          debouncedSaveCategoriesCache(newCats);
          return newCats;
        });
      }
    };

    window.addEventListener('product-cache-update', handleProductCacheUpdate);
    window.addEventListener('product-cache-delete', handleProductCacheDelete);
    window.addEventListener('products-batch-delete', handleProductsBatchDelete);
    window.addEventListener('category-cache-update', handleCategoryCacheUpdate);
    window.addEventListener('category-cache-delete', handleCategoryCacheDelete);

    return () => {
      window.removeEventListener('product-cache-update', handleProductCacheUpdate);
      window.removeEventListener('product-cache-delete', handleProductCacheDelete);
      window.removeEventListener('products-batch-delete', handleProductsBatchDelete);
      window.removeEventListener('category-cache-update', handleCategoryCacheUpdate);
      window.removeEventListener('category-cache-delete', handleCategoryCacheDelete);
    };
  }, [setProducts, setCategories]);

  return { syncProducts };
}
