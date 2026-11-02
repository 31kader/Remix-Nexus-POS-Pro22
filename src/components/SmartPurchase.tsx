import React from 'react';
import { 
  Product, Supplier, InvoicePattern, Purchase, 
  PurchaseOrder, CompanySettings, SupplierPayment, Category 
} from '../types';
import { SubTabPurchasesHistory } from './smart-purchase/SubTabPurchasesHistory';
import { SubTabDebts } from './smart-purchase/SubTabDebts';
import { SubTabNewPurchase } from './smart-purchase/SubTabNewPurchase';
import { SubTabShortages } from './smart-purchase/SubTabShortages';
import { useSmartPurchaseLogic } from './smart-purchase/useSmartPurchaseLogic';
import { SmartPurchaseModals } from './smart-purchase/SmartPurchaseModals';
import { SmartPurchaseStepViews } from './smart-purchase/SmartPurchaseStepViews';
import { SmartPurchaseHeaderNav } from './smart-purchase/SmartPurchaseHeaderNav';
import { toast } from 'sonner';

interface SmartPurchaseProps {
  products: Product[];
  suppliers: Supplier[];
  patterns: InvoicePattern[];
  purchases: Purchase[];
  purchaseOrders: PurchaseOrder[];
  settings: CompanySettings;
  user: any;
  categories: Category[];
  supplierPayments: SupplierPayment[];
  setIsProductModalOpen: (v: boolean) => void;
  setEditingProduct: (p: Product | null) => void;
  isProductModalOpen: boolean;
  editingProduct: Product | null;
  setViewingPurchaseVoucher: (p: Purchase | null) => void;
}

