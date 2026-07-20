import React from 'react';
import { localDb } from '../../services/LocalDatabase';
import { toast } from 'sonner';
import { Package, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../translations';
import { useCoreStore } from '../../store/useCoreStore';

import { DuplicateSKUAlert } from './DuplicateSKUAlert';
import { InventoryActionBar } from './InventoryActionBar';
import { BarcodeScanner } from '../BarcodeScanner';
import { Modal, Button } from '../ui';
import { ProductMobileCard } from '../ProductMobileCard';
import { InventorySupplierView } from './InventorySupplierView';

import { InventoryProductRow } from './InventoryProductRow';

export function InventoryProductsTab(props: any) {
  const { t } = useTranslation();
  const isDataLoading = useCoreStore(s => s.isDataLoading);
  const storeProducts = useCoreStore(s => s.products);
  const {
    products, duplicateSKUGroups, setIsDuplicateModalOpen, handleAutoResolveAll, isAutoMerging, autoMergeProgress, setConfirmAction, setIsProcessing, search, setSearch, showFilters, setShowFilters, hasActiveFilters, isScannerOpen, setIsScannerOpen, selectedProductIds, handleBulkDelete, setIsMassDeleteConfirmOpen, setIsQuickSelectMode, isQuickSelectMode, setViewMode, viewMode, handleBarcodeScan, setIsPriceCheckerOpen, priceCheckResult, setPriceCheckResult, settings, setEditingProduct, setIsProductModalOpen, sortedProducts, isMobile, paginatedProducts, brands, categories, toggleSelectProduct, setSelectedProductForAdjustment, setIsAdjustmentModalOpen, handleDelete, setViewingHistoryProduct, setIsProductHistoryModalOpen, setHistoryTab, printQuickLabel, isDeletingId, setIsDeletingId, isMassDeleting, marginExtremes, requestSort, showMarginExtremes, setShowMarginExtremes, currentPage, setCurrentPage, totalPages, productsBySupplier
  } = props;

  // Afficher un spinner si les données chargent encore (synchronisation réseau)
  const isSyncing = isDataLoading || (storeProducts.length === 0 && sortedProducts.length === 0);

  return (
    <>
      <div className="space-y-4">
        <DuplicateSKUAlert duplicateGroupsCount={duplicateSKUGroups.length} onOpenDetails={() => setIsDuplicateModalOpen(true)} onAutoResolveAll={handleAutoResolveAll} isAutoMerging={isAutoMerging} autoMergeProgress={autoMergeProgress} />
        
        <InventoryActionBar 
          search={search} setSearch={setSearch} showFilters={showFilters} setShowFilters={setShowFilters} hasActiveFilters={hasActiveFilters} setIsScannerOpen={setIsScannerOpen} selectedProductIds={selectedProductIds} onBulkDelete={handleBulkDelete} onClearInventory={() => setIsMassDeleteConfirmOpen(true)} isQuickSelectMode={isQuickSelectMode} setIsQuickSelectMode={setIsQuickSelectMode} viewMode={viewMode} setViewMode={setViewMode}
        />
      </div>
      {isScannerOpen && ( <BarcodeScanner onScan={handleBarcodeScan} onClose={() => { setIsScannerOpen(false); setIsPriceCheckerOpen(false); }} /> )}
      {priceCheckResult && (
        <Modal 
          isOpen={!!priceCheckResult} 
          onClose={() => { setPriceCheckResult(null); setIsPriceCheckerOpen(false); }} 
          title="Vérificateur de Prix"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-900/60 rounded-[2rem] border border-slate-800/40 shadow-inner">
              <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700/50 overflow-hidden shadow-2xl">
                {priceCheckResult.imageUrl ? (
                  <img src={priceCheckResult.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Package className="text-slate-600" size={32} />
                )}
              </div>
              <div className="text-left">
                <h4 className="font-black text-white text-lg tracking-tight uppercase tracking-widest">{priceCheckResult.name}</h4>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">SKU: {priceCheckResult.sku}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 text-center">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Prix Final</p>
                <p className="text-3xl font-black text-emerald-400 tracking-tighter">{priceCheckResult.price.toFixed(2)} <span className="text-xs uppercase tracking-widest opacity-60">{settings.currency}</span></p>
              </div>
              <div className="p-6 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 text-center">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Stock Dispo</p>
                <p className="text-3xl font-black text-indigo-400 tracking-tighter">{priceCheckResult.trackStock ? priceCheckResult.stock : '∞'}</p>
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <Button onClick={() => { setEditingProduct(priceCheckResult); setPriceCheckResult(null); setIsProductModalOpen(true); }} className="flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] bg-indigo-500 text-xs">MODIFIER</Button>
              <Button onClick={() => { setPriceCheckResult(null); setIsPriceCheckerOpen(false); }} variant="secondary" className="flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs">FERMER</Button>
            </div>
          </div>
        </Modal>
      )}
      {viewMode === 'list' ? (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 animate-in fade-in duration-700">
           <div className="flex-1 min-h-[650px] h-[calc(100vh-300px)] bg-white/5 rounded-[3.5rem] border border-white/5 relative overflow-hidden backdrop-blur-3xl group/catalog ring-1 ring-white/5 shadow-2xl">
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />

            {isSyncing ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 p-20 text-center relative z-10">
                <div className="relative">
                  <Loader2 size={64} className="text-indigo-500 animate-spin" />
                  <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
                </div>
                <div className="space-y-2">
                  <p className="text-white font-black uppercase tracking-[0.3em] text-sm">Initialisation du Terminal</p>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Synchronisation sécurisée des données...</p>
                </div>
              </div>
            ) : sortedProducts.length > 0 ? (
              <div className="virtual-catalog-container flex flex-col h-full min-h-0 pt-8 pb-4 relative z-10">
                {isMobile ? (
                  <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5 custom-scrollbar pb-32">
                    {paginatedProducts.map((product: any) => (
                      <ProductMobileCard key={product.id} product={product} settings={settings} brands={brands} categories={categories} isQuickSelectMode={isQuickSelectMode} selectedProductIds={selectedProductIds} onToggleSelect={() => toggleSelectProduct(product.id)} onEdit={() => { setEditingProduct(product); setIsProductModalOpen(true); }} onAdjust={() => { setSelectedProductForAdjustment(product); setIsAdjustmentModalOpen(true); }} onDelete={() => handleDelete(product.id)} onHistory={() => { setViewingHistoryProduct(product); setIsProductHistoryModalOpen(true); setHistoryTab('sales'); }} onPrint={() => printQuickLabel(product)} onCopy={() => { setEditingProduct({...product, id: undefined, name: product.name + " (Copie)"}); setIsProductModalOpen(true); }} isDeleting={isDeletingId === product.id} />
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex items-center gap-8 px-14 mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 italic">
                      <div className="w-12"></div>
                      <div className="w-16">Média</div>
                      <div className="flex-1 cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => requestSort('name')}>Désignation Produit</div>
                      <div className="w-32 flex flex-col items-end gap-1.5">
                        <div className="cursor-pointer hover:text-indigo-400 transition-colors text-right w-full" onClick={() => requestSort('margin')}>VALEUR / PROFIT</div>
                        <button onClick={() => setShowMarginExtremes(!showMarginExtremes)} className={cn("text-[8px] px-2 py-0.5 rounded-lg border transition-all font-black", showMarginExtremes ? "bg-indigo-600 text-white border-indigo-400 shadow-neon-indigo" : "bg-black/40 text-slate-700 border-white/5 hover:border-white/10")}>SÉLECTION</button>
                      </div>
                      <div className="w-40 text-right cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => requestSort('stock')}>DISPONIBILITÉ</div>
                      <div className="w-64 text-right">GESTION SYSTÈME</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-10 py-2 space-y-1 custom-scrollbar">
                      {paginatedProducts.map((product: any) => (
                        <InventoryProductRow 
                          key={product.id}
                          product={product}
                          isSelected={selectedProductIds.includes(product.id)}
                          onToggleSelect={toggleSelectProduct}
                          isQuickSelectMode={isQuickSelectMode}
                          onToggleQuickSelect={async (p: any) => {
                            const updatedAt = new Date().toISOString();
                            const newVal = !p.isQuickSelect;
                            try {
                              await localDb.update(`products/${p.id}`, { isQuickSelect: newVal, updatedAt });
                              window.dispatchEvent(new CustomEvent('product-cache-update', { detail: { ...p, isQuickSelect: newVal, updatedAt } }));
                              toast.success(newVal ? "Ajouté aux favoris" : "Retiré des favoris");
                            } catch (err) {
                              console.error(err);
                              toast.error("Erreur lors de la mise à jour");
                            }
                          }}
                          onEdit={(p: any) => { setEditingProduct(p); setIsProductModalOpen(true); }}
                          onDelete={handleDelete}
                          onPrintLabel={printQuickLabel}
                          onCopy={(p: any) => { setEditingProduct({...p, id: undefined, name: p.name + " (Copie)"}); setIsProductModalOpen(true); }}
                          onViewHistory={(p: any) => { setViewingHistoryProduct(p); setIsProductHistoryModalOpen(true); setHistoryTab('sales'); }}
                          onOpenAdjustment={(p: any) => { setSelectedProductForAdjustment(p); setIsAdjustmentModalOpen(true); }}
                          settings={settings}
                          isDeleting={isDeletingId === product.id || isMassDeleting}
                          isExtremeMargin={{ isMax: marginExtremes?.maxId === product.id && showMarginExtremes, isMin: marginExtremes?.minId === product.id && showMarginExtremes }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center px-14 py-6 border-t border-white/5 bg-black/20 backdrop-blur-xl">
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Affichage des résultats: <span className="text-white">{paginatedProducts.length} sur {sortedProducts.length}</span></p>
                  </div>
                  <div className="flex items-center gap-6">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
                      className="p-4 bg-white/5 border border-white/10 disabled:opacity-20 text-indigo-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shadow-2xl"
                    >
                       <ChevronLeft size={24} />
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-white text-sm font-black tracking-tighter italic leading-none">{currentPage}</span>
                      <div className="h-4 w-px bg-white/10 my-1" />
                      <span className="text-slate-700 text-[10px] font-black uppercase tracking-widest leading-none">{totalPages || 1}</span>
                    </div>
                    <button
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))}
                      className="p-4 bg-white/5 border border-white/10 disabled:opacity-20 text-indigo-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shadow-2xl"
                    >
                       <ChevronRight size={24} />
                    </button>
                  </div>
                </div>
              </div>
              ) : (
                <div className="p-20 text-center flex flex-col items-center justify-center h-full">
                  <Package size={64} className="opacity-10 mb-6" />
                  <p className="text-white/30 font-black uppercase tracking-[0.2em]">{t("Aucun produit trouvé")}</p>
                </div>
              )}
           </div>
        </div>
      ) : (
        <InventorySupplierView productsBySupplier={productsBySupplier} settings={settings} isDeletingId={isDeletingId} onViewHistory={(p: any) => { setViewingHistoryProduct(p); setIsProductHistoryModalOpen(true); setHistoryTab('sales'); }} onOpenAdjustment={(p: any) => { setSelectedProductForAdjustment(p); setIsAdjustmentModalOpen(true); }} onPrintLabel={printQuickLabel} onEdit={(p: any) => { setEditingProduct(p); setIsProductModalOpen(true); }} onDelete={async (id: string) => { setIsDeletingId(id); try { await handleDelete(id); } finally { setIsDeletingId(null); } }} />
      )}
    </>
  );
}
