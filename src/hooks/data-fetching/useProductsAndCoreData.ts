import { useEffect, useRef } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { localDb } from '../../services/LocalDatabase';
import { supabase, isSupabaseConfigured, removeChannelByName } from '../../supabase';
import { 
  Product, Category, Brand, Transaction, Promotion, Customer, Supplier, UserProfile,
  ProductReturn, Expense, StockAdjustment, Purchase, SupplierPayment, DamagedRecord, AuditLog
} from '../../types';
import { fetchProductsFromSupabase, fetchTableFromSupabase } from './supabaseFetchHelper';
import { convertKeysToCamel } from '../../lib/db-converters';


interface useProductsAndCoreDataParams {
  loading: boolean;
  appMode: string;
  userId: string | undefined;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  setTransactions: (txs: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  setPromotions: React.Dispatch<React.SetStateAction<Promotion[]>>;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  setReturns: React.Dispatch<React.SetStateAction<ProductReturn[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  setStockAdjustments: React.Dispatch<React.SetStateAction<StockAdjustment[]>>;
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  setSupplierPayments: React.Dispatch<React.SetStateAction<SupplierPayment[]>>;
  setDamagedItems: React.Dispatch<React.SetStateAction<DamagedRecord[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  setIsDataLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useProductsAndCoreData({
  loading,
  appMode,
  userId,
  setProducts,
  setCategories,
  setBrands,
  setTransactions,
  setPromotions,
  setCustomers,
  setSuppliers,
  setUsers,
  setReturns,
  setExpenses,
  setStockAdjustments,
  setPurchases,
  setSupplierPayments,
  setDamagedItems,
  setAuditLogs,
  setIsDataLoading
}: useProductsAndCoreDataParams) {
  const isFetching = useRef(false);

  useEffect(() => {
    if (loading) return;

    // Migration du cache pour intégrer les champs d'expiration et de lots
    const CACHE_VERSION = '1.3';
    const currentVersion = localStorage.getItem('nexus_products_cache_version');
    if (currentVersion !== CACHE_VERSION) {
      localStorage.removeItem('nexus_has_cached_products');
      localStorage.removeItem('last_sync_timestamp');
      idbSet('nexus_products_cache', null).catch(err => console.warn('[IDB Error]', err));
      localStorage.setItem('nexus_products_cache_version', CACHE_VERSION);
      console.log('[Cache Migration] Ancien cache produit vidé pour charger les nouvelles colonnes.');
    }

    if (appMode !== 'price_checker' && !userId) {
      setIsDataLoading(false);
      return;
    }

    let isSubscribed = true;
    const unsubscribes: (() => void)[] = [];
    const hasCache = localStorage.getItem('nexus_has_cached_products') === 'true';
    // Réinitialiser le verrou à chaque montage
    isFetching.current = false;
    if (!hasCache) {
      setIsDataLoading(true);
    }

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
          idbSet('nexus_products_cache', newProducts).catch(err => console.warn('[IDB Error]', err));
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
          idbSet('nexus_products_cache', newProducts).catch(err => console.warn('[IDB Error]', err));
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
          idbSet('nexus_products_cache', newProducts).catch(err => console.warn('[IDB Error]', err));
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
          idbSet('nexus_categories', newCats).catch(err => console.warn('[IDB Error]', err));
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
          idbSet('nexus_categories', newCats).catch(err => console.warn('[IDB Error]', err));
          return newCats;
        });
      }
    };

    window.addEventListener('product-cache-update', handleProductCacheUpdate);
    window.addEventListener('product-cache-delete', handleProductCacheDelete);
    window.addEventListener('products-batch-delete', handleProductsBatchDelete);
    window.addEventListener('category-cache-update', handleCategoryCacheUpdate);
    window.addEventListener('category-cache-delete', handleCategoryCacheDelete);

    try {
      const offlineTxs = JSON.parse(localStorage.getItem('nexus_offline_transactions') || '[]');
      if (offlineTxs.length > 0) {
        setTransactions(offlineTxs);
      }
    } catch (e) {
      console.warn("Failed to load local offline transactions", e);
    }

    const handleOfflineTxCreated = (e: Event) => {
      const customEvent = e as CustomEvent<Transaction>;
      if (customEvent.detail && isSubscribed) {
        setTransactions(prev => {
          const merged = [customEvent.detail, ...prev];
          const unique = Array.from(new Map(merged.map(t => [t.id, t])).values());
          return unique;
        });
      }
    };
    
    const handleOfflineReturnCreated = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail && isSubscribed) {
        setReturns(prev => {
          const merged = [customEvent.detail, ...prev];
          const unique = Array.from(new Map(merged.map(t => [t.id, t])).values());
          return unique;
        });
      }
    };
    
