import { useEffect } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { localDb } from '../../database';
import { supabase, isSupabaseConfigured, removeChannelByName, safeRemoveChannel, safeSubscribeChannel, realtimeCircuitBreaker } from '../../supabase';
import { convertKeysToCamel, TABLE_COLUMNS } from '../../lib/db-converters';
import { CashShift, OnlineOrder, CompanySettings } from '../../types';
import { fetchTableFromSupabase } from './supabaseFetchHelper';
import { setLocalState, saveStateToStorage } from '../../lib/local-db';
import { getTerminalId } from '../../services/terminalService';
import { withNetworkTimeout } from '../../services/networkErrorHandler';

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
    const listeners: (() => void)[] = [];
    const settingsCols = '*';

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
            setActiveShift(findActiveShiftForTerminal(cachedShifts));
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
          const onlineData = onlineDataRaw.map((item: any) => {
            if (item.items && typeof item.items === 'string') {
              try { item.items = JSON.parse(item.items); } catch(e) {}
            }
            return convertKeysToCamel(item) as OnlineOrder;
          });
          setOnlineOrders(onlineData);
          idbSet('nexus_online_orders_cache', onlineData).catch(err => console.warn('[IDB Error]', err));
        }
        
        const shiftsDataRaw = (shiftsRes as any)?.data;
        if (Array.isArray(shiftsDataRaw)) {
          const shiftsData = shiftsDataRaw.map((item: any) => convertKeysToCamel(item) as CashShift);
          shiftsData.sort((a: any, b: any) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
          setShifts(shiftsData);
          setActiveShift(findActiveShiftForTerminal(shiftsData));
          idbSet('nexus_cash_shifts_cache', shiftsData).catch(err => console.warn('[IDB Error]', err));
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
      setActiveShift(findActiveShiftForTerminal(docs));
    });

    // Realtime Supabase pour settings, online_orders et cash_shifts
    if (isSupabaseConfigured) {
      removeChannelByName('nexus-fast-realtime');
      const fastChannel = supabase.channel('nexus-fast-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'settings' },
          (payload: any) => {
            if (!isSubscribed || !payload.new) return;
            const companyRow = payload.new;
            if (companyRow.id === 'company' || !companyRow.id) {
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
              console.log('[Realtime] ⚙️ Paramètres système mis à jour en direct.');
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'online_orders' },
          (payload: any) => {
            if (!isSubscribed) return;
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id;
              if (deletedId) {
                setOnlineOrders(prev => {
                  const safe = Array.isArray(prev) ? prev : [];
                  const updated = safe.filter(o => String(o.id) !== String(deletedId));
                  idbSet('nexus_online_orders_cache', updated).catch(() => {});
                  return updated;
                });
              }
            } else if (payload.new && payload.new.id) {
              const rawOrder = payload.new;
              if (rawOrder.items && typeof rawOrder.items === 'string') {
                try { rawOrder.items = JSON.parse(rawOrder.items); } catch(e) {}
              }
              const camelOrder = convertKeysToCamel(rawOrder) as OnlineOrder;
              setOnlineOrders(prev => {
                const safe = Array.isArray(prev) ? prev : [];
                const idx = safe.findIndex(o => String(o.id) === String(camelOrder.id));
                let updated: OnlineOrder[];
                if (idx >= 0) {
                  updated = [...safe];
                  updated[idx] = { ...updated[idx], ...camelOrder };
                } else {
                  updated = [camelOrder, ...safe];
                }
                idbSet('nexus_online_orders_cache', updated).catch(() => {});
                return updated;
              });
              console.log('[Realtime] 📦 Commande en ligne synchronisée en direct:', camelOrder.id);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cash_shifts' },
          (payload: any) => {
            if (!isSubscribed) return;
            if (payload.new && payload.new.id) {
              const camelShift = convertKeysToCamel(payload.new) as CashShift;
              setShifts(prev => {
                const safe = Array.isArray(prev) ? prev : [];
                const idx = safe.findIndex(s => s.id === camelShift.id);
                let updated: CashShift[];
                if (idx >= 0) {
                  updated = [...safe];
                  updated[idx] = { ...updated[idx], ...camelShift };
                } else {
                  updated = [camelShift, ...safe];
                }
                updated.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
                setActiveShift(findActiveShiftForTerminal(updated));
                idbSet('nexus_cash_shifts_cache', updated).catch(() => {});
                return updated;
              });
            }
          }
        );

      const connectFastChannel = () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        if (realtimeCircuitBreaker.isOpen()) return;

        safeSubscribeChannel(fastChannel, (status: string) => {
          if (status === 'SUBSCRIBED') {
            realtimeCircuitBreaker.recordSuccess();
            console.log('[Realtime] ✅ Canal nexus-fast-realtime (settings, online_orders, shifts) connecté.');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            realtimeCircuitBreaker.recordFailure('nexus-fast-realtime');
          }
        });
      };

      if (typeof navigator === 'undefined' || navigator.onLine) {
        if (!realtimeCircuitBreaker.isOpen()) {
          connectFastChannel();
        }
      }

      const handleRetryFast = () => connectFastChannel();
      window.addEventListener('nexus-realtime-retry', handleRetryFast);
      listeners.push(() => window.removeEventListener('nexus-realtime-retry', handleRetryFast));

      listeners.push(() => safeRemoveChannel(fastChannel));
    }

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
      listeners.forEach(unsub => { try { unsub(); } catch(e) {} });
    };
  }, [loading, userId]);
}
