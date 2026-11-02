import { useEffect, useRef } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { localDb, getDeletedRecordIds } from '../../services/LocalDatabase';
import { supabase, realtimeCircuitBreaker } from '../../supabase';
import { 
  Product, Category, Brand, Transaction, Promotion, Customer, Supplier, UserProfile,
  ProductReturn, Expense, StockAdjustment, Purchase, SupplierPayment, DamagedRecord, AuditLog,
  AdvanceRecord, AttendanceRecord, InventoryAudit
} from '../../types';
import { replaceTableState, getArchivedTransactionsFromStorage } from '../../lib/local-db';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useProductsFetcher } from './sub-fetchers/useProductsFetcher';
import { useFinanceDataFetcher } from './sub-fetchers/useFinanceDataFetcher';
import { usePeopleDataFetcher } from './sub-fetchers/usePeopleDataFetcher';
import { setupRealtimeMultiplexedChannel, syncTableFromNetwork, QueueConfig } from './sub-fetchers/useRealtimeSyncCoordinator';

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
  const isSubscribedRef = useRef(true);

  // 1. Initialisation des sous-fetchers
  const { syncProducts } = useProductsFetcher({
    setProducts,
    setCategories,
    setIsDataLoading,
    isSubscribedRef
  });

  useFinanceDataFetcher({
    setTransactions,
    setReturns,
    isSubscribedRef
  });

  const { loadLocalUsersFallback } = usePeopleDataFetcher({ setUsers });

  useEffect(() => {
    if (loading) return;
    isSubscribedRef.current = true;

    // Migration du cache v2.4
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

    const isPublicPriceMode = appMode === 'price_checker' || appMode === 'client_scan' || appMode === 'kiosk' || appMode === 'carton_reception';
    if (!isPublicPriceMode && (!userId || userId === 'unauthenticated')) {
      setIsDataLoading(false);
      loadLocalUsersFallback();
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const hasCache = localStorage.getItem('nexus_has_cached_products') === 'true';
    if (!hasCache) {
      setIsDataLoading(true);
    }

    // Handlers de cycle de vie et synchronisation forcée
    const handleForceFullSync = () => {
      if (!isSubscribedRef.current) return;
      syncProducts(true);
    };
    window.addEventListener('force-full-sync', handleForceFullSync);
    unsubscribes.push(() => window.removeEventListener('force-full-sync', handleForceFullSync));

    const handleForegroundResume = () => {
      if (!isSubscribedRef.current) return;
      realtimeCircuitBreaker.reset('foreground_resume');
      if (typeof supabase?.realtime?.connect === 'function') {
        try { supabase.realtime.connect(); } catch (_) {}
      }
      syncProducts(false);
    };

    window.addEventListener('app-foreground-resume', handleForegroundResume);
    unsubscribes.push(() => window.removeEventListener('app-foreground-resume', handleForegroundResume));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleForegroundResume();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    unsubscribes.push(() => document.removeEventListener('visibilitychange', handleVisibilityChange));

    const handleOnlineEvent = () => handleForegroundResume();
    window.addEventListener('online', handleOnlineEvent);
    unsubscribes.push(() => window.removeEventListener('online', handleOnlineEvent));

    const periodicSyncInterval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncProducts(false);
      }
    }, 5 * 60 * 1000);
    unsubscribes.push(() => clearInterval(periodicSyncInterval));

    // Construction de la file des tables à charger
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

      if (setAdvances) deferredQueueConfig.push({ cacheKey: 'nexus_advances_cache', collectionName: 'advances', setState: setAdvances, limit: 500, timestampColumn: 'date' });
      if (setAttendance) deferredQueueConfig.push({ cacheKey: 'nexus_attendance_cache', collectionName: 'attendance', setState: setAttendance, limit: 500, timestampColumn: 'date' });
      if (setAudits) deferredQueueConfig.push({ cacheKey: 'nexus_audits_cache', collectionName: 'audits', setState: setAudits, limit: 500, timestampColumn: 'date' });
    }

    const queueConfig: QueueConfig[] = [...coreQueueConfig, ...deferredQueueConfig];

    // Brancher le canal multiplexé Supabase Realtime
    setupRealtimeMultiplexedChannel({
      userId,
      queueConfig,
      setProducts,
      isSubscribedRef,
      syncProducts,
      unsubscribes
    });

    // Chargement parallèle IDB et réseau
    const runQueue = async () => {
      try {
        const [cachedProducts, localDbTxsRaw, localDbPurchasesRaw, archivedTxsRaw, ...otherCaches] = await Promise.all([
          idbGet<Product[]>('nexus_products_cache').catch(() => null),
          idbGet<Record<string, any>>('nexus_db_transactions').catch(() => ({})),
          idbGet<Record<string, any>>('nexus_db_purchases').catch(() => ({})),
          getArchivedTransactionsFromStorage().catch(() => []),
          ...queueConfig.map(config => idbGet<any[]>(config.cacheKey).catch(() => []))
        ]);

        const localDbTxList = localDbTxsRaw ? Object.values(localDbTxsRaw) : [];
        const localDbPurchaseList = localDbPurchasesRaw ? Object.values(localDbPurchasesRaw) : [];
        const archivedTxList = Array.isArray(archivedTxsRaw) ? archivedTxsRaw : [];

        if (cachedProducts && cachedProducts.length > 0 && isSubscribedRef.current) {
          setProducts(cachedProducts);
          localStorage.setItem('nexus_has_cached_products', 'true');
        }

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
          if (cached && cached.length > 0 && isSubscribedRef.current) {
            config.setState(cached);
          }
        });
      } finally {
        if (isSubscribedRef.current) setIsDataLoading(false);
      }

      await syncProducts();

      const CONCURRENCY = 4;
      for (let i = 0; i < coreQueueConfig.length; i += CONCURRENCY) {
        if (!isSubscribedRef.current) break;
        const chunk = coreQueueConfig.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(config => syncTableFromNetwork(config, isSubscribedRef, unsubscribes)));
      }

      if (deferredQueueConfig.length > 0) {
        for (let i = 0; i < deferredQueueConfig.length; i += CONCURRENCY) {
          if (!isSubscribedRef.current) break;
          const chunk = deferredQueueConfig.slice(i, i + CONCURRENCY);
          await Promise.all(chunk.map(config => syncTableFromNetwork(config, isSubscribedRef, unsubscribes)));
        }
      }
    };

    runQueue();

    return () => {
      isSubscribedRef.current = false;
      unsubscribes.forEach(unsub => {
        try { unsub(); } catch (_) {}
      });
    };
  }, [loading, appMode, userId]);
}
