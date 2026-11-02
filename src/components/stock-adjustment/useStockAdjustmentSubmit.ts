import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { convertKeysToSnake } from '../../lib/db-converters';
import { applyStockAdjustment } from '../../services/stockService';
import { localDb } from '../../services/LocalDatabase';
import { Product, CompanySettings } from '../../types';
import { normalizeBatches } from '../../types/products';
import { toast } from 'sonner';
import { useCoreStore } from '../../store/useCoreStore';
import { useInventoryStore } from '../../store/useInventoryStore';

interface UseStockAdjustmentSubmitParams {
  product: Product | null;
  user: any;
  settings: CompanySettings;
  newStock: number | '';
  localBatches: any[];
  reason: string;
  isLoss: boolean;
  onClose: () => void;
}

export function useStockAdjustmentSubmit({
  product,
  user,
  newStock,
  localBatches,
  reason,
  isLoss,
  onClose
}: UseStockAdjustmentSubmitParams) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (newStock === '' || newStock === (product.stock || 0)) return;
    if (!product.id || product.id === 'undefined') {
      toast.error("Impossible de modifier le stock : ID du produit manquant.");
      return;
    }

    setIsProcessing(true);
    try {
      const currentStock = Number(product.stock || 0);
      const targetStock = Number(newStock);
      const delta = targetStock - currentStock;
      const isLossRecord = delta < 0 && isLoss;
      
      let earliestDate = product.expirationDate;
      let primaryBatch = product.batchNumber;
      if (product.useMultiExpiry && localBatches.length > 0) {
        const sorted = [...localBatches].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
        earliestDate = sorted[0].expirationDate;
        primaryBatch = sorted[0].batchNumber;
      }

      const safeUserId = user?.uid || user?.id || 'system';
      const safeUserName = user?.displayName || user?.name || 'Inconnu';

      // Clé d'idempotence unique et déterministe (identique entre Direct-Write et Offline Queue)
      const adjustmentId = `adj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

      // ⚡ EXÉCUTION ATOMIQUE & IDEMPOTENTE VIA LE SERVICE UNIFIÉ (T5)
      const result = await applyStockAdjustment({
        productId: product.id,
        value: targetStock,
        mode: 'set',
        adjustmentId,
        reason: reason || (delta < 0 ? 'Ajustement négatif' : 'Ajustement positif'),
        userId: safeUserId,
        userName: safeUserName,
        isLoss: isLossRecord
      });

      const returnedStock = result.newStock;
      const actualDelta = returnedStock - currentStock;
      const nowIso = new Date().toISOString();

      // Métadonnées produit complémentaires (lots, dates de péremption, pertes)
      const normalizedExistingBatches = normalizeBatches(product.batches);
      const updatedProduct: Product = {
        ...product,
        stock: returnedStock,
        batches: product.useMultiExpiry 
          ? (localBatches.length > 0 ? localBatches : undefined)
          : (normalizedExistingBatches.length > 0 ? normalizedExistingBatches : undefined),
        expirationDate: earliestDate,
        batchNumber: primaryBatch,
        damagedStock: isLossRecord ? (product.damagedStock || 0) + Math.abs(actualDelta) : (product.damagedStock || 0),
        updatedAt: nowIso
      };

      // Persister localement dans LocalDatabase et useCoreStore
      await (localDb.updateLocalOnly ?? localDb.update)(`products/${product.id}`, updatedProduct);
      useCoreStore.getState().setProducts(prev =>
        (prev || []).map(p => p.id === product.id ? updatedProduct : p)
      );

      // Mettre à jour les métadonnées produit dans Supabase (hors colonne stock déjà traitée par le RPC)
      if (result.appliedDirectly && isSupabaseConfigured) {
        try {
          await supabase.from('products').update({
            damaged_stock: updatedProduct.damagedStock,
            batches: updatedProduct.batches || null,
            expiration_date: updatedProduct.expirationDate || null,
            batch_number: updatedProduct.batchNumber || null
          }).eq('id', product.id);
        } catch (syncErr) {
          console.warn("[StockAdjustmentModal] Warning updating product metadata on Supabase:", syncErr);
        }
      } else {
        await localDb.update(`products/${product.id}`, {
          damagedStock: updatedProduct.damagedStock,
          batches: updatedProduct.batches || null,
          expirationDate: updatedProduct.expirationDate || null,
          batchNumber: updatedProduct.batchNumber || null,
          updatedAt: nowIso
        });
      }

      // Enregistrement d'audit dans l'historique local avec le même adjustmentId
      const adjustmentData = {
        id: adjustmentId,
        productId: product.id,
        productName: product.name,
        oldQuantity: currentStock,
        newQuantity: returnedStock,
        adjustment: actualDelta,
        quantity: actualDelta,
        type: actualDelta > 0 ? 'found' : 'damage',
        reason: reason,
        userId: safeUserId,
        userName: safeUserName,
        date: nowIso,
        timestamp: nowIso,
        isLoss: isLossRecord
      };

      await localDb.insertLocalOnly(`stock_adjustments/${adjustmentId}`, adjustmentData);

      // ⚡ Synchronisation temps réel avec useInventoryStore
      useInventoryStore.getState().setStockAdjustments(prev => [adjustmentData as any, ...(prev || [])]);

      if (isLossRecord) {
        const damId = `dam_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        const damRecord = {
          id: damId,
          productId: product.id,
          productName: product.name,
          quantity: Math.abs(actualDelta),
          reason: reason || "Perte/casse via ajustement",
          date: nowIso,
          userId: safeUserId,
          userName: safeUserName,
          claimStatus: 'to_claim' as const,
          costPrice: product.costPrice || 0
        };
        if (result.appliedDirectly) {
          try {
            await supabase.from('damaged_items').insert(convertKeysToSnake(damRecord));
          } catch (damErr) {
            console.warn("[StockAdjustmentModal] Warning inserting damaged item on Supabase:", damErr);
          }
          await localDb.insertLocalOnly(`damaged_items/${damId}`, damRecord);
        } else {
          await localDb.insert(`damaged_items/${damId}`, damRecord);
        }
        useInventoryStore.getState().setDamagedItems(prev => [damRecord as any, ...(prev || [])]);
      }

      // ⚡ Mise à jour du cache persistant IndexedDB
      try {
        const { get: getIDB, set: setIDB } = await import('idb-keyval');
        const cached = (await getIDB<any[]>('nexus_stock_adjustments_cache')) || [];
        await setIDB('nexus_stock_adjustments_cache', [adjustmentData, ...cached]);
      } catch (_) {}

      window.dispatchEvent(new CustomEvent('stock-adjustment-created', { detail: adjustmentData }));
      toast.success(isLossRecord ? "Perte déclarée et synchronisée avec le rapport des pertes !" : "Stock ajusté avec succès !");

      onClose();
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      toast.error("Erreur lors de l'ajustement: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    handleSubmit
  };
}
