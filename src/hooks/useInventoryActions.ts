import { useState } from 'react';
import { supabase } from '../supabase';
import { Product } from '../types';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { toast } from 'sonner';
import { logAction } from '../lib/utils';

interface UseInventoryActionsParams {
  products: Product[];
  duplicateSKUGroups: { sku: string; products: Product[] }[];
  user: any;
  setConfirmAction: (action: any) => void;
  selectedProductIds: string[];
  setIsBulkUpdateModalOpen: (val: boolean) => void;
  setSelectedProductIds: (ids: string[]) => void;
  setIsMassDeleteConfirmOpen: (val: boolean) => void;
}

export function useInventoryActions({
  products,
  duplicateSKUGroups,
  user,
  setConfirmAction,
  selectedProductIds,
  setIsBulkUpdateModalOpen,
  setSelectedProductIds,
  setIsMassDeleteConfirmOpen
}: UseInventoryActionsParams) {
  const [isAutoMerging, setIsAutoMerging] = useState(false);
  const [autoMergeProgress, setAutoMergeProgress] = useState(0);
  const [isMassDeleting, setIsMassDeleting] = useState(false);
  const [massDeleteProgress, setMassDeleteProgress] = useState(0);
  const [isMassUpdating, setIsMassUpdating] = useState(false);

  const [bulkUpdateCategory, setBulkUpdateCategory] = useState(false);
  const [bulkUpdateBrand, setBulkUpdateBrand] = useState(false);
  const [bulkParentCatId, setBulkParentCatId] = useState('');
  const [bulkSubCatId, setBulkSubCatId] = useState('');
  const [bulkBrandId, setBulkBrandId] = useState('');

  const handleAutoResolveAll = async () => {
    const groupsToProcess = [...duplicateSKUGroups];
    if (groupsToProcess.length === 0) return;
    
    setConfirmAction({
      title: "Fusion Automatique",
      message: `Voulez-vous fusionner AUTOMATIQUEMENT les ${groupsToProcess.length} groupes de doublons ? Les stocks seront additionnés pour chaque groupe.`,
      onConfirm: async () => {
        setIsAutoMerging(true);
        setAutoMergeProgress(0);
        let successCount = 0;

        try {
          for (let i = 0; i < groupsToProcess.length; i++) {
            const group = groupsToProcess[i];
            if (!group || !group.products || group.products.length < 2) continue;

            const [mainProduct, ...others] = group.products;
            const totalStock = group.products.reduce((acc, p) => acc + (p.stock || 0), 0);
            
            const updatedAt = new Date().toISOString();
            
            // In Supabase (via sync queue), update main product stock
            const delta = totalStock - (mainProduct.stock || 0);
            enqueueStockAdjustment(mainProduct.id, delta);
            localDb.update(`products/${mainProduct.id}`, { updatedAt });

            // Delete other duplicate products in localDb
            const otherIds = others.map(other => other.id);
            for (const otherId of otherIds) {
              await localDb.delete(`products/${otherId}`);
            }
            
            window.dispatchEvent(new CustomEvent('product-cache-update', { 
              detail: { ...mainProduct, stock: totalStock, updatedAt } 
            }));
            
            others.forEach(other => {
              window.dispatchEvent(new CustomEvent('product-cache-delete', { detail: { id: other.id } }));
            });
            successCount++;
            setAutoMergeProgress(((i + 1) / groupsToProcess.length) * 100);
          }
          toast.success(`Nettoyage terminé : ${successCount} groupes fusionnés.`);
        } catch (err) {
          console.error('Auto merge failed:', err);
          toast.error("Erreur lors de la fusion automatique.");
        } finally {
          setIsAutoMerging(false);
          setAutoMergeProgress(0);
          setConfirmAction(null);
        }
      }
    });
  };

  const handleMassDeleteProducts = async () => {
    setIsMassDeleting(true);
    setMassDeleteProgress(0);
    try {
      // Delete all products via localDb
      await localDb.delete('products');
      
      window.dispatchEvent(new CustomEvent('products-batch-delete', { detail: { ids: products.map(d => d.id) } }));
      setIsMassDeleteConfirmOpen(false);
      toast.success("Tous les produits ont été supprimés.");
    } catch (error) {
      console.error("Mass delete failed:", error);
      toast.error("Erreur lors de la suppression massive.");
    } finally {
      setIsMassDeleting(false);
      setMassDeleteProgress(0);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedProductIds.length === 0) return;
    if (!bulkUpdateCategory && !bulkUpdateBrand) {
      toast.error("Veuillez sélectionner au moins un champ à modifier (Catégorie ou Marque).");
      return;
    }

    setIsMassUpdating(true);
    try {
      const brandIdToSet = bulkUpdateBrand ? (bulkBrandId || null) : undefined;
      const categoryIdToSet = bulkUpdateCategory ? (bulkSubCatId || bulkParentCatId || null) : undefined;
      const updatedAt = new Date().toISOString();

      for (const productId of selectedProductIds) {
        const prod = products.find(p => p.id === productId);
        if (prod) {
          const localUpdate: any = { updatedAt };
          if (brandIdToSet !== undefined) localUpdate.brandId = brandIdToSet;
          if (categoryIdToSet !== undefined) localUpdate.categoryId = categoryIdToSet;
          await localDb.update(`products/${productId}`, localUpdate);
        }
      }

      const details = [
        bulkUpdateCategory ? `Catégorie: ${bulkSubCatId || bulkParentCatId || 'Aucune'}` : null,
        bulkUpdateBrand ? `Marque: ${bulkBrandId || 'Aucune'}` : null
      ].filter(Boolean).join(', ');

      logAction(
        user.uid,
        user.displayName || 'Utilisateur',
        'Mise à jour Groupée',
        'Inventaire',
        `Changement groupé pour ${selectedProductIds.length} articles (${details})`
      );

      toast.success(`Les ${selectedProductIds.length} produits ont été mis à jour avec succès !`);
      setSelectedProductIds([]);
      setIsBulkUpdateModalOpen(false);
      
      // Reset modal values
      setBulkUpdateCategory(false);
      setBulkUpdateBrand(false);
      setBulkParentCatId('');
      setBulkSubCatId('');
      setBulkBrandId('');
    } catch (error) {
      console.error(error);
      toast.error("Une erreur s'est produite lors de la mise à jour groupée.");
    } finally {
      setIsMassUpdating(false);
    }
  };

  const handleBulkDelete = () => {
    setConfirmAction({
      title: "Supprimer la sélection",
      message: `Êtes-vous sûr de vouloir supprimer les ${selectedProductIds.length} produits sélectionnés ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirmAction(null);
        setIsMassDeleting(true);
        setMassDeleteProgress(0);
        try {
          for (const id of selectedProductIds) {
            await localDb.delete(`products/${id}`);
          }
          
          window.dispatchEvent(new CustomEvent('products-batch-delete', { detail: { ids: selectedProductIds } }));
          logAction(user.uid, user.displayName || 'Utilisateur', 'Suppression Groupée', 'Inventaire', `${selectedProductIds.length} produits supprimés`);
          setSelectedProductIds([]);
          toast.success("Produits supprimés de l'inventaire avec succès.");
        } catch (error: any) {
          alert("Erreur lors de la suppression: " + error.message);
        } finally {
          setIsMassDeleting(false);
        }
      }
    });
  };

  return {
    isAutoMerging,
    autoMergeProgress,
    isMassDeleting,
    massDeleteProgress,
    isMassUpdating,
    handleAutoResolveAll,
    handleMassDeleteProducts,
    handleBulkUpdate,
    handleBulkDelete,
    
    // state for bulk update
    bulkUpdateCategory, setBulkUpdateCategory,
    bulkUpdateBrand, setBulkUpdateBrand,
    bulkParentCatId, setBulkParentCatId,
    bulkSubCatId, setBulkSubCatId,
    bulkBrandId, setBulkBrandId,
    setIsMassDeleting // in case it needs to be set manually
  };
}
