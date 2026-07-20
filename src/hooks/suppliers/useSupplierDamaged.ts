import { useState } from 'react';
import { supabase } from '../../supabase';
import { convertKeysToSnake } from '../../lib/db-converters';
import { enqueueStockAdjustment } from '../../services/SyncService';
import { localDb } from '../../services/LocalDatabase';
import { Product, DamagedRecord } from '../../types';

interface UseSupplierDamagedParams {
  user: any;
}

export function useSupplierDamaged({ user }: UseSupplierDamagedParams) {
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [selectedProductForDamage, setSelectedProductForDamage] = useState<Product | null>(null);
  const [damageData, setDamageData] = useState({ quantity: 1, reason: '' });
  const [isProcessingDamage, setIsProcessingDamage] = useState(false);

  const handleDamageSubmit = async () => {
    if (!selectedProductForDamage || damageData.quantity <= 0) return;
    setIsProcessingDamage(true);
    try {
      const recordId = Math.random().toString(36).substring(2, 11);
      const record: DamagedRecord = {
        id: recordId,
        productId: selectedProductForDamage.id,
        productName: selectedProductForDamage.name,
        quantity: damageData.quantity,
        reason: damageData.reason,
        date: new Date().toISOString(),
        userId: user?.uid || 'system',
        userName: user?.displayName || 'Admin',
        claimStatus: 'to_claim',
        costPrice: selectedProductForDamage.costPrice || 0
      };
      
      const snakeRecord = convertKeysToSnake(record);
      const { error: recordError } = await supabase
        .from('damaged_items')
        .insert(snakeRecord);
      if (recordError) throw recordError;

      // Adjust stock via sync queue
      if (selectedProductForDamage.id && selectedProductForDamage.id !== 'undefined') {
        enqueueStockAdjustment(selectedProductForDamage.id, -damageData.quantity);
        const currentDamaged = selectedProductForDamage.damagedStock || 0;
        localDb.update(`products/${selectedProductForDamage.id}`, {
          damagedStock: currentDamaged + damageData.quantity,
          updatedAt: new Date().toISOString()
        });
      }

      setIsDamageModalOpen(false);
      setSelectedProductForDamage(null);
      setDamageData({ quantity: 1, reason: '' });
    } catch (error: any) {
      console.error("Error submitting damage record:", error);
      alert("Erreur de signalement : " + error.message);
    } finally {
      setIsProcessingDamage(false);
    }
  };

  const handleUpdateClaimStatus = async (recordId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('damaged_items')
        .update({
          claim_status: status as any
        })
        .eq('id', recordId);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating claim status:", error);
      alert("Erreur: " + error.message);
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
