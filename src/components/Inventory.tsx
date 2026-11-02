import React, { useState, useEffect, useDeferredValue } from 'react';
import { Product, InventoryTab } from '../types';
import { useTranslation } from '../translations';

import { InventoryContent } from './inventory/InventoryContent';
import { useInventoryBarcodeScanner } from './inventory/useInventoryBarcodeScanner';
import { useInventoryHandlers } from './inventory/useInventoryHandlers';
import { useInventoryData } from '../hooks/useInventoryData';
import { useProductImport } from '../hooks/useProductImport';
import { useInventoryActions } from '../hooks/useInventoryActions';
import { useInventoryMetrics } from '../hooks/useInventoryMetrics';
import { useInventoryExportAndPrint } from './inventory/hooks/useInventoryExportAndPrint';
import { useInventoryCategoryExpansion } from './inventory/hooks/useInventoryCategoryExpansion';

interface ConfirmAction {
  title: string;
  message: string;
  onConfirm: () => void;
}

import { useCoreStore } from '../store/useCoreStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { usePeopleStore } from '../store/usePeopleStore';

export interface InventoryProps {
  setActiveTab: (tab: string) => void;
  setIsProductModalOpen: (open: boolean) => void;
  setEditingProduct: (product: any) => void;
  editingProduct: any;
  isProductModalOpen: boolean;
  setViewingPurchaseVoucher: (voucher: any) => void;
  onPosSelect?: (product: any) => void;
}

