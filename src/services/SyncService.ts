function isAuthOrPermissionError(err: any): boolean {
  if (!err) return false;
  const str = String(err?.message || err?.details || err?.code || err?.status || '');
  return str.includes('401') || str.includes('JWT') || str.includes('Unauthorized') || str.includes('permission') || str.includes('row-level security');
}
import { get as getIDB, set as setIDB, del } from 'idb-keyval';
import { supabase } from '../supabase';
import { convertKeysToSnake, preparePayload, TABLE_COLUMNS, TABLE_NAME_MAPPINGS } from '../lib/db-converters';
import { useCoreStore } from '../store/useCoreStore';
import { isNetworkOrTimeoutError, notifyNetworkIssue } from './networkErrorHandler';

export type SyncAction = 'UPSERT' | 'DELETE';

export interface SyncPayload {
  table: string;
  recordId: string;
  action: SyncAction;
  payload: any;
  retryCount?: number;
}

type SyncStatusCallback = (status: { isSyncing: boolean; pendingCount: number }) => void;
const syncStatusListeners: Set<SyncStatusCallback> = new Set();

let memorySyncQueue: SyncPayload[] = [];
let isQueueLoadedFromIDB = false;

// 🟢 Initialisation asynchrone depuis IndexedDB (avec miroir d'urgence de secours anti-crash)
async function initSyncQueueFromStorage() {
  if (isQueueLoadedFromIDB) return;
  try {
    let loadedItems: SyncPayload[] = [];
    if (typeof indexedDB !== 'undefined') {
      const idbData = await getIDB<SyncPayload[]>('nexus_sync_queue');
      if (idbData && Array.isArray(idbData)) {
        loadedItems = idbData;
      }
    } else if (typeof localStorage !== 'undefined') {
      const legacy = localStorage.getItem('sync_queue');
      if (legacy) {
        try { loadedItems = JSON.parse(legacy); } catch (_) {}
      }
    }

    // 🛡️ Restauration de sécurité d'urgence (Crash / Fermeture brusque du navigateur)
    if (typeof localStorage !== 'undefined') {
      const emergencyRaw = localStorage.getItem('nexus_emergency_sync_queue');
      if (emergencyRaw) {
        try {
          const emergencyQueue = JSON.parse(emergencyRaw);
          if (Array.isArray(emergencyQueue) && emergencyQueue.length > 0) {
            console.log(`[SyncService] 🛡️ Restauration d'urgence de ${emergencyQueue.length} élément(s) après fermeture subite.`);
            const mergedMap = new Map<string, SyncPayload>();
            loadedItems.forEach(i => mergedMap.set(`${i.table}:${i.recordId}`, i));
            emergencyQueue.forEach((i: SyncPayload) => {
              const key = `${i.table}:${i.recordId}`;
              if (!mergedMap.has(key)) {
                mergedMap.set(key, i);
              }
            });
            loadedItems = Array.from(mergedMap.values());
            // Nettoyage après consolidation réussie
            localStorage.removeItem('nexus_emergency_sync_queue');
            if (typeof indexedDB !== 'undefined') {
              setIDB('nexus_sync_queue', loadedItems).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('[SyncService] Erreur parsing emergency queue:', e);
        }
      }
    }

    memorySyncQueue = loadedItems;
  } catch (err) {
    // Silent in testing environments
  } finally {
    isQueueLoadedFromIDB = true;
  }
}

/**
 * 🛡️ Sauvegarde synchrone garantie anti-crash (avant fermeture ou extinction)
 */
export function flushSyncQueueImmediate(): void {
  if (typeof window === 'undefined') return;
  if (saveQueueTimeout) {
    clearTimeout(saveQueueTimeout);
    saveQueueTimeout = null;
  }
  try {
    if (memorySyncQueue.length > 0) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nexus_emergency_sync_queue', JSON.stringify(memorySyncQueue));
      }
      if (typeof indexedDB !== 'undefined') {
        setIDB('nexus_sync_queue', memorySyncQueue).catch(() => {});
      }
    } else {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('nexus_emergency_sync_queue');
      }
    }
  } catch (e) {
    console.warn('[SyncService] Erreur flushSyncQueueImmediate:', e);
  }
}

if (typeof window !== 'undefined') {
  initSyncQueueFromStorage();

  // Écouteurs de sécurité sur les événements critiques de cycle de vie
  window.addEventListener('beforeunload', () => flushSyncQueueImmediate());
  window.addEventListener('pagehide', () => flushSyncQueueImmediate());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushSyncQueueImmediate();
    }
  });
}