export function SmartPurchase(props: SmartPurchaseProps) {
  const {
    file, setFile, isScanning, setIsScanning,
    extractedData, setExtractedData, step, setStep,
    lastPurchaseItems, setLastPurchaseItems,
    activeSubTab, setActiveSubTab, purchaseStatus, setPurchaseStatus,
    paidAmount, setPaidAmount, paymentMethod, setPaymentMethod,
    autoMargin, setAutoMargin, editingPurchaseId, setEditingPurchaseId,
    isPaymentModalOpen, setIsPaymentModalOpen,
    isPurchaseScannerOpen, setIsPurchaseScannerOpen,
    mode, setMode, scanMethod, setScanMethod,
    cart, setCart, addToCart, removeFromCart, updateQuantity, updateItemField,
    selectedSupplierId, setSelectedSupplierId,
    invoiceNumber, setInvoiceNumber, receptionDate, setReceptionDate,
    globalDiscount, setGlobalDiscount, globalTax, setGlobalTax,
    search, setSearch, deferredSearch,
    isProcessing, setIsProcessing,
    purchaseToDelete, setPurchaseToDelete,
    error, setError, showMockOption, setShowMockOption,
    isOfflineScanning, setIsOfflineScanning,
    offlineScanProgress, setOfflineScanProgress,
    rawOcrText, setRawOcrText,
    isOcrInspectorOpen, setIsOcrInspectorOpen,
    detectedOcrType, setDetectedOcrType,
    draftItemToCreate, setDraftItemToCreate,
    isQuickCreateOpen, setIsQuickCreateOpen,
    linkingItem, setLinkingItem, isLinkModalOpen, setIsLinkModalOpen,
    quickCreateSearchFilter, setQuickCreateSearchFilter,
    quickCreateForm, setQuickCreateForm,
    historySearch, setHistorySearch,
    historyStartDate, setHistoryStartDate,
    historyEndDate, setHistoryEndDate,
    historySupplierId, setHistorySupplierId,
    historyPaymentStatus, setHistoryPaymentStatus,
    historyReceiptStatus, setHistoryReceiptStatus,
    historyQuickDate, setHistoryQuickDate,
    historyMinAmount, setHistoryMinAmount,
    historyMaxAmount, setHistoryMaxAmount,
    historySortBy, setHistorySortBy,
    isAdvancedFiltersOpen, setIsAdvancedFiltersOpen,
    setQuickDatePeriod, resetHistoryFilters,
    activeHistoryFiltersCount, purchasesSummary,
    paymentData, setPaymentData,
    isQuickSupplierModalOpen, setIsQuickSupplierModalOpen,
    quickSupplierData, setQuickSupplierData,
    filteredProducts, filteredPurchases, cartonTemplates,
    fileInputRef, searchInputRef, quantityInputRefs,
    linkDraftToProduct,
    openQuickCreateModal,
    handleQuickCreateSubmit,
    handlePurchaseBarcodeScan,
    handleFileChange,
    processFile,
    processFileOffline,
    simulateInvoiceScanning,
    confirmPurchase,
    resetForm,
    handleSupplierPayment,
    handleQuickSupplierSubmit,
    handleEditPurchaseRequest,
    handleDeletePurchase
  } = useSmartPurchaseLogic(props);

  const { 
    products, suppliers, patterns, purchases, purchaseOrders, 
    settings, user, categories, supplierPayments, 
    setIsProductModalOpen, setEditingProduct, isProductModalOpen, 
    editingProduct, setViewingPurchaseVoucher 
  } = props;

  if (step === 'updatePrices' || step === 'confirm') {
    return (
      <SmartPurchaseStepViews
        step={step}
        lastPurchaseItems={lastPurchaseItems}
        settings={settings}
        products={products}
        onReset={() => {
          resetForm();
          setStep('upload');
          setFile(null);
          setExtractedData(null);
        }}
        onCompleteUpdatePrices={() => setStep('confirm')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SmartPurchaseHeaderNav
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        editingPurchaseId={editingPurchaseId}
        onResetNew={resetForm}
      />

      {activeSubTab === 'new' ? (
        <SubTabNewPurchase 
          mode={mode}
          setMode={setMode}
          scanMethod={scanMethod}
          setScanMethod={setScanMethod}
          error={error}
          setError={setError}
          autoMargin={autoMargin}
          setAutoMargin={setAutoMargin}
          setEditingProduct={setEditingProduct}
          setIsProductModalOpen={setIsProductModalOpen}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          isScanning={isScanning}
          isOfflineScanning={isOfflineScanning}
          processFile={processFile}
          processFileOffline={processFileOffline}
          offlineScanProgress={offlineScanProgress}
          showMockOption={showMockOption}
          file={file}
          simulateInvoiceScanning={simulateInvoiceScanning}
          searchInputRef={searchInputRef}
          search={search}
          setSearch={setSearch}
          setIsPurchaseScannerOpen={setIsPurchaseScannerOpen}
          filteredProducts={filteredProducts}
          cartonTemplates={cartonTemplates}
          addToCart={addToCart}
          settings={settings}
          selectedSupplierId={selectedSupplierId}
          setSelectedSupplierId={setSelectedSupplierId}
          suppliers={suppliers}
          setIsQuickSupplierModalOpen={setIsQuickSupplierModalOpen}
          purchaseStatus={purchaseStatus}
          setPurchaseStatus={setPurchaseStatus}
          rawOcrText={rawOcrText}
          scannedImageUrl={extractedData?.scannedImageUrl || ''}
          setIsOcrInspectorOpen={setIsOcrInspectorOpen}
          detectedOcrType={detectedOcrType}
          invoiceNumber={invoiceNumber}
          setInvoiceNumber={setInvoiceNumber}
          receptionDate={receptionDate}
          setReceptionDate={setReceptionDate}
          cart={cart}
          products={products}
          openQuickCreateModal={openQuickCreateModal}
          setLinkingItem={setLinkingItem}
          setIsLinkModalOpen={setIsLinkModalOpen}
          updateItemField={updateItemField}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          quantityInputRefs={quantityInputRefs}
          paidAmount={paidAmount}
          setPaidAmount={setPaidAmount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          resetForm={resetForm}
          globalDiscount={globalDiscount}
          setGlobalDiscount={setGlobalDiscount}
          globalTax={globalTax}
          setGlobalTax={setGlobalTax}
          isProcessing={isProcessing}
          confirmPurchase={confirmPurchase}
          editingPurchaseId={editingPurchaseId}
        />
      ) : activeSubTab === 'purchases' ? (
        <SubTabPurchasesHistory 
          filteredPurchases={filteredPurchases}
          suppliers={suppliers}
          historySearch={historySearch}
          setHistorySearch={setHistorySearch}
          historyStartDate={historyStartDate}
          setHistoryStartDate={setHistoryStartDate}
          historyEndDate={historyEndDate}
          setHistoryEndDate={setHistoryEndDate}
          historySupplierId={historySupplierId}
          setHistorySupplierId={setHistorySupplierId}
          historyPaymentStatus={historyPaymentStatus}
          setHistoryPaymentStatus={setHistoryPaymentStatus}
          historyReceiptStatus={historyReceiptStatus}
          setHistoryReceiptStatus={setHistoryReceiptStatus}
          historyQuickDate={historyQuickDate}
          setQuickDatePeriod={setQuickDatePeriod}
          historyMinAmount={historyMinAmount}
          setHistoryMinAmount={setHistoryMinAmount}
          historyMaxAmount={historyMaxAmount}
          setHistoryMaxAmount={setHistoryMaxAmount}
          historySortBy={historySortBy}
          setHistorySortBy={setHistorySortBy}
          isAdvancedFiltersOpen={isAdvancedFiltersOpen}
          setIsAdvancedFiltersOpen={setIsAdvancedFiltersOpen}
          resetHistoryFilters={resetHistoryFilters}
          activeFiltersCount={activeHistoryFiltersCount}
          purchasesSummary={purchasesSummary}
          setViewingPurchaseVoucher={setViewingPurchaseVoucher}
          handleEditPurchaseRequest={handleEditPurchaseRequest}
          setPurchaseToDelete={setPurchaseToDelete}
        />
      ) : activeSubTab === 'debts' ? (
        <SubTabDebts 
          suppliers={suppliers}
          supplierPayments={supplierPayments}
          settings={settings}
          setPaymentData={setPaymentData}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
        />
      ) : activeSubTab === 'shortages' ? (
        <SubTabShortages 
          products={products}
          suppliers={suppliers}
          purchases={purchases}
          onConvertToPurchase={(itemsToConvert, targetSupplierId) => {
            if (!itemsToConvert || itemsToConvert.length === 0) {
              toast.error("Aucun article à convertir.");
              return;
            }
            for (const item of itemsToConvert) {
              addToCart({
                productId: item.productId,
                name: item.name,
                quantity: item.quantityNeeded,
                costPrice: item.costPrice,
                taxRate: 0
              });
            }
            if (targetSupplierId) {
              setSelectedSupplierId(targetSupplierId);
            }
            setActiveSubTab('new');
            setMode('manual');
            toast.success(`${itemsToConvert.length} article(s) transféré(s) au Bon d'Achat !`);
          }}
        />
      ) : null}

      <SmartPurchaseModals
        isQuickSupplierModalOpen={isQuickSupplierModalOpen}
        setIsQuickSupplierModalOpen={setIsQuickSupplierModalOpen}
        quickSupplierData={quickSupplierData}
        setQuickSupplierData={setQuickSupplierData}
        handleQuickSupplierSubmit={handleQuickSupplierSubmit}
        isPaymentModalOpen={isPaymentModalOpen}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
        paymentData={paymentData}
        setPaymentData={setPaymentData}
        handleSupplierPayment={handleSupplierPayment}
        purchaseToDelete={purchaseToDelete}
        setPurchaseToDelete={setPurchaseToDelete}
        handleDeletePurchase={handleDeletePurchase}
        isOcrInspectorOpen={isOcrInspectorOpen}
        setIsOcrInspectorOpen={setIsOcrInspectorOpen}
        detectedOcrType={detectedOcrType}
        rawOcrText={rawOcrText}
        isQuickCreateOpen={isQuickCreateOpen}
        setIsQuickCreateOpen={setIsQuickCreateOpen}
        setDraftItemToCreate={setDraftItemToCreate}
        draftItemToCreate={draftItemToCreate}
        quickCreateForm={quickCreateForm}
        setQuickCreateForm={setQuickCreateForm}
        handleQuickCreateSubmit={handleQuickCreateSubmit}
        categories={categories}
        isLinkModalOpen={isLinkModalOpen}
        setIsLinkModalOpen={setIsLinkModalOpen}
        setLinkingItem={setLinkingItem}
        linkingItem={linkingItem}
        quickCreateSearchFilter={quickCreateSearchFilter}
        setQuickCreateSearchFilter={setQuickCreateSearchFilter}
        products={products}
        linkDraftToProduct={linkDraftToProduct}
        isPurchaseScannerOpen={isPurchaseScannerOpen}
        setIsPurchaseScannerOpen={setIsPurchaseScannerOpen}
        handlePurchaseBarcodeScan={handlePurchaseBarcodeScan}
      />
    </div>
  );
}
