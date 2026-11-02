import React from 'react';
import { Modal, Button } from '../../ui';
import { 
  ProductSalesEditModalProps, 
  useProductSalesEditLogic, 
  ProductSalesOverviewHeader, 
  BulkCostBanner, 
  ProductSalesEditTable 
} from './sales-edit';

export function ProductSalesEditModal({
  isOpen,
  onClose,
  product,
  transactions,
  settings
}: ProductSalesEditModalProps) {
  const {
    currency,
    salesRows,
    paginatedRows,
    bulkCost,
    setBulkCost,
    isProcessingBulk,
    processingTxId,
    currentPage,
    setCurrentPage,
    totalPages,
    summary,
    handleUpdateRowState,
    handleSaveTransactionRow,
    handleRemoveProductFromTransaction,
    handleApplyBulkCost,
    ITEMS_PER_PAGE,
  } = useProductSalesEditLogic({ product, transactions, settings });

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DÉTAIL & CORRECTION DES VENTES PAR PRODUIT"
      maxWidth="max-w-6xl"
      className="bg-[#0b0d14] border border-white/10"
    >
      <div className="space-y-6 text-left py-2">
        {/* En-tête Récapitulatif Produit & KPIs */}
        <ProductSalesOverviewHeader
          product={product}
          currency={currency}
          summary={summary}
        />

        {/* Bannière de Régularisation du Coût d'Achat en Lot */}
        <BulkCostBanner
          bulkCost={bulkCost}
          setBulkCost={setBulkCost}
          onApplyBulkCost={handleApplyBulkCost}
          isProcessingBulk={isProcessingBulk}
        />

        {/* Tableau des Ventes Éditables */}
        <ProductSalesEditTable
          salesRows={salesRows}
          paginatedRows={paginatedRows}
          currency={currency}
          processingTxId={processingTxId}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          onUpdateRowState={handleUpdateRowState}
          onSaveTransactionRow={handleSaveTransactionRow}
          onRemoveProductFromTransaction={handleRemoveProductFromTransaction}
        />

        <div className="pt-2 border-t border-white/10 flex justify-end">
          <Button variant="secondary" onClick={onClose} className="px-6 py-2.5 text-xs font-bold uppercase cursor-pointer">
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
