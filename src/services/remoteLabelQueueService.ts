import { supabase, isSupabaseConfigured } from '../supabase';
import { Product } from '../types';

export interface RemoteLabelQueueItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  addedAt: string;
  sourceTerminal: string;
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

    if (!error && data && data.footer_text) {
      const cloudItems: RemoteLabelQueueItem[] = JSON.parse(data.footer_text);
      if (Array.isArray(cloudItems)) {
        // Merge cloud and local items by productId (keeping latest/max quantity)
        const map = new Map<string, RemoteLabelQueueItem>();
        localItems.forEach(item => { if (item?.productId) map.set(item.productId, item); });
        cloudItems.forEach(item => { if (item?.productId) map.set(item.productId, item); });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        );
        saveLocalLabelQueue(merged);
        return merged;
      }
    }
  } catch (_) {}

  return localItems;
}

async function persistQueueToCloud(items: RemoteLabelQueueItem[]): Promise<void> {
  saveLocalLabelQueue(items);
  if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

  try {
    await supabase.from('settings').upsert(
      {
        id: SUPABASE_SETTINGS_ID,
        name: 'File Impression Etiquettes Distante',
        footer_text: JSON.stringify(items),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );
  } catch (_) {}
}

export async function addProductToRemoteLabelQueue(
  product: Product,
  quantity: number = 1,
  sourceTerminal: string = 'Vérificateur de Prix'
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

  // Periodic cloud poll every 10s when window is active so other workstations receive scanned items automatically
  const interval = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchRemoteLabelQueue().then(onUpdate).catch(() => {});
    }
  }, 10000);

  return () => {
    window.removeEventListener('nexus-remote-label-queue-updated', handleCustomEvent);
    queueChannel?.removeEventListener('message', handleBroadcast);
    clearInterval(interval);
  };
}
