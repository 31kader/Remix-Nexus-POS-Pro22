import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Product, Category, CompanySettings, Brand } from '../types';
import { Modal, Button } from './ui';
import { BarcodeScanner } from './BarcodeScanner';
import { ProductMultiExpirySection } from './product/ProductMultiExpirySection';
import { ProductAdvancedOptions } from './product/ProductAdvancedOptions';
import { ProductClassificationSection } from './product/ProductClassificationSection';
import { ProductBasicInfoSection } from './product/ProductBasicInfoSection';
import { ProductPricingSection } from './product/ProductPricingSection';
import { ProductStockSection } from './product/ProductStockSection';
import { ProductMediaSection } from './product/ProductMediaSection';
import { useProductFormLogic } from './useProductFormLogic';
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

export function ProductFormModal(props: ProductFormModalProps) {
  const {
    isOpen, onClose, editingProduct, products, categories, settings, brands,
    setIsPurchaseHistoryModalOpen, setIsSalesHistoryModalOpen, setActiveTab
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

  const headerAction = (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); handleSubmit(e as any); }}
      disabled={!!skuError || isGlobalLoading}
      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-neon-indigo border border-indigo-400/50"
    >
      {isGlobalLoading ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
      {editingProduct ? "MAJ" : "CRÉER"}
    </button>
  );

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={editingProduct ? "ÉDITION PRODUIT" : "NOUVEAU PRODUIT"}
        maxWidth="max-w-7xl"
        maxHeight="max-h-[95vh]"
        padding="p-0"
        headerAction={headerAction}
        className="lg:rounded-[2rem] border border-white/10 shadow-2xl"
      >
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col h-full bg-[#05070a] relative">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-10 xl:p-12 space-y-8 sm:space-y-10 lg:space-y-12 pb-32">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 xl:gap-12">
              {/* Left Column */}
              <div className="space-y-12">
                <div className="space-y-6">
                  <ProductBasicInfoSection
                    formData={formData}
                    setFormData={setFormData}
                    startVoiceEntry={startVoiceEntry}
                    isVoiceScanning={isVoiceScanning}
                    skuError={skuError}
                    isGlobalLoading={isGlobalLoading}
                    setIsScannerOpen={setIsScannerOpen}
                  />
                </div>

                <div className="space-y-6">
                  <ProductPricingSection
                    formData={formData}
                    setFormData={setFormData}
                    settings={settings}
                  />
                </div>

                <div className="space-y-6">
                  <ProductStockSection
                    formData={formData}
                    setFormData={setFormData}
                    displayExpDate={displayExpDate}
                    handleDisplayDateChange={handleDisplayDateChange}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-12">
                <div className="space-y-6">
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

                <div className="space-y-6">
                   <ProductMediaSection
                    formData={formData}
                    setFormData={setFormData}
                    removeImage={removeImage}
                    isUploadingImage={isUploadingImage}
                    handleImageUpload={handleImageUpload}
                  />

                  <div className="space-y-3 pt-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center justify-between">
                      Description Smart-IA
                      <button
                        type="button"
                        onClick={generateAiDescription}
                        disabled={isGeneratingDescription}
                        className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[8px] font-black text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all uppercase tracking-widest disabled:opacity-50 group"
                      >
                        {isGeneratingDescription ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} className="group-hover:scale-110 transition-transform" />}
                        Générer
                      </button>
                    </label>
                    <textarea rows={3} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-800 shadow-inner" placeholder="Description marketing..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tags & Indexation</label>
                    <input className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-800 shadow-inner" placeholder="Tags..." value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 xl:gap-12 border-t border-white/5 pt-8 lg:pt-10 xl:pt-12">
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

              <div className="space-y-6">
                 {(setIsPurchaseHistoryModalOpen || setIsSalesHistoryModalOpen) && (
                    <div className="flex gap-4">
                      {setIsPurchaseHistoryModalOpen && <Button type="button" variant="secondary" className="flex-1 py-4 uppercase tracking-[0.2em] text-[10px] font-black rounded-2xl" onClick={() => setIsPurchaseHistoryModalOpen(true)}>Historique Achats</Button>}
                      {setIsSalesHistoryModalOpen && <Button type="button" variant="secondary" className="flex-1 py-4 uppercase tracking-[0.2em] text-[10px] font-black rounded-2xl" onClick={() => setIsSalesHistoryModalOpen(true)}>Historique Ventes</Button>}
                    </div>
                  )}
                  <ProductAdvancedOptions
                    formData={formData}
                    setFormData={setFormData}
                    products={products}
                    settings={settings}
                    editingProduct={editingProduct}
                  />
              </div>
            </div>
          </div>
        </form>
      </Modal>
      
      {isScannerOpen && (
        <BarcodeScanner 
          onScan={(code) => {
            setFormData(prev => ({ ...prev, sku: code }));
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </>
  );
}
