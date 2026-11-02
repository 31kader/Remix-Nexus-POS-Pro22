import { get, set } from 'idb-keyval';
import { enqueueStockAdjustment } from '../SyncService';
import { localDb } from '../LocalDatabase';
import { generateUniqueId } from '../../lib/utils';
import { Product } from '../../types';
import { useCoreStore } from '../../store/useCoreStore';
import { CartonTemplate, CartonRecognitionResult } from './cartonTypes';
import { computeImageDHash, detectBarcodeFromImage } from './cartonHasher';

export const TEMPLATES_STORAGE_KEY = 'nexus_carton_templates';

export let inMemoryCartonTemplates: CartonTemplate[] | null = null;

export function setInMemoryCartonTemplates(templates: CartonTemplate[] | null) {
  inMemoryCartonTemplates = templates;
}

export async function refreshCartonTemplatesFromSupabase(): Promise<CartonTemplate[] | null> {
  try {
    const { supabase, isSupabaseConfigured } = await import('../../supabase');
    if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return null;
    }
    const { data, error } = await supabase.from('carton_templates').select('*');
    if (error || !Array.isArray(data)) return null;

    const { convertKeysToCamel } = await import('../../lib/db-converters');
    const formatted: CartonTemplate[] = data.map((row: any) => {
      const camel = convertKeysToCamel(row);
      return {
        id: camel.id,
        productId: camel.productId,
        productName: camel.productName,
        unitsPerCarton: Number(camel.unitsPerCarton) || 12,
        cartonCostPrice: Number(camel.cartonCostPrice) || 0,
        unitCostPrice: Number(camel.unitCostPrice) || 0,
        retailPrice: Number(camel.retailPrice) || 0,
        wholesalePrice: Number(camel.wholesalePrice) || 0,
        sku: camel.sku || '',
        cartonPhotoUrl: camel.cartonPhotoUrl || '',
        barcode: camel.barcode ? String(camel.barcode).trim() : undefined,
        productBarcode: camel.productBarcode ? String(camel.productBarcode).trim() : undefined,
        dHash: camel.dhash || camel.dHash,
        colorSignature: camel.colorSignature,
        updatedAt: camel.updatedAt || new Date().toISOString(),
        usageCount: Number(camel.usageCount) || 1
      };
    });

    inMemoryCartonTemplates = formatted;
    set(TEMPLATES_STORAGE_KEY, formatted).catch(() => {});
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(formatted));
    } catch {}

    for (const t of formatted) {
      localDb.insertLocalOnly(`carton_templates/${t.id}`, t).catch(() => {});
    }

    return formatted;
  } catch (err) {
    console.warn('[CartonIntakeService] Error refreshing from Supabase:', err);
    return null;
  }
}

/**
 * Récupère tous les modèles de cartons mémorisés (Templates)
 */