export function Inventory(props: InventoryProps) {
  const isQuickSelectMode = false; const setIsQuickSelectMode = (_v: boolean) => {};
  
  const products = useCoreStore(s => s.products);
  const categories = useCoreStore(s => s.categories);
  const brands = useCoreStore(s => s.brands);
  const settings = useCoreStore(s => s.settings);
  const stockAdjustments = useInventoryStore(s => s.stockAdjustments);
  const supplierSyncs = useInventoryStore(s => s.supplierSyncs);
  const damagedRecords = useInventoryStore(s => s.damagedItems);
  const user = useAuthStore(s => s.user);
  const transactions = useTransactionStore(s => s.transactions);
  const purchases = useFinanceStore(s => s.purchases);
  const allSuppliers = usePeopleStore(s => s.suppliers);

  const { 
    onPosSelect: _onPosSelect, 
    setActiveTab,
    setIsProductModalOpen,
    setEditingProduct,
    editingProduct,
    isProductModalOpen,
    setViewingPurchaseVoucher
  } = props;
  const { t: _t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [selectedProductForAdjustment, setSelectedProductForAdjustment] = useState<Product | null>(null);
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<Product | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('carton')) return 'cartons';
    }
    return 'products';
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('carton')) setInventoryTab('cartons');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'low' | 'out' | 'in'>('all');
  const [dateRange, _setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedSupplier, _setSelectedSupplier] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'grouped'>('grid');
  const { isScannerOpen, setIsScannerOpen, handleBarcodeScan } = useInventoryBarcodeScanner(products, setEditingProduct, setIsProductModalOpen, setSearch);
  const [isPurchaseHistoryModalOpen, setIsPurchaseHistoryModalOpen] = useState(false);
  const [isSalesHistoryModalOpen, setIsSalesHistoryModalOpen] = useState(false);
  const [selectedBrand, _setSelectedBrand] = useState<string>('all');
  const [statusFilter, _setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'discontinued'>('all');

  const preExpandedCategories = useInventoryCategoryExpansion(selectedCategories, categories);

  const {
    sortedProducts,
    paginatedProducts,
    totalPages,
    currentPage,
    setCurrentPage,
    requestSort,
    sortConfig,
  } = useInventoryData({
    products,
    categories,
    searchQuery: deferredSearch,
    selectedCategories: preExpandedCategories,
    stockLevelFilter: stockLevelFilter as any,
    brandFilter: selectedBrand,
    dateRange,
    statusFilter,
    selectedSupplier
  });

  const [isPriceCheckerOpen, setIsPriceCheckerOpen] = useState(false);
  const [priceCheckResult, setPriceCheckResult] = useState<Product | null>(null);
  const [isProductHistoryModalOpen, setIsProductHistoryModalOpen] = useState(false);
  const [viewingHistoryProduct, setViewingHistoryProduct] = useState<Product | null>(null);
  const [historyTab, setHistoryTab] = useState<'sales' | 'purchases' | 'price'>('sales');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMarginExtremes, setShowMarginExtremes] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);

  const toggleSelectProduct = React.useCallback((id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  }, []);

  const handleBulkPrintLabels = React.useCallback(() => {
    setInventoryTab('labels');
  }, []);

  const {
    duplicateSKUGroups,
    productsBySupplier,
    marginExtremes,
  } = useInventoryMetrics(products, paginatedProducts, sortedProducts, categories, selectedCategories);

  const {
    isAutoMerging,
    autoMergeProgress,
    isMassDeleting,
    massDeleteProgress,
    isMassUpdating,
    handleAutoResolveAll,
    handleMassDeleteProducts,
    handleBulkUpdate,
    handleBulkDelete,
    bulkUpdateCategory, setBulkUpdateCategory,
    bulkUpdateBrand, setBulkUpdateBrand,
    bulkParentCatId, setBulkParentCatId,
    bulkSubCatId, setBulkSubCatId,
    bulkBrandId, setBulkBrandId
  } = useInventoryActions({
    products,
    duplicateSKUGroups,
    user,
    setConfirmAction,
    selectedProductIds,
    setIsBulkUpdateModalOpen,
    setSelectedProductIds,
    setIsMassDeleteConfirmOpen
  });

  useEffect(() => {
    setSelectedProductIds([]);
  }, [inventoryTab, currentPage, deferredSearch, selectedCategories]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, selectedCategories, selectedSupplier, selectedBrand, statusFilter, stockLevelFilter, dateRange]);

  const {
    handleDelete,
    confirmDelete,
    handleCSVImport,
  } = useInventoryHandlers({
    products, user, settings, setIsProcessing, setActiveTab,
    setProductToDelete, setIsDeleteConfirmOpen, setCsvHeaders, setImportPreviewData, setIsImportModalOpen, productToDelete
  });

  const { isProcessing: isImportProcessing, importProgress, importErrors, executeImport } = useProductImport({
    products,
    categories,
    importPreviewData,
    setIsImportModalOpen
  });

  const { printQuickLabel, handleExportExcel } = useInventoryExportAndPrint({
    products,
    categories,
    brands,
    settings
  });

  const productTabProps = {
    products, duplicateSKUGroups, setIsDuplicateModalOpen, handleAutoResolveAll,
    isAutoMerging, autoMergeProgress, setConfirmAction,
    setIsProcessing, search, setSearch, showFilters, setShowFilters,
    hasActiveFilters: selectedCategories.length > 0 || statusFilter !== 'all' || stockLevelFilter !== 'all',
    setIsScannerOpen, selectedProductIds, handleBulkDelete, setIsMassDeleteConfirmOpen,
    isQuickSelectMode, setIsQuickSelectMode, viewMode,
    setViewMode, isScannerOpen, handleBarcodeScan, setIsPriceCheckerOpen,
    priceCheckResult, setPriceCheckResult, settings, setEditingProduct,
    setIsProductModalOpen, sortedProducts, isMobile, paginatedProducts,
    brands, categories, toggleSelectProduct, setSelectedProductForAdjustment,
    setIsAdjustmentModalOpen, handleDelete, setViewingHistoryProduct,
    setIsProductHistoryModalOpen, setHistoryTab, printQuickLabel, isDeletingId, setIsDeletingId,
    isMassDeleting, marginExtremes, requestSort, sortConfig, showMarginExtremes,
    setShowMarginExtremes, currentPage, setCurrentPage, totalPages, productsBySupplier,
    stockLevelFilter, setStockLevelFilter,
    onZoomImage: (url: string) => setEnlargedImage(url),
    onExportExcel: handleExportExcel
  };

  const modalsProps = {
    user, settings, products, categories, brands, transactions, purchases,
    isAdjustmentModalOpen, setIsAdjustmentModalOpen, selectedProductForAdjustment,
    setSelectedProductForAdjustment, confirmAction, setConfirmAction, enlargedImage,
    setEnlargedImage, isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen,
    isMassDeleting, massDeleteProgress, handleMassDeleteProducts,
    isDuplicateModalOpen, setIsDuplicateModalOpen, duplicateSKUGroups,
    setEditingProduct, setIsProductModalOpen, handleDelete, isImportModalOpen,
    setIsImportModalOpen, csvHeaders, importPreviewData, executeImport,
    isProcessing: isImportProcessing || isProcessing, importProgress, importErrors,
    selectedProductForLabel, setSelectedProductForLabel, isBulkUpdateModalOpen,
    setIsBulkUpdateModalOpen, selectedProductIds, bulkUpdateCategory,
    setBulkUpdateCategory, bulkUpdateBrand, setBulkUpdateBrand, bulkParentCatId,
    setBulkParentCatId, bulkSubCatId, setBulkSubCatId, bulkBrandId, setBulkBrandId,
    handleBulkUpdate, isMassUpdating, isPurchaseHistoryModalOpen,
    setIsPurchaseHistoryModalOpen, editingProduct, setActiveTab,
    isSalesHistoryModalOpen, setIsSalesHistoryModalOpen, isProductModalOpen,
    isDeleteConfirmOpen, setIsDeleteConfirmOpen, setProductToDelete, confirmDelete,
    viewingHistoryProduct, setViewingHistoryProduct, setViewingPurchaseVoucher, handleBulkPrintLabels
  };

  return (
    <InventoryContent
      inventoryTab={inventoryTab}
      setInventoryTab={setInventoryTab}
      products={products}
      setEditingProduct={setEditingProduct}
      setIsProductModalOpen={setIsProductModalOpen}
      isProcessing={isProcessing}
      handleCSVImport={handleCSVImport}
      productTabProps={productTabProps}
      stockAdjustments={stockAdjustments}
      user={user}
      settings={settings}
      damagedRecords={damagedRecords}
      selectedProductIds={selectedProductIds}
      supplierSyncs={supplierSyncs}
      allSuppliers={allSuppliers}
      modalsProps={modalsProps}
      setConfirmAction={setConfirmAction}
      onExportExcel={handleExportExcel}
    />
  );
}
