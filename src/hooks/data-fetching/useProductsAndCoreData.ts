import { useEffect, useRef } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { localDb, getDeletedRecordIds } from '../../services/LocalDatabase';
import { supabase, isSupabaseConfigured, removeChannelByName, safeRemoveChannel, safeSubscribeChannel, realtimeCircuitBreaker } from '../../supabase';
import { 
  Product, Category, Brand, Transaction, Promotion, Customer, Supplier, UserProfile,
  ProductReturn, Expense, StockAdjustment, Purchase, SupplierPayment, DamagedRecord, AuditLog,
  AdvanceRecord, AttendanceRecord, InventoryAudit
} from '../../types';
import { fetchProductsFromSupabase, fetchTableFromSupabase } from './supabaseFetchHelper';
import { convertKeysToCamel, TABLE_NAME_MAPPINGS } from '../../lib/db-converters';
import { getArchivedTransactionsFromStorage, replaceTableState } from '../../lib/local-db';
import { toast } from 'sonner';
import { playOrderChime } from '../../lib/audioNotification';
import { useTransactionStore } from '../../store/useTransactionStore';
import { loadPendingSyncQueue } from '../../services/SyncService';


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
  setAdvances?: React.Dispatch<React.SetStateAction<AdvanceRecord[]>>;
  setAttendance?: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  setAudits?: React.Dispatch<React.SetStateAction<InventoryAudit[]>>;
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
  setAdvances,
  setAttendance,
  setAudits,
  setIsDataLoading
}: useProductsAndCoreDataParams) {
  const isFetching = useRef(false);

  useEffect(() => {
    if (loading) return;

    // Migration du cache pour aligner tous les appareils avec les produits, acomptes, journaux d'audit et bons d'achat Supabase
    const CACHE_VERSION = '2.4';
    const currentVersion = localStorage.getItem('nexus_products_cache_version');
    if (currentVersion !== CACHE_VERSION) {
      localStorage.removeItem('last_sync_timestamp');
      localStorage.removeItem('last_sync_purchases');
      localStorage.removeItem('last_sync_supplierPayments');
      localStorage.removeItem('last_sync_expenses');
      localStorage.removeItem('last_sync_returns');
      localStorage.removeItem('last_sync_audit_logs');
      localStorage.removeItem('last_sync_advances');
      localStorage.removeItem('last_sync_attendance');
      idbSet('nexus_audit_logs_cache', []).catch(() => {});
      // Purger les anciens bons d'achat de test/init du cache local
      const legacyPurchaseIds = [
        'pur_zaimi_init', 'pur_montdor_init', 'pur_patifour_init',
        's25yta5cu', 'a23t6keqx', '2g45zkpa2', 'qs9qfhrj6', '9m9aji1jb', '6e94xbcjb'
      ];
      legacyPurchaseIds.forEach(id => {
        try { localDb.delete(`purchases/${id}`); } catch (_) {}
      });
      idbSet('nexus_purchases_cache', []).catch(() => {});
      idbSet('nexus_db_purchases', {}).catch(() => {});
      localStorage.setItem('nexus_products_cache_version', CACHE_VERSION);
    }

    const isPublicPriceMode = appMode === 'price_checker' || appMode === 'client_scan' || appMode === 'kiosk';
    if (!isPublicPriceMode && (!userId || userId === 'unauthenticated')) {
      setIsDataLoading(false);
      localDb.get('users').then(snap => {
        if (snap?.exists() && snap.val()) {
          const vals = Object.values(snap.val()).map((u: any) => {
            if (!u || typeof u !== 'object') return u;
            const { password, passwordHash, password_hash, pin, ...rest } = u;
            return rest;
          });
          if (vals.length > 0) setUsers(vals as any);
        }
      }).catch(() => {});
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

let productsSaveTimeout: any = null;
function debouncedSaveProductsCache(products: Product[], delay = 300) {
  if (productsSaveTimeout) clearTimeout(productsSaveTimeout);
  productsSaveTimeout = setTimeout(() => {
    idbSet('nexus_products_cache', products).catch(err => console.warn('[IDB Error]', err));
  }, delay);
}

let categoriesSaveTimeout: any = null;
function debouncedSaveCategoriesCache(categories: Category[], delay = 300) {
  if (categoriesSaveTimeout) clearTimeout(categoriesSaveTimeout);
  categoriesSaveTimeout = setTimeout(() => {
    idbSet('nexus_categories', categories).catch(err => console.warn('[IDB Error]', err));
  }, delay);
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
          const map = new Map<string, Transaction>();
          (Array.isArray(prev) ? prev : []).forEach(t => { if (t && t.id) map.set(t.id, t); });
          if (customEvent.detail && customEvent.detail.id) {
            map.set(customEvent.detail.id, customEvent.detail);
          }
          const unique = Array.from(map.values());
          setTimeout(() => {
            idbSet('nexus_transactions_cache', unique).catch(() => {});
          }, 0);
          return unique;
        });
      }
    };
    
    const handleOfflineReturnCreated = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail && isSubscribed) {
        setReturns(prev => {
          const map = new Map<string, any>();
          (Array.isArray(prev) ? prev : []).forEach(r => { if (r && r.id) map.set(r.id, r); });
          if (customEvent.detail && customEvent.detail.id) {
            map.set(customEvent.detail.id, customEvent.detail);
          }
          return Array.from(map.values());
        });
      }
    };
    
    window.addEventListener('offline-transaction-created', handleOfflineTxCreated);
    window.addEventListener('offline-return-created', handleOfflineReturnCreated);

    const syncProducts = async (forceFull = false) => {
      if (!isSubscribed || isFetching.current) return;
      isFetching.current = true;
      try {
        const cachedProducts = await idbGet<Product[]>('nexus_products_cache');
        const hasCache = cachedProducts && cachedProducts.length > 0;

        if (isSupabaseConfigured) {
          if (hasCache && !forceFull) {
            // 1. Delta Sync intelligent (uniquement les articles modifiés depuis la dernière synchronisation)
            const lastSyncTimestamp = localStorage.getItem('last_sync_timestamp');
            let fetchSince = lastSyncTimestamp;
            if (!fetchSince) {
              const yesterdayDate = new Date();
              yesterdayDate.setDate(yesterdayDate.getDate() - 1);
              fetchSince = yesterdayDate.toISOString();
            }

            const modifiedProducts = await fetchProductsFromSupabase(undefined, true, fetchSince);
            if (isSubscribed && modifiedProducts && modifiedProducts.length > 0) {
              const mergedMap = new Map<string, Product>();
              cachedProducts.forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });
              modifiedProducts.forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });

              // 🛡️ Protéger les produits locaux en attente de synchronisation
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

              // 🛡️ Protéger également les deltas de stock en attente (stock_adjustments)
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
              
              // 🛡️ Calcul de l'horodatage basé sur les données serveur avec marge de sécurité de 2 min (T10)
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
              console.log(`[DeltaSync] ${modifiedProducts.length} produit(s) mis à jour incrémentalement.`);
            } else if (isSubscribed) {
              const safeSyncTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();
              localStorage.setItem('last_sync_timestamp', safeSyncTimestamp);
            }
          } else {
            // Pas de cache ou synchronisation complète forcée
            const fullDocs = await fetchProductsFromSupabase();
            if (fullDocs && fullDocs.length > 0 && isSubscribed) {
              const mergedMap = new Map<string, Product>();
              fullDocs.forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });

              // 🛡️ Protéger les produits locaux en attente de synchronisation
              const pendingQueue = loadPendingSyncQueue();
              const pendingProductIds = new Set<string>();
              pendingQueue
                .filter(i => (i.table === 'products' || i.table === 'nexus_products') && i.payload)
                .forEach(i => {
                  const pId = i.recordId || i.payload?.id;
                  if (pId) {
                    pendingProductIds.add(pId);
                    if (i.action === 'UPSERT') {
                      const existing = mergedMap.get(pId) || ({} as Product);
                      mergedMap.set(pId, { ...existing, ...i.payload });
                    } else if (i.action === 'DELETE') {
                      mergedMap.delete(pId);
                    }
                  }
                });

              // 🛡️ Protéger également les deltas de stock en attente (stock_adjustments)
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

              const validFullDocs = Array.from(mergedMap.values()).filter(p => p && p.id && p.name && p.name !== 'Sans nom' && p.name !== 'Article Sans Nom');
              setProducts(validFullDocs);
              await idbSet('nexus_products_cache', validFullDocs).catch(err => console.warn('[IDB Error]', err));
              
              // 🛡️ Réconciliation des orphelins (T11) : aligner le cache local sur les 11 571 produits Supabase
              try {
                const serverIdSet = new Set(validFullDocs.map(p => p.id));
                const localSnap = await localDb.get('products');
                if (localSnap.exists()) {
                  const localObj = localSnap.val() || {};
                  for (const localId of Object.keys(localObj)) {
                    // Ne jamais supprimer un produit local qui est en attente de synchro vers Supabase !
                    // Et n'utiliser que deleteLocalOnly pour ne JAMAIS envoyer de DELETE à Supabase pour les orphelins locaux
                    if (!serverIdSet.has(localId) && !pendingProductIds.has(localId)) {
                      await localDb.deleteLocalOnly(`products/${localId}`);
                    }
                  }
                }
              } catch (purgeErr) {
                console.warn('[Sync] Erreur réconciliation orphelins locaux:', purgeErr);
              }

              localStorage.setItem('last_sync_timestamp', new Date().toISOString());
              localStorage.setItem('nexus_has_cached_products', 'true');
              console.log(`[FullSync] Synchronisation complète réussie : ${validFullDocs.length} produits mis en cache.`);
            }
          }
        }
      } catch (err) {
        console.warn('[useProductsAndCoreData] Erreur synchronisation produits:', err);
      } finally {
        isFetching.current = false;
      }
    };

    const handleForceFullSync = () => {
      syncProducts(true);
    };
    window.addEventListener('force-full-sync', handleForceFullSync);
    unsubscribes.push(() => window.removeEventListener('force-full-sync', handleForceFullSync));

    // ⚡ GESTION DE LA REPRISE AU PREMIER PLAN (T9) : Détection Android + Navigateur
    const handleForegroundResume = () => {
      if (!isSubscribed) return;
      console.log('[Lifecycle] ⚡ Reprise au premier plan -> reconnexion Realtime et delta-sync');
      realtimeCircuitBreaker.reset('foreground_resume');
      if (typeof supabase?.realtime?.connect === 'function') {
        try { supabase.realtime.connect(); } catch (_) {}
      }
      syncProducts(false);
    };

    window.addEventListener('app-foreground-resume', handleForegroundResume);
    unsubscribes.push(() => window.removeEventListener('app-foreground-resume', handleForegroundResume));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleForegroundResume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    unsubscribes.push(() => document.removeEventListener('visibilitychange', handleVisibilityChange));

    const handleOnlineEvent = () => {
      handleForegroundResume();
    };
    window.addEventListener('online', handleOnlineEvent);
    unsubscribes.push(() => window.removeEventListener('online', handleOnlineEvent));

    // Synchronisation delta périodique toutes les 5 minutes en ligne
    const periodicSyncInterval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncProducts(false);
      }
    }, 5 * 60 * 1000);
    unsubscribes.push(() => clearInterval(periodicSyncInterval));

    // Purge automatique de toute ancienne commande d'auto-réapprovisionnement
    const purgeAutoReapprovisionnement = async () => {
      try {
        const purchasesSnap = await localDb.get('purchases');
        if (purchasesSnap.exists()) {
          const pData = purchasesSnap.val() || {};
          for (const [key, p] of Object.entries<any>(pData)) {
            const sId = p?.supplierId || p?.supplier_id;
            const sName = (p?.supplierName || p?.supplier_name || '').toLowerCase();
            if (sId === 'low-stock-auto' || sName.includes('auto-réapprovisionnement') || sName.includes('auto-reapprovisionnement')) {
              await localDb.delete(`purchases/${key}`);
            }
          }
        }
        const cached = await idbGet<any[]>('nexus_purchases_cache');
        if (Array.isArray(cached)) {
          const filtered = cached.filter(p => {
            const sId = p?.supplierId || p?.supplier_id;
            const sName = (p?.supplierName || p?.supplier_name || '').toLowerCase();
            return sId !== 'low-stock-auto' && !sName.includes('auto-réapprovisionnement') && !sName.includes('auto-reapprovisionnement');
          });
          if (filtered.length !== cached.length) {
            await idbSet('nexus_purchases_cache', filtered);
          }
        }
      } catch (err) {
        console.warn('[Startup] Cleanup Auto-Réapprovisionnement warning:', err);
      }
    };
    purgeAutoReapprovisionnement();

    type QueueConfig = {
      cacheKey: string;
      collectionName: string;
      setState: (data: any) => void;
      limit?: number;
      startDate?: string;
      timestampColumn?: string;
      enableRealtime?: boolean;
    };

    // Tables vitales au fonctionnement de la caisse (chargées et synchronisées en priorité)
    const coreQueueConfig: QueueConfig[] = [
      { cacheKey: 'nexus_categories', collectionName: 'categories', setState: setCategories },
      { cacheKey: 'nexus_brands', collectionName: 'brands', setState: setBrands },
      { cacheKey: 'nexus_promotions', collectionName: 'promotions', setState: setPromotions },
    ];

    if (!isPublicPriceMode) {
      coreQueueConfig.push(
        { cacheKey: 'nexus_customers', collectionName: 'customers', setState: setCustomers, timestampColumn: 'updated_at' },
        { cacheKey: 'nexus_suppliers', collectionName: 'suppliers', setState: setSuppliers, timestampColumn: 'updated_at' },
        { cacheKey: 'nexus_users', collectionName: 'users', setState: setUsers }
      );
    }

    // Tables administratives secondaires (synchronisation différée en arrière-plan pour ne pas saturer la caisse)
    const deferredQueueConfig: QueueConfig[] = [];

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    if (appMode !== 'customer' && !isPublicPriceMode) {
      coreQueueConfig.push(
        { cacheKey: 'nexus_transactions_cache', collectionName: 'transactions', setState: setTransactions as any, limit: 500, startDate: ninetyDaysAgo, timestampColumn: 'timestamp' },
        { cacheKey: 'nexus_returns_cache', collectionName: 'returns', setState: setReturns, limit: 500, timestampColumn: 'date' },
        { 
          cacheKey: 'nexus_online_orders_cache', 
          collectionName: 'onlineOrders', 
          setState: (ordersOrUpdater: any) => { 
            useTransactionStore.getState().setOnlineOrders((prev: any[]) => {
              const raw = typeof ordersOrUpdater === 'function' ? ordersOrUpdater(prev || []) : ordersOrUpdater;
              const arr = Array.isArray(raw) ? raw : [];
              const deletedIds = getDeletedRecordIds('online_orders');
              const filtered = arr.filter(o => o && o.id && !deletedIds.has(String(o.id)));
              replaceTableState('online_orders', filtered);
              return filtered;
            });
          }, 
          limit: 500, 
          timestampColumn: 'timestamp' 
        }
      );

      const filterCleanPurchases = (arr: any[]) => {
        const deletedIds = getDeletedRecordIds('purchases');
        return (Array.isArray(arr) ? arr : []).filter(p => {
          if (!p || !p.id || deletedIds.has(String(p.id))) return false;
          const sId = p?.supplierId || p?.supplier_id;
          const sName = (p?.supplierName || p?.supplier_name || '').toLowerCase();
          return sId !== 'low-stock-auto' && !sName.includes('auto-réapprovisionnement') && !sName.includes('auto-reapprovisionnement');
        });
      };

      deferredQueueConfig.push(
        { cacheKey: 'nexus_expenses_cache', collectionName: 'expenses', setState: setExpenses, limit: 500, timestampColumn: 'date' },
        { cacheKey: 'nexus_stock_adjustments_cache', collectionName: 'stockAdjustments', setState: setStockAdjustments, limit: 500 },
        { 
          cacheKey: 'nexus_purchases_cache', 
          collectionName: 'purchases', 
          setState: (purchasesOrUpdater: any) => {
            if (typeof purchasesOrUpdater === 'function') {
              setPurchases((prev: any[]) => filterCleanPurchases(purchasesOrUpdater(prev || [])));
            } else {
              setPurchases(filterCleanPurchases(purchasesOrUpdater));
            }
          }, 
          limit: 500, 
          timestampColumn: 'date' 
        },
        { cacheKey: 'nexus_supplier_payments_cache', collectionName: 'supplierPayments', setState: setSupplierPayments, limit: 500, timestampColumn: 'date' },
        { cacheKey: 'nexus_damaged_items_cache', collectionName: 'damaged_items', setState: setDamagedItems, limit: 500 },
        { cacheKey: 'nexus_audit_logs_cache', collectionName: 'audit_logs', setState: setAuditLogs, limit: 500, timestampColumn: 'timestamp', enableRealtime: true },
        { cacheKey: 'nexus_goods_receipt_notes_cache', collectionName: 'goodsReceiptNotes', setState: (notesOrUpdater: any) => { const notes = typeof notesOrUpdater === 'function' ? notesOrUpdater([]) : notesOrUpdater; if (Array.isArray(notes) && notes.length > 0) { replaceTableState('goods_receipt_notes', notes); } }, limit: 500 }
      );
      if (setAdvances) {
        deferredQueueConfig.push({
          cacheKey: 'nexus_advances_cache',
          collectionName: 'advances',
          setState: setAdvances,
          limit: 500,
          timestampColumn: 'date'
        });
      }
      if (setAttendance) {
        deferredQueueConfig.push({
          cacheKey: 'nexus_attendance_cache',
          collectionName: 'attendance',
          setState: setAttendance,
          limit: 500,
          timestampColumn: 'date'
        });
      }
      if (setAudits) {
        deferredQueueConfig.push({
          cacheKey: 'nexus_audits_cache',
          collectionName: 'audits',
          setState: setAudits,
          limit: 500,
          timestampColumn: 'date'
        });
      }
    }

    const queueConfig: QueueConfig[] = [...coreQueueConfig, ...deferredQueueConfig];

    if (isSupabaseConfigured) {
      // 1. CANAL TEMPS RÉEL UNIQUE & MULTIPLEXÉ POUR TOUTES LES TABLES
      let productUpdateQueue: Product[] = [];
      let productDeleteQueue: string[] = [];
      let productUpdateTimeout: any = null;

      const processBatchedProductUpdates = () => {
        if (productUpdateQueue.length === 0 && productDeleteQueue.length === 0) return;
        const deletedIds = getDeletedRecordIds('products');
        const pendingQueue = loadPendingSyncQueue();
        const pendingProdDeletes = new Set<string>();
        const pendingProdUpserts = new Map<string, any>();
        const pendingStockAdjustIds = new Set<string>();

        pendingQueue.forEach(q => {
          const tName = TABLE_NAME_MAPPINGS[q.table] || q.table;
          const recId = String(q.recordId || q.payload?.id || '');
          if (!recId) return;
          if (tName === 'products') {
            if (q.action === 'DELETE') pendingProdDeletes.add(recId);
            else if (q.action === 'UPSERT' && q.payload) {
              pendingProdUpserts.set(recId, { ...(pendingProdUpserts.get(recId) || {}), ...q.payload });
            }
          } else if ((q.action as string) === 'STOCK_ADJUST' || tName === 'stock_adjustments') {
            const pId = String(q.payload?.productId || recId);
            if (pId) pendingStockAdjustIds.add(pId);
          }
        });

        setProducts(prev => {
          const map = new Map<string, Product>();
          prev.forEach(p => map.set(p.id, p));
          let hasActualChange = false;

          productUpdateQueue.forEach(p => {
            if (!p || !p.id) return;
            const pid = String(p.id);
            // 🛡️ Ignorer les produits supprimés localement ou en instance de suppression
            if (deletedIds.has(pid) || pendingProdDeletes.has(pid)) {
              if (map.has(pid)) {
                map.delete(pid);
                hasActualChange = true;
              }
              return;
            }

            const existing = map.get(pid);

            // 🛡️ Garde d'ordre temporel (T12) : Ne jamais écraser par un événement plus ancien
            if (existing && existing.updatedAt && p.updatedAt) {
              const existingTime = new Date(existing.updatedAt).getTime();
              const incomingTime = new Date(p.updatedAt).getTime();
              if (incomingTime < existingTime) {
                return;
              }
            }

            const pendingUpsert = pendingProdUpserts.get(pid);
            const hasPendingStock = pendingStockAdjustIds.has(pid) || (pendingUpsert && pendingUpsert.stock !== undefined);

            // Protéger le stock contre les payloads partiels, indéfinis ou en cours d'ajustement local
            const safeStock = (hasPendingStock && existing)
              ? Number(existing.stock ?? 0)
              : ((p.stock !== undefined && p.stock !== null && !isNaN(Number(p.stock)))
                  ? Number(p.stock)
                  : (existing?.stock ?? 0));

            const mergedProd = {
              ...existing,
              ...p,
              ...(pendingUpsert || {}),
              stock: safeStock
            } as Product;

            if (!existing || existing.updatedAt !== mergedProd.updatedAt || existing.name !== mergedProd.name || existing.price !== mergedProd.price || existing.stock !== safeStock) {
              map.set(pid, mergedProd);
              hasActualChange = true;
            }
          });

          productDeleteQueue.forEach(id => {
            if (map.has(id)) {
              map.delete(id);
              hasActualChange = true;
            }
          });

          if (!hasActualChange) return prev;

          const newProds = Array.from(map.values());
          debouncedSaveProductsCache(newProds);
          return newProds;
        });
        productUpdateQueue = [];
        productDeleteQueue = [];
      };

      removeChannelByName('nexus-pos-realtime');
      removeChannelByName('public:products');
      let multiplexedChannel = supabase.channel('nexus-pos-realtime');

      // Écouteur Produits
      multiplexedChannel = multiplexedChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload: any) => {
          if (!isSubscribed) return;
          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              productDeleteQueue.push(deletedId);
              if (productUpdateTimeout) clearTimeout(productUpdateTimeout);
              productUpdateTimeout = setTimeout(processBatchedProductUpdates, 100);
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
              if (productUpdateTimeout) clearTimeout(productUpdateTimeout);
              productUpdateTimeout = setTimeout(processBatchedProductUpdates, 100);
            }
          }
        }
      );

      // Écouteurs chaînés sur le même canal pour toutes les autres tables actives
      const tableCleanups: (() => void)[] = [];
      queueConfig.forEach(config => {
        if (config.enableRealtime === false) return;
        const mappedTable = config.collectionName === 'shifts' ? 'cash_shifts' : 
                            config.collectionName === 'onlineOrders' ? 'online_orders' :
                            config.collectionName === 'purchaseOrders' ? 'purchase_orders' :
                            config.collectionName === 'stockAdjustments' ? 'stock_adjustments' :
                            config.collectionName === 'supplierPayments' || config.collectionName === 'supplier_payments' ? 'supplier_payments' :
                            config.collectionName === 'damagedItems' || config.collectionName === 'damaged_items' ? 'damaged_items' :
                            config.collectionName === 'goodsReceiptNotes' || config.collectionName === 'goods_receipt_notes' ? 'goods_receipt_notes' :
                            config.collectionName === 'auditLogs' || config.collectionName === 'audit_logs' ? 'audit_logs' : config.collectionName;

        let tableUpdateQueue: any[] = [];
        let tableDeleteQueue: string[] = [];
        let tableTimeout: any = null;

        const processTableBatch = () => {
          if (tableUpdateQueue.length === 0 && tableDeleteQueue.length === 0) return;
          const deletedIds = getDeletedRecordIds(mappedTable);
          const pendingQueue = loadPendingSyncQueue();
          const pendingDeletes = new Set<string>();
          const pendingUpserts = new Map<string, any>();
          const pendingCustomerBalanceIds = new Set<string>();

          pendingQueue.forEach(q => {
            const matchesTable = q.table === config.collectionName || q.table === mappedTable || TABLE_NAME_MAPPINGS[q.table] === mappedTable;
            const recId = String(q.recordId || q.payload?.id || '');
            if (matchesTable && recId) {
              if (q.action === 'DELETE') pendingDeletes.add(recId);
              else if (q.action === 'UPSERT' && q.payload) {
                pendingUpserts.set(recId, { ...(pendingUpserts.get(recId) || {}), ...q.payload });
              }
            }
            if (config.collectionName === 'customers') {
              const hasDelta = q.payload && (
                q.payload.deltaBalance !== undefined ||
                q.payload.delta_balance !== undefined ||
                q.payload.deltaSpent !== undefined ||
                q.payload.delta_spent !== undefined ||
                q.payload.deltaPoints !== undefined ||
                q.payload.delta_points !== undefined
              );
              if (hasDelta || (q.action as string) === 'ADJUST_CUSTOMER_BALANCE') {
                const cid = String(q.payload?.customerId || q.payload?.id || recId);
                if (cid) pendingCustomerBalanceIds.add(cid);
              }
            }
          });

          config.setState((prev: any[]) => {
            const map = new Map<string, any>();
            (prev || []).forEach(item => {
              if (item && item.id && !deletedIds.has(String(item.id)) && !pendingDeletes.has(String(item.id))) {
                map.set(item.id, item);
              }
            });
            tableUpdateQueue.forEach(item => {
              if (!item || !item.id) return;
              const itemId = String(item.id);
              if (deletedIds.has(itemId) || pendingDeletes.has(itemId)) {
                map.delete(itemId);
                return;
              }
              const existing = map.get(itemId);
              if (existing && existing.updatedAt && item.updatedAt) {
                const existingTime = new Date(existing.updatedAt).getTime();
                const incomingTime = new Date(item.updatedAt).getTime();
                if (incomingTime < existingTime) return;
              }
              const pendingPatch = pendingUpserts.get(itemId);
              let merged = { ...(existing || {}), ...item, ...(pendingPatch || {}) };
              if (config.collectionName === 'customers' && pendingCustomerBalanceIds.has(itemId) && existing) {
                merged.balance = existing.balance;
                merged.totalSpent = existing.totalSpent;
                merged.loyaltyPoints = existing.loyaltyPoints;
              }
              map.set(itemId, merged);
            });
            tableDeleteQueue.forEach(id => map.delete(id));
            
            let updated = Array.from(map.values());
            if (config.timestampColumn) {
              updated.sort((a, b) => new Date(b[config.timestampColumn!]).getTime() - new Date(a[config.timestampColumn!]).getTime());
            }
            if (config.limit && updated.length > config.limit) {
              updated = updated.slice(0, config.limit);
            }
            setTimeout(() => {
              idbSet(config.cacheKey, updated).catch(err => console.warn('[IDB Error]', err));
            }, 0);
            return updated;
          });
          tableUpdateQueue = [];
          tableDeleteQueue = [];
        };

        tableCleanups.push(() => {
          if (tableTimeout) clearTimeout(tableTimeout);
        });

        multiplexedChannel = multiplexedChannel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: mappedTable },
          (payload: any) => {
            if (!isSubscribed) return;
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id;
              if (deletedId) {
                tableDeleteQueue.push(deletedId);
                if (tableTimeout) clearTimeout(tableTimeout);
                tableTimeout = setTimeout(processTableBatch, 100);
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
                tableUpdateQueue.push(camelItem);

                // 🔔 Alerte sonore et visuelle immédiate pour les commandes en ligne entrantes
                if (mappedTable === 'online_orders' && payload.eventType === 'INSERT') {
                  try {
                    playOrderChime();
                    toast.info(`Nouvelle commande en ligne reçue (#${String(camelItem.id || '').slice(-6)}) !`, {
                      icon: '🛍️',
                      duration: 8000
                    });
                    window.dispatchEvent(new CustomEvent('nexus-new-online-order', { detail: camelItem }));
                  } catch (audioErr) {
                    console.warn('[AudioChime] Error triggering chime:', audioErr);
                  }
                }

                if (tableTimeout) clearTimeout(tableTimeout);
                tableTimeout = setTimeout(processTableBatch, 100);
              }
            }
          }
        );
      });

      // 3. Présence et Broadcast inter-caisses
      multiplexedChannel = multiplexedChannel
        .on('presence', { event: 'sync' }, () => {
          try {
            const newState = multiplexedChannel.presenceState();
            const terminals = Object.values(newState).flat();
            window.dispatchEvent(new CustomEvent('nexus-terminals-presence', { detail: terminals }));
          } catch (e) {}
        })
        .on('broadcast', { event: 'cashier-alert' }, (eventPayload: any) => {
          if (eventPayload?.payload) {
            window.dispatchEvent(new CustomEvent('cashier-alert-received', { detail: eventPayload.payload }));
          }
        });

      const handleSendBroadcast = (e: Event) => {
        const custom = e as CustomEvent<any>;
        if (custom.detail) {
          multiplexedChannel.send({
            type: 'broadcast',
            event: 'cashier-alert',
            payload: custom.detail
          }).catch((err: any) => console.warn('[Realtime Broadcast Error]', err));
        }
      };
      window.addEventListener('send-cashier-alert', handleSendBroadcast);
      unsubscribes.push(() => window.removeEventListener('send-cashier-alert', handleSendBroadcast));

      let wasDisconnected = false;

      const connectRealtime = () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        if (realtimeCircuitBreaker.isOpen()) return;

        safeSubscribeChannel(multiplexedChannel, async (status: string, err?: Error) => {
          if (status === 'SUBSCRIBED') {
            realtimeCircuitBreaker.recordSuccess();
            console.log('[Realtime] ✅ Canal unique multiplexé nexus-pos-realtime connecté avec succès.');
            window.dispatchEvent(new CustomEvent('nexus-realtime-status', { detail: { status: 'connected' } }));
            
            try {
              await multiplexedChannel.track({
                userId: userId || 'pos-terminal',
                onlineAt: new Date().toISOString()
              });
            } catch (e) {}

            // Rattrapage d'événements (Event Backfill) après coupure réseau
            if (wasDisconnected) {
              console.log('[Realtime] 🔄 Reconnexion détectée : rattrapage automatique des données...');
              wasDisconnected = false;
              syncProducts(false);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            wasDisconnected = true;
            realtimeCircuitBreaker.recordFailure('nexus-pos-realtime', err);
            if (!realtimeCircuitBreaker.isOpen()) {
              window.dispatchEvent(new CustomEvent('nexus-realtime-status', { detail: { status: 'reconnecting' } }));
              if (typeof navigator === 'undefined' || navigator.onLine) {
                console.warn(`[Realtime] Canal nexus-pos-realtime état: ${status}`, err?.message || '');
              }
            }
          }
        });
      };

      if (typeof navigator === 'undefined' || navigator.onLine) {
        if (!realtimeCircuitBreaker.isOpen()) {
          connectRealtime();
        }
      }

      const handleRetryRealtime = () => {
        connectRealtime();
      };
      window.addEventListener('nexus-realtime-retry', handleRetryRealtime);
      unsubscribes.push(() => window.removeEventListener('nexus-realtime-retry', handleRetryRealtime));

      unsubscribes.push(() => {
        if (productUpdateTimeout) clearTimeout(productUpdateTimeout);
        tableCleanups.forEach(c => c());
        safeRemoveChannel(multiplexedChannel);
      });
    } else {
      const unsub = localDb.subscribe('products', (snapshot) => {
        if (isSubscribed) {
          if (snapshot.exists()) {
            const productsData = snapshot.val();
            if (productsData && typeof productsData === 'object') {
              const updatedDocs = Object.keys(productsData).map(id => ({ id, ...productsData[id] } as Product));
              setProducts(prev => {
                const map = new Map<string, Product>();
                (prev || []).forEach(p => { if (p && p.id) map.set(p.id, p); });
                updatedDocs.forEach(p => { if (p && p.id) map.set(p.id, p); });
                const merged = Array.from(map.values());
                setTimeout(() => {
                  idbSet('nexus_products_cache', merged).catch(err => console.warn('[IDB Error]', err));
                }, 0);
                return merged;
              });
            }
          }
          setIsDataLoading(false);
        }
      });
      unsubscribes.push(unsub);
    }

    const runQueue = async () => {
      try {
        // 1. Charger en parallèle: produits IDB + toutes les autres tables IDB + base locale des transactions/achats + archives
        const [cachedProducts, localDbTxsRaw, localDbPurchasesRaw, archivedTxsRaw, ...otherCaches] = await Promise.all([
          idbGet<Product[]>('nexus_products_cache').catch(() => null),
          idbGet<Record<string, any>>('nexus_db_transactions').catch(() => ({})),
          idbGet<Record<string, any>>('nexus_db_purchases').catch(() => ({})),
          getArchivedTransactionsFromStorage().catch(() => []),
          ...queueConfig.map(config =>
            idbGet<any[]>(config.cacheKey).catch(() => [])
          )
        ]);

        const localDbTxList = localDbTxsRaw ? Object.values(localDbTxsRaw) : [];
        const localDbPurchaseList = localDbPurchasesRaw ? Object.values(localDbPurchasesRaw) : [];
        const archivedTxList = Array.isArray(archivedTxsRaw) ? archivedTxsRaw : [];

        // Appliquer le cache des produits
        if (cachedProducts && cachedProducts.length > 0 && isSubscribed) {
          setProducts(cachedProducts);
          localStorage.setItem('nexus_has_cached_products', 'true');
        }

        // Appliquer le cache des autres tables avec fusion des ventes et bons d'achat locaux
        queueConfig.forEach((config, i) => {
          const deletedIds = getDeletedRecordIds(config.collectionName);
          let cached = (otherCaches[i] || []).filter((item: any) => item && item.id && !deletedIds.has(String(item.id)));
          if (config.collectionName === 'transactions') {
            const mergedMap = new Map<string, any>();
            archivedTxList.forEach((t: any) => t && t.id && !deletedIds.has(String(t.id)) && mergedMap.set(t.id, t));
            localDbTxList.forEach((t: any) => t && t.id && !deletedIds.has(String(t.id)) && mergedMap.set(t.id, t));
            cached.forEach((t: any) => t && t.id && !deletedIds.has(String(t.id)) && mergedMap.set(t.id, t));
            cached = Array.from(mergedMap.values()).sort((a: any, b: any) => 
              new Date(b.timestamp || b.created_at || b.date || 0).getTime() - new Date(a.timestamp || a.created_at || a.date || 0).getTime()
            );
          } else if (config.collectionName === 'purchases') {
            const mergedMap = new Map<string, any>();
            cached.forEach((p: any) => p && p.id && !deletedIds.has(String(p.id)) && mergedMap.set(p.id, p));
            localDbPurchaseList.forEach((p: any) => p && p.id && !deletedIds.has(String(p.id)) && mergedMap.set(p.id, p));
            cached = Array.from(mergedMap.values()).sort((a: any, b: any) => 
              new Date(b.date || b.updated_at || 0).getTime() - new Date(a.date || a.updated_at || 0).getTime()
            );
          }
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

      // 4. Synchronisation réseau prioritaire des tables vitales à la caisse
      const CONCURRENCY = 4;
      for (let i = 0; i < coreQueueConfig.length; i += CONCURRENCY) {
        if (!isSubscribed) break;
        const chunk = coreQueueConfig.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(config => syncTableFromNetwork(config)));
      }

      // 5. Synchronisation des tables administratives
      if (deferredQueueConfig.length > 0) {
        for (let i = 0; i < deferredQueueConfig.length; i += CONCURRENCY) {
          if (!isSubscribed) break;
          const chunk = deferredQueueConfig.slice(i, i + CONCURRENCY);
          await Promise.all(chunk.map(config => syncTableFromNetwork(config)));
        }
      }
    };

    const syncTableFromNetwork = async <T,>(config: QueueConfig) => {
      const { cacheKey, collectionName, setState, limit, startDate, timestampColumn } = config;
      try {
        const deletedIds = getDeletedRecordIds(collectionName);
        const rawCached = await idbGet<T[]>(cacheKey) || [];
        const cached = rawCached.filter((r: any) => r && r.id && !deletedIds.has(String(r.id)));
        if (isSupabaseConfigured) {
          // Ne jamais filtrer par deltaSyncTime quand timestampColumn === 'date' (car 'date' est souvent à 00:00:00Z, ce qui masquerait les bons du jour)
          const useDelta = Boolean(timestampColumn && timestampColumn !== 'date');
          const lastSyncTime = (useDelta && cached.length > 0) ? localStorage.getItem(`last_sync_${collectionName}`) : null;
          const camelData = await fetchTableFromSupabase<T>(collectionName, limit, startDate, lastSyncTime || undefined, timestampColumn);
          
          if (camelData && isSubscribed) {
            const mergedMap = new Map<string, any>();
            // Si c'est les transactions, préserver d'abord toutes les transactions locales et archivées non supprimées
            if (collectionName === 'transactions') {
              const localDbTxs = await idbGet<Record<string, any>>('nexus_db_transactions').catch(() => ({}));
              const archivedTxs = await getArchivedTransactionsFromStorage().catch(() => []);
              if (Array.isArray(archivedTxs)) {
                archivedTxs.forEach((t: any) => t && t.id && !deletedIds.has(String(t.id)) && mergedMap.set(t.id, t));
              }
              if (localDbTxs) {
                Object.values(localDbTxs).forEach((t: any) => t && t.id && !deletedIds.has(String(t.id)) && mergedMap.set(t.id, t));
              }
            } else if (collectionName === 'purchases') {
              const localDbPurchases = await idbGet<Record<string, any>>('nexus_db_purchases').catch(() => ({}));
              if (localDbPurchases) {
                Object.values(localDbPurchases).forEach((p: any) => p && p.id && !deletedIds.has(String(p.id)) && mergedMap.set(p.id, p));
              }
            } else if (collectionName === 'advances') {
              const localDbAdvances = await idbGet<Record<string, any>>('nexus_db_advances').catch(() => ({}));
              if (localDbAdvances) {
                Object.values(localDbAdvances).forEach((a: any) => a && a.id && !deletedIds.has(String(a.id)) && mergedMap.set(a.id, a));
              }
            }

            // Si c'est une synchronisation incrémentale (lastSyncTime présent), on garde le cache existant non supprimé.
            // Si c'est un chargement complet (lastSyncTime === null, ex: purchases, expenses, supplierPayments),
            // on ne réinjecte PAS les anciennes lignes de `cached` qui ont été supprimées sur Supabase !
            if (lastSyncTime) {
              cached.forEach((r: any) => r && r.id && !deletedIds.has(String(r.id)) && mergedMap.set(r.id, r));
            }
            camelData.forEach((newRow: any) => newRow && newRow.id && !deletedIds.has(String(newRow.id)) && mergedMap.set(newRow.id, newRow));

            // 🛡️ Protéger les modifications locales en attente dans SyncService (Offline-First)
            const pendingQueue = loadPendingSyncQueue();
            const pendingRecords = pendingQueue.filter(item => 
              (item.table === collectionName || TABLE_NAME_MAPPINGS[item.table] === collectionName) && item.payload
            );
            pendingRecords.forEach(item => {
              const recId = item.recordId || item.payload?.id;
              if (recId && !deletedIds.has(String(recId))) {
                if (item.action === 'UPSERT') {
                  const existing = mergedMap.get(recId) || {};
                  const merged = { ...existing, ...item.payload };
                  if (collectionName === 'customers') {
                    const localCust = ((Array.isArray(cached) ? cached : []) as any[]).find((c: any) => c && c.id === recId);
                    if (localCust && (item.payload?.deltaBalance !== undefined || item.payload?.delta_balance !== undefined)) {
                      merged.balance = (localCust as any).balance;
                      merged.totalSpent = (localCust as any).totalSpent;
                      merged.loyaltyPoints = (localCust as any).loyaltyPoints;
                    }
                  }
                  mergedMap.set(recId, merged);
                } else if (item.action === 'DELETE') {
                  mergedMap.delete(recId);
                }
              }
            });

            let updatedCache = Array.from(mergedMap.values());
            if (timestampColumn) {
              updatedCache.sort((a: any, b: any) => 
                new Date(b[timestampColumn] || b.timestamp || b.created_at || 0).getTime() - 
                new Date(a[timestampColumn] || a.timestamp || a.created_at || 0).getTime()
              );
            }

            setState(updatedCache);
            idbSet(cacheKey, updatedCache).catch(err => console.warn('[IDB Error]', err));
            localStorage.setItem(`last_sync_${collectionName}`, new Date().toISOString());
          }
          // (Les événements temps réel sont gérés par le canal unique multiplexé 'nexus-pos-realtime')
          // Souscription locale complémentaire pour répercuter immédiatement les mutations locales / hors-ligne
          const unsubLocal = localDb.subscribe(collectionName, (snapshot) => {
            if (!isSubscribed) return;
            if (snapshot.exists()) {
              const data = snapshot.val();
              if (data && typeof data === 'object') {
                const deletedSet = getDeletedRecordIds(collectionName);
                setState((prev: any[]) => {
                  const map = new Map<string, any>();
                  (Array.isArray(prev) ? prev : []).forEach(r => {
                    if (r && r.id && !deletedSet.has(String(r.id))) map.set(r.id, r);
                  });
                  Object.keys(data).forEach(id => {
                    if (!deletedSet.has(String(id)) && data[id]) {
                      map.set(id, { ...(map.get(id) || {}), id, ...data[id] });
                    }
                  });
                  let next = Array.from(map.values());
                  if (timestampColumn) {
                    next.sort((a: any, b: any) =>
                      new Date(b[timestampColumn] || b.timestamp || b.created_at || 0).getTime() -
                      new Date(a[timestampColumn] || a.timestamp || a.created_at || 0).getTime()
                    );
                  }
                  idbSet(cacheKey, next).catch(() => {});
                  return next;
                });
              }
            }
          });
          unsubscribes.push(unsubLocal);
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
