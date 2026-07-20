import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../supabase';
import { StockAdjustment, Product } from '../../../types';

interface UseStockHistoryLogicProps {
  adjustments: StockAdjustment[];
  products: Product[];
}

export function useStockHistoryLogic({ adjustments, products }: UseStockHistoryLogicProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof StockAdjustment; direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'desc' });
  const pageSize = 20;

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null);
  const [editedReason, setEditedReason] = useState('');
  const [editedAdjustmentValue, setEditedAdjustmentValue] = useState<number | ''>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [revertProductStock, setRevertProductStock] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const getProductForAdjustment = (adj: StockAdjustment | null) => {
    if (!adj) return null;
    return products.find(p => p.id === adj.productId) || null;
  };

  const sortedAdjustments = useMemo(() => {
    let sortableItems = [...adjustments];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [adjustments, sortConfig]);

  const requestSort = (key: keyof StockAdjustment) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const paginatedAdjustments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAdjustments.slice(start, start + pageSize);
  }, [sortedAdjustments, currentPage]);

  const totalPages = Math.ceil(adjustments.length / pageSize);

  const handleEditClick = (adj: StockAdjustment) => {
    setSelectedAdjustment(adj);
    setEditedReason(adj.reason || '');
    setEditedAdjustmentValue(adj.adjustment || 0);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (adj: StockAdjustment) => {
    setSelectedAdjustment(adj);
    setRevertProductStock(true);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustment) return;
    if (editedAdjustmentValue === '') {
      toast.error("Veuillez saisir une valeur d'ajustement valide.");
      return;
    }

    setIsSaving(true);
    try {
      const originalAdjustment = selectedAdjustment.adjustment || 0;
      const difference = editedAdjustmentValue - originalAdjustment;
      const product = getProductForAdjustment(selectedAdjustment);

      if (difference !== 0 && product && product.id) {
        const updatedStock = (product.stock || 0) + difference;
        const { error } = await supabase
          .from('products')
          .update({
            stock: updatedStock,
            updatedAt: new Date().toISOString()
          })
          .eq('id', product.id);
        if (error) throw error;

        window.dispatchEvent(new CustomEvent('product-cache-update', { 
          detail: { ...product, stock: updatedStock, updatedAt: new Date().toISOString() } 
        }));
      }

      const newQuantity = selectedAdjustment.oldQuantity + editedAdjustmentValue;
      const { error: adjError } = await supabase
        .from('stockAdjustments')
        .update({
          adjustment: editedAdjustmentValue,
          quantity: editedAdjustmentValue,
          newQuantity: newQuantity,
          reason: editedReason,
          timestamp: new Date().toISOString()
        })
        .eq('id', selectedAdjustment.id);
      
      if (adjError) throw adjError;

      toast.success("Ajustement de stock mis à jour avec succès.");
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating stock adjustment:", error);
      toast.error("Erreur lors de la mise à jour de l'ajustement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAdjustment) return;

    setIsDeleting(true);
    try {
      const product = getProductForAdjustment(selectedAdjustment);

      if (revertProductStock && product && product.id) {
        const updatedStock = (product.stock || 0) - (selectedAdjustment.adjustment || 0);
        const { error } = await supabase
          .from('products')
          .update({
            stock: updatedStock,
            updatedAt: new Date().toISOString()
          })
          .eq('id', product.id);
        if (error) throw error;

        window.dispatchEvent(new CustomEvent('product-cache-update', { 
          detail: { ...product, stock: updatedStock, updatedAt: new Date().toISOString() } 
        }));
      }

      const { error: delError } = await supabase
        .from('stockAdjustments')
        .delete()
        .eq('id', selectedAdjustment.id);
      if (delError) throw delError;

      toast.success("Ajustement de stock supprimé/annulé avec succès.");
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting stock adjustment:", error);
      toast.error("Erreur lors de la suppression de l'ajustement.");
    } finally {
      setIsDeleting(false);
    }
  };

  const activeProduct = getProductForAdjustment(selectedAdjustment);
  const livePreviewStock = useMemo(() => {
    if (!activeProduct || !selectedAdjustment) return 0;
    const currentProductStock = activeProduct.stock || 0;
    const originalAdjustmentValue = selectedAdjustment.adjustment || 0;
    const targetAdjustmentValue = editedAdjustmentValue === '' ? 0 : editedAdjustmentValue;
    return currentProductStock + (targetAdjustmentValue - originalAdjustmentValue);
  }, [activeProduct, selectedAdjustment, editedAdjustmentValue]);

  return {
    currentPage,
    setCurrentPage,
    sortConfig,
    requestSort,
    paginatedAdjustments,
    totalPages,
    isEditModalOpen,
    setIsEditModalOpen,
    selectedAdjustment,
    editedReason,
    setEditedReason,
    editedAdjustmentValue,
    setEditedAdjustmentValue,
    isSaving,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    revertProductStock,
    setRevertProductStock,
    isDeleting,
    handleEditClick,
    handleDeleteClick,
    handleSaveEdit,
    handleConfirmDelete,
    getProductForAdjustment,
    activeProduct,
    livePreviewStock
  };
}