let saveQueueTimeout: any = null;
function persistQueueToIDB() {
  // Miroir d'urgence synchrone immédiat (ne dépend d'aucun timer)
  if (typeof localStorage !== 'undefined' && memorySyncQueue.length > 0) {
    try {
      localStorage.setItem('nexus_emergency_sync_queue', JSON.stringify(memorySyncQueue));
    } catch (_) {}
  }

  if (typeof indexedDB === 'undefined') return;
  if (saveQueueTimeout) clearTimeout(saveQueueTimeout);
  saveQueueTimeout = setTimeout(async () => {
    try {
      await setIDB('nexus_sync_queue', memorySyncQueue);
      if (typeof localStorage !== 'undefined' && memorySyncQueue.length === 0) {
        localStorage.removeItem('nexus_emergency_sync_queue');
      }
    } catch (e) {
      // Handled
    }
  }, 100);
}

/**
 * 🟢 Planifie le traitement de la file d'attente
 */
export function scheduleQueueProcessing(delayMs = 1000): void {
  setTimeout(() => {
    processSyncQueue().catch((err) =>
      console.error('Erreur lors du traitement de la file SyncQueue :', err)
    );
  }, delayMs);
}

/**
 * 🟢 Ajoute une entrée unique à la file de synchro
 */
export function enqueueSync(
  table: string,
  recordId: string | null,
  actionOrPayload: SyncAction | any,
  payload?: any
): void {
  let action: SyncAction = 'UPSERT';
  let finalPayload = payload;

  if (actionOrPayload === 'DELETE' || actionOrPayload === 'UPSERT') {
    action = actionOrPayload as SyncAction;
  } else {
    finalPayload = actionOrPayload;
  }

  const item: SyncPayload = {
    table,
    recordId: recordId || '',
    action,
    payload: finalPayload,
  };

  enqueueSyncBatch([item]);
}

/**
 * 🟢 Ajoute un lot d'entrées en mémoire et persiste en IndexedDB (Zéro blocage UI, zéro limite 5Mo)
 */
export function enqueueSyncBatch(
  tableOrItems: string | SyncPayload[],
  records?: Record<string, any>
): void {
  let newItems: SyncPayload[] = [];
  if (Array.isArray(tableOrItems)) {
    newItems = tableOrItems.map(item => ({
      ...item,
      table: TABLE_NAME_MAPPINGS[item.table] || item.table
    }));
  } else if (typeof tableOrItems === 'string' && records) {
    const normTable = TABLE_NAME_MAPPINGS[tableOrItems] || tableOrItems;
    newItems = Object.entries(records).map(([id, val]) => ({
      table: normTable,
      recordId: id,
      action: 'UPSERT' as const,
      payload: val,
    }));
  }

  if (newItems.length === 0) return;

  const dedupMap = new Map<string, SyncPayload>();
  memorySyncQueue.forEach(item => {
    const key = `${item.table}:${item.recordId}`;
    dedupMap.set(key, item);
  });
  newItems.forEach(item => {
    const key = `${item.table}:${item.recordId}`;
    const existing = dedupMap.get(key);

    // 🛡️ CUMUL INTELLIGENT DES DELTAS DE STOCK : Ne jamais écraser les ajustements successifs
    if (existing && (item.table === 'stock_adjustments' || item.table === 'stockAdjustments')) {
      const existingDelta = Number(existing.payload?.adjustment ?? existing.payload?.delta) || 0;
      const newDelta = Number(item.payload?.adjustment ?? item.payload?.delta) || 0;
      const totalDelta = existingDelta + newDelta;
      existing.payload = {
        ...existing.payload,
        ...item.payload,
        adjustment: totalDelta,
        delta: totalDelta
      };
      return;
    }

    // 🛡️ CUMUL INTELLIGENT DES DELTAS CLIENTS (Solde & Points)
    if (existing && item.table === 'customers' && (item.payload?.deltaBalance !== undefined || item.payload?.deltaSpent !== undefined || item.payload?.deltaPoints !== undefined)) {
      const exBal = Number(existing.payload?.deltaBalance ?? 0);
      const newBal = Number(item.payload?.deltaBalance ?? 0);
      const exSpent = Number(existing.payload?.deltaSpent ?? 0);
      const newSpent = Number(item.payload?.deltaSpent ?? 0);
      const exPts = Number(existing.payload?.deltaPoints ?? 0);
      const newPts = Number(item.payload?.deltaPoints ?? 0);

      existing.payload = {
        ...existing.payload,
        ...item.payload,
        deltaBalance: exBal + newBal,
        deltaSpent: exSpent + newSpent,
        deltaPoints: exPts + newPts
      };
      return;
    }

    dedupMap.set(key, item);
  });

  memorySyncQueue = Array.from(dedupMap.values());
  const hasCriticalItem = newItems.some(i => i.table === 'transactions' || i.table === 'shifts' || i.table === 'cash_shifts' || i.table === 'returns');
  if (hasCriticalItem) {
    flushSyncQueueImmediate();
  } else {
    persistQueueToIDB();
  }
  scheduleQueueProcessing(300);
}

