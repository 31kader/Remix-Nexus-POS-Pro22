import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { localDb } from '../../services/LocalDatabase';
import { enqueueStockAdjustment } from '../../services/SyncService';
import { Product, normalizeBatches } from '../../types';
import { logAction, sanitizeProductForSupabase } from '../../lib/utils';
import { ProductFormData } from './productFormInitialState';
import { parseDisplayDate } from './productFormDateHelpers';

interface ExecuteProductSubmitParams {
  formData: ProductFormData;
  editingProduct: Product | null;
  displayExpDate: string;
  subCatId: string;
  parentCatId: string;
  user: any;
  onClose: () => void;
}

export async function executeProductSubmit({
  formData,
  editingProduct,
  displayExpDate,
  subCatId,
  parentCatId,
  user,
  onClose
}: ExecuteProductSubmitParams): Promise<void> {
  const trimmedName = formData.name.trim();
  const trimmedSku = formData.sku.trim();
  
  if (!trimmedName) {
    toast.error("Le nom du produit est obligatoire.");
    return;
  }

  const newPrice = parseFloat(formData.price || '0');
  const newCostPrice = parseFloat(formData.costPrice || '0');
  const newStock = parseFloat(formData.stock || '0');
  
  if (newPrice < 0 || newCostPrice < 0) {
    toast.error("Les prix ne peuvent pas être négatifs.");
    return;
  }

  if (newStock < -1000) {
    toast.error("La valeur de stock semble incorrecte.");
    return;
  }
  
  let priceHistory = editingProduct?.priceHistory || [];
  
  if (editingProduct && (editingProduct.price !== newPrice || editingProduct.costPrice !== newCostPrice)) {
    priceHistory = [
      {
        price: editingProduct.price,
        costPrice: editingProduct.costPrice || 0,
        timestamp: new Date().toISOString(),
        reason: 'Mise à jour manuelle'
      },
      ...priceHistory
    ].slice(0, 50);
  }

  let earliestDate = formData.expirationDate;
  if (!formData.useMultiExpiry && (!earliestDate || earliestDate.trim() === '') && displayExpDate) {
    earliestDate = parseDisplayDate(displayExpDate);
  }
  let primaryBatch = formData.batchNumber;
  const safeBatches = normalizeBatches(formData.batches);
  const batchSum = safeBatches.reduce((acc, b) => acc + (Number(b.stock) || 0), 0);
  const finalStock = (formData.useMultiExpiry && safeBatches.length > 0) ? batchSum : newStock;

  if (formData.useMultiExpiry && safeBatches.length > 0) {
    const sorted = [...safeBatches].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
    earliestDate = sorted[0].expirationDate;
    primaryBatch = sorted[0].batchNumber;
  }

  const chosenCatId = subCatId || parentCatId || formData.categoryId || 'uncategorized';
  const chosenBrandId = formData.brandId || null;

  const data = {
    ...formData,
    name: trimmedName,
    sku: trimmedSku,
    barcode: formData.barcode ? formData.barcode.trim() : null,
    supplier: formData.supplier ? formData.supplier.trim() : '',
    showInPos: formData.showInPos !== false,
    isQuickSelect: !!formData.isQuickSelect,
    damagedStock: parseFloat(formData.damagedStock || '0') || 0,
    price: newPrice,
    costPrice: newCostPrice,
    taxRate: parseFloat(formData.taxRate || '0'),
    stock: finalStock,
    minStock: parseFloat(formData.minStock || '5'),
    unitsPerParent: formData.unitsPerParent ? parseFloat(formData.unitsPerParent) : null,
    parentId: formData.parentId || null,
    autoUnpack: !!formData.autoUnpack,
    wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : null,
    onlinePrice: formData.onlinePrice ? parseFloat(formData.onlinePrice) : null,
    tags: formData.tags ? (Array.isArray(formData.tags) ? formData.tags : formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)) : [],
    categoryId: chosenCatId,
    brandId: chosenBrandId,
    updatedAt: new Date().toISOString(),
    expirationDate: earliestDate ? earliestDate.trim() : null,
    batchNumber: primaryBatch || null,
    priceHistory,
    operationalCosts: {
      packaging: formData.operationalCosts.packaging ? parseFloat(formData.operationalCosts.packaging) : null,
      shipping: formData.operationalCosts.shipping ? parseFloat(formData.operationalCosts.shipping) : null,
      other: formData.operationalCosts.other ? parseFloat(formData.operationalCosts.other) : null,
    }
  };

  try {
    // Fermer immédiatement la fenêtre pour une réactivité instantanée
    onClose();

    if (editingProduct && editingProduct.id) {
      const oldStock = Number(editingProduct.stock) || 0;
      const stockChanged = finalStock !== oldStock;

      if (stockChanged) {
        enqueueStockAdjustment(editingProduct.id, finalStock, {
          mode: 'set',
          newQuantity: finalStock,
          reason: 'Correction manuelle formulaire produit'
        });
      }

      const updatedProduct = {
        ...editingProduct,
        ...data,
        stock: finalStock,
        id: editingProduct.id
      } as Product;
      
      window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProduct }));
      localDb.update(`products/${editingProduct.id}`, updatedProduct).catch(console.error);

      if (isSupabaseConfigured) {
        const supabasePayload = sanitizeProductForSupabase(updatedProduct);
        if (stockChanged) {
          delete supabasePayload.stock;
        }
        delete supabasePayload.stock; 
        delete supabasePayload.id; 
        delete supabasePayload.created_at; 
        supabase.from('products').update(supabasePayload).eq('id', editingProduct.id).then(({ error }: { error: any }) => {
          if (error) console.warn('[Supabase Direct Update] Retrying via SyncService:', error.message);
        }).catch(console.warn);
      }

      logAction(user?.uid || 'admin', user?.displayName || 'Utilisateur', 'Modification Produit', 'Inventaire', `Produit: ${data.name}, SKU: ${data.sku}`);
      toast.success(`Produit "${data.name}" mis à jour !`);
    } else {
      const newProductId = Math.random().toString(36).substring(2, 11);
      const createdProduct = {
        ...data,
        id: newProductId,
        createdAt: new Date().toISOString()
      } as Product;
      
      window.dispatchEvent(new CustomEvent('product-cache-update', { detail: createdProduct }));
      localDb.insert(`products/${newProductId}`, createdProduct).catch(console.error);

      if (isSupabaseConfigured) {
        const supabasePayload = sanitizeProductForSupabase(createdProduct);
        supabase.from('products').insert(supabasePayload).then(({ error }: { error: any }) => {
          if (error) console.warn('[Supabase Direct Insert] Retrying via SyncService:', error.message);
        }).catch(console.warn);
      }

      logAction(user?.uid || 'admin', user?.displayName || 'Utilisateur', 'Création Produit', 'Inventaire', `Produit: ${data.name}, SKU: ${data.sku}`);
      toast.success(`Nouveau produit "${data.name}" créé avec succès !`);
    }
  } catch (error: any) {
    console.error("Error submitting product:", error);
    toast.error("Erreur lors de la sauvegarde: " + error.message);
  }
}
