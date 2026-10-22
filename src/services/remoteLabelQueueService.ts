import { supabase, isSupabaseConfigured } from '../supabase';
import { Product } from '../types';

export interface RemoteLabelQueueItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  originalPrice?: number;
  unit?: string;
  quantity: number;
  addedAt: string;
  sourceTerminal: string;
  pendingOfflineSync?: boolean;
}

const LOCAL_QUEUE_KEY = 'nexus_remote_label_print_queue_v1';
const SUPABASE_SETTINGS_ID = 'remote_label_queue_v1';

let queueChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    queueChannel = new BroadcastChannel('nexus_remote_label_queue_bc');
  } catch (_) {}
}

export function getLocalLabelQueue(): RemoteLabelQueueItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalLabelQueue(items: RemoteLabelQueueItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('nexus-remote-label-queue-updated', { detail: items }));
    queueChannel?.postMessage({ type: 'QUEUE_UPDATED', items });
  } catch (_) {}
}

export async function fetchRemoteLabelQueue(): Promise<RemoteLabelQueueItem[]> {
  const localItems = getLocalLabelQueue();
  if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return localItems;
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('id, footer_text')
      .eq('id', SUPABASE_SETTINGS_ID)
      .maybeSingle();

    if (!error && data && typeof data.footer_text === 'string') {
      const cloudItems: RemoteLabelQueueItem[] = JSON.parse(data.footer_text || '[]');
      if (Array.isArray(cloudItems)) {
        // Only merge local items that were explicitly added while offline (pendingOfflineSync === true)
        const offlineUnsynced = localItems.filter(i => i?.pendingOfflineSync === true);
        if (offlineUnsynced.length > 0) {
          const map = new Map<string, RemoteLabelQueueItem>();
          cloudItems.forEach(item => { if (item?.productId) map.set(item.productId, { ...item, pendingOfflineSync: false }); });
          offlineUnsynced.forEach(item => {
            if (item?.productId) {
              const existing = map.get(item.productId);
              map.set(item.productId, {
                ...item,
                quantity: existing ? Math.max(existing.quantity, item.quantity) : item.quantity,
                pendingOfflineSync: false
              });
            }
          });
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
          );
          await persistQueueToCloud(merged);
          return merged;
        }

        // Otherwise, Supabase Cloud is the authoritative shared state across all devices!
        const normalizedCloud = cloudItems.map(i => ({ ...i, pendingOfflineSync: false }));
        saveLocalLabelQueue(normalizedCloud);
        return normalizedCloud;
      }
    } else if (!error && !data && localItems.length > 0) {
      // First time pushing existing local queue to Supabase
      await persistQueueToCloud(localItems);
      return localItems;
    }
  } catch (_) {}

  return localItems;
}

export async function persistQueueToCloud(items: RemoteLabelQueueItem[]): Promise<boolean> {
  const isOnline = isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine);
  const markedItems = items.map(i => ({ ...i, pendingOfflineSync: !isOnline }));
  saveLocalLabelQueue(markedItems);

  if (!isOnline) return false;

  try {
    const payload = {
      id: SUPABASE_SETTINGS_ID,
      name: 'File Impression Etiquettes Distante',
      footer_text: JSON.stringify(markedItems.map(i => ({ ...i, pendingOfflineSync: false }))),
    };
    let { error } = await supabase.from('settings').upsert(payload, { onConflict: 'id' });
    if (error) {
      const { id: _, ...updPayload } = payload;
      const res = await supabase.from('settings').update(updPayload).eq('id', SUPABASE_SETTINGS_ID);
      error = res.error;
    }
    if (!error) {
      saveLocalLabelQueue(markedItems.map(i => ({ ...i, pendingOfflineSync: false })));
      return true;
    }
  } catch (_) {}
  return false;
}

export async function addProductToRemoteLabelQueue(
  product: Product,
  quantity: number = 1,
  sourceTerminal: string = 'Poste Mobile / Rayon'
): Promise<RemoteLabelQueueItem[]> {
  const current = await fetchRemoteLabelQueue();
  const existingIndex = current.findIndex(i => i.productId === product.id);
  const nowIso = new Date().toISOString();

  let updated: RemoteLabelQueueItem[];
  if (existingIndex > -1) {
    updated = [...current];
    updated[existingIndex] = {
      ...updated[existingIndex],
      price: Number(product.price) || 0,
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      unit: product.unit || updated[existingIndex].unit || 'pcs',
      quantity: Math.max(1, (updated[existingIndex].quantity || 0) + quantity),
      addedAt: nowIso,
      sourceTerminal
    };
  } else {
    const newItem: RemoteLabelQueueItem = {
      productId: product.id,
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      price: Number(product.price) || 0,
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      unit: product.unit || 'pcs',
      quantity: Math.max(1, quantity),
      addedAt: nowIso,
      sourceTerminal
    };
    updated = [newItem, ...current];
  }

  await persistQueueToCloud(updated);
  return updated;
}

export async function updateRemoteLabelQueueQuantity(
  productId: string,
  quantity: number
): Promise<RemoteLabelQueueItem[]> {
  const current = getLocalLabelQueue();
  const updated = current
    .map(item => (item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item));
  await persistQueueToCloud(updated);
  return updated;
}

export async function removeFromRemoteLabelQueue(productId: string): Promise<RemoteLabelQueueItem[]> {
  const current = getLocalLabelQueue();
  const updated = current.filter(item => item.productId !== productId);
  await persistQueueToCloud(updated);
  return updated;
}

export async function clearRemoteLabelQueue(): Promise<void> {
  await persistQueueToCloud([]);
}

export function subscribeToRemoteLabelQueue(
  onUpdate: (items: RemoteLabelQueueItem[]) => void
): () => void {
  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<RemoteLabelQueueItem[]>;
    if (Array.isArray(custom.detail)) {
      onUpdate(custom.detail);
    }
  };

  const handleBroadcast = (e: MessageEvent) => {
    if (e.data?.type === 'QUEUE_UPDATED' && Array.isArray(e.data.items)) {
      onUpdate(e.data.items);
    }
  };

  window.addEventListener('nexus-remote-label-queue-updated', handleCustomEvent);
  queueChannel?.addEventListener('message', handleBroadcast);

  // Supabase Realtime channel so the PC with the printer receives scans from other devices in < 1 second
  let realtimeChannel: any = null;
  if (isSupabaseConfigured) {
    try {
      realtimeChannel = supabase
        .channel('remote_label_queue_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'settings',
            filter: `id=eq.${SUPABASE_SETTINGS_ID}`
          },
          (payload: any) => {
            try {
              const raw = payload?.new?.footer_text;
              if (typeof raw === 'string') {
                const parsed = JSON.parse(raw || '[]');
                if (Array.isArray(parsed)) {
                  saveLocalLabelQueue(parsed);
                  onUpdate(parsed);
                }
              }
            } catch (_) {}
          }
        )
        .subscribe();
    } catch (_) {}
  }

  // Periodic cloud poll every 4s when window is active as a fallback
  const interval = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchRemoteLabelQueue().then(onUpdate).catch(() => {});
    }
  }, 4000);

  return () => {
    window.removeEventListener('nexus-remote-label-queue-updated', handleCustomEvent);
    queueChannel?.removeEventListener('message', handleBroadcast);
    clearInterval(interval);
    if (realtimeChannel) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch (_) {}
    }
  };
}

