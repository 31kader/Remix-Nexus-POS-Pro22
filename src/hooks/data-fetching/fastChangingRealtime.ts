import { supabase, isSupabaseConfigured, removeChannelByName, safeRemoveChannel, safeSubscribeChannel, realtimeCircuitBreaker } from '../../supabase';
import { convertKeysToCamel } from '../../lib/db-converters';
import { setLocalState, saveStateToStorage, removeLocalState } from '../../lib/local-db';
import { getDeletedRecordIds, markRecordDeleted } from '../../services/LocalDatabase';
import { set as idbSet } from 'idb-keyval';
import { CashShift, OnlineOrder, CompanySettings } from '../../types';

export interface SetupFastChangingRealtimeParams {
  isSubscribedRef: { current: boolean };
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  setOnlineOrders: React.Dispatch<React.SetStateAction<OnlineOrder[]>>;
  setShifts: React.Dispatch<React.SetStateAction<CashShift[]>>;
  setActiveShift: React.Dispatch<React.SetStateAction<CashShift | null>>;
  findActiveShift: (shifts: CashShift[]) => CashShift | null;
  listeners: (() => void)[];
}

export function setupFastChangingRealtimeSubscription({
  isSubscribedRef,
  setSettings,
  setOnlineOrders,
  setShifts,
  setActiveShift,
  findActiveShift,
  listeners
}: SetupFastChangingRealtimeParams): void {
  if (!isSupabaseConfigured) return;

  removeChannelByName('nexus-fast-realtime');
  const fastChannel = supabase.channel('nexus-fast-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settings' },
      (payload: any) => {
        if (!isSubscribedRef.current || !payload.new) return;
        const companyRow = payload.new;
        if (companyRow.id === 'company' || !companyRow.id) {
          const jsonFields = ['site_locations', 'role_kpis', 'notifications', 'operational_costs', 'delivery_zones', 'api_keys', 'available_taxes', 'loyalty_tiers', 'role_permissions', 'favorite_category_ids', 'quick_select_groups'];
          jsonFields.forEach(field => {
            if (companyRow[field] && typeof companyRow[field] === 'string') {
              try { companyRow[field] = JSON.parse(companyRow[field]); } catch (_) {}
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
        if (!isSubscribedRef.current) return;
        if (payload.eventType === 'DELETE') {
          const deletedId = payload.old?.id;
          if (deletedId) {
            markRecordDeleted('online_orders', String(deletedId));
            removeLocalState(`online_orders/${deletedId}`);
            saveStateToStorage('online_orders');
            setOnlineOrders(prev => {
              const safe = Array.isArray(prev) ? prev : [];
              const updated = safe.filter(o => String(o.id) !== String(deletedId));
              idbSet('nexus_online_orders_cache', updated).catch(() => {});
              return updated;
            });
          }
        } else if (payload.new && payload.new.id) {
          const deletedOrderIds = getDeletedRecordIds('online_orders');
          if (deletedOrderIds.has(String(payload.new.id))) {
            return;
          }
          const rawOrder = payload.new;
          if (rawOrder.items && typeof rawOrder.items === 'string') {
            try { rawOrder.items = JSON.parse(rawOrder.items); } catch (_) {}
          }
          const camelOrder = convertKeysToCamel(rawOrder) as OnlineOrder;
          setLocalState(`online_orders/${camelOrder.id}`, camelOrder);
          saveStateToStorage('online_orders');
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
        if (!isSubscribedRef.current) return;
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
            setActiveShift(findActiveShift(updated));
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