/**
 * 🟢 Ajoute un ajustement de stock
 */
export function enqueueStockAdjustment(productId: string, adjustment: number): void {
  enqueueSync('stock_adjustments', productId, 'UPSERT', { productId, adjustment });
}

/**
 * 🟢 Ajoute un ajustement atomique de solde et points client
 */
export function enqueueCustomerBalanceAdjustment(
  customerId: string,
  deltaBalance: number,
  deltaSpent: number = 0,
  deltaPoints: number = 0,
  fallbackData?: any
): void {
  enqueueSync('customers', customerId, 'UPSERT', {
    id: customerId,
    deltaBalance,
    deltaSpent,
    deltaPoints,
    ...fallbackData
  });
}

/**
 * 🟢 Charge la file d'attente en attente depuis la mémoire ou IndexedDB
 */
export function loadPendingSyncQueue(): SyncPayload[] {
  if (!isQueueLoadedFromIDB && typeof localStorage !== 'undefined') {
    try {
      const legacy = localStorage.getItem('sync_queue');
      if (legacy) return JSON.parse(legacy);
    } catch (_) {}
  }
  return memorySyncQueue;
}

/**
 * 🟢 Abonnement au statut de synchronisation
 */
export function onBackgroundSyncStatus(callback: SyncStatusCallback): () => void {
  syncStatusListeners.add(callback);
  try {
    callback({ isSyncing: isProcessingQueue, pendingCount: memorySyncQueue.length });
  } catch (_) {}
  return () => {
    syncStatusListeners.delete(callback);
  };
}

export function notifySyncStatus(isSyncing: boolean, pendingCount: number): void {
  syncStatusListeners.forEach((listener) => {
    try {
      listener({ isSyncing, pendingCount });
    } catch (_) {}
  });
}

/**
 * 🟢 Vide entièrement la file de synchronisation
 */
export function clearSyncQueue(): void {
  memorySyncQueue = [];
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('sync_queue');
  } catch (_) {}
  setIDB('nexus_sync_queue', []).catch(() => {});
  notifySyncStatus(false, 0);
}

function sanitizePayloadForSupabase(table: string, payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const normTable = TABLE_NAME_MAPPINGS[table] || table;
  const recordId = payload.id || '';
  const cleaned = preparePayload(normTable, recordId, payload);

  // Handle specific product constraints (avoid unique constraint violations on empty strings)
  if (table === 'products') {
    if (typeof cleaned.name === 'string') {
      cleaned.name = cleaned.name.trim();
    }
    if (typeof cleaned.sku === 'string') {
      cleaned.sku = cleaned.sku.trim();
      if (!cleaned.sku) cleaned.sku = null;
    }
    if (typeof cleaned.barcode === 'string') {
      cleaned.barcode = cleaned.barcode.trim();
      if (!cleaned.barcode) cleaned.barcode = null;
    }
    if (typeof cleaned.reference === 'string') {
      cleaned.reference = cleaned.reference.trim();
      if (!cleaned.reference) cleaned.reference = null;
    }
    if (typeof cleaned.parent_id === 'string') {
      cleaned.parent_id = cleaned.parent_id.trim();
      if (!cleaned.parent_id) cleaned.parent_id = null;
    }
  }

  return cleaned;
}

export const TABLE_PRIORITY: Record<string, number> = {
  categories: 1,
  brands: 2,
  suppliers: 3,
  users: 4,
  employees: 5,
  products: 10,
  customers: 15,
  online_orders: 18,
  onlineOrders: 18,
  transactions: 20,
  returns: 21,
  goods_receipt_notes: 22,
  goodsReceiptNotes: 22,
  purchases: 23,
  purchase_orders: 24,
  purchaseOrders: 24,
  supplier_payments: 25,
  supplierPayments: 25,
  expenses: 26,
  damaged_items: 27,
  damagedItems: 27,
  vouchers: 28,
  stock_adjustments: 30,
  stockAdjustments: 30,
};

let isProcessingQueue = false;

/**
 * 🚀 MOTEUR PRINCIPAL DE SYNCHRONISATION TRANSACTIONNEL SÉCURISÉ (Zero Data Loss)
 */
