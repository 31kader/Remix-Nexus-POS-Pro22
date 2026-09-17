import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { preparePayload } from '../../lib/db-converters';
import { enqueueStockAdjustment, enqueueSyncBatch } from '../../services/SyncService';
import { localDb } from '../../services/LocalDatabase';
import { useInventoryStore } from '../../store/useInventoryStore';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { Product, DamagedRecord, Supplier } from '../../types';
import { toast } from 'sonner';

interface UseSupplierDamagedParams {
  user: any;
  viewingDetailsSupplier?: Supplier | null;
}

export function useSupplierDamaged({ user, viewingDetailsSupplier }: UseSupplierDamagedParams) {
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [selectedProductForDamage, setSelectedProductForDamage] = useState<Product | null>(null);
  const [damageData, setDamageData] = useState({ quantity: 1, reason: '' });
  const [isProcessingDamage, setIsProcessingDamage] = useState(false);

  const handleDamageSubmit = async () => {
    if (!selectedProductForDamage || damageData.quantity <= 0) return;
    setIsProcessingDamage(true);
    try {
      const recordId = 'dmg_' + Date.now() + Math.random().toString(36).substring(2, 6);
      const record: DamagedRecord = {
        id: recordId,
        productId: selectedProductForDamage.id,
        productName: selectedProductForDamage.name,
        quantity: damageData.quantity,
        reason: damageData.reason || 'Article défectueux',
        date: new Date().toISOString(),
        userId: user?.uid || 'system',
        userName: user?.displayName || 'Admin',
        claimStatus: 'to_claim',
        costPrice: Number(selectedProductForDamage.costPrice || 0)
      };

      if (viewingDetailsSupplier?.id) {
        (record as any).supplierId = viewingDetailsSupplier.id;
        (record as any).supplier_id = viewingDetailsSupplier.id;
      }

      // 1. Mettre à jour immédiatement le store Zustand et le cache IndexedDB
      useInventoryStore.getState().setDamagedItems(prev => [record, ...(Array.isArray(prev) ? prev : [])]);
      idbGet<any[]>('nexus_damaged_items_cache').then(cached => {
        const next = [record, ...(Array.isArray(cached) ? cached : [])];
        idbSet('nexus_damaged_items_cache', next).catch(() => {});
      }).catch(() => {});

      // 2. Adjust stock via sync queue
      if (selectedProductForDamage.id && selectedProductForDamage.id !== 'undefined') {
        enqueueStockAdjustment(selectedProductForDamage.id, -damageData.quantity);
        const currentDamaged = selectedProductForDamage.damagedStock || 0;
        localDb.update(`products/${selectedProductForDamage.id}`, {
          damagedStock: currentDamaged + damageData.quantity,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }

      // 3. Synchronisation Supabase
      if (isSupabaseConfigured) {
        try {
          const payload = preparePayload('damaged_items', record.id, record);
          const { error: recordError } = await supabase
            .from('damaged_items')
            .insert(payload);
          if (recordError) throw recordError;
        } catch (cloudErr) {
          console.warn("Supabase damaged_items insert error, enqueuing:", cloudErr);
          enqueueSyncBatch([{
            table: 'damaged_items',
            action: 'UPSERT',
            recordId: record.id,
            payload: preparePayload('damaged_items', record.id, record)
          }]);
        }
      }

      toast.success(`Article défectueux enregistré avec succès (${damageData.quantity} unité(s)).`);
      setIsDamageModalOpen(false);
      setSelectedProductForDamage(null);
      setDamageData({ quantity: 1, reason: '' });
    } catch (error: any) {
      console.error("Error submitting damage record:", error);
      toast.error("Erreur de signalement : " + error.message);
    } finally {
      setIsProcessingDamage(false);
    }
  };

  const handleUpdateClaimStatus = async (recordId: string, status: string) => {
    try {
      // 1. Mise à jour locale immédiate
      useInventoryStore.getState().setDamagedItems(prev => 
        (Array.isArray(prev) ? prev : []).map(d => d.id === recordId ? { ...d, claimStatus: status as any } : d)
      );

      // 2. Supabase
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('damaged_items')
          .update({
            claim_status: status as any
          })
          .eq('id', recordId);
        if (error) throw error;
      }
      toast.success("Statut de la réclamation mis à jour.");
    } catch (error: any) {
      console.error("Error updating claim status:", error);
      toast.error("Erreur: " + error.message);
    }
  };

  return {
    isDamageModalOpen,
    setIsDamageModalOpen,
    selectedProductForDamage,
    setSelectedProductForDamage,
    damageData,
    setDamageData,
    isProcessingDamage,
    setIsProcessingDamage,
    handleDamageSubmit,
    handleUpdateClaimStatus
  };
}
