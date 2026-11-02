import { get, set } from 'idb-keyval';
import { enqueueStockAdjustment } from '../SyncService';
import { localDb } from '../LocalDatabase';
import { generateUniqueId } from '../../lib/utils';
import { Product } from '../../types';
import { useCoreStore } from '../../store/useCoreStore';
import { CartonIntakeItem } from './cartonTypes';
import { saveCartonTemplate } from './cartonTemplateStorage';

export const STORAGE_KEY = 'nexus_pending_carton_intakes';
export const BROADCAST_CHANNEL_NAME = 'nexus_carton_intake_channel';

// Helper to get broadcast channel safely
export function getChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Récupère les cartons en attente dans la file
 */
export async function getPendingCartonIntakes(): Promise<CartonIntakeItem[]> {
  try {
    const idbItems = await get<CartonIntakeItem[]>(STORAGE_KEY);
    if (Array.isArray(idbItems)) return idbItems;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

/**
 * Ajoute un carton à la file d'attente et notifie tous les onglets/postes
 */
export async function addCartonIntake(intake: Omit<CartonIntakeItem, 'id' | 'timestamp'>): Promise<CartonIntakeItem> {
  const item: CartonIntakeItem = {
    ...intake,
    id: generateUniqueId(),
    timestamp: new Date().toISOString()
  };

  const current = await getPendingCartonIntakes();
  const updated = [item, ...current];

  try {
    await set(STORAGE_KEY, updated);
  } catch {
    // idb error fallback
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  // Mémorisation automatique dans les templates de cartons
  if (intake.cartonPhotoUrl && intake.productId) {
    saveCartonTemplate({
      productId: intake.productId,
      productName: intake.productName,
      unitsPerCarton: intake.unitsPerCarton,
      cartonCostPrice: intake.cartonCostPrice,
      unitCostPrice: intake.unitCostPrice,
      cartonPhotoUrl: intake.cartonPhotoUrl
    }).catch(() => {});
  }

  // Diffusion BroadcastChannel (pour les autres onglets ou fenêtres locales)
  const channel = getChannel();
  if (channel) {
    channel.postMessage({ type: 'CARTON_INTAKE_ADDED', payload: item });
  }

  // Événement local custom
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexus:carton-intake-added', { detail: item }));
  }

  return item;
}

/**
 * Supprime un carton de la file d'attente (ex: après ajout dans le panier)
 */
export async function removeCartonIntake(id: string): Promise<void> {
  const current = await getPendingCartonIntakes();
  const updated = current.filter(item => item.id !== id);

  try {
    await set(STORAGE_KEY, updated);
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  const channel = getChannel();
  if (channel) {
    channel.postMessage({ type: 'CARTON_INTAKE_REMOVED', payload: id });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexus:carton-intake-removed', { detail: id }));
  }
}

/**
 * Valide directement la réception de stock en base de données sans passer par le panier du bureau
 */
export async function directValidateCartonReception(
  intake: CartonIntakeItem,
  product: Product,
  currentUserId?: string,
  currentUserName?: string
): Promise<{ success: boolean; newStock: number }> {
  const totalUnits = intake.totalUnits;
  const currentStock = Number(product.stock) || 0;
  const newStock = currentStock + totalUnits;

  // 1. Incrémenter le stock produit via localDb
  await localDb.update(`products/${product.id}`, {
    ...product,
    stock: newStock,
    costPrice: intake.unitCostPrice || product.costPrice,
    unitsPerParent: intake.unitsPerCarton || product.unitsPerParent || 12,
    updatedAt: new Date().toISOString()
  });

  // Mettre à jour immédiatement le store Zustand en mémoire pour réactivité instantanée
  try {
    useCoreStore.getState().setProducts(prev =>
      prev.map(p => p.id === product.id ? {
        ...p,
        stock: newStock,
        costPrice: intake.unitCostPrice || p.costPrice,
        unitsPerParent: intake.unitsPerCarton || p.unitsPerParent || 12
      } : p)
    );
  } catch (_) {}

  // 2. Enregistrer l'ajustement de stock via la file de synchronisation offline-first
  enqueueStockAdjustment(product.id, totalUnits, {
    reason: `Réception carton mobile (${intake.cartonCount} cartons x ${intake.unitsPerCarton} pcs)`,
    userId: currentUserId,
    userName: currentUserName,
    isLoss: false,
    newQuantity: newStock,
    mode: 'delta'
  });

  // 3. Enregistrer un bon d'achat / réception dans purchases pour historique comptable complet
  const purchaseId = generateUniqueId();
  const purchaseDoc = {
    id: purchaseId,
    supplierId: product.supplier || '',
    supplierName: 'Réception Dépôt Mobile',
    date: new Date().toISOString(),
    status: 'completed',
    paymentStatus: 'paid',
    total: intake.totalCostAmount,
    total_amount: intake.totalCostAmount,
    paidAmount: intake.totalCostAmount,
    notes: `Réception carton mobile: ${intake.cartonCount} cartons de ${intake.unitsPerCarton} unités. P.U: ${intake.unitCostPrice} DA`,
    items: [
      {
        lineId: generateUniqueId(),
        productId: product.id,
        name: product.name,
        quantity: totalUnits,
        costPrice: intake.unitCostPrice,
        discount: 0,
        taxRate: 0,
        imageUrl: product.imageUrl || '',
        cartonCount: intake.cartonCount,
        unitsPerCarton: intake.unitsPerCarton,
        cartonCostPrice: intake.cartonCostPrice,
        cartonPhotoUrl: intake.cartonPhotoUrl
      }
    ],
    documents: intake.cartonPhotoUrl ? [intake.cartonPhotoUrl] : []
  };

  await localDb.insert(`purchases/${purchaseId}`, purchaseDoc);

  // Mémoriser automatiquement l'empreinte du carton si une photo est présente
  if (intake.cartonPhotoUrl && product.id) {
    saveCartonTemplate({
      productId: product.id,
      productName: product.name,
      unitsPerCarton: intake.unitsPerCarton,
      cartonCostPrice: intake.cartonCostPrice,
      unitCostPrice: intake.unitCostPrice,
      cartonPhotoUrl: intake.cartonPhotoUrl,
      productBarcode: product.barcode
    }).catch(() => {});
  }

  // Nettoyer si présent dans la file d'attente
  if (intake.id) {
    await removeCartonIntake(intake.id);
  }

  return { success: true, newStock };
}

/**
 * Hook ou abonnement pour écouter les nouveaux cartons en direct
 */
export function subscribeToCartonIntakes(onNewIntake: (item: CartonIntakeItem) => void): () => void {
  const channel = getChannel();

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'CARTON_INTAKE_ADDED' && event.data.payload) {
      onNewIntake(event.data.payload);
    }
  };

  const handleCustomEvent = (event: Event) => {
    const custom = event as CustomEvent<CartonIntakeItem>;
    if (custom.detail) {
      onNewIntake(custom.detail);
    }
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('nexus:carton-intake-added', handleCustomEvent);
  }

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('nexus:carton-intake-added', handleCustomEvent);
    }
  };
}
