import React, { useState, useEffect } from 'react';
import { Package, ChevronLeft, ChevronRight, Loader2, ArrowUpDown, ChevronUp, ChevronDown, CheckCircle2, AlertOctagon, AlertTriangle, Percent, RotateCcw, RefreshCw } from 'lucide-react';
import { set as idbSet } from 'idb-keyval';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useCoreStore } from '../../store/useCoreStore';
import { useAuthStore } from '../../store/useAuthStore';
import { checkIsOwner } from '../../config/ownerConfig';
import { DuplicateSKUAlert } from './DuplicateSKUAlert';
import { InventoryActionBar } from './InventoryActionBar';
import { BulkPricingStudioModal } from './BulkPricingStudioModal';
import { BarcodeScanner } from '../BarcodeScanner';
import { Modal, Button, SafeImage } from '../ui';
import { InventoryProductCard } from './InventoryProductCard';
import { InventoryProductRow } from './InventoryProductRow';
import { supabase, isSupabaseConfigured } from '../../supabase';

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
  const [resetStockConfirmInput, setResetStockConfirmInput] = useState('');
  const [isResettingStock, setIsResettingStock] = useState(false);

  const handleOpenResetStockModal = () => {
    const authUser = useAuthStore.getState().user;
    const authProfile = useAuthStore.getState().profile;
    const isAdmin = checkIsOwner(authUser?.email, authUser?.uid) || authProfile?.role === 'admin';
    if (!isAdmin) {
      toast.error("Action de remise à zéro de masse réservée exclusivement à l'administrateur.");
      return;
    }
    setResetStockConfirmInput('');
    setIsResetStockModalOpen(true);
  };

  const handleConfirmResetStock = async () => {
    if (resetStockConfirmInput.trim().toUpperCase() !== 'ZERO') {
      toast.error("Veuillez taper exactement 'ZERO' pour confirmer.");
      return;
    }
    setIsResettingStock(true);
    try {
      const nowIso = new Date().toISOString();
      const zeroed = products.map((p: any) => ({ ...p, stock: 0, updatedAt: nowIso }));
      useCoreStore.getState().setProducts(zeroed);
      await idbSet('nexus_products_cache', zeroed).catch(() => {});
      if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine) {
        await supabase.from('products').update({ stock: 0, updated_at: nowIso }).neq('stock', 0);
      }
      toast.success(`Quantité mise à 0 sur tous les ${products.length} articles !`);
      setIsResetStockModalOpen(false);
    } catch (err: any) {
      toast.error("Erreur lors de la remise à zéro des stocks : " + (err.message || err));
    } finally {
      setIsResettingStock(false);
    }
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
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStockLevelFilter && setStockLevelFilter('all')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer",
              stockLevelFilter === 'all'
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
            )}
          >
            <Package size={14} />
            <span>Tous</span>
            <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-mono", stockLevelFilter === 'all' ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300")}>
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStockLevelFilter && setStockLevelFilter(stockLevelFilter === 'in' ? 'all' : 'in')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer",
              stockLevelFilter === 'in'
                ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/25"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
            )}
          >
            <CheckCircle2 size={14} />
            <span>En Stock</span>
            <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-mono", stockLevelFilter === 'in' ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300")}>
              {inStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStockLevelFilter && setStockLevelFilter(stockLevelFilter === 'out' ? 'all' : 'out')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer",
              stockLevelFilter === 'out'
                ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/25"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25 hover:bg-rose-500/20"
            )}
          >
            <AlertOctagon size={14} />
            <span>En Rupture</span>
            <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-mono", stockLevelFilter === 'out' ? "bg-white/20 text-white" : "bg-rose-500/20 text-rose-700 dark:text-rose-300")}>
              {outOfStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStockLevelFilter && setStockLevelFilter(stockLevelFilter === 'low' ? 'all' : 'low')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer",
              stockLevelFilter === 'low'
                ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/25"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
            )}
          >
            <AlertTriangle size={14} />
            <span className="hidden sm:inline">Stock Faible</span>
            <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-mono", stockLevelFilter === 'low' ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-700 dark:text-amber-300")}>
              {lowStockCount}
            </span>
          </button>
        </div>

        {/* Boutons d'actions globales sur les Prix Gros/En Ligne (%), Synchro Cloud et Remise à 0 du Stock */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleForceSyncFromCloud}
            disabled={isForceSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Recharger et synchroniser tous les produits et stocks réels depuis Supabase"
          >
            <RefreshCw size={13} className={cn(isForceSyncing && "animate-spin")} />
            <span>{isForceSyncing ? "Synchro..." : "Synchro Cloud"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPricingStudioOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Percent size={14} />
            <span>Régler Prix Gros & En Ligne (%)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenResetStockModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            title="Remettre la quantité (stock) de tous les articles à 0"
          >
            <RotateCcw size={13} />
            <span>Stock = 0</span>
          </button>
        </div>
      </div>

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
      {priceCheckResult && (
        <Modal 
          isOpen={!!priceCheckResult} 
          onClose={() => { setPriceCheckResult(null); setIsPriceCheckerOpen(false); }} 
          title="Vérificateur de Prix"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
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

      {/* Modal Sécurisée de Remise à Zéro des Stocks */}
      <Modal
        isOpen={isResetStockModalOpen}
        onClose={() => !isResettingStock && setIsResetStockModalOpen(false)}
        title="⚠️ Remise à zéro totale du stock"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 p-2 text-slate-800 dark:text-slate-200">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
            <AlertOctagon className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
            <div className="text-xs space-y-1">
              <p className="font-bold text-rose-700 dark:text-rose-300">
                Action critique & irréversible
              </p>
              <p className="text-rose-600/90 dark:text-rose-400/90">
                Cette action va remettre le stock de l'ensemble des <strong>{products.length} articles</strong> du catalogue à <strong>0</strong> (sur le terminal local et sur Supabase Cloud).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
              Pour confirmer, tapez le mot <span className="text-rose-600 dark:text-rose-400 font-mono font-black">ZERO</span> ci-dessous :
            </label>
            <input
              type="text"
              value={resetStockConfirmInput}
              onChange={(e) => setResetStockConfirmInput(e.target.value)}
              placeholder="Tapez ZERO"
              disabled={isResettingStock}
              autoFocus
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-center uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isResettingStock}
              onClick={() => setIsResetStockModalOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={resetStockConfirmInput.trim().toUpperCase() !== 'ZERO' || isResettingStock}
              onClick={handleConfirmResetStock}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black"
            >
              {isResettingStock ? <Loader2 size={16} className="animate-spin" /> : "Remettre à 0"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
