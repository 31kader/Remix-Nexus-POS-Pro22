import { supabase, isSupabaseConfigured } from '../supabase';
import { enqueueStockAdjustment, enqueueSync, loadPendingSyncQueue } from './SyncService';
import { localDb } from './LocalDatabase';
import { useCoreStore } from '../store/useCoreStore';
import { Product } from '../types';

export interface ApplyStockParams {
  productId: string;
  value: number; // delta relatif OU valeur absolue cible selon mode
  mode?: 'delta' | 'set';
  adjustmentId?: string;
  reason?: string;
  userId?: string;
  userName?: string;
  isLoss?: boolean;
}

export interface ApplyStockResult {
  success: boolean;
  newStock: number;
  adjustmentId: string;
  appliedDirectly: boolean;
  error?: any;
}

/**
 * ⚡ Service Unifié d'Ajustement de Stock (Atomique, Idempotent, Offline-First)
 * 
 * - Si en ligne : exécute le RPC PostgreSQL `apply_stock_adjustment` avec verrouillage FOR UPDATE.
 *   L'ID unique (p_adj_id) garantit qu'une requête rejouée n'appliquera jamais le delta deux fois.
 * - Si hors-ligne ou erreur réseau : bascule dans la file persistante SyncService avec le même p_adj_id.
 * - Met à jour le cache local (Zustand + IndexedDB) de façon immédiate et cohérente.
 */
export async function applyStockAdjustment(params: ApplyStockParams): Promise<ApplyStockResult> {
  const {
    productId,
    value,
    mode = 'delta',
    reason = 'Ajustement stock',
    userId,
    userName,
    isLoss = false
  } = params;

  // 1. Clé d'idempotence unique et déterministe
  const adjustmentId = params.adjustmentId || `adj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

  // 2. Récupérer le produit en mémoire pour calcul optimiste local
  const currentProduct = useCoreStore.getState().products.find(p => p.id === productId);
  const currentStock = Number(currentProduct?.stock || 0);
  const expectedStock = mode === 'set' ? value : currentStock + value;

  let directSuccess = false;
  let finalStock = expectedStock;
  let directError: any = null;

  // 🛡️ P1-SYNC-11 : Vérifier si des ajustements ou deltas pour ce produit sont déjà en attente dans la file SyncService.
  // Si oui, NE PAS court-circuiter avec un RPC direct pour préserver l'ordre chronologique des deltas !
  const pendingQueue = loadPendingSyncQueue();
  const hasPendingAdjustments = pendingQueue.some(
    i => (i.table === 'stock_adjustments' || i.table === 'stockAdjustments' || i.table === 'products') &&
         (String(i.recordId) === String(productId) || String(i.payload?.productId) === String(productId))
  );

  // 3. Tentative Direct-Write-First si le terminal est connecté ET qu'aucun delta n'est en attente
  if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine && !hasPendingAdjustments) {
    try {
      const { data, error } = await supabase.rpc('apply_stock_adjustment', {
        p_id: String(productId),
        p_value: value,
        p_mode: mode,
        p_adj_id: adjustmentId,
        p_reason: reason,
        p_user_id: userId || null,
        p_user_name: userName || null,
        p_is_loss: isLoss
      });

      if (!error && data !== null && data !== undefined) {
        directSuccess = true;
        finalStock = Number(data);
      } else {
        directError = error;
        console.warn(`[StockService] Échec RPC direct apply_stock_adjustment (${productId}):`, error);
      }
    } catch (netErr) {
      directError = netErr;
      console.warn(`[StockService] Erreur réseau direct-write (${productId}):`, netErr);
    }
  }

  // 4. Mise à jour locale (Zustand + IndexedDB)
  const nowIso = new Date().toISOString();
  if (currentProduct) {
    const updatedProd: Product = {
      ...currentProduct,
      stock: finalStock,
      updatedAt: nowIso
    };
    useCoreStore.getState().setProducts(prev => (prev || []).map(p => p.id === productId ? updatedProd : p));
    window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProd }));
    
    // 🛡️ P1-SYNC-03 : Toujours utiliser updateLocalOnly sur les produits pour éliminer
    // la concurrence de snapshot absolu qui écraserait les deltas relatifs stock_adjustments
    await localDb.updateLocalOnly(`products/${productId}`, {
      stock: finalStock,
      updatedAt: nowIso
    });
  }

  // 5. Si échec ou hors-ligne, mise en file d'attente avec la clé d'idempotence exacte
  if (!directSuccess) {
    enqueueStockAdjustment(productId, mode === 'delta' ? value : (value - currentStock), {
      mode,
      adjustmentId,
      reason,
      userId,
      userName,
      isLoss,
      newQuantity: finalStock
    });
  }

  return {
    success: directSuccess,
    newStock: finalStock,
    adjustmentId,
    appliedDirectly: directSuccess,
    error: directError
  };
}
