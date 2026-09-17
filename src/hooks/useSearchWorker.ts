import { useEffect, useRef, useState, useCallback } from 'react';
import { Product } from '../types';

export function useSearchWorker(products: Product[]) {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const requestIdRef = useRef(0);
  const pendingRequests = useRef<Map<number, (res: any) => void>>(new Map());

  useEffect(() => {
    try {
      // Initialize web worker with Vite worker import
      const worker = new Worker(
        new URL('../workers/search.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e) => {
        const { id, type, results, product } = e.data;
        const callback = pendingRequests.current.get(id);
        if (callback) {
          pendingRequests.current.delete(id);
          if (type === 'SEARCH_RESULTS') callback(results);
          if (type === 'LOOKUP_RESULT') callback(product);
        }
      };

      workerRef.current = worker;
      setIsReady(true);

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (err) {
      console.warn('[useSearchWorker] Web Worker initialization fallback to main thread:', err);
    }
  }, []);

  // Synchronize single product or deletion instantly on cache update/delete events (O(1) fast path)
  useEffect(() => {
    const handleProductCacheUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Product>;
      if (customEvent.detail && customEvent.detail.id && workerRef.current && isReady) {
        workerRef.current.postMessage({
          type: 'UPSERT_SINGLE_PRODUCT',
          payload: { product: customEvent.detail }
        });
      }
    };

    const handleProductCacheDelete = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail && customEvent.detail.id && workerRef.current && isReady) {
        workerRef.current.postMessage({
          type: 'DELETE_SINGLE_PRODUCT',
          payload: { id: customEvent.detail.id }
        });
      }
    };

    const handleProductsBatchDelete = (e: Event) => {
      const customEvent = e as CustomEvent<{ ids: string[] }>;
      if (customEvent.detail && customEvent.detail.ids && workerRef.current && isReady) {
        workerRef.current.postMessage({
          type: 'BATCH_DELETE_PRODUCTS',
          payload: { ids: customEvent.detail.ids }
        });
      }
    };

    window.addEventListener('product-cache-update', handleProductCacheUpdate);
    window.addEventListener('product-cache-delete', handleProductCacheDelete);
    window.addEventListener('products-batch-delete', handleProductsBatchDelete);

    return () => {
      window.removeEventListener('product-cache-update', handleProductCacheUpdate);
      window.removeEventListener('product-cache-delete', handleProductCacheDelete);
      window.removeEventListener('products-batch-delete', handleProductsBatchDelete);
    };
  }, [isReady]);

  // Synchronize full index when products change (debounced to avoid blocking main thread on rapid updates)
  const lastProductsLength = useRef<number>(0);
  useEffect(() => {
    if (!workerRef.current || !isReady || !products) return;

    // Avoid full re-indexing if length hasn't changed and array was already indexed
    if (products.length === lastProductsLength.current && lastProductsLength.current > 0) return;
    lastProductsLength.current = products.length;

    const timer = setTimeout(() => {
      if (workerRef.current && isReady) {
        workerRef.current.postMessage({
          type: 'INDEX_PRODUCTS',
          payload: { products }
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [products, isReady]);

  const searchProducts = useCallback(
    (query: string, limit: number = 80): Promise<Product[]> => {
      return new Promise((resolve) => {
        if (!workerRef.current || !isReady) {
          // Fallback simple search
          const q = (query || '').toLowerCase().trim();
          if (!q) {
            resolve((products || []).slice(0, limit));
            return;
          }
          const tokens = q.split(/\s+/).filter(Boolean);
          const filtered = (products || []).filter(p => {
            const str = `${p.name} ${p.sku} ${p.barcode}`.toLowerCase();
            return tokens.every(t => str.includes(t));
          }).slice(0, limit);
          resolve(filtered);
          return;
        }

        const id = ++requestIdRef.current;
        pendingRequests.current.set(id, resolve);
        workerRef.current.postMessage({
          id,
          type: 'SEARCH',
          payload: { query, limit }
        });
      });
    },
    [isReady, products]
  );

  const lookupBarcode = useCallback(
    (barcode: string): Promise<Product | null> => {
      return new Promise((resolve) => {
        if (!workerRef.current || !isReady) {
          const bc = (barcode || '').trim().toLowerCase();
          const p = (products || []).find(x => 
            x.barcode?.toLowerCase() === bc || 
            x.sku?.toLowerCase() === bc
          );
          resolve(p || null);
          return;
        }

        const id = ++requestIdRef.current;
        pendingRequests.current.set(id, resolve);
        workerRef.current.postMessage({
          id,
          type: 'LOOKUP_BARCODE',
          payload: { barcode }
        });
      });
    },
    [isReady, products]
  );

  return {
    searchProducts,
    lookupBarcode,
    isWorkerReady: isReady
  };
}
