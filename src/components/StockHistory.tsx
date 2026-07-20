import React, { memo } from 'react';
import { StockAdjustment, Product } from '../types';
import { useStockHistoryLogic } from './reports/stock/useStockHistoryLogic';
import { StockHistoryTable } from './reports/stock/StockHistoryTable';
import { StockHistoryModals } from './reports/stock/StockHistoryModals';

interface StockHistoryProps {
  adjustments: StockAdjustment[];
  products?: Product[];
  user?: any;
}

export const StockHistory = memo(function StockHistory({ adjustments, products = [], user }: StockHistoryProps) {
  const {
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
    activeProduct,
    livePreviewStock
  } = useStockHistoryLogic({ adjustments, products });

  const pageSize = 20;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">Historique des Ajustements</h3>
          <p className="text-sm text-slate-400">Suivez, modifiez ou annulez les modifications de stock et leurs causes</p>
        </div>
      </div>

      <StockHistoryTable 
        adjustments={adjustments}
        paginatedAdjustments={paginatedAdjustments}
        sortConfig={sortConfig}
        requestSort={requestSort}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />

      <StockHistoryModals 
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        selectedAdjustment={selectedAdjustment}
        editedReason={editedReason}
        setEditedReason={setEditedReason}
        editedAdjustmentValue={editedAdjustmentValue}
        setEditedAdjustmentValue={setEditedAdjustmentValue}
        isSaving={isSaving}
        handleSaveEdit={handleSaveEdit}
        isDeleteModalOpen={isDeleteModalOpen}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        revertProductStock={revertProductStock}
        setRevertProductStock={setRevertProductStock}
        isDeleting={isDeleting}
        handleConfirmDelete={handleConfirmDelete}
        activeProduct={activeProduct}
        livePreviewStock={livePreviewStock}
      />
    </div>
  );
});
