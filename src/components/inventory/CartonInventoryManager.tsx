import React, { useMemo } from 'react';
import { Product } from '../../types';
import { useCoreStore } from '../../store/useCoreStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ProductHistoryModal } from './ProductHistoryModal';
import { ProductFormModal } from '../ProductFormModal';
import { useCartonManagerLogic } from './cartons/useCartonManagerLogic';
import { CartonTableView } from './cartons/CartonTableView';
import { CartonFormModal } from './cartons/CartonFormModal';
import { CartonQuickAdjustModal } from './cartons/CartonQuickAdjustModal';

interface CartonInventoryManagerProps {
  products?: Product[];
  onAddToCartDirectly?: (item: any) => void;
  onSwitchToScanner?: () => void;
}

export const CartonInventoryManager: React.FC<CartonInventoryManagerProps> = ({
  products: initialProducts = [],
  onAddToCartDirectly,
  onSwitchToScanner
}) => {
  const storeProducts = useCoreStore(s => s.products);
  const products = useMemo(() => {
    if (initialProducts && initialProducts.length > 0) return initialProducts;
    return storeProducts || [];
  }, [initialProducts, storeProducts]);

  const transactions = useTransactionStore(s => s.transactions) || [];
  const purchases = useFinanceStore(s => s.purchases) || [];
  const settings = useCoreStore(s => s.settings) || ({} as any);
  const categories = useCoreStore(s => s.categories) || [];
  const brands = useCoreStore(s => s.brands) || [];
  const currentUser = useAuthStore(s => s.user);

  const logic = useCartonManagerLogic(products);

  const outOfStockCount = useMemo(() => {
    return logic.filteredCartons.filter(c => c.cartonsStock === 0).length;
  }, [logic.filteredCartons]);

  return (
    <div className="space-y-4">
      {/* Tableau / Grille des cartons */}
      <CartonTableView
        totals={logic.totals}
        outOfStockCount={outOfStockCount}
        searchQuery={logic.searchQuery}
        setSearchQuery={logic.setSearchQuery}
        stockFilter={logic.stockFilter}
        setStockFilter={logic.setStockFilter}
        sortBy={logic.sortBy}
        setSortBy={logic.setSortBy}
        onSwitchToScanner={onSwitchToScanner}
        handleOpenCreate={logic.handleOpenCreate}
        isLoading={logic.isLoading}
        filteredCartons={logic.filteredCartons}
        setZoomedImage={logic.setZoomedImage}
        setHistoryProduct={logic.setHistoryProduct}
        setIsHistoryModalOpen={logic.setIsHistoryModalOpen}
        setEditingProductSheet={logic.setEditingProductSheet}
        setIsProductSheetModalOpen={logic.setIsProductSheetModalOpen}
        setAdjustingTemplate={logic.setAdjustingTemplate}
        setCartonDeltaInput={logic.setCartonDeltaInput}
        onAddToCartDirectly={onAddToCartDirectly}
        handleOpenEdit={logic.handleOpenEdit}
        handleDeleteTemplate={logic.handleDeleteTemplate}
        categories={categories}
      />

      {/* Modal Création / Édition Carton */}
      <CartonFormModal
        isOpen={logic.isEditModalOpen}
        onClose={() => logic.setIsEditModalOpen(false)}
        editingTemplate={logic.editingTemplate}
        formProductId={logic.formProductId}
        formProductSearch={logic.formProductSearch}
        setFormProductSearch={logic.setFormProductSearch}
        filteredProductOptions={logic.filteredProductOptions}
        handleSelectProductInForm={logic.handleSelectProductInForm}
        formSelectedProduct={logic.formSelectedProduct}
        formUnitsPerCarton={logic.formUnitsPerCarton}
        setFormUnitsPerCarton={logic.setFormUnitsPerCarton}
        formBarcode={logic.formBarcode}
        setFormBarcode={logic.setFormBarcode}
        setIsFormScannerOpen={logic.setIsFormScannerOpen}
        formSku={logic.formSku}
        setFormSku={logic.setFormSku}
        formPhotoUrl={logic.formPhotoUrl}
        setFormPhotoUrl={logic.setFormPhotoUrl}
        formFileInputRef={logic.formFileInputRef}
        handlePhotoUpload={logic.handlePhotoUpload}
        formCartonCostPrice={logic.formCartonCostPrice}
        setFormCartonCostPrice={logic.setFormCartonCostPrice}
        formRetailPrice={logic.formRetailPrice}
        setFormRetailPrice={logic.setFormRetailPrice}
        formWholesalePrice={logic.formWholesalePrice}
        setFormWholesalePrice={logic.setFormWholesalePrice}
        isFormSaving={logic.isFormSaving}
        handleSaveForm={logic.handleSaveForm}
      />

      {/* Modal Ajustement Rapide de Stock */}
      <CartonQuickAdjustModal
        adjustingTemplate={logic.adjustingTemplate}
        onClose={() => logic.setAdjustingTemplate(null)}
        cartonDeltaInput={logic.cartonDeltaInput}
        setCartonDeltaInput={logic.setCartonDeltaInput}
        isAdjusting={logic.isAdjusting}
        onConfirmAdjust={logic.handleQuickAdjust}
        linkedProduct={products.find(p => p.id === logic.adjustingTemplate?.productId)}
      />

      {/* Modal Zoom Image */}
      {logic.zoomedImage && (
        <div 
          onClick={() => logic.setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-xl max-h-[85vh] rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative">
            <img src={logic.zoomedImage.url} alt={logic.zoomedImage.title} className="w-full h-full object-contain max-h-[80vh]" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 text-white">
              <h4 className="font-bold text-sm">{logic.zoomedImage.title}</h4>
              <p className="text-[11px] text-slate-300">Photo / Empreinte Visuelle Carton</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique des Ventes & Achats */}
      {logic.isHistoryModalOpen && logic.historyProduct && (
        <ProductHistoryModal
          isOpen={logic.isHistoryModalOpen}
          onClose={() => {
            logic.setIsHistoryModalOpen(false);
            logic.setHistoryProduct(null);
          }}
          viewingHistoryProduct={logic.historyProduct}
          setViewingHistoryProduct={logic.setHistoryProduct}
          transactions={transactions}
          purchases={purchases}
          settings={settings}
          setViewingPurchaseVoucher={() => {}}
        />
      )}

      {/* Modal Fiche Produit */}
      {logic.isProductSheetModalOpen && logic.editingProductSheet && (
        <ProductFormModal
          isOpen={logic.isProductSheetModalOpen}
          onClose={() => {
            logic.setIsProductSheetModalOpen(false);
            logic.setEditingProductSheet(null);
          }}
          editingProduct={logic.editingProductSheet}
          products={products}
          categories={categories}
          settings={settings}
          user={currentUser}
          brands={brands}
        />
      )}
    </div>
  );
};
