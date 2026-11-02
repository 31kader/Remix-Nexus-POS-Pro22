import { triggerObservers } from '../../lib/local-db';

// ⚡ Canal de synchronisation inter-onglets et multi-fenêtres (BroadcastChannel natif 0ms de latence)
let crossTabBc: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    crossTabBc = new BroadcastChannel('nexus_crosstab_sync');
    crossTabBc.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'offline-transaction-created' && data.detail) {
        window.dispatchEvent(new CustomEvent('offline-transaction-created', { detail: data.detail }));
      } else if (data.type === 'offline-return-created' && data.detail) {
        window.dispatchEvent(new CustomEvent('offline-return-created', { detail: data.detail }));
      } else if (data.type === 'table-updated' && data.detail?.table) {
        triggerObservers(data.detail.table);
        if (data.detail.path) triggerObservers(data.detail.path);
      }
    };
  } catch (err) {
    console.warn('[LocalDatabase] BroadcastChannel init error:', err);
  }
}

export function broadcastTableUpdated(table: string, path?: string) {
  crossTabBc?.postMessage({ type: 'table-updated', detail: { table, path } });
}

export function broadcastOfflineTransaction(val: any) {
  window.dispatchEvent(new CustomEvent('offline-transaction-created', { detail: val }));
  crossTabBc?.postMessage({ type: 'offline-transaction-created', detail: val });
}

export function broadcastOfflineReturn(val: any) {
  window.dispatchEvent(new CustomEvent('offline-return-created', { detail: val }));
  crossTabBc?.postMessage({ type: 'offline-return-created', detail: val });
}
