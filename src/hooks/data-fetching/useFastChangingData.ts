import { useEffect } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { localDb } from '../../database';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { convertKeysToCamel } from '../../lib/db-converters';
import { CashShift, OnlineOrder, CompanySettings } from '../../types';
import { setLocalState, saveStateToStorage, replaceTableState, dbState } from '../../lib/local-db';
import { getDeletedRecordIds } from '../../services/LocalDatabase';
import { getTerminalId } from '../../services/terminalService';
import { withNetworkTimeout } from '../../services/networkErrorHandler';
import { getSyncQueue } from '../../services/SyncService';
import { setupFastChangingRealtimeSubscription } from './fastChangingRealtime';

interface useFastChangingDataParams {
  loading: boolean;
  userId: string | undefined;
  setOnlineOrders: React.Dispatch<React.SetStateAction<OnlineOrder[]>>;
  setShifts: React.Dispatch<React.SetStateAction<CashShift[]>>;
  setActiveShift: React.Dispatch<React.SetStateAction<CashShift | null>>;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function findActiveShiftForTerminal(shifts: CashShift[]): CashShift | null {
  if (!shifts || shifts.length === 0) return null;
  const currentTerminalId = getTerminalId();
  // 1. Chercher d'abord le shift ouvert spécifiquement pour ce terminal
  const terminalShift = shifts.find(s => s.status === 'open' && s.terminalId === currentTerminalId);
  if (terminalShift) return terminalShift;
  // 2. Rétrocompatibilité : shift ouvert sans terminalId assigné
  return shifts.find(s => s.status === 'open' && !s.terminalId) || null;
}

export function useFastChangingData({
  loading,
  userId,
  setOnlineOrders,
  setShifts,
  setActiveShift,
  setSettings
}: useFastChangingDataParams) {
  useEffect(() => {
    if (loading || !userId || userId === 'unauthenticated') return;
    
    let isSubscribed = true;
    const isSubscribedRef = { current: true };
    const listeners: (() => void)[] = [];
    const settingsCols = '*';

    // Load from local IndexedDB cache immediately so the UI is not empty at start
    const loadCachedData = async () => {
      try {
        const cachedOrders = await idbGet<OnlineOrder[]>('nexus_online_orders_cache');
        const cachedShifts = await idbGet<CashShift[]>('nexus_cash_shifts_cache');
        const deletedOrderIds = getDeletedRecordIds('online_orders');
        
        if (isSubscribed) {
          if (cachedOrders && cachedOrders.length > 0) {
            const filteredOrders = cachedOrders.filter(o => o && o.id && !deletedOrderIds.has(String(o.id)));
            setOnlineOrders(filteredOrders);
          }
          if (cachedShifts && cachedShifts.length > 0) {
            setShifts(cachedShifts);
            setActiveShift(findActiveShiftForTerminal(cachedShifts));
            replaceTableState('cash_shifts', cachedShifts);
          }
        }
      } catch (err) {
        console.warn('[useFastChangingData] Failed to load cache:', err);
      }
    };

    const loadInstantSupabaseData = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const onlineCols = '*';
        const shiftsCols = '*';
        
        const onlinePromise = withNetworkTimeout(
          supabase.from('online_orders').select(onlineCols).then(async (res: any) => {
            if (res.error) {
              console.warn('[online_orders fetch] Instant load failed, falling back to select("*"):', res.error);
              return supabase.from('online_orders').select('*');
            }
            return res;
          }),
          5000,
          { data: null, error: null },
          'online_orders'
        );

        const shiftsPromise = withNetworkTimeout(
          supabase.from('cash_shifts').select(shiftsCols).then(async (res: any) => {
            if (res.error) {
              console.warn('[cash_shifts fetch] Instant load failed, falling back to select("*"):', res.error);
              return supabase.from('cash_shifts').select('*');
            }
            return res;
          }),
          5000,
          { data: null, error: null },
          'cash_shifts'
        );

        const settingsPromise = withNetworkTimeout(
          supabase.from('settings').select(settingsCols).then(async (res: any) => {
            if (res.error) {
              console.warn('[settings fetch] Instant load failed, falling back to select("*"):', res.error);
              return supabase.from('settings').select('*');
            }
            return res;
          }),
          5000,
          { data: null, error: null },
          'settings'
        );

        const [onlineRes, shiftsRes, settingsRes] = await Promise.all([
          onlinePromise,
          shiftsPromise,
          settingsPromise
        ]);
        
        if (!isSubscribed) return;
        
        const onlineDataRaw = (onlineRes as any)?.data;
        if (Array.isArray(onlineDataRaw)) {
          const deletedOrderIds = getDeletedRecordIds('online_orders');
          const onlineData = onlineDataRaw
            .filter((item: any) => item && item.id && !deletedOrderIds.has(String(item.id)))
            .map((item: any) => {
              if (item.items && typeof item.items === 'string') {
                try { item.items = JSON.parse(item.items); } catch(e) {}
              }
              return convertKeysToCamel(item) as OnlineOrder;
            });

          // 🛡️ VULN-03 : Réconciliation avec les commandes locales en attente dans la file de sync
          const pendingOrdersQueue = getSyncQueue().filter(q => q && (q.table === 'online_orders' || q.table === 'onlineOrders'));
          const pendingOrderIds = new Set(pendingOrdersQueue.map(q => String(q.recordId || (q.payload && q.payload.id))));
          const mergedOrders = [...onlineData];

          const localOrdersObj = dbState?.online_orders || {};
          Object.values(localOrdersObj).forEach((localOrd: any) => {
            if (localOrd && localOrd.id && pendingOrderIds.has(String(localOrd.id))) {
              const existingIdx = mergedOrders.findIndex(o => String(o.id) === String(localOrd.id));
              if (existingIdx >= 0) {
                mergedOrders[existingIdx] = { ...mergedOrders[existingIdx], ...localOrd };
              } else {
                mergedOrders.push(localOrd);
              }
            }
          });

          setOnlineOrders(mergedOrders);
          idbSet('nexus_online_orders_cache', mergedOrders).catch(err => console.warn('[IDB Error]', err));
          replaceTableState('online_orders', mergedOrders);
        }
        
        const shiftsDataRaw = (shiftsRes as any)?.data;
        if (Array.isArray(shiftsDataRaw)) {
          const shiftsData = shiftsDataRaw.map((item: any) => convertKeysToCamel(item) as CashShift);

          // 🛡️ VULN-03 : Réconciliation avec les shifts locaux en attente dans la file de sync
          const pendingShiftsQueue = getSyncQueue().filter(q => q && (q.table === 'cash_shifts' || q.table === 'shifts' || q.table === 'cashShifts'));
          const pendingShiftIds = new Set(pendingShiftsQueue.map(q => String(q.recordId || (q.payload && q.payload.id))));
          const mergedShifts = [...shiftsData];

          const localShiftsObj = dbState?.cash_shifts || {};
          Object.values(localShiftsObj).forEach((localShift: any) => {
            if (localShift && localShift.id && pendingShiftIds.has(String(localShift.id))) {
              const existingIdx = mergedShifts.findIndex(s => String(s.id) === String(localShift.id));
              if (existingIdx >= 0) {
                mergedShifts[existingIdx] = { ...mergedShifts[existingIdx], ...localShift };
              } else {
                mergedShifts.push(localShift);
              }
            }
          });

          mergedShifts.sort((a: any, b: any) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
          setShifts(mergedShifts);
          setActiveShift(findActiveShiftForTerminal(mergedShifts));
          replaceTableState('cash_shifts', mergedShifts);
          idbSet('nexus_cash_shifts_cache', mergedShifts).catch(err => console.warn('[IDB Error]', err));
        }
        
        const settData = (settingsRes as any)?.data;
        if (Array.isArray(settData) && settData.length > 0) {
          const companyRow = settData.find((r: any) => r.id === 'company') || settData[0];
          if (companyRow) {
            const jsonFields = ['site_locations', 'role_kpis', 'notifications', 'operational_costs', 'delivery_zones', 'api_keys', 'available_taxes', 'loyalty_tiers', 'role_permissions', 'favorite_category_ids', 'quick_select_groups'];
            jsonFields.forEach(field => {
              if (companyRow[field] && typeof companyRow[field] === 'string') {
                try { companyRow[field] = JSON.parse(companyRow[field]); } catch (e) {}
              }
            });
            const camelSettings = convertKeysToCamel(companyRow) as CompanySettings;
            setSettings(camelSettings);
            setLocalState('settings/company', camelSettings);
            saveStateToStorage();
          }
        }
      } catch (e) {
        console.warn('[useDataFetching] Failed instant fast-changing Supabase fetch:', e);
      }
    };
    
    // Load from cache first, then sync from Supabase
    loadCachedData().then(() => {
      if (isSupabaseConfigured) {
        loadInstantSupabaseData();
      }
    });

    const subscribe = (path: string, setter: (data: any) => void, extraAction?: (data: any) => void) => {
      const unsub = localDb.subscribe(path, (snapshot) => {
        if (!isSubscribed) return;
        if (snapshot.exists()) {
          const val = snapshot.val();
          const deletedOrderIds = path === 'onlineOrders' ? getDeletedRecordIds('online_orders') : new Set<string>();
          const docs = Object.keys(val)
            .filter(id => !deletedOrderIds.has(String(id)))
            .map(id => ({ id, ...val[id] }));
          setter(docs);
          if (extraAction) extraAction(docs);

          // Save updated state to cache to maintain legacy cache behavior
          const cacheKey = path === 'shifts' ? 'nexus_cash_shifts_cache' : 
                            path === 'onlineOrders' ? 'nexus_online_orders_cache' : null;
          if (cacheKey) {
            idbSet(cacheKey, docs).catch(err => console.warn('[IDB Error]', err));
          }
        } else {
          setter([]);
          if (extraAction) extraAction([]);
        }
      });
      listeners.push(unsub);
    };

    // Online Orders
    subscribe('onlineOrders', setOnlineOrders);

    // Settings (Real-time update)
    // Always subscribe to local emulated DB to ensure instant UI updates offline/first
    const unsubSettings = localDb.subscribe('settings/company', (snapshot) => {
      if (!isSubscribed) return;
      if (snapshot.exists()) {
        setSettings(snapshot.val() as CompanySettings);
      }
    });
    listeners.push(unsubSettings);

    // Shifts
    subscribe('shifts', (data) => {
      const docs = data as CashShift[];
      if (Array.isArray(docs) && docs.length > 0) {
        docs.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
        setShifts(docs);
        setActiveShift(findActiveShiftForTerminal(docs));
      }
    });

    // Realtime Supabase pour settings, online_orders et cash_shifts
    setupFastChangingRealtimeSubscription({
      isSubscribedRef,
      setSettings,
      setOnlineOrders,
      setShifts,
      setActiveShift,
      findActiveShift: findActiveShiftForTerminal,
      listeners
    });

    // Écouteur pour changement de poste / terminal local
    const handleTerminalChanged = () => {
      idbGet<CashShift[]>('nexus_cash_shifts_cache').then(cachedShifts => {
        if (cachedShifts && cachedShifts.length > 0) {
          setActiveShift(findActiveShiftForTerminal(cachedShifts));
        }
      }).catch(() => {});
    };
    window.addEventListener('nexus-terminal-changed', handleTerminalChanged);
    listeners.push(() => window.removeEventListener('nexus-terminal-changed', handleTerminalChanged));

    return () => {
      isSubscribed = false;
      isSubscribedRef.current = false;
      listeners.forEach(unsub => { try { unsub(); } catch(e) {} });
    };
  }, [loading, userId]);
}
