import React from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui';
import { 
  BulkPricingStudioModalProps,
  useBulkPricingLogic,
  BulkPricingScopeSelector,
  BulkPricingRulesColumns,
  BulkPricingPreviewTable
} from './bulk-pricing';

export const BulkPricingStudioModal: React.FC<BulkPricingStudioModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    products = [],
    filteredProducts = [],
    selectedProductIds = [],
    categories = [],
    settings
  } = props;

  const currency = settings?.currency || 'DA';

  const {
    scope,
    setScope,
    targetCategoryId,
    setTargetCategoryId,
    enableWholesale,
    setEnableWholesale,
    wholesaleBase,
    setWholesaleBase,
    wholesalePercent,
    setWholesalePercent,
    enableOnline,
    setEnableOnline,
    onlineBase,
    setOnlineBase,
    onlinePercent,
    setOnlinePercent,
    roundingMode,
    setRoundingMode,
    isApplying,
    isZeroConfirmOpen,
    setIsZeroConfirmOpen,
    zeroConfirmInput,
    setZeroConfirmInput,
    targetProducts,
    previewItems,
    handleApplyBulkPricing,
    handleOpenZeroStockConfirm,
    handleConfirmZeroAllStock
  } = useBulkPricingLogic({
    products,
    filteredProducts,
    selectedProductIds,
    categories,
    settings,
    onClose
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Studio de Réglage des Prix de Gros & En Ligne (%)"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-left">
        {/* 1. Sélection de la cible */}
        <BulkPricingScopeSelector
          scope={scope}
          setScope={setScope}
          targetCategoryId={targetCategoryId}
          setTargetCategoryId={setTargetCategoryId}
          products={products}
          filteredProducts={filteredProducts}
          selectedProductIds={selectedProductIds}
          categories={categories}
          targetProductsCount={targetProducts.length}
          isApplying={isApplying}
          isZeroConfirmOpen={isZeroConfirmOpen}
          setIsZeroConfirmOpen={setIsZeroConfirmOpen}
          zeroConfirmInput={zeroConfirmInput}
          setZeroConfirmInput={setZeroConfirmInput}
          onOpenZeroStockConfirm={handleOpenZeroStockConfirm}
          onConfirmZeroAllStock={handleConfirmZeroAllStock}
        />

        {/* 2. Cartes de règles : Prix de Gros & Tarif En Ligne + Arrondi */}
        <BulkPricingRulesColumns
          enableWholesale={enableWholesale}
          setEnableWholesale={setEnableWholesale}
          wholesaleBase={wholesaleBase}
          setWholesaleBase={setWholesaleBase}
          wholesalePercent={wholesalePercent}
          setWholesalePercent={setWholesalePercent}
          enableOnline={enableOnline}
          setEnableOnline={setEnableOnline}
          onlineBase={onlineBase}
          setOnlineBase={setOnlineBase}
          onlinePercent={onlinePercent}
          setOnlinePercent={setOnlinePercent}
          roundingMode={roundingMode}
          setRoundingMode={setRoundingMode}
          currency={currency}
        />

        {/* 3. Aperçu en direct */}
        <BulkPricingPreviewTable
          previewItems={previewItems}
          currency={currency}
        />

        {/* 4. Boutons d'action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isApplying}
            onClick={handleApplyBulkPricing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isApplying ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            <span>Appliquer sur {targetProducts.length} articles</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
