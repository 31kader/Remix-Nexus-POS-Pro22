import React, { Suspense, lazy } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../supabase';
import { enqueueStockAdjustment } from '../../services/SyncService';
import { localDb } from '../../services/LocalDatabase';
import { logAction } from '../../lib/utils';
import { Button, Modal, ConfirmDialog } from '../ui';
import { InventoryConfirmModal } from './InventoryConfirmModal';
import { ImageZoomModal } from './ImageZoomModal';
import { FloatingBulkActions } from './FloatingBulkActions';

const StockAdjustmentModal = lazy(() => import('../StockAdjustmentModal').then(m => ({ default: m.StockAdjustmentModal })));
const DuplicateSKUModal = lazy(() => import('../DuplicateSKUModal').then(m => ({ default: m.DuplicateSKUModal })));
const ImportModal = lazy(() => import('../ImportModal').then(m => ({ default: m.ImportModal })));
const SingleLabel = lazy(() => import('../LabelPrinter').then(m => ({ default: m.SingleLabel })));

const MassDeleteModal = lazy(() => import('./MassDeleteModal').then(m => ({ default: m.MassDeleteModal })));
const BulkUpdateModal = lazy(() => import('./BulkUpdateModal').then(m => ({ default: m.BulkUpdateModal })));
const ProductHistoryModal = lazy(() => import('./ProductHistoryModal').then(m => ({ default: m.ProductHistoryModal })));

