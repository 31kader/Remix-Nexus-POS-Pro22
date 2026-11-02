import { supabase, isSupabaseConfigured, removeChannelByName, safeRemoveChannel, safeSubscribeChannel, realtimeCircuitBreaker } from '../../../supabase';
import { Product } from '../../../types';
import { convertKeysToCamel } from '../../../lib/db-converters';
import { playOrderChime } from '../../../lib/audioNotification';
import { toast } from 'sonner';
import { QueueConfig, syncTableFromNetwork } from './syncTableFromNetwork';
import { applyProductRealtimeBatch } from './realtimeProductBatchProcessor';
import { applyTableRealtimeBatch } from './realtimeTableBatchProcessor';

export type { QueueConfig };
export { syncTableFromNetwork };

interface SetupRealtimeParams {
  userId: string | undefined;
  queueConfig: QueueConfig[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  isSubscribedRef: { current: boolean };
  syncProducts: (forceFull?: boolean) => Promise<void>;
  unsubscribes: (() => void)[];
}

export function setupRealtimeMultiplexedChannel({
  userId,
  queueConfig,
  setProducts,
  isSubscribedRef,
  syncProducts,
  unsubscribes
}: SetupRealtimeParams) {
  if (!isSupabaseConfigured) return;

  let productUpdateQueue: Product[] = [];
  let productDeleteQueue: string[] = [];
  let productUpdateTimeout: any = null;

  const processBatchedProductUpdates = () => {
    setProducts(prev => applyProductRealtimeBatch(prev, productUpdateQueue, productDeleteQueue));
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
      if (!isSubscribedRef.current) return;
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
      config.setState((prev: any[]) => applyTableRealtimeBatch(prev, config, mappedTable, tableUpdateQueue, tableDeleteQueue));
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
        if (!isSubscribedRef.current) return;
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

  // Présence et Broadcast inter-caisses
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
        console.log('[Realtime] ✅ Canal unique multiplexé nexus-pos-realtime connecté');
        window.dispatchEvent(new CustomEvent('nexus-realtime-status', { detail: { status: 'connected' } }));
        
        try {
          await multiplexedChannel.track({
            userId: userId || 'pos-terminal',
            onlineAt: new Date().toISOString()
          });
        } catch (e) {}

        if (wasDisconnected) {
          wasDisconnected = false;
          syncProducts(false);
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        wasDisconnected = true;
        realtimeCircuitBreaker.recordFailure('nexus-pos-realtime', err);
        if (!realtimeCircuitBreaker.isOpen()) {
          window.dispatchEvent(new CustomEvent('nexus-realtime-status', { detail: { status: 'reconnecting' } }));
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
}
