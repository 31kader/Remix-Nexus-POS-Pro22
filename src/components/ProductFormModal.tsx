import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Package,
  DollarSign,
  Layers,
  Image as ImageIcon,
  LayoutGrid,
  TrendingUp,
  History
} from 'lucide-react';
import { Product, Category, CompanySettings, Brand } from '../types';
import { Modal, Button } from './ui';
import { SafeImage } from './ui/SafeImage';
import { BarcodeScanner } from './BarcodeScanner';
import { ProductMultiExpirySection } from './product/ProductMultiExpirySection';
import { ProductAdvancedOptions } from './product/ProductAdvancedOptions';
import { ProductClassificationSection } from './product/ProductClassificationSection';
import { ProductBasicInfoSection } from './product/ProductBasicInfoSection';
import { ProductPricingSection } from './product/ProductPricingSection';
import { ProductStockSection } from './product/ProductStockSection';
import { ProductMediaSection } from './product/ProductMediaSection';
import { useProductFormLogic } from '../hooks/useProductFormLogic';
import { cn } from '../lib/utils';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  products: Product[];
  categories: Category[];
  settings: CompanySettings;
  user: any;
  brands: Brand[];
  setIsPurchaseHistoryModalOpen?: (v: boolean) => void;
  setIsSalesHistoryModalOpen?: (v: boolean) => void;
  setActiveTab?: (tab: string) => void;
}

type FicheTab = 'all' | 'identity' | 'pricing' | 'stock' | 'media';

