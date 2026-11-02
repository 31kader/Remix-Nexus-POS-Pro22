import React from 'react';
import { Product, Supplier } from '../../types';
import { ArrowLeft, Boxes, Zap, BookOpen, Camera } from 'lucide-react';
import { BarcodeScanner } from '../BarcodeScanner';
import { CartonInventoryManager } from '../inventory/CartonInventoryManager';
import { useMobileCartonLogic } from './carton-reception/useMobileCartonLogic';
import { MobileCartonTemplatesModal } from './carton-reception/MobileCartonTemplatesModal';
import { MobileCartonQuickCreateModal } from './carton-reception/MobileCartonQuickCreateModal';
import { MobileCartonScannerView } from './carton-reception/MobileCartonScannerView';
import { MobileCartonFormView } from './carton-reception/MobileCartonFormView';

interface MobileCartonReceptionProps {
  products?: Product[];
  suppliers?: Supplier[];
  onBackToPos?: () => void;
  onAddToCartDirectly?: (item: any) => void;
  currentUserId?: string;
  currentUserName?: string;
  isStandalone?: boolean;
}

export function MobileCartonReception({
  products: initialProducts = [],
  suppliers = [],
  onBackToPos,
  onAddToCartDirectly,
  currentUserId,
  currentUserName,
  isStandalone = false
}: MobileCartonReceptionProps) {
  const logic = useMobileCartonLogic({
    initialProducts,
    suppliers,
    onAddToCartDirectly,
    currentUserId,
    currentUserName
  });

  return (
    <div className={`font-sans select-none ${
      isStandalone 
        ? "min-h-screen bg-industrial-950 text-white flex flex-col pb-12" 
        : "w-full text-slate-900 dark:text-white space-y-4"
    }`}>
      {/* Scanner Caméra Plein Écran */}
      {logic.isScannerOpen && (
        <BarcodeScanner
          onScan={logic.handleBarcodeScan}
          onClose={() => logic.setIsScannerOpen(false)}
        />
      )}

      {/* Modal Mémoire Visuelle Cartons */}
      <MobileCartonTemplatesModal
        isOpen={logic.isTemplatesModalOpen}
        onClose={() => logic.setIsTemplatesModalOpen(false)}
        savedTemplates={logic.savedTemplates}
        onReloadTemplates={logic.loadTemplates}
      />

      {/* Modal Création Rapide Produit */}
      <MobileCartonQuickCreateModal
        isOpen={logic.isQuickCreateOpen}
        onClose={() => logic.setIsQuickCreateOpen(false)}
        onSubmit={logic.handleQuickCreateProduct}
        quickName={logic.quickName}
        setQuickName={logic.setQuickName}
        quickBarcode={logic.quickBarcode}
        setQuickBarcode={logic.setQuickBarcode}
        quickUnitsPerCarton={logic.quickUnitsPerCarton}
        setQuickUnitsPerCarton={logic.setQuickUnitsPerCarton}
        quickCostPrice={logic.quickCostPrice}
        setQuickCostPrice={logic.setQuickCostPrice}
        quickSellingPrice={logic.quickSellingPrice}
        setQuickSellingPrice={logic.setQuickSellingPrice}
      />

      {/* En-tête */}
      {isStandalone ? (
        <header className="sticky top-0 z-30 bg-industrial-900/95 backdrop-blur-md border-b border-industrial-800 pt-[max(env(safe-area-inset-top,0px),12px)] pl-[max(env(safe-area-inset-left,0px),16px)] pr-[max(env(safe-area-inset-right,0px),16px)] pb-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onBackToPos) onBackToPos();
                else { window.location.hash = ''; window.location.reload(); }
              }}
              className="w-10 h-10 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-300 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              aria-label="Retour"
              title="Retour au POS"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-industrial-950">
                <Boxes size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight uppercase text-white flex items-center gap-2">
                  Réception Cartons
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                    DÉPÔT
                  </span>
                </h1>
                <p className="text-[10px] text-industrial-400 font-medium">
                  {currentUserName ? `Agent : ${currentUserName}` : 'Mode Mobile Android'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={logic.toggleAutoAddToCart}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer border ${
                logic.autoAddToCart
                  ? "bg-amber-500 text-industrial-950 border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-industrial-800 text-industrial-300 border-industrial-700"
              }`}
              title="Ajout direct automatique au panier sur reconnaissance"
            >
              <Zap size={13} className={logic.autoAddToCart ? "fill-current" : ""} />
              <span>{logic.autoAddToCart ? "⚡ Direct: ON" : "⚡ Direct: OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => { logic.loadTemplates(); logic.setIsTemplatesModalOpen(true); }}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-industrial-800 hover:bg-industrial-700 text-industrial-300 border border-industrial-700 flex items-center gap-1 cursor-pointer transition-colors"
              title="Consulter les cartons mémorisés"
            >
              <BookOpen size={13} />
              <span>Mémoire ({logic.savedTemplates.length})</span>
            </button>
          </div>
        </header>
      ) : (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <Boxes size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  Réception Cartons & Colisage Rapide
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">
                  Dépôt / Stock
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Prenez la photo du carton : Nexus le reconnaît et le met au panier !
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={logic.toggleAutoAddToCart}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
                logic.autoAddToCart
                  ? "bg-amber-500 text-industrial-950 border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              }`}
            >
              <Zap size={14} className={logic.autoAddToCart ? "fill-current" : ""} />
              <span>{logic.autoAddToCart ? "⚡ Direct Panier : ACTIF" : "⚡ Direct Panier : OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => { logic.loadTemplates(); logic.setIsTemplatesModalOpen(true); }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <BookOpen size={14} />
              <span>Cartons Mémorisés ({logic.savedTemplates.length})</span>
            </button>

            {onBackToPos && (
              <button
                type="button"
                onClick={onBackToPos}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-all"
              >
                <ArrowLeft size={15} />
                <span>Retour aux articles</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sélecteur Inventaire vs Scanner */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={() => logic.setViewMode('inventory')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            logic.viewMode === 'inventory'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes size={16} />
          <span>Gestion & Inventaire Cartons</span>
          {logic.savedTemplates.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${logic.viewMode === 'inventory' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
              {logic.savedTemplates.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => logic.setViewMode('scanner')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            logic.viewMode === 'scanner'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera size={16} />
          <span>Scanner & Réception Rapide</span>
        </button>
      </div>

      {logic.viewMode === 'inventory' ? (
        <CartonInventoryManager
          products={logic.effectiveProducts}
          onAddToCartDirectly={onAddToCartDirectly}
          onSwitchToScanner={() => logic.setViewMode('scanner')}
        />
      ) : (
        <main className={`w-full ${
          isStandalone 
            ? "p-4 max-w-lg mx-auto space-y-4" 
            : "grid grid-cols-1 lg:grid-cols-12 gap-5"
        }`}>
          <div className={`${isStandalone ? "space-y-4" : "lg:col-span-6 space-y-4"}`}>
            <MobileCartonScannerView
              cartonPhoto={logic.cartonPhoto}
              isCompressing={logic.isCompressing}
              fileInputRef={logic.fileInputRef}
              handlePhotoCapture={logic.handlePhotoCapture}
              isRecognizing={logic.isRecognizing}
              recognitionResult={logic.recognitionResult}
              autoAddToCart={logic.autoAddToCart}
              unitsPerCarton={logic.unitsPerCarton}
              totalUnits={logic.totalUnits}
              handleSendToCart={logic.handleSendToCart}
              handleDirectValidate={logic.handleDirectValidate}
              isSubmitting={logic.isSubmitting}
              selectedProduct={logic.selectedProduct}
              setSelectedProduct={logic.setSelectedProduct}
              searchQuery={logic.searchQuery}
              setSearchQuery={logic.setSearchQuery}
              setIsScannerOpen={logic.setIsScannerOpen}
              effectiveProducts={logic.effectiveProducts}
              filteredProducts={logic.filteredProducts}
              handleSelectProduct={logic.handleSelectProduct}
              setQuickName={logic.setQuickName}
              setQuickBarcode={logic.setQuickBarcode}
              setIsQuickCreateOpen={logic.setIsQuickCreateOpen}
            />
          </div>

          <div className={`${isStandalone ? "space-y-4" : "lg:col-span-6 space-y-4"}`}>
            <MobileCartonFormView
              selectedProduct={logic.selectedProduct}
              unitsPerCarton={logic.unitsPerCarton}
              handleUnitsPerCartonChange={logic.handleUnitsPerCartonChange}
              cartonCount={logic.cartonCount}
              setCartonCount={logic.setCartonCount}
              cartonCostPrice={logic.cartonCostPrice}
              handleCartonCostChange={logic.handleCartonCostChange}
              unitCostPrice={logic.unitCostPrice}
              handleUnitCostChange={logic.handleUnitCostChange}
              totalUnits={logic.totalUnits}
              totalCostAmount={logic.totalCostAmount}
              isSubmitting={logic.isSubmitting}
              handleSendToCart={logic.handleSendToCart}
              handleDirectValidate={logic.handleDirectValidate}
              recentIntakes={logic.recentIntakes}
            />
          </div>
        </main>
      )}
    </div>
  );
}
