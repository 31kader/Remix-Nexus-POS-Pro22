import React, { useState, useEffect, useDeferredValue } from 'react';
import { printLabels } from '../services/printService';
import { Product, InventoryTab } from '../types';
import { useTranslation } from '../translations';
import { exportToExcel } from '../lib/utils';
import { toast } from 'sonner';

import { InventoryContent } from './inventory/InventoryContent';
import { useInventoryBarcodeScanner } from './inventory/useInventoryBarcodeScanner';
import { useInventoryHandlers } from './inventory/useInventoryHandlers';
import { useInventoryData } from '../hooks/useInventoryData';
import { useProductImport } from '../hooks/useProductImport';
import { useInventoryActions } from '../hooks/useInventoryActions';
import { useInventoryMetrics } from '../hooks/useInventoryMetrics';

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
  const isQuickSelectMode = false; const setIsQuickSelectMode = (v: boolean) => {};
  
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
    onPosSelect, 
    setActiveTab,
    setIsProductModalOpen,
    setEditingProduct,
    editingProduct,
    isProductModalOpen,
    setViewingPurchaseVoucher
  } = props;
const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImageModalOpen, setIsBulkImageModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] = useState<Product | null>(null);
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<Product | null>(null);
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>('products');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'low' | 'out' | 'in'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'grouped'>('grid');
  const { isScannerOpen, setIsScannerOpen, handleBarcodeScan } = useInventoryBarcodeScanner(products, setEditingProduct, setIsProductModalOpen, setSearch);
  const [isBarcodeGenOpen, setIsBarcodeGenOpen] = useState(false);
  const [isPurchaseHistoryModalOpen, setIsPurchaseHistoryModalOpen] = useState(false);
  const [isSalesHistoryModalOpen, setIsSalesHistoryModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'discontinued'>('all');

  const {
    sortedProducts,
    paginatedProducts,
    totalPages,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    requestSort,
    sortConfig,
    totalResults
  } = useInventoryData({
    products,
    categories,
    searchQuery: deferredSearch,
    selectedCategories,
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
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const toggleSelectAll = React.useCallback(() => {
    setSelectedProductIds(prev => {
      if (prev.length === paginatedProducts.length) {
        return [];
      } else {
        return paginatedProducts.map(p => p.id);
      }
    });
  }, [paginatedProducts]);

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
    categoryProductCounts,
    expandedSelectedCategories,
    productSuppliers
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
  }, [inventoryTab, currentPage, search, selectedCategories]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategories, selectedSupplier, selectedBrand, statusFilter, stockLevelFilter, dateRange]);
  const {
    handleDelete,
    confirmDelete,
    handleCSVImport,
    handleCSVExport
  } = useInventoryHandlers({
    products, user, settings, setIsProcessing, setActiveTab,
    setProductToDelete, setIsDeleteConfirmOpen, setCsvHeaders, setImportPreviewData, setIsImportModalOpen, productToDelete
  });

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const { isProcessing: isImportProcessing, importProgress, importErrors, executeImport } = useProductImport({
    products,
    categories,
    importPreviewData,
    setIsImportModalOpen
  });


  const handlePrintLabel = (product: Product) => {
    printLabels([product], settings);
  };



  const printQuickLabel = (product: Product) => {
    printLabels([product], settings);
  };

  const handleExportExcel = async () => {
    try {
      if (!products || products.length === 0) {
        toast.error("Aucun produit à exporter.");
        return;
      }
      
      const exportData = products.map((p: Product) => {
        const cat = categories.find(c => c.id === p.categoryId);
        const brand = brands.find(b => b.id === p.brandId);
        return {
          'ID': p.id,
          'Désignation': p.name || '',
          'Code-barres': p.barcode || '',
          'SKU': p.sku || '',
          'Prix Vente (DA)': Number(p.price) || 0,
          'Prix Achat (DA)': Number(p.costPrice) || 0,
          'Stock': Number(p.stock) || 0,
          'Stock Min': Number(p.minStock) || 0,
          'Catégorie': cat?.name || p.categoryId || '',
          'Marque': brand?.name || p.brandId || '',
          'Fournisseur': p.supplier || '',
          'Unité': p.unit || 'pcs',
          'Statut': p.status || 'active',
          'Date Expiration': p.expirationDate || ''
        };
      });

      await exportToExcel(exportData, `catalogue_produits_${new Date().toISOString().slice(0, 10)}`);
      toast.success(`${products.length} produit(s) exporté(s) en Excel avec succès !`);
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("Erreur lors de l'export: " + err.message);
    }
  };

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
    isProductHistoryModalOpen, setIsProductHistoryModalOpen, viewingHistoryProduct,
    setViewingHistoryProduct, setViewingPurchaseVoucher, handleBulkPrintLabels,
    handleBulkDelete
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
