import React from 'react';
import { Package, ChevronLeft, ChevronRight, Loader2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCoreStore } from '../../store/useCoreStore';
import { DuplicateSKUAlert } from './DuplicateSKUAlert';
import { InventoryActionBar } from './InventoryActionBar';
import { BarcodeScanner } from '../BarcodeScanner';
import { Modal, Button, SafeImage } from '../ui';
import { InventoryProductCard } from './InventoryProductCard';
import { InventoryProductRow } from './InventoryProductRow';

export function InventoryProductsTab(props: any) {
  const isDataLoading = useCoreStore(s => s.isDataLoading);
  const storeProducts = useCoreStore(s => s.products);

  const {
    products, duplicateSKUGroups, setIsDuplicateModalOpen, handleAutoResolveAll, 
    isAutoMerging, autoMergeProgress, search, setSearch, showFilters, setShowFilters, 
    hasActiveFilters, isScannerOpen, setIsScannerOpen, selectedProductIds, handleBulkDelete, 
    setIsMassDeleteConfirmOpen, setIsQuickSelectMode, isQuickSelectMode, setViewMode, 
    viewMode = 'grid', handleBarcodeScan, setIsPriceCheckerOpen, priceCheckResult, 
    setPriceCheckResult, settings, setEditingProduct, setIsProductModalOpen, 
    sortedProducts, paginatedProducts, toggleSelectProduct, 
    setSelectedProductForAdjustment, setIsAdjustmentModalOpen, handleDelete, 
    setViewingHistoryProduct, setIsProductHistoryModalOpen, setHistoryTab, 
    printQuickLabel, isDeletingId, marginExtremes, currentPage, setCurrentPage, totalPages,
    requestSort, sortConfig
  } = props;

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
      {priceCheckResult && (
        <Modal 
          isOpen={!!priceCheckResult} 
          onClose={() => { setPriceCheckResult(null); setIsPriceCheckerOpen(false); }} 
          title="Vérificateur de Prix"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
              <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden">
                {priceCheckResult.imageUrl ? (
                  <SafeImage 
                    src={priceCheckResult.imageUrl} 
                    alt={priceCheckResult.name} 
                    className="w-full h-full object-cover" 
                    fallback={<Package className="text-slate-400 dark:text-slate-500" size={28} />}
                  />
                ) : (
                  <Package className="text-slate-400 dark:text-slate-500" size={28} />
                )}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{priceCheckResult.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">SKU: {priceCheckResult.sku || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-center shadow-sm">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold block">Prix Final</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {priceCheckResult.price.toFixed(2)} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{settings.currency}</span>
                </span>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-center shadow-sm">
                <span className="text-xs text-indigo-700 dark:text-indigo-400 font-bold block">Stock Disponible</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {priceCheckResult.trackStock ? priceCheckResult.stock : '∞'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => { setEditingProduct(priceCheckResult); setPriceCheckResult(null); setIsProductModalOpen(true); }} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Modifier
              </Button>
              <Button 
                onClick={() => { setPriceCheckResult(null); setIsPriceCheckerOpen(false); }} 
                variant="secondary" 
                className="flex-1"
              >
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}

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
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
              />
            ))}
          </div>
        ) : (
          /* List View (Sleek Data Rows) */
          <div className="space-y-1 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-2 rounded-2xl shadow-sm">
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page <strong className="text-slate-900 dark:text-white">{currentPage}</strong> sur <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({sortedProducts.length} articles)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
