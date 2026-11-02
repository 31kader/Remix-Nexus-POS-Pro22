import React, { useState } from 'react';
import { Package, Loader2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useCoreStore } from '../../store/useCoreStore';
import { useAuthStore } from '../../store/useAuthStore';
import { checkIsOwner } from '../../config/ownerConfig';
import { DuplicateSKUAlert } from './DuplicateSKUAlert';
import { InventoryActionBar } from './InventoryActionBar';
import { BulkPricingStudioModal } from './BulkPricingStudioModal';
import { BarcodeScanner } from '../BarcodeScanner';
import { InventoryProductCard } from './InventoryProductCard';
import { InventoryProductRow } from './InventoryProductRow';
import { InventoryPaginationBar } from './InventoryPaginationBar';
import { ResetStockModal } from './modals/ResetStockModal';
import { InventoryStockStatsHeader } from './InventoryStockStatsHeader';
import { InventoryPriceCheckerDialog } from './InventoryPriceCheckerDialog';

export function InventoryProductsTab(props: any) {
  const isDataLoading = useCoreStore(s => s.isDataLoading);
  const storeProducts = useCoreStore(s => s.products);
  const [isPricingStudioOpen, setIsPricingStudioOpen] = useState(false);

  const {
    products = [], duplicateSKUGroups, setIsDuplicateModalOpen, handleAutoResolveAll, 
    isAutoMerging, autoMergeProgress, search, setSearch, showFilters, setShowFilters, 
    hasActiveFilters, isScannerOpen, setIsScannerOpen, selectedProductIds, handleBulkDelete, 
    setIsMassDeleteConfirmOpen, setIsQuickSelectMode, isQuickSelectMode, setViewMode, 
    viewMode = 'grid', handleBarcodeScan, setIsPriceCheckerOpen, priceCheckResult, 
    setPriceCheckResult, settings, setEditingProduct, setIsProductModalOpen, 
    sortedProducts, paginatedProducts, toggleSelectProduct, 
    setSelectedProductForAdjustment, setIsAdjustmentModalOpen, handleDelete, 
    setViewingHistoryProduct, setIsProductHistoryModalOpen, setHistoryTab, 
    printQuickLabel, isDeletingId, marginExtremes, currentPage, setCurrentPage, totalPages,
    requestSort, sortConfig, stockLevelFilter = 'all', setStockLevelFilter, categories = []
  } = props;

  const [isForceSyncing, setIsForceSyncing] = React.useState(false);

  const handleForceSyncFromCloud = () => {
    setIsForceSyncing(true);
    toast.info("Actualisation complète du catalogue depuis Supabase...");
    window.dispatchEvent(new CustomEvent('force-full-sync'));
    setTimeout(() => {
      setIsForceSyncing(false);
      toast.success("Catalogue synchronisé avec Supabase !");
    }, 2500);
  };

  const inStockCount = React.useMemo(() => products.filter((p: any) => (Number(p.stock) || 0) > 0).length, [products]);
  const outOfStockCount = React.useMemo(() => products.filter((p: any) => (Number(p.stock) || 0) <= 0).length, [products]);
  const lowStockCount = React.useMemo(() => products.filter((p: any) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= (p.minStock || 5)).length, [products]);

  const [isResetStockModalOpen, setIsResetStockModalOpen] = useState(false);

  const handleOpenResetStockModal = () => {
    const authUser = useAuthStore.getState().user;
    const authProfile = useAuthStore.getState().profile;
    const isAdmin = checkIsOwner(authUser?.email, authUser?.uid) || authProfile?.role === 'admin';
    if (!isAdmin) {
      toast.error("Action de remise à zéro de masse réservée exclusivement à l'administrateur.");
      return;
    }
    setIsResetStockModalOpen(true);
  };

  const renderSortHeader = (label: string, sortKey: string, align: 'left' | 'right' = 'right', widthClass: string = '') => {
    const isActive = sortConfig?.key === sortKey;
    const isAsc = sortConfig?.direction === 'asc';
    return (
      <button
        type="button"
        onClick={() => requestSort && requestSort(sortKey)}
        className={cn(
          "flex items-center gap-1 hover:text-indigo-400 transition-colors font-black uppercase text-[10px] tracking-wider cursor-pointer group select-none",
          align === 'right' ? "justify-end text-right" : "justify-start text-left",
          isActive ? "text-indigo-400" : "text-slate-400",
          widthClass
        )}
      >
        <span>{label}</span>
        {isActive ? (
          isAsc ? <ChevronUp size={13} className="text-indigo-400 shrink-0" /> : <ChevronDown size={13} className="text-indigo-400 shrink-0" />
        ) : (
          <ArrowUpDown size={11} className="text-slate-600 opacity-40 group-hover:opacity-100 shrink-0 transition-opacity" />
        )}
      </button>
    );
  };

  const isSyncing = isDataLoading && storeProducts.length === 0 && sortedProducts.length === 0;

  return (
    <div className="space-y-4">
      {/* Duplicate Alert if any */}
      <DuplicateSKUAlert 
        duplicateGroupsCount={duplicateSKUGroups.length} 
        onOpenDetails={() => setIsDuplicateModalOpen(true)} 
        onAutoResolveAll={handleAutoResolveAll} 
        isAutoMerging={isAutoMerging} 
        autoMergeProgress={autoMergeProgress} 
      />

      {/* Barre de Boutons Rapides : En Stock / En Rupture + Studio Prix Gros & En Ligne (%) */}
      <InventoryStockStatsHeader
        totalCount={products.length}
        inStockCount={inStockCount}
        outOfStockCount={outOfStockCount}
        lowStockCount={lowStockCount}
        stockLevelFilter={stockLevelFilter}
        setStockLevelFilter={setStockLevelFilter}
        isForceSyncing={isForceSyncing}
        onForceSyncFromCloud={handleForceSyncFromCloud}
        onOpenPricingStudio={() => setIsPricingStudioOpen(true)}
        onOpenResetStockModal={handleOpenResetStockModal}
      />

      {/* Studio de Réglage Global des Prix de Gros & En Ligne (%) */}
      <BulkPricingStudioModal
        isOpen={isPricingStudioOpen}
        onClose={() => setIsPricingStudioOpen(false)}
        products={products}
        filteredProducts={sortedProducts}
        selectedProductIds={selectedProductIds}
        categories={categories}
        settings={settings}
      />
      
      {/* Search & Actions Bar */}
      <InventoryActionBar 
        search={search} 
        setSearch={setSearch} 
        showFilters={showFilters} 
        setShowFilters={setShowFilters} 
        hasActiveFilters={hasActiveFilters} 
        setIsScannerOpen={setIsScannerOpen} 
        selectedProductIds={selectedProductIds} 
        onBulkDelete={handleBulkDelete} 
        onClearInventory={() => setIsMassDeleteConfirmOpen(true)} 
        isQuickSelectMode={isQuickSelectMode} 
        setIsQuickSelectMode={setIsQuickSelectMode} 
        viewMode={viewMode} 
        setViewMode={setViewMode}
      />

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScanner 
          onScan={handleBarcodeScan} 
          onClose={() => { setIsScannerOpen(false); setIsPriceCheckerOpen(false); }} 
        />
      )}

      {/* Price Checker Result Modal */}
      <InventoryPriceCheckerDialog
        priceCheckResult={priceCheckResult}
        onClose={() => { setPriceCheckResult(null); setIsPriceCheckerOpen(false); }}
        onEditProduct={(p) => {
          setEditingProduct(p);
          setPriceCheckResult(null);
          setIsProductModalOpen(true);
        }}
        currency={settings.currency}
      />

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {isSyncing ? (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <Loader2 size={40} className="text-indigo-500 animate-spin" />
            <div>
              <p className="text-slate-900 dark:text-white font-bold text-sm">Chargement des données...</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Synchronisation du catalogue en cours</p>
            </div>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center gap-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500">
              <Package size={32} />
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-white font-bold text-base">Aucun produit trouvé</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm">
                Aucun article ne correspond à votre recherche ou à vos filtres actuels.
              </p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View (Modern Visual Cards) */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {paginatedProducts.map((product: any) => (
              <InventoryProductCard
                key={product.id}
                product={product}
                isSelected={selectedProductIds.includes(product.id)}
                onToggleSelect={() => toggleSelectProduct(product.id)}
                isQuickSelectMode={isQuickSelectMode}
                onToggleQuickSelect={() => {}}
                onEdit={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
                onDelete={() => handleDelete(product.id)}
                onPrintLabel={() => printQuickLabel(product)}
                onViewHistory={() => { setViewingHistoryProduct(product); setIsProductHistoryModalOpen(true); setHistoryTab('sales'); }}
                onOpenAdjustment={() => { setSelectedProductForAdjustment(product); setIsAdjustmentModalOpen(true); }}
                onCopy={() => { setEditingProduct({ ...product, id: undefined, name: product.name.includes('(Copie)') ? product.name : product.name + " (Copie)", sku: product.sku ? `${product.sku}-COPY` : '', barcode: '' }); setIsProductModalOpen(true); }}
                settings={settings}
                isDeleting={isDeletingId === product.id}
                isExtremeMargin={{
                  isMax: marginExtremes?.maxId === product.id,
                  isMin: marginExtremes?.minId === product.id
                }}
                onZoomImage={props.onZoomImage}
              />
            ))}
          </div>
        ) : (
          /* List View (Sleek Data Rows) */
          <div className="space-y-1 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-2 rounded-xl shadow-sm">
            {/* Table Header Bar for Sorting */}
            <div className="hidden md:flex items-center justify-between gap-4 px-4 py-2.5 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl mb-2 shadow-sm">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-5 text-center text-[10px] font-black text-slate-500 dark:text-slate-400">#</span>
                {renderSortHeader('Produit / Nom', 'name', 'left')}
                {renderSortHeader('SKU', 'sku', 'left', 'ml-6')}
              </div>

              <div className="flex items-center gap-6">
                {renderSortHeader('Achat', 'costPrice', 'right', 'min-w-[80px]')}
                {renderSortHeader('Vente', 'price', 'right', 'min-w-[90px]')}
                {renderSortHeader('Marge', 'margin', 'right', 'min-w-[70px]')}
                {renderSortHeader('Stock', 'stock', 'right', 'min-w-[85px]')}
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider w-[180px] text-right">Actions</span>
              </div>
            </div>

            {paginatedProducts.map((product: any) => (
              <InventoryProductRow
                key={product.id}
                product={product}
                isSelected={selectedProductIds.includes(product.id)}
                onToggleSelect={() => toggleSelectProduct(product.id)}
                isQuickSelectMode={isQuickSelectMode}
                onToggleQuickSelect={() => {}}
                onEdit={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
                onDelete={() => handleDelete(product.id)}
                onPrintLabel={() => printQuickLabel(product)}
                onViewHistory={() => { setViewingHistoryProduct(product); setIsProductHistoryModalOpen(true); setHistoryTab('sales'); }}
                onOpenAdjustment={() => { setSelectedProductForAdjustment(product); setIsAdjustmentModalOpen(true); }}
                onCopy={() => { setEditingProduct({ ...product, id: undefined, name: product.name.includes('(Copie)') ? product.name : product.name + " (Copie)", sku: product.sku ? `${product.sku}-COPY` : '', barcode: '' }); setIsProductModalOpen(true); }}
                settings={settings}
                isDeleting={isDeletingId === product.id}
                isExtremeMargin={{
                  isMax: marginExtremes?.maxId === product.id,
                  isMin: marginExtremes?.minId === product.id
                }}
                onZoomImage={props.onZoomImage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <InventoryPaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedProducts.length}
        onPageChange={setCurrentPage}
      />

      {/* Modal Sécurisée de Remise à Zéro des Stocks */}
      <ResetStockModal
        isOpen={isResetStockModalOpen}
        onClose={() => setIsResetStockModalOpen(false)}
        products={products}
      />
    </div>
  );
}