export function InventoryModalsGroup(props: any) {
  const {
    user, settings, products, categories, brands, transactions, purchases,
    isAdjustmentModalOpen, setIsAdjustmentModalOpen, selectedProductForAdjustment, setSelectedProductForAdjustment,
    confirmAction, setConfirmAction,
    enlargedImage, setEnlargedImage,
    isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen, isMassDeleting, massDeleteProgress, handleMassDeleteProducts,
    isDuplicateModalOpen, setIsDuplicateModalOpen, duplicateSKUGroups, setEditingProduct, setIsProductModalOpen, handleDelete,
    isImportModalOpen, setIsImportModalOpen, csvHeaders, importPreviewData, executeImport, isProcessing, importProgress, importErrors,
    selectedProductForLabel, setSelectedProductForLabel,
    isBulkUpdateModalOpen, setIsBulkUpdateModalOpen, selectedProductIds,
    bulkUpdateCategory, setBulkUpdateCategory, bulkUpdateBrand, setBulkUpdateBrand,
    bulkParentCatId, setBulkParentCatId, bulkSubCatId, setBulkSubCatId, bulkBrandId, setBulkBrandId,
    handleBulkUpdate, isMassUpdating,
    isPurchaseHistoryModalOpen, setIsPurchaseHistoryModalOpen, editingProduct, setActiveTab,
    isSalesHistoryModalOpen, setIsSalesHistoryModalOpen,
    isProductModalOpen,
    isDeleteConfirmOpen, setIsDeleteConfirmOpen, setProductToDelete, confirmDelete,
    isProductHistoryModalOpen, setIsProductHistoryModalOpen, viewingHistoryProduct, setViewingHistoryProduct,
    setViewingPurchaseVoucher,
    handleBulkPrintLabels, handleBulkDelete
  } = props;

  return (
    <Suspense fallback={null}>
      {isAdjustmentModalOpen && (
        <StockAdjustmentModal 
          isOpen={isAdjustmentModalOpen}
          onClose={() => { setIsAdjustmentModalOpen(false); setSelectedProductForAdjustment(null); }}
          product={selectedProductForAdjustment}
          user={user}
          settings={settings}
        />
      )}

      <InventoryConfirmModal 
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />

      <ImageZoomModal 
        imageUrl={enlargedImage}
        onClose={() => setEnlargedImage(null)}
      />

      {isMassDeleteConfirmOpen && (
        <MassDeleteModal 
          isOpen={isMassDeleteConfirmOpen}
          onClose={() => setIsMassDeleteConfirmOpen(false)}
          isDeleting={isMassDeleting}
          progress={massDeleteProgress}
          onConfirm={handleMassDeleteProducts}
        />
      )}

      {isDuplicateModalOpen && (
        <DuplicateSKUModal
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          groups={duplicateSKUGroups}
          onEdit={(p: any) => {
            setEditingProduct(p);
            setIsProductModalOpen(true);
            setIsDuplicateModalOpen(false);
          }}
          onDelete={(id: string) => {
            handleDelete(id);
          }}
          onMerge={async (group: any) => {
            const [mainProduct, ...others] = group.products;
            const totalStock = group.products.reduce((acc: number, p: any) => acc + (p.stock || 0), 0);
            
            try {
              if (!mainProduct || !mainProduct.id) {
                throw new Error("Produit principal sans ID valide.");
              }
              const updatedAt = new Date().toISOString();
              const updatedMainProductData = {
                ...mainProduct,
                stock: totalStock,
                updatedAt: updatedAt
              };
              
              const delta = totalStock - (mainProduct.stock || 0);
              enqueueStockAdjustment(mainProduct.id, delta);
              localDb.update(`products/${mainProduct.id}`, { updatedAt });

              const otherIds = others.map((other: any) => other.id);
              if (otherIds.length > 0) {
                const { error: delErr } = await supabase
                  .from('products')
                  .delete()
                  .in('id', otherIds);
                if (delErr) throw delErr;
              }
              
              window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedMainProductData }));
              others.forEach((other: any) => {
                window.dispatchEvent(new CustomEvent('product-cache-delete', { detail: { id: other.id } }));
              });
              logAction(user.uid, user.displayName || 'Utilisateur', 'Fusion Doublons', 'Inventaire', `Fusion de ${others.length + 1} articles pour le SKU: ${group.sku}`);
            } catch (error) {
              console.error("Duplicate resolver failed:", error);
              throw error;
            }
          }}
          settings={settings}
        />
      )}

      {isImportModalOpen && (
        <ImportModal 
          isOpen={isImportModalOpen} 
          onClose={() => setIsImportModalOpen(false)} 
          headers={csvHeaders} 
          data={importPreviewData}
          onConfirm={executeImport} 
          isProcessing={isProcessing}
          progress={importProgress}
          errors={importErrors}
        />
      )}

      {selectedProductForLabel && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedProductForLabel(null)} 
          title={`Impression Rapide - ${selectedProductForLabel.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <SingleLabel product={selectedProductForLabel} currency={settings.currency} />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setSelectedProductForLabel(null)}>Fermer</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk category / brand update modal */}
      {isBulkUpdateModalOpen && (
        <BulkUpdateModal
          isOpen={isBulkUpdateModalOpen}
          onClose={() => setIsBulkUpdateModalOpen(false)}
          selectedCount={selectedProductIds.length}
          categories={categories}
          brands={brands}
          bulkUpdateCategory={bulkUpdateCategory}
          setBulkUpdateCategory={setBulkUpdateCategory}
          bulkUpdateBrand={bulkUpdateBrand}
          setBulkUpdateBrand={setBulkUpdateBrand}
          bulkParentCatId={bulkParentCatId}
          setBulkParentCatId={setBulkParentCatId}
          bulkSubCatId={bulkSubCatId}
          setBulkSubCatId={setBulkSubCatId}
          bulkBrandId={bulkBrandId}
          setBulkBrandId={setBulkBrandId}
          onConfirm={handleBulkUpdate}
          isProcessing={isMassUpdating}
        />
      )}

      {isPurchaseHistoryModalOpen && (
        <Modal isOpen={isPurchaseHistoryModalOpen} onClose={() => setIsPurchaseHistoryModalOpen(false)} title="Historique des Achats">
          <div className="space-y-4">
            {purchases.filter((p: any) => p.items.some((item: any) => item.productId === editingProduct?.id)).map((p: any) => (
              <div key={p.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold">{format(new Date(p.date), 'dd/MM/yyyy')}</p>
                  <p className="text-sm text-slate-500">{p.supplierName}</p>
                </div>
                <Button onClick={() => { 
                  setIsPurchaseHistoryModalOpen(false);
                  setActiveTab('purchases');
                }}>Voir</Button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {isSalesHistoryModalOpen && (
        <Modal isOpen={isSalesHistoryModalOpen} onClose={() => setIsSalesHistoryModalOpen(false)} title="Historique des Ventes">
          <div className="space-y-4">
            {transactions.filter((t: any) => t.items.some((item: any) => item.id === editingProduct?.id)).map((t: any) => (
              <div key={t.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold">{format(new Date(t.timestamp), 'dd/MM/yyyy')}</p>
                  <p className="text-sm text-slate-500">{t.customerName || 'Client inconnu'}</p>
                </div>
                <Button onClick={() => { 
                  setIsSalesHistoryModalOpen(false);
                  setActiveTab('pos');
                }}>Voir</Button>
              </div>
            ))}
          </div>
        </Modal>
      )}



      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onClose={() => { setIsDeleteConfirmOpen(false); setProductToDelete(null); }}
        onConfirm={confirmDelete}
        title="Supprimer le produit"
        message="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
        confirmText="Supprimer"
        variant="danger"
      />

      {isProductHistoryModalOpen && (
        <ProductHistoryModal
          isOpen={isProductHistoryModalOpen}
          onClose={() => setIsProductHistoryModalOpen(false)}
          viewingHistoryProduct={viewingHistoryProduct}
          setViewingHistoryProduct={setViewingHistoryProduct}
          transactions={transactions}
          purchases={purchases}
          settings={settings}
          setViewingPurchaseVoucher={setViewingPurchaseVoucher}
        />
      )}

      {/* Floating Bulk Action Bar */}
      <FloatingBulkActions
        selectedCount={selectedProductIds.length}
        onPrintLabels={handleBulkPrintLabels}
        onOpenBulkUpdate={() => setIsBulkUpdateModalOpen(true)}
        onBulkDelete={handleBulkDelete}
      />
    </Suspense>
  );
}
