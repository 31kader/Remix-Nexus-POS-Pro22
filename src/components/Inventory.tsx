import { DEFAULT_PERMISSIONS } from '../constants';
import React, { useState, useMemo, memo, useEffect, useRef, useDeferredValue } from 'react';
import { printReceipt, printLabels } from '../services/printService';
import { Package, Tag, RefreshCw, History, LayoutGrid, Plus, FileSpreadsheet, Upload, ShoppingBag, AlertTriangle, Zap, Info, Search, Filter, Scan, LayoutList, Layers, Bot, Truck, ArrowUpDown, ArrowRight, Banknote, Users, Check, Printer, Copy, PackageOpen, Trash2, ChevronUp, ChevronLeft, ChevronRight, BarcodeIcon, ShoppingCart, Eye, X, MessageCircle, Phone, MapPin, Navigation, Edit, Clock, Mail, Percent, DollarSign, Star, Palette, FileText, AlignLeft, Shield, UserCog, Link2, MapIcon, Brain, Database, CreditCard, Minus, UserPlus, ChevronDown, ArrowUpRight, ArrowDownRight, Sparkles, FolderTree, Award, Calendar, AlertCircle, TrendingDown, ShieldCheck, RotateCcw } from 'lucide-react';
import { supabase } from '../supabase';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { Button, Card, Modal, ConfirmDialog, BlurCard, SortableHeader, SafeImage } from './ui';
import { Product, Category, Brand, StockAdjustment, CompanySettings, SupplierSync, Supplier, Purchase, Transaction, OnlineOrder, Employee, Customer, CartItem, ProductReturn, RolePermissions, DamagedRecord, UserProfile, InventoryTab } from '../types';
import { cn, logAction, safeDate, exportToExcel, getHierarchicalCategories, getCategoryDescendants, formatSafe, exportToCSV, generateUniqueId, isLocked, mapDoc } from '../lib/utils';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../translations';

import { StockAdjustmentModal } from './StockAdjustmentModal';
import { InventoryModalsGroup } from './inventory/InventoryModalsGroup';
import { DuplicateSKUModal } from './DuplicateSKUModal';
import { ImportModal } from './ImportModal';
import { ProductFormModal } from './ProductFormModal';
import { LabelPrinter, SingleLabel, getCommonStyles } from './LabelPrinter';
import { SupplierSyncManager } from './SupplierSyncManager';
import { StockHistory } from './StockHistory';
import { BarcodeScanner } from './BarcodeScanner';
import { ManualQRCodeGenerator } from './ManualQRCodeGenerator';
import { LossReport } from './LossReport';
import { ProductMobileCard } from './ProductMobileCard';
import { InventoryContent } from './inventory/InventoryContent';
import { InventoryFilters } from './inventory/InventoryFilters';
import { BulkUpdateModal } from './inventory/BulkUpdateModal';
import { FloatingBulkActions } from './inventory/FloatingBulkActions';
import { ProductHistoryModal } from './inventory/ProductHistoryModal';
import { InventoryHeader } from './inventory/InventoryHeader';
import { InventoryActionBar } from './inventory/InventoryActionBar';
import { DuplicateSKUAlert } from './inventory/DuplicateSKUAlert';
import { InventoryProductRow } from './inventory/InventoryProductRow';
import { ImageZoomModal } from './inventory/ImageZoomModal';
import { InventoryConfirmModal } from './inventory/InventoryConfirmModal';
import { MassDeleteModal } from './inventory/MassDeleteModal';
import { PriceCheckerModal } from './inventory/PriceCheckerModal';
import { InventoryProductsTab } from './inventory/InventoryProductsTab';
import { InventorySupplierView } from './inventory/InventorySupplierView';
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
  
  const { products, categories, brands, settings } = useCoreStore();
  const { stockAdjustments, supplierSyncs, damagedItems: damagedRecords } = useInventoryStore();
  const { user } = useAuthStore();
  const { transactions } = useTransactionStore();
  const { purchases } = useFinanceStore();
  const { suppliers: allSuppliers } = usePeopleStore();

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
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'low' | 'out'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
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

  const toggleSelectAll = () => {
    if (selectedProductIds.length === paginatedProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(paginatedProducts.map(p => p.id));
    }
  };

  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleBulkPrintLabels = () => {
    const selected = products.filter(p => selectedProductIds.includes(p.id));
    setInventoryTab('labels');
  };

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
    generateLowStockOrder,
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
    isMassDeleting, marginExtremes, requestSort, showMarginExtremes,
    setShowMarginExtremes, currentPage, setCurrentPage, totalPages, productsBySupplier
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
      generateLowStockOrder={generateLowStockOrder}
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
    />
  );
}