export async function getCartonTemplates(forceRefresh: boolean = false): Promise<CartonTemplate[]> {
  if (!forceRefresh && inMemoryCartonTemplates && inMemoryCartonTemplates.length > 0) {
    return inMemoryCartonTemplates;
  }

  try {
    const idbItems = await get<CartonTemplate[]>(TEMPLATES_STORAGE_KEY);
    if (Array.isArray(idbItems) && idbItems.length > 0) {
      inMemoryCartonTemplates = idbItems;
      if (!forceRefresh) {
        refreshCartonTemplatesFromSupabase().catch(() => {});
        return idbItems;
      }
    }

    const snap = await localDb.get('carton_templates');
    if (snap?.exists() && snap.val()) {
      const list = Object.values(snap.val()) as CartonTemplate[];
      if (list.length > 0) {
        inMemoryCartonTemplates = list;
        set(TEMPLATES_STORAGE_KEY, list).catch(() => {});
        if (!forceRefresh) {
          refreshCartonTemplatesFromSupabase().catch(() => {});
          return list;
        }
      }
    }

    const remote = await refreshCartonTemplatesFromSupabase();
    if (remote && remote.length > 0) return remote;

    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCartonTemplates = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return inMemoryCartonTemplates || [];
}

/**
 * Enregistre ou met à jour la mémoire d'un carton (Template)
 * Associe l'image du carton, son empreinte visuelle et son colisage avec le produit
 */
export async function saveCartonTemplate(data: {
  id?: string;
  productId: string;
  productName: string;
  unitsPerCarton: number;
  cartonCostPrice: number;
  unitCostPrice: number;
  retailPrice?: number;
  wholesalePrice?: number;
  sku?: string;
  cartonPhotoUrl: string;
  barcode?: string;
  productBarcode?: string;
}): Promise<CartonTemplate> {
  const templates = await getCartonTemplates();
  const existingIdx = data.id
    ? templates.findIndex(t => t.id === data.id)
    : templates.findIndex(t => t.productId === data.productId);
  const existing = existingIdx >= 0 ? templates[existingIdx] : null;

  // Calcul de la signature visuelle dHash et couleur
  let dHash = existing?.dHash;
  let colorSignature = existing?.colorSignature;

  if (data.cartonPhotoUrl && !dHash) {
    try {
      const visualSig = await computeImageDHash(data.cartonPhotoUrl);
      if (visualSig) {
        dHash = visualSig.dHash;
        colorSignature = visualSig.avgColor;
      }
    } catch {}
  }

  // Détection éventuelle de code-barres dans la photo du carton
  let detectedBarcode = data.barcode !== undefined ? data.barcode : existing?.barcode;
  if (!detectedBarcode && data.cartonPhotoUrl) {
    try {
      const scanned = await detectBarcodeFromImage(data.cartonPhotoUrl);
      if (scanned) detectedBarcode = scanned;
    } catch {}
  }

  const cleanSku = data.sku || existing?.sku || (detectedBarcode ? `CART-${detectedBarcode}` : `CART-${generateUniqueId().slice(0, 6).toUpperCase()}`);

  const template: CartonTemplate = {
    id: data.id || existing?.id || generateUniqueId(),
    productId: data.productId,
    productName: data.productName,
    unitsPerCarton: Number(data.unitsPerCarton) || 12,
    cartonCostPrice: Number(data.cartonCostPrice) || 0,
    unitCostPrice: Number(data.unitCostPrice) || 0,
    retailPrice: Number(data.retailPrice) || existing?.retailPrice || 0,
    wholesalePrice: Number(data.wholesalePrice) || existing?.wholesalePrice || 0,
    sku: cleanSku,
    cartonPhotoUrl: data.cartonPhotoUrl || existing?.cartonPhotoUrl || '',
    barcode: detectedBarcode ? detectedBarcode.trim() : undefined,
    productBarcode: data.productBarcode || existing?.productBarcode,
    dHash,
    colorSignature,
    updatedAt: new Date().toISOString(),
    usageCount: (existing?.usageCount || 0) + 1
  };

  const updatedTemplates = existingIdx >= 0
    ? templates.map((t, idx) => idx === existingIdx ? template : t)
    : [template, ...templates];

  inMemoryCartonTemplates = updatedTemplates;

  try {
    await set(TEMPLATES_STORAGE_KEY, updatedTemplates);
  } catch {}

  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updatedTemplates));
  } catch {}

  // Synchronisation avec localDb (qui synchronisera automatiquement vers Supabase)
  try {
    if (existing) {
      await localDb.update(`carton_templates/${template.id}`, template);
    } else {
      await localDb.insert(`carton_templates/${template.id}`, template);
    }
  } catch {}

  // Mise à jour du produit dans la base locale et le store
  try {
    const productSnap = await localDb.get(`products/${data.productId}`);
    if (productSnap?.exists() && productSnap.val()) {
      const currentProd = productSnap.val();
      const updatedProd = {
        ...currentProd,
        unitsPerParent: template.unitsPerCarton,
        cartonPhotoUrl: template.cartonPhotoUrl || currentProd.cartonPhotoUrl
      };
      await localDb.update(`products/${data.productId}`, updatedProd);
      useCoreStore.getState().setProducts(prev =>
        prev.map(p => p.id === data.productId ? { ...p, ...updatedProd } : p)
      );
    }
  } catch {}

  return template;
}

/**
 * Ajuste le stock d'un produit en ajoutant ou retirant un nombre entier de cartons
 * Met à jour instantanément localDb, le store Zustand et envoie l'ajustement à SyncService
 */
export async function quickAdjustCartonStock(
  template: CartonTemplate,
  cartonDelta: number, // +1, -1, +5, etc.
  product: Product,
  currentUserId?: string,
  currentUserName?: string
): Promise<{ newUnitsStock: number; newCartonStock: number }> {
  const unitsPerCarton = template.unitsPerCarton || product.unitsPerParent || 12;
  const unitsDelta = cartonDelta * unitsPerCarton;
  const currentUnits = Number(product.stock) || 0;
  const newUnitsStock = Math.max(0, currentUnits + unitsDelta);
  const newCartonStock = Math.floor(newUnitsStock / unitsPerCarton);

  // 1. Mettre à jour localDb
  await localDb.update(`products/${product.id}`, {
    ...product,
    stock: newUnitsStock,
    updatedAt: new Date().toISOString()
  });

  // 2. Mettre à jour le store Zustand
  try {
    useCoreStore.getState().setProducts(prev =>
      prev.map(p => p.id === product.id ? { ...p, stock: newUnitsStock } : p)
    );
  } catch (_) {}

  // 3. Diffuser l'ajustement via SyncService
  enqueueStockAdjustment(product.id, unitsDelta, {
    reason: `Ajustement stock carton (${cartonDelta > 0 ? '+' : ''}${cartonDelta} ct)`,
    userId: currentUserId,
    userName: currentUserName,
    isLoss: cartonDelta < 0,
    newQuantity: newUnitsStock,
    mode: 'delta'
  });

  return { newUnitsStock, newCartonStock };
}

/**
 * Supprime un modèle de carton de la mémoire
 */
export async function deleteCartonTemplate(id: string): Promise<void> {
  const templates = await getCartonTemplates();
  const filtered = templates.filter(t => t.id !== id);

  inMemoryCartonTemplates = filtered;

  try {
    await set(TEMPLATES_STORAGE_KEY, filtered);
  } catch {}

  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}

  try {
    await localDb.delete(`carton_templates/${id}`);
  } catch {}
}

// Réexportation transparente du moteur de reconnaissance automatique
export { recognizeCarton } from './cartonRecognition';
