import { useEffect } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { localDb } from '../../database';
import { supabase, isSupabaseConfigured, removeChannelByName } from '../../supabase';
import { convertKeysToCamel, TABLE_COLUMNS } from '../../lib/db-converters';
import { CashShift, OnlineOrder, CompanySettings } from '../../types';
import { fetchTableFromSupabase } from './supabaseFetchHelper';
import { setLocalState, saveStateToStorage } from '../../lib/local-db';

interface useFastChangingDataParams {
  loading: boolean;
  userId: string | undefined;
  setOnlineOrders: React.Dispatch<React.SetStateAction<OnlineOrder[]>>;
  setShifts: React.Dispatch<React.SetStateAction<CashShift[]>>;
  setActiveShift: React.Dispatch<React.SetStateAction<CashShift | null>>;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
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
    if (loading || !userId) return;
    
    let isSubscribed = true;
    const listeners: (() => void)[] = [];
    const settingsCols = TABLE_COLUMNS['settings'] ? TABLE_COLUMNS['settings'].join(',') : '*';

    // Load from local IndexedDB cache immediately so the UI is not empty at start
    const loadCachedData = async () => {
      try {
        const cachedOrders = await idbGet<OnlineOrder[]>('nexus_online_orders_cache');
        const cachedShifts = await idbGet<CashShift[]>('nexus_cash_shifts_cache');
        
        if (isSubscribed) {
          if (cachedOrders && cachedOrders.length > 0) {
            setOnlineOrders(cachedOrders);
          }
          if (cachedShifts && cachedShifts.length > 0) {
            setShifts(cachedShifts);
            setActiveShift(cachedShifts.find((s: any) => s.status === 'open') || null);
          }
        }
      } catch (err) {
        console.warn('[useFastChangingData] Failed to load cache:', err);
      }
    };

    const loadInstantSupabaseData = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const onlineCols = TABLE_COLUMNS['online_orders'] ? TABLE_COLUMNS['online_orders'].join(',') : '*';
        const shiftsCols = TABLE_COLUMNS['cash_shifts'] ? TABLE_COLUMNS['cash_shifts'].join(',') : '*';
        
        const onlinePromise = supabase.from('online_orders').select(onlineCols).then(async (res: any) => {
          if (res.error) {
            console.warn('[online_orders fetch] Instant load failed, falling back to select("*"):', res.error);
            return supabase.from('online_orders').select('*');
          }
          return res;
        });

        const shiftsPromise = supabase.from('cash_shifts').select(shiftsCols).then(async (res: any) => {
          if (res.error) {
            console.warn('[cash_shifts fetch] Instant load failed, falling back to select("*"):', res.error);
            return supabase.from('cash_shifts').select('*');
          }
          return res;
        });

        const settingsPromise = supabase.from('settings').select(settingsCols).then(async (res: any) => {
          if (res.error) {
            console.warn('[settings fetch] Instant load failed, falling back to select("*"):', res.error);
            return supabase.from('settings').select('*');
          }
          return res;
        });

        const [onlineRes, shiftsRes, settingsRes] = await Promise.all([
          onlinePromise,
          shiftsPromise,
          settingsPromise
        ]);
        
        if (!isSubscribed) return;
        
        if (onlineRes.data) {
          const onlineData = onlineRes.data.map((item: any) => {
            if (item.items && typeof item.items === 'string') {
              try { item.items = JSON.parse(item.items); } catch(e) {}
            }
            return convertKeysToCamel(item) as OnlineOrder;
          });
          setOnlineOrders(onlineData);
          idbSet('nexus_online_orders_cache', onlineData).catch(err => console.warn('[IDB Error]', err));
        }
        
        if (shiftsRes.data) {
          const shiftsData = shiftsRes.data.map((item: any) => convertKeysToCamel(item) as CashShift);
          shiftsData.sort((a: any, b: any) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
          setShifts(shiftsData);
          setActiveShift(shiftsData.find((s: any) => s.status === 'open') || null);
          idbSet('nexus_cash_shifts_cache', shiftsData).catch(err => console.warn('[IDB Error]', err));
        }
        
        if (settingsRes.data && settingsRes.data.length > 0) {
          const companyRow = settingsRes.data.find((r: any) => r.id === 'company') || settingsRes.data[0];
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
          const docs = Object.keys(val).map(id => ({ id, ...val[id] }));
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
      docs.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
      setShifts(docs);
      setActiveShift(docs.find(s => s.status === 'open') || null);
    });

    return () => {
      isSubscribed = false;
      listeners.forEach(unsub => { try { unsub(); } catch(e) {} });
    };
  }, [loading, userId]);
}