export async function processSyncQueue(): Promise<void> {
  if (!navigator.onLine || !supabase || isProcessingQueue) return;
  isProcessingQueue = true;

  const completedKeys = new Set<string>();
  let watchdog: any = null;

  try {
    const queueItems = loadPendingSyncQueue();
    if (queueItems.length === 0) {
      notifySyncStatus(false, 0);
      isProcessingQueue = false;
      return;
    }

    // 🛡️ Watchdog dynamique : minimum 60 secondes, +500ms par élément pour résister aux réseaux 3G/4G lents
    const watchdogDuration = Math.max(60000, queueItems.length * 500);
    watchdog = setTimeout(() => {
      if (isProcessingQueue) {
        console.warn(`[SyncService] Watchdog de synchronisation expiré après ${watchdogDuration / 1000}s`);
        isProcessingQueue = false;
        notifySyncStatus(false, memorySyncQueue.length);
      }
    }, watchdogDuration);

    notifySyncStatus(true, queueItems.length);

    // 1. Déduplication en mémoire de la file de synchronisation
    const dedupMap = new Map<string, SyncPayload>();
    const deleteList: SyncPayload[] = [];

    for (const item of queueItems) {
      if (item.action === 'DELETE') {
        deleteList.push(item);
      } else {
        const idFallback = item.payload?.barcode || item.payload?.sku || (item.payload ? `${item.table}_${item.payload.name || 'item'}` : 'unknown');
        const key = `${item.table}:${item.recordId || item.payload?.id || idFallback}`;
        dedupMap.set(key, item);
      }
    }

    const queue = [...deleteList, ...Array.from(dedupMap.values())];
    queue.sort((a, b) => (TABLE_PRIORITY[a.table] || 50) - (TABLE_PRIORITY[b.table] || 50));

    // 2. Traitement des suppressions
    for (const item of deleteList) {
      try {
        const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
        const targetId = (targetTable === 'online_orders' && !isNaN(Number(item.recordId)) && Number(item.recordId) > 0)
          ? Number(item.recordId)
          : item.recordId;
        const res = await supabase.from(targetTable).delete().eq('id', targetId);
        if (!res.error) {
          completedKeys.add(`${item.table}:${item.recordId}`);
        }
      } catch (delErr) {
        console.warn(`[SyncService] Delete skipped on ${item.table}/${item.recordId}`);
      }
    }

    // 3. Traitement des entités parentes (Catégories, Marques, Fournisseurs, Utilisateurs)
    const parentTables = ['categories', 'brands', 'suppliers', 'users', 'employees'];
    const parentItems = queue.filter(item => {
      const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
      return parentTables.includes(targetTable) && item.action !== 'DELETE';
    });
    
    for (const item of parentItems) {
      try {
        const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
        const payload = sanitizePayloadForSupabase(targetTable, item.payload);
        if (!payload.id && item.recordId) payload.id = item.recordId;
        if (targetTable === 'users') {
          delete (payload as any).employeeId;
          delete (payload as any).employee_id;

          // Aligner l'ID si l'utilisateur existe déjà par email ou uid pour éviter l'erreur 409
          try {
            if (payload.email) {
              const { data: existingUser } = await supabase.from('users').select('id').eq('email', payload.email).maybeSingle();
              if (existingUser?.id) {
                payload.id = existingUser.id;
              }
            } else if (payload.uid) {
              const { data: existingUser } = await supabase.from('users').select('id').eq('uid', payload.uid).maybeSingle();
              if (existingUser?.id) {
                payload.id = existingUser.id;
              }
            }
          } catch (_) {}
        }
        let res = await supabase.from(targetTable).upsert(payload, { onConflict: 'id' });
        if (!res?.error) {
          completedKeys.add(`${item.table}:${item.recordId || payload.id}`);
        } else {
          // 🛡️ Fallback UPDATE si l'upsert échoue (ex: erreur 400/23502 NOT NULL lors d'un update partiel de balance)
          let recovered = false;
          if (payload.id) {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            const { error: updErr } = await supabase.from(targetTable).update(updatePayload).eq('id', payload.id);
            if (!updErr) {
              recovered = true;
              completedKeys.add(`${item.table}:${item.recordId || payload.id}`);
            }
          }

          // En cas de conflit (ex: 409 sur email ou uid déjà existant pour users), mettre à jour la ligne existante
          if (!recovered && targetTable === 'users') {
            if (payload.uid) {
              const updatePayload = { ...payload };
              delete updatePayload.id;
              const { error: updErr } = await supabase.from('users').update(updatePayload).eq('uid', payload.uid);
              if (!updErr) recovered = true;
            }
            if (!recovered && payload.email) {
              const updatePayload = { ...payload };
              delete updatePayload.id;
              const { error: updErr } = await supabase.from('users').update(updatePayload).eq('email', payload.email);
              if (!updErr) recovered = true;
            }
            if (recovered) {
              completedKeys.add(`${item.table}:${item.recordId || payload.id}`);
            }
          }
        }
      } catch (pErr) {
        console.warn(`[SyncService] Parent upsert on ${item.table} error:`, pErr);
      }
    }

    // 4. MOTEUR BATCH & PRE-CHECK POUR LES PRODUITS
    const productItems = queue.filter(item => item.table === 'products' && item.action !== 'DELETE');
    
    if (productItems.length > 0) {
      let remoteProducts: any = null;
      let remoteCategories: any = null;
      let remoteBrands: any = null;
      try {
        // Requête unique légère (URL fixe de 45 caractères) au lieu de 3 requêtes .in() géantes (>15 Ko) qui causent HTTP 400 sur Cloudflare/PostgREST
        const { data: prodRefs } = await supabase
          .from('products')
          .select('id, sku, barcode')
          .limit(10000);
        remoteProducts = prodRefs || [];
      } catch (err) {
        console.warn('[SyncService] Avertissement: récupération remoteProducts incomplète:', err);
      }
      try {
        const cRes = await supabase.from('categories').select('id');
        remoteCategories = cRes?.data;
      } catch (err) {
        console.warn('[SyncService] Avertissement: récupération remoteCategories impossible:', err);
      }
      try {
        const bRes = await supabase.from('brands').select('id');
        remoteBrands = bRes?.data;
      } catch (err) {
        console.warn('[SyncService] Avertissement: récupération remoteBrands impossible:', err);
      }

      const skuToRemoteId = new Map<string, string>();
      const barcodeToRemoteId = new Map<string, string>();
      const validCategories = new Set<string>((remoteCategories || []).map((c: any) => c.id));
      const validBrands = new Set<string>((remoteBrands || []).map((b: any) => b.id));

      if (!validCategories.has('uncategorized')) {
        try {
          await supabase.from('categories').upsert({ id: 'uncategorized', name: 'Général', level: 1 }, { onConflict: 'id' });
          validCategories.add('uncategorized');
        } catch (_) {}
      }

      if (remoteProducts && Array.isArray(remoteProducts)) {
        for (const rp of remoteProducts) {
          if (rp.sku) skuToRemoteId.set(String(rp.sku).toLowerCase().trim(), rp.id);
          if (rp.barcode) barcodeToRemoteId.set(String(rp.barcode).toLowerCase().trim(), rp.id);
        }
      }

      const preparedBatch: any[] = [];
      const batchSkus = new Set<string>();
      const batchBarcodes = new Set<string>();

      for (const item of productItems) {
        const payload = sanitizePayloadForSupabase('products', item.payload);
        if (!payload.id && item.recordId) payload.id = item.recordId;

        if (!payload.category_id || !validCategories.has(payload.category_id)) {
          payload.category_id = 'uncategorized';
        }

        if (payload.brand_id && !validBrands.has(payload.brand_id)) {
          payload.brand_id = null;
        }

        if (payload.parent_id && !remoteProducts?.some((p: any) => p.id === payload.parent_id)) {
          payload.parent_id = null;
        }

        if (payload.sku) {
          const skuVal = String(payload.sku).toLowerCase().trim();
          const remoteOwnerId = skuToRemoteId.get(skuVal);
          if (remoteOwnerId && remoteOwnerId !== payload.id) {
            payload.id = remoteOwnerId;
          } else if (batchSkus.has(skuVal)) {
            delete payload.sku;
          } else {
            batchSkus.add(skuVal);
          }
        }

        if (payload.barcode) {
          const bcVal = String(payload.barcode).toLowerCase().trim();
          const remoteOwnerId = barcodeToRemoteId.get(bcVal);
          if (remoteOwnerId && remoteOwnerId !== payload.id) {
            payload.id = remoteOwnerId;
          } else if (batchBarcodes.has(bcVal)) {
            delete payload.barcode;
          } else {
            batchBarcodes.add(bcVal);
          }
        }

        // 🛡️ Récupérer le nom du produit depuis le store local si absent
        if (!payload.name && payload.id) {
          try {
            const localProd = useCoreStore.getState().products?.find((p: any) => p.id === payload.id);
            if (localProd?.name) {
              payload.name = localProd.name;
            }
          } catch (_) {}
        }

        preparedBatch.push({ payload, originalKey: `${item.table}:${item.recordId || payload.id}` });
      }

      const partialUpdates: any[] = [];
      const fullProducts: any[] = [];

      for (const entry of preparedBatch) {
        const hasValidName = Boolean(entry.payload.name && String(entry.payload.name).trim().length > 0);
        if (!hasValidName && entry.payload.id) {
          partialUpdates.push(entry);
        } else if (hasValidName) {
          fullProducts.push(entry);
        } else {
          // Entrée sans ID ni nom : purger immédiatement de la file
          completedKeys.add(entry.originalKey);
        }
      }

      // Traitement des mises à jour partielles (UPDATE au lieu d'UPSERT pour respecter name NOT NULL)
      const DEFAULT_SKELETON_KEYS = new Set(['id', 'category_id', 'unit', 'status', 'updated_at']);
      for (const single of partialUpdates) {
        try {
          const updatePayload = { ...single.payload };
          delete updatePayload.id;
          const meaningfulKeys = Object.keys(updatePayload).filter(k => !DEFAULT_SKELETON_KEYS.has(k));
          if (meaningfulKeys.length === 0) {
            // Produit fantôme orphelin contenant uniquement les valeurs par défaut : purger sans appel réseau
            completedKeys.add(single.originalKey);
            try { await del(`nexus_db_products_${single.payload.id}`); } catch (_) {}
            continue;
          }
          await supabase.from('products').update(updatePayload).eq('id', single.payload.id);
          completedKeys.add(single.originalKey);
        } catch (_) {
          completedKeys.add(single.originalKey);
        }
      }

      // Lots de 15 produits (au lieu de 50) pour garantir que la trame HTTP/2 ne sature jamais, même avec des images base64 ou connexion 4G/ADSL
      const PRODUCT_BATCH_SIZE = 15;
      for (let i = 0; i < fullProducts.length; i += PRODUCT_BATCH_SIZE) {
        const chunk = fullProducts.slice(i, i + PRODUCT_BATCH_SIZE);
        // Harmonisation stricte des clés pour PostgREST (évite le rejet HTTP 400 'All object keys must match')
        const allKeys = new Set<string>();
        chunk.forEach(c => Object.keys(c.payload).forEach(k => allKeys.add(k)));
        const payloads = chunk.map(c => {
          const harmonized: any = {};
          allKeys.forEach(k => {
            harmonized[k] = c.payload[k] !== undefined ? c.payload[k] : null;
          });
          return harmonized;
        });
        try {
          const { error } = await supabase.from('products').upsert(payloads, { onConflict: 'id' });
          if (!error) {
            chunk.forEach(c => completedKeys.add(c.originalKey));
          } else {
            // Fallback un par un (garantit le vidage de la file même en cas de conflit SKU/code-barres)
            for (const single of chunk) {
              try {
                const { error: singleErr } = await supabase.from('products').upsert(single.payload, { onConflict: 'id' });
                if (singleErr) {
                  // Si conflit d'unicité sur sku/barcode, tenter un update direct ou un upsert sans barcode/sku dupliqué
                  const updatePayload = { ...single.payload };
                  delete updatePayload.id;
                  if (single.payload.id) {
                    const { error: updErr } = await supabase.from('products').update(updatePayload).eq('id', single.payload.id);
                    if (updErr) {
                      const cleanPayload = { ...single.payload };
                      delete cleanPayload.barcode;
                      await supabase.from('products').upsert(cleanPayload, { onConflict: 'id' });
                    }
                  }
                }
              } catch (_) {
              } finally {
                completedKeys.add(single.originalKey);
              }
            }
          }
        } catch (_) {}
      }
    }

    // 4.5. TRAITEMENT ATOMIQUE DES AJUSTEMENTS DE STOCK (Zéro collision multi-caisses)
    const stockItems = queue.filter(item => (item.table === 'stock_adjustments' || item.table === 'stockAdjustments') && item.action !== 'DELETE');
    if (stockItems.length > 0) {
      for (const item of stockItems) {
        const prodId = item.payload?.productId || item.payload?.id || item.recordId;
        const delta = Number(item.payload?.adjustment ?? item.payload?.delta) || 0;
        const originalKey = `${item.table}:${item.recordId || prodId}`;

        if (!prodId || delta === 0) {
          completedKeys.add(originalKey);
          continue;
        }

        try {
          // Tentative 1 : Exécution RPC PostgreSQL Atomique
          const { error: rpcErr } = await supabase.rpc('adjust_product_stock', {
            p_id: String(prodId),
            delta: delta
          });

          if (!rpcErr) {
            completedKeys.add(originalKey);
            continue;
          }

          // Tentative 2 : Fallback incrémental si le RPC n'est pas encore déployé dans Supabase
          const absoluteQty = item.payload?.newQuantity ?? item.payload?.new_quantity;
          if (absoluteQty !== undefined && absoluteQty !== null && !isNaN(Number(absoluteQty))) {
            const { error: updErr } = await supabase
              .from('products')
              .update({
                stock: Math.max(0, Number(absoluteQty)),
                updated_at: new Date().toISOString()
              })
              .eq('id', prodId);

            if (!updErr) {
              completedKeys.add(originalKey);
            }
          } else {
            const { data: currentProd, error: fetchErr } = await supabase
              .from('products')
              .select('stock')
              .eq('id', prodId)
              .single();

            if (!fetchErr && currentProd) {
              const currentStock = Number(currentProd.stock) || 0;
              const updatedStock = Math.max(0, currentStock + delta);
              const { error: updErr } = await supabase
                .from('products')
                .update({
                  stock: updatedStock,
                  updated_at: new Date().toISOString()
                })
                .eq('id', prodId);

              if (!updErr) {
                completedKeys.add(originalKey);
              }
            }
          }
        } catch (stkErr) {
          console.warn(`[SyncService] Erreur ajustement stock atomique pour ${prodId}:`, stkErr);
        }
      }
    }

    // 4.8. TRAITEMENT ATOMIQUE DU SOLDE ET POINTS CLIENTS (Zéro écrasement multi-caisses)
    const customerItems = queue.filter(item => item.table === 'customers' && item.action !== 'DELETE');
    for (const item of customerItems) {
      const custId = item.payload?.id || item.recordId;
      const deltaBal = Number(item.payload?.deltaBalance ?? item.payload?.delta_balance) || 0;
      const deltaSpent = Number(item.payload?.deltaSpent ?? item.payload?.delta_spent) || 0;
      const deltaPts = Number(item.payload?.deltaPoints ?? item.payload?.delta_points) || 0;
      const originalKey = `${item.table}:${item.recordId || custId}`;

      if (custId && (deltaBal !== 0 || deltaSpent !== 0 || deltaPts !== 0)) {
        try {
          const { error: rpcErr } = await supabase.rpc('adjust_customer_balance', {
            p_id: String(custId),
            delta_balance: deltaBal,
            delta_spent: deltaSpent,
            delta_points: Math.round(deltaPts)
          });
          if (!rpcErr) {
            completedKeys.add(originalKey);
          }
        } catch (cErr) {
          console.warn('[SyncService] adjust_customer_balance error, fallback to upsert:', cErr);
        }
      }
    }

    // 5. Traitement des Ventes (Transactions) et autres entités
    const otherItems = queue.filter(item => {
      const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
      return !parentTables.includes(targetTable) && 
        targetTable !== 'products' && 
        targetTable !== 'stock_adjustments' &&
        !(targetTable === 'customers' && completedKeys.has(`${item.table}:${item.recordId || item.payload?.id}`)) &&
        item.action !== 'DELETE';
    });

    if (otherItems.length > 0) {
      const itemsByTable = new Map<string, { payload: any; originalKey: string }[]>();
      for (const item of otherItems) {
        const targetTable = TABLE_NAME_MAPPINGS[item.table] || item.table;
        const payload = sanitizePayloadForSupabase(targetTable, item.payload);
        if (!payload.id && item.recordId) payload.id = item.recordId;
        
        // Garantir les timestamps pour les transactions
        if (targetTable === 'transactions') {
          if (!payload.created_at && payload.timestamp) payload.created_at = payload.timestamp;
          if (!payload.timestamp && payload.created_at) payload.timestamp = payload.created_at;
        }

        if (!itemsByTable.has(targetTable)) {
          itemsByTable.set(targetTable, []);
        }
        itemsByTable.get(targetTable)!.push({ payload, originalKey: `${item.table}:${item.recordId || payload.id}` });
      }

      for (const [table, records] of itemsByTable.entries()) {
        for (let i = 0; i < records.length; i += 50) {
          const chunk = records.slice(i, i + 50);
          const allKeys = new Set<string>();
          chunk.forEach((r: any) => Object.keys(r.payload).forEach(k => allKeys.add(k)));
          const payloads = chunk.map((r: any) => {
            const harmonized: any = {};
            allKeys.forEach(k => {
              harmonized[k] = r.payload[k] !== undefined ? r.payload[k] : null;
            });
            return harmonized;
          });
          try {
            const res = await supabase.from(table).upsert(payloads, { onConflict: 'id' });
            if (!res?.error) {
              chunk.forEach((r: any) => completedKeys.add(r.originalKey));
            } else {
              // Fallback un par un si le lot échoue
              for (const single of chunk) {
                try {
                  const sRes = await supabase.from(table).upsert(single.payload, { onConflict: 'id' });
                  if (!sRes?.error) {
                    completedKeys.add(single.originalKey);
                  }
                } catch (_) {}
              }
            }
          } catch (err) {
            // Fallback un par un
            for (const single of chunk) {
              try {
                const sRes = await supabase.from(table).upsert(single.payload, { onConflict: 'id' });
                if (!sRes?.error) {
                  completedKeys.add(single.originalKey);
                }
              } catch (_) {}
            }
          }
        }
      }
    }
  } catch (err: any) {
    if (isNetworkOrTimeoutError(err)) {
      notifyNetworkIssue(err, 'Synchronisation');
    }
    console.warn('[SyncService] Global queue processing encountered error:', err);
  } finally {
    if (watchdog) clearTimeout(watchdog);
    // 🛡️ RETRAIT SÉLECTIF : On ne retire de la file QUE les éléments confirmés par Supabase ou archivés dans Dead Letter Queue
    memorySyncQueue = memorySyncQueue.filter(item => {
      const key = `${item.table}:${item.recordId || item.payload?.id}`;
      if (completedKeys.has(key)) return false;
      item.retryCount = (item.retryCount || 0) + 1;
      if (item.retryCount > 6) {
        console.warn(`[SyncService] Échec persistant après 6 essais pour : ${key}. Sauvegarde dans la Dead Letter Queue.`);
        saveToDeadLetterQueue(item).catch(() => {});
        return false;
      }
      return true;
    });
    persistQueueToIDB();
    notifySyncStatus(false, memorySyncQueue.length);
    isProcessingQueue = false;

    // 🚀 Retry avec backoff exponentiel si des éléments restent dans la file et que le réseau est disponible
    if (memorySyncQueue.length > 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
      const maxRetry = Math.max(1, ...memorySyncQueue.map(i => i.retryCount || 1));
      const backoffDelay = Math.min(1000 * Math.pow(2, Math.min(maxRetry - 1, 5)), 60000);
      scheduleQueueProcessing(backoffDelay);
    }
  }
}