    window.addEventListener('offline-transaction-created', handleOfflineTxCreated);
    window.addEventListener('offline-return-created', handleOfflineReturnCreated);

    const syncProducts = async () => {
      if (!isSubscribed || isFetching.current) return;
      isFetching.current = true;
      try {
        // Note: le cache IDB est déjà chargé par runQueue en parallèle
        // Ici on ne fait que la synchronisation réseau
        const cachedProducts = await idbGet<Product[]>('nexus_products_cache');
        const hasCache = cachedProducts && cachedProducts.length > 0;

        if (isSupabaseConfigured) {
          if (hasCache) {
            // OPTIMISATION DELTA : Demander uniquement les produits modifiés depuis le dernier timestamp de synchronisation réussie
            const lastSyncTimestamp = localStorage.getItem('last_sync_timestamp');
            
            let fetchSince = lastSyncTimestamp;
            if (!fetchSince) {
              const yesterdayDate = new Date();
              yesterdayDate.setDate(yesterdayDate.getDate() - 1);
              fetchSince = yesterdayDate.toISOString();
            }

            console.log(`[useProductsAndCoreData] Checking for product changes since last sync timestamp: ${fetchSince}...`);
            const modifiedProducts = await fetchProductsFromSupabase(undefined, true, fetchSince);
            
            if (isSubscribed) {
              if (modifiedProducts && modifiedProducts.length > 0) {
                console.log(`[useProductsAndCoreData] Delta found! ${modifiedProducts.length} products updated/created since ${fetchSince}. Merging with cache.`);
                const mergedMap = new Map<string, Product>();
                cachedProducts.forEach(p => mergedMap.set(p.id, p));
                modifiedProducts.forEach(p => mergedMap.set(p.id, p));
                const mergedProducts = Array.from(mergedMap.values());
                
                setProducts(mergedProducts);
                await idbSet('nexus_products_cache', mergedProducts).catch(err => console.warn('[IDB Error]', err));
              } else {
                console.log('[useProductsAndCoreData] No product changes since last sync. Using 100% local cache.');
              }
              // Mettre à jour le timestamp de la dernière synchronisation réussie
              localStorage.setItem('last_sync_timestamp', new Date().toISOString());
              // Note: isDataLoading est géré par runQueue
            }
          } else {
            // Pas de cache local : Premier chargement classique (premiers 50 puis déchargement en arrière-plan)
            const updatedDocs = await fetchProductsFromSupabase(50);
            if (updatedDocs && isSubscribed) {
              setProducts(updatedDocs);
              await idbSet('nexus_products_cache', updatedDocs).catch(err => console.warn('[IDB Error]', err));
              localStorage.setItem('nexus_has_cached_products', 'true');
              // Note: isDataLoading est géré par runQueue
            } else {
              if (isSubscribed) {
                // Note: isDataLoading est géré par runQueue
              }
            }

            const bgLoadTimeout = setTimeout(async () => {
              if (!isSubscribed) return;
              try {
                console.log('[useProductsAndCoreData] Non-blocking background fetch of the remaining product catalog starts.');
                const fullDocs = await fetchProductsFromSupabase();
                if (fullDocs && isSubscribed) {
                  setProducts(fullDocs);
                  await idbSet('nexus_products_cache', fullDocs).catch(err => console.warn('[IDB Error]', err));
                  localStorage.setItem('last_sync_timestamp', new Date().toISOString());
                  console.log(`[useProductsAndCoreData] Background product sync complete. Total cached: ${fullDocs.length}`);
                }
              } catch (err) {
                console.warn('[useProductsAndCoreData] Background catalog fetch failed:', err);
              }
            }, 3000);

            unsubscribes.push(() => clearTimeout(bgLoadTimeout));
          }

          // Realtime postgres_changes subscription for products table with batching to prevent update flood
          let productUpdateQueue: Product[] = [];
          let productDeleteQueue: string[] = [];
          let updateTimeout: any = null;

          const processBatchedProductUpdates = () => {
            if (productUpdateQueue.length === 0 && productDeleteQueue.length === 0) return;
            setProducts(prev => {
              const map = new Map<string, Product>();
              prev.forEach(p => map.set(p.id, p));
              productUpdateQueue.forEach(p => map.set(p.id, p));
              productDeleteQueue.forEach(id => map.delete(id));
              const newProds = Array.from(map.values());
              idbSet('nexus_products_cache', newProds).catch(err => console.warn('[IDB Error]', err));
              return newProds;
            });
            productUpdateQueue = [];
            productDeleteQueue = [];
          };

          removeChannelByName('public:products');
          const channel = supabase
            .channel('public:products')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async (payload: any) => {
              if (!isSubscribed) return;
              if (payload.eventType === 'DELETE') {
                const deletedId = payload.old?.id;
                if (deletedId) {
                  productDeleteQueue.push(deletedId);
                  if (updateTimeout) clearTimeout(updateTimeout);
                  updateTimeout = setTimeout(processBatchedProductUpdates, 100);
                }
              } else {
                const rawItem = payload.new;
                if (rawItem && rawItem.id) {
                  const jsonFields = ['image_urls', 'bundle_items', 'quantity_discounts', 'batches', 'tags'];
                  jsonFields.forEach(field => {
                    if (rawItem[field] && typeof rawItem[field] === 'string') {
                      try { rawItem[field] = JSON.parse(rawItem[field]); } catch (e) {}
                    }
                  });
                  const camelItem = convertKeysToCamel(rawItem) as Product;
                  productUpdateQueue.push(camelItem);
                  if (updateTimeout) clearTimeout(updateTimeout);
                  updateTimeout = setTimeout(processBatchedProductUpdates, 100);
                }
              }
            })
            .subscribe();

          unsubscribes.push(() => {
            if (updateTimeout) clearTimeout(updateTimeout);
            supabase.removeChannel(channel);
          });
        } else {
          const unsub = localDb.subscribe('products', (snapshot) => {
            if (isSubscribed) {
              if (snapshot.exists()) {
                const productsData = snapshot.val();
                if (productsData) {
                  const updatedDocs = Object.keys(productsData).map(id => ({ id, ...productsData[id] } as Product));
                  setProducts(updatedDocs);
                  idbSet('nexus_products_cache', updatedDocs).catch(err => console.warn('[IDB Error]', err));
                } else {
                  setProducts([]);
                  idbSet('nexus_products_cache', []).catch(err => console.warn('[IDB Error]', err));
                }
              } else {
                setProducts([]);
                idbSet('nexus_products_cache', []).catch(err => console.warn('[IDB Error]', err));
              }
              setIsDataLoading(false);
            }
          });
          unsubscribes.push(unsub);
        }
      } catch (err) {
        console.warn("Product sync failed:", err);
        if (isSubscribed) setIsDataLoading(false);
      } finally {
        isFetching.current = false;
      }
    };


    syncProducts();

    type QueueConfig = {
      cacheKey: string;
      collectionName: string;
      setState: (data: any) => void;
      limit?: number;
      startDate?: string;
      timestampColumn?: string;
    };

    const queueConfig: QueueConfig[] = [
      { cacheKey: 'nexus_categories', collectionName: 'categories', setState: setCategories },
      { cacheKey: 'nexus_brands', collectionName: 'brands', setState: setBrands },
      { cacheKey: 'nexus_promotions', collectionName: 'promotions', setState: setPromotions },
      { cacheKey: 'nexus_customers', collectionName: 'customers', setState: setCustomers, timestampColumn: 'updated_at' },
      { cacheKey: 'nexus_suppliers', collectionName: 'suppliers', setState: setSuppliers, timestampColumn: 'updated_at' },
      { cacheKey: 'nexus_users', collectionName: 'users', setState: setUsers }
    ];

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    if (appMode !== 'customer') {
      queueConfig.push(
        { cacheKey: 'nexus_transactions_cache', collectionName: 'transactions', setState: setTransactions as any, limit: 100, startDate: thirtyDaysAgo, timestampColumn: 'timestamp' },
        { cacheKey: 'nexus_expenses_cache', collectionName: 'expenses', setState: setExpenses, timestampColumn: 'date' },
        { cacheKey: 'nexus_stock_adjustments_cache', collectionName: 'stockAdjustments', setState: setStockAdjustments },
        { cacheKey: 'nexus_purchases_cache', collectionName: 'purchases', setState: setPurchases, timestampColumn: 'date' },
        { cacheKey: 'nexus_returns_cache', collectionName: 'returns', setState: setReturns, timestampColumn: 'date' },
        { cacheKey: 'nexus_supplier_payments_cache', collectionName: 'supplierPayments', setState: setSupplierPayments, timestampColumn: 'date' },
        { cacheKey: 'nexus_damaged_items_cache', collectionName: 'damaged_items', setState: setDamagedItems },
        { cacheKey: 'nexus_audit_logs_cache', collectionName: 'audit_logs', setState: setAuditLogs, timestampColumn: 'updated_at' },
        { cacheKey: 'nexus_goods_receipt_notes_cache', collectionName: 'goodsReceiptNotes', setState: () => {} }
      );
    }

    const runQueue = async () => {
      try {
        // 1. Charger en parallèle: produits IDB + toutes les autres tables IDB
        const [cachedProducts, ...otherCaches] = await Promise.all([
          idbGet<Product[]>('nexus_products_cache').catch(() => null),
          ...queueConfig.map(config =>
            idbGet<any[]>(config.cacheKey).catch(() => [])
          )
        ]);

        // Appliquer le cache des produits
        if (cachedProducts && cachedProducts.length > 0 && isSubscribed) {
          setProducts(cachedProducts);
          localStorage.setItem('nexus_has_cached_products', 'true');
        }

        // Appliquer le cache des autres tables
        queueConfig.forEach((config, i) => {
          const cached = otherCaches[i];
          if (cached && cached.length > 0 && isSubscribed) {
            config.setState(cached);
          }
        });
      } finally {
        // Toujours arrêter le chargement après lecture du cache IDB
        if (isSubscribed) setIsDataLoading(false);
      }

      // 3. Synchronisation réseau en arrière-plan (ne bloque plus l'UI)
      await syncProducts();

      // 4. Synchronisation séquentielle des autres tables
      for (const config of queueConfig) {
        if (!isSubscribed) break;
        await syncTableFromNetwork(config);
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    };

    const syncTableFromNetwork = async <T,>(config: QueueConfig) => {
      const { cacheKey, collectionName, setState, limit, startDate, timestampColumn } = config;
      try {
        const cached = await idbGet<T[]>(cacheKey) || [];
        if (isSupabaseConfigured) {
          const lastSyncTime = cached.length > 0 ? localStorage.getItem(`last_sync_${collectionName}`) : null;
          const camelData = await fetchTableFromSupabase<T>(collectionName, limit, startDate, lastSyncTime || undefined, timestampColumn);
          
          if (camelData && isSubscribed) {
            const updatedCache = [...cached];
            camelData.forEach((newRow: any) => {
              const idx = updatedCache.findIndex((r: any) => r.id === newRow.id);
              if (idx > -1) updatedCache[idx] = newRow;
              else updatedCache.push(newRow);
            });

            setState(updatedCache);
            idbSet(cacheKey, updatedCache).catch(err => console.warn('[IDB Error]', err));
            localStorage.setItem(`last_sync_${collectionName}`, new Date().toISOString());
          }

          const mappedTable = collectionName === 'shifts' ? 'cash_shifts' : 
                              collectionName === 'onlineOrders' ? 'online_orders' :
                              collectionName === 'purchaseOrders' ? 'purchase_orders' :
                              collectionName === 'stockAdjustments' ? 'stock_adjustments' :
                              collectionName === 'supplierPayments' ? 'supplier_payments' :
                              collectionName === 'damagedItems' ? 'damaged_items' :
                              collectionName === 'goodsReceiptNotes' ? 'goods_receipt_notes' :
                              collectionName === 'auditLogs' ? 'audit_logs' : collectionName;

          let updateQueue: any[] = [];
          let deleteQueue: string[] = [];
          let updateTimeout: any = null;

          const processBatchedUpdates = () => {
            if (updateQueue.length === 0 && deleteQueue.length === 0) return;
            setState((prev: any[]) => {
              const map = new Map<string, any>();
              prev.forEach(item => map.set(item.id, item));
              updateQueue.forEach(item => map.set(item.id, item));
              deleteQueue.forEach(id => map.delete(id));
              
              let updated = Array.from(map.values());
              if (timestampColumn) {
                updated.sort((a, b) => new Date(b[timestampColumn]).getTime() - new Date(a[timestampColumn]).getTime());
              }
              if (limit && updated.length > limit) {
                updated = updated.slice(0, limit);
              }
              idbSet(cacheKey, updated).catch(err => console.warn('[IDB Error]', err));
              return updated;
            });
            updateQueue = [];
            deleteQueue = [];
          };

          removeChannelByName(`public:${mappedTable}`);
          const channel = supabase
            .channel(`public:${mappedTable}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: mappedTable }, async (payload: any) => {
              if (!isSubscribed) return;
              if (payload.eventType === 'DELETE') {
                const deletedId = payload.old?.id;
                if (deletedId) {
                  deleteQueue.push(deletedId);
                  if (updateTimeout) clearTimeout(updateTimeout);
                  updateTimeout = setTimeout(processBatchedUpdates, 100);
                }
              } else {
                const rawItem = payload.new;
                if (rawItem && rawItem.id) {
                  const jsonFields = ['items', 'status_history', 'metadata', 'details', 'documents', 'bundle_items', 'quantity_discounts', 'usage_logs', 'batches', 'alerts', 'favorite_items', 'conditions', 'discrepancies', 'notifications', 'role_kpis', 'role_permissions', 'favorite_category_ids', 'quick_select_groups'];
                  jsonFields.forEach(field => {
                    if (rawItem[field] && typeof rawItem[field] === 'string') {
                      try { rawItem[field] = JSON.parse(rawItem[field]); } catch (e) {}
                    }
                  });
                  const camelItem = convertKeysToCamel(rawItem);
                  updateQueue.push(camelItem);
                  if (updateTimeout) clearTimeout(updateTimeout);
                  updateTimeout = setTimeout(processBatchedUpdates, 100);
                }
              }
            })
            .subscribe();

          unsubscribes.push(() => {
            if (updateTimeout) clearTimeout(updateTimeout);
            supabase.removeChannel(channel);
          });
        } else {
          const unsub = localDb.subscribe(collectionName, (snapshot) => {
            if (isSubscribed) {
              if (snapshot.exists()) {
                const data = snapshot.val();
                if (data) {
                  const docs = Object.keys(data).map(id => ({ id, ...data[id] } as T));
                  setState(docs);
                  idbSet(cacheKey, docs).catch(err => console.warn('[IDB Error]', err));
                } else {
                  setState([]);
                  idbSet(cacheKey, []).catch(err => console.warn('[IDB Error]', err));
                }
              } else {
                setState([]);
                idbSet(cacheKey, []).catch(err => console.warn('[IDB Error]', err));
              }
            }
          });
          unsubscribes.push(unsub);
        }
      } catch (err: any) {
        const errMessage = err?.message || String(err);
        if (errMessage.includes('Quota') || errMessage.includes('PERMISSION_DENIED') || errMessage.includes('resource-exhausted')) {
          console.warn(`[Quota/Permission] Fetch fallback for ${collectionName}`);
        } else {
          console.error(`Fetch failed for ${collectionName}:`, err);
        }
      }
    };

    runQueue();

    return () => {
      isSubscribed = false;
      unsubscribes.forEach(unsub => {
        try { unsub(); } catch(e) {}
      });
      window.removeEventListener('product-cache-update', handleProductCacheUpdate);
      window.removeEventListener('product-cache-delete', handleProductCacheDelete);
      window.removeEventListener('products-batch-delete', handleProductsBatchDelete);
      window.removeEventListener('category-cache-update', handleCategoryCacheUpdate);
      window.removeEventListener('category-cache-delete', handleCategoryCacheDelete);
      window.removeEventListener('offline-transaction-created', handleOfflineTxCreated);
      window.removeEventListener('offline-return-created', handleOfflineReturnCreated);
    };
  }, [loading, appMode, userId]);
}