export function ProductFormModal(props: ProductFormModalProps) {
  const {
    isOpen,
    onClose,
    editingProduct,
    products,
    categories,
    settings,
    brands,
    setIsPurchaseHistoryModalOpen,
    setIsSalesHistoryModalOpen,
    setActiveTab
  } = props;

  const {
    isScannerOpen,
    setIsScannerOpen,
    isGeneratingDescription,
    isGlobalLoading,
    isUploadingImage,
    parentCatId,
    setParentCatId,
    subCatId,
    setSubCatId,
    displayExpDate,
    newBatchNumber,
    setNewBatchNumber,
    newBatchExpiry,
    setNewBatchExpiry,
    newBatchStock,
    setNewBatchStock,
    formData,
    skuError,
    handleDisplayDateChange,
    generateAiDescription,
    handleImageUpload,
    removeImage,
    handleSubmit,
    startVoiceEntry,
    handleKeyDown,
    setFormData,
    isVoiceScanning
  } = useProductFormLogic(props);

  const [scannerTarget, setScannerTarget] = useState<'barcode' | 'sku'>('barcode');
  const [activeFicheTab, setActiveFicheTab] = useState<FicheTab>('all');

  const currency = settings?.currency || 'DA';
  const costPrice = Number(formData.costPrice) || 0;
  const retailPrice = Number(formData.price) || 0;
  const wholesalePrice = Number((formData as any).wholesalePrice) || 0;
  const currentStock = Number(formData.stock) || 0;
  const netMarginDA = retailPrice - costPrice;
  const marginPercent = costPrice > 0 ? ((retailPrice - costPrice) / costPrice) * 100 : 0;

  const headerAction = (
    <button
      type="button"
      onClick={e => {
        e.preventDefault();
        handleSubmit(e as any);
      }}
      disabled={!!skuError}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xs border border-indigo-400/50 cursor-pointer"
    >
      <RefreshCw size={12} className={isGlobalLoading ? 'animate-spin' : ''} />
      {editingProduct ? 'ENREGISTRER LA FICHE' : 'CRÉER LA FICHE'}
    </button>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editingProduct ? `FICHE D'INVENTAIRE — ${editingProduct.name}` : "NOUVELLE FICHE D'INVENTAIRE ARTICLE"}
        maxWidth="max-w-7xl"
        maxHeight="max-h-[95vh]"
        padding="p-0"
        headerAction={headerAction}
        className="lg:rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl"
      >
        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 relative"
        >
          {/* BANDEAU RÉSUMÉ EN DIRECT DE LA FICHE ARTICLE */}
          <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-5 py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                {formData.imageUrl ? (
                  <SafeImage src={formData.imageUrl} alt={formData.name || ''} className="w-full h-full object-contain" />
                ) : (
                  <Package size={20} className="text-indigo-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {formData.name || 'Nouvel Article (Saisissez la désignation)'}
                </p>
                <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  SKU: <span className="font-mono">{formData.sku || 'Auto'}</span> • Code-barres:{' '}
                  <span className="font-mono">{formData.barcode || 'Non défini'}</span>
                </p>
              </div>
            </div>

            {/* 4 Indicateurs Clés en Direct (Achat, Détail, Marge, Stock) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                <span className="block text-[9px] font-black uppercase text-slate-400">Prix Achat</span>
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  {costPrice.toFixed(2)} {currency}
                </span>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <span className="block text-[9px] font-black uppercase text-indigo-500">Prix Vente Détail</span>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {retailPrice.toFixed(2)} {currency}
                </span>
              </div>

              <div
                className={cn(
                  'px-3 py-1.5 rounded-xl border',
                  netMarginDA > 0
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                )}
              >
                <span className="block text-[9px] font-black uppercase">Marge Nette</span>
                <span className="text-xs font-black">
                  {netMarginDA >= 0 ? '+' : ''}
                  {netMarginDA.toFixed(0)} {currency} ({marginPercent.toFixed(0)}%)
                </span>
              </div>

              <div
                className={cn(
                  'px-3 py-1.5 rounded-xl border',
                  currentStock > 0
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                )}
              >
                <span className="block text-[9px] font-black uppercase">Stock Actuel</span>
                <span className="text-xs font-black">
                  {currentStock} {formData.unit || 'u.'} {wholesalePrice > 0 ? `• Gros: ${wholesalePrice} ${currency}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* BARRE D'ONGLETS DE RÉORGANISATION DE LA FICHE */}
          <div className="bg-slate-100/80 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: '👁️ Vue Complète Structurée', icon: LayoutGrid },
                { id: 'identity', label: '1. Identification & Rayon', icon: Package },
                { id: 'pricing', label: '2. Tarifs, Gros & Marges', icon: DollarSign },
                { id: 'stock', label: '3. Stock, Emplacement & Lots', icon: Layers },
                { id: 'media', label: '4. Photos, IA & Avancé', icon: ImageIcon },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeFicheTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFicheTab(tab.id as FicheTab)}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border',
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-indigo-400'
                    )}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {(setIsPurchaseHistoryModalOpen || setIsSalesHistoryModalOpen) && (
              <div className="flex items-center gap-2">
                {setIsPurchaseHistoryModalOpen && (
                  <button
                    type="button"
                    onClick={() => setIsPurchaseHistoryModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold text-slate-700 dark:text-zinc-300 hover:border-indigo-500 flex items-center gap-1 cursor-pointer"
                  >
                    <History size={12} className="text-indigo-500" /> Achats
                  </button>
                )}
                {setIsSalesHistoryModalOpen && (
                  <button
                    type="button"
                    onClick={() => setIsSalesHistoryModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold text-slate-700 dark:text-zinc-300 hover:border-emerald-500 flex items-center gap-1 cursor-pointer"
                  >
                    <TrendingUp size={12} className="text-emerald-500" /> Ventes
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CORPS DE LA FICHE RÉORGANISÉ EN CARTES PROPRES */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 pb-24">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Colonne Gauche (Identification, Tarifs, Stock) */}
              <div
                className={cn(
                  'space-y-6',
                  activeFicheTab === 'all' ? 'xl:col-span-7' : 'xl:col-span-12'
                )}
              >
                {(activeFicheTab === 'all' || activeFicheTab === 'identity') && (
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-5 shadow-xs">
                    <ProductBasicInfoSection
                      formData={formData}
                      setFormData={setFormData}
                      startVoiceEntry={startVoiceEntry}
                      isVoiceScanning={isVoiceScanning}
                      skuError={skuError}
                      isGlobalLoading={isGlobalLoading}
                      setIsScannerOpen={setIsScannerOpen}
                      setScannerTarget={setScannerTarget}
                    />
                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                      <ProductClassificationSection
                        formData={formData}
                        setFormData={setFormData}
                        brands={brands}
                        categories={categories}
                        parentCatId={parentCatId}
                        setParentCatId={setParentCatId}
                        subCatId={subCatId}
                        setSubCatId={setSubCatId}
                        setActiveTab={setActiveTab}
                        onClose={onClose}
                      />
                    </div>
                  </div>
                )}

                {(activeFicheTab === 'all' || activeFicheTab === 'pricing') && (
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
                    <ProductPricingSection
                      formData={formData}
                      setFormData={setFormData}
                      settings={settings}
                    />
                  </div>
                )}

                {(activeFicheTab === 'all' || activeFicheTab === 'stock') && (
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-5 shadow-xs">
                    <ProductStockSection
                      formData={formData}
                      setFormData={setFormData}
                      displayExpDate={displayExpDate}
                      handleDisplayDateChange={handleDisplayDateChange}
                    />
                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                      <ProductMultiExpirySection
                        formData={formData}
                        setFormData={setFormData}
                        newBatchNumber={newBatchNumber}
                        setNewBatchNumber={setNewBatchNumber}
                        newBatchExpiry={newBatchExpiry}
                        setNewBatchExpiry={setNewBatchExpiry}
                        newBatchStock={newBatchStock}
                        setNewBatchStock={setNewBatchStock}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Colonne Droite (Médias, Description IA, Options Avancées) */}
              {(activeFicheTab === 'all' || activeFicheTab === 'media') && (
                <div
                  className={cn(
                    'space-y-6',
                    activeFicheTab === 'all' ? 'xl:col-span-5' : 'xl:col-span-12'
                  )}
                >
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-5 shadow-xs">
                    <ProductMediaSection
                      formData={formData}
                      setFormData={setFormData}
                      removeImage={removeImage}
                      isUploadingImage={isUploadingImage}
                      handleImageUpload={handleImageUpload}
                    />

                    <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
                      <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center justify-between">
                        <span>Description Commerciale & Smart-IA</span>
                        <button
                          type="button"
                          onClick={generateAiDescription}
                          disabled={isGeneratingDescription}
                          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all uppercase cursor-pointer"
                        >
                          {isGeneratingDescription ? (
                            <RefreshCw size={11} className="animate-spin" />
                          ) : (
                            <Sparkles size={11} />
                          )}
                          Générer avec l'IA
                        </button>
                      </label>
                      <textarea
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                        placeholder="Caractéristiques de l'article, ingrédients, dimensions..."
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">
                        Mots-clés & Tags de recherche rapide
                      </label>
                      <input
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                        placeholder="Ex: boisson, frais, promo, import..."
                        value={formData.tags}
                        onChange={e => setFormData({ ...formData, tags: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
                    <ProductAdvancedOptions
                      formData={formData}
                      setFormData={setFormData}
                      products={products}
                      settings={settings}
                      editingProduct={editingProduct}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Barre d'action inférieure fixe */}
          <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
            <div className="flex-1 w-full">
              {skuError ? (
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl text-xs font-bold">
                  <span>⚠️ {skuError}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  {editingProduct
                    ? 'Toutes les modifications de la fiche produit seront synchronisées immédiatement.'
                    : "L'article sera immédiatement enregistré et disponible au scan en caisse."}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                Annuler
              </Button>
              <button
                type="submit"
                disabled={!!skuError}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                <RefreshCw size={14} className={isGlobalLoading ? 'animate-spin' : ''} />
                <span>{editingProduct ? 'Enregistrer la Fiche' : 'Créer la Fiche Produit'}</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {isScannerOpen && (
        <BarcodeScanner
          onScan={code => {
            if (scannerTarget === 'sku') {
              setFormData(prev => ({ ...prev, sku: code }));
            } else {
              setFormData(prev => ({ ...prev, barcode: code }));
            }
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </>
  );
}