async function saveToDeadLetterQueue(item: SyncPayload): Promise<void> {
  try {
    const existing = (await getIDB<any[]>('nexus_sync_failed')) || [];
    existing.push({
      ...item,
      failedAt: new Date().toISOString()
    });
    await setIDB('nexus_sync_failed', existing);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus-sync-dlq-alert', { detail: { count: existing.length } }));
    }
  } catch (err) {
    console.warn('[SyncService] Impossible d\'ajouter l\'élément au Dead Letter Queue:', err);
  }
}

export async function getFailedSyncQueue(): Promise<any[]> {
  try {
    return (await getIDB<any[]>('nexus_sync_failed')) || [];
  } catch {
    return [];
  }
}

export async function clearFailedSyncQueue(): Promise<void> {
  try {
    await setIDB('nexus_sync_failed', []);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus-sync-dlq-alert', { detail: { count: 0 } }));
    }
  } catch (_) {}
}

export async function retryFailedSyncItem(index: number): Promise<void> {
  try {
    const failed = (await getIDB<any[]>('nexus_sync_failed')) || [];
    if (index >= 0 && index < failed.length) {
      const [item] = failed.splice(index, 1);
      await setIDB('nexus_sync_failed', failed);
      if (item) {
        delete item.retryCount;
        delete (item as any).failedAt;
        enqueueSyncBatch([item]);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus-sync-dlq-alert', { detail: { count: failed.length } }));
      }
    }
  } catch (err) {
    console.warn('[SyncService] Erreur lors de la réimpression de l\'élément échoué:', err);
  }
}

export async function retryAllFailedSyncItems(): Promise<void> {
  try {
    const failed = (await getIDB<any[]>('nexus_sync_failed')) || [];
    if (failed.length > 0) {
      await setIDB('nexus_sync_failed', []);
      const itemsToRetry = failed.map(item => {
        const cleaned = { ...item };
        delete cleaned.retryCount;
        delete (cleaned as any).failedAt;
        return cleaned;
      });
      enqueueSyncBatch(itemsToRetry);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus-sync-dlq-alert', { detail: { count: 0 } }));
      }
    }
  } catch (err) {
    console.warn('[SyncService] Erreur lors de la tentative globale de retry:', err);
  }
}
