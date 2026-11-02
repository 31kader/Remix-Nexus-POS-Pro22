import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from './ui';
import { Product, CompanySettings } from '../types';
import { useMarketingPostersLogic } from './marketing/useMarketingPostersLogic';
import { MarketingPosterControls } from './marketing/MarketingPosterControls';
import { MarketingPosterPreview } from './marketing/MarketingPosterPreview';
import { MarketingPosterShareModal } from './marketing/MarketingPosterShareModal';

export interface MarketingPostersProps {
  products: Product[];
  settings: CompanySettings;
}

export const MarketingPosters: React.FC<MarketingPostersProps> = ({ products, settings }) => {
  const {
    selectedProduct,
    setSelectedProduct,
    posterType,
    setPosterType,
    posterFormat,
    setPosterFormat,
    customText,
    setCustomText,
    customBadge,
    setCustomBadge,
    search,
    setSearch,
    showImage,
    setShowImage,
    showQrCode,
    setShowQrCode,
    qrContent,
    setQrContent,
    discountPercent,
    applyDiscountPercent,
    customOldPrice,
    setCustomOldPrice,
    showOldPrice,
    setShowOldPrice,
    isShareModalOpen,
    setIsShareModalOpen,
    isGenerating,
    previewRef,
    filteredProducts,
    handleSelectProduct,
    activeTheme,
    currentBadgeText,
    safePrice,
    safeOldPrice,
    currency,
    productImage,
    setCustomProductImage,
    handlePrint,
    handleDownload,
    handleShare,
    copyImageToClipboard,
    shareToSocial
  } = useMarketingPostersLogic({ products, settings });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-5 rounded-xl border border-slate-800 gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white uppercase flex items-center gap-3">
            <Sparkles className="text-amber-400 animate-pulse" size={24} /> Affiches & Marketing Pro
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Générez des affiches vitrines percutantes, des étiquettes de rayon et des visuels pour réseaux sociaux avec photo HD.
          </p>
        </div>
        {selectedProduct && (
          <Button 
            variant="secondary" 
            className="gap-2 border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-bold uppercase text-xs rounded-xl" 
            onClick={() => setSelectedProduct(null)}
          >
            <X size={15} /> Changer d'article
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Settings & Controls */}
        <div className="xl:col-span-6 space-y-5">
          <MarketingPosterControls
            products={products}
            currency={currency}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            search={search}
            setSearch={setSearch}
            filteredProducts={filteredProducts}
            handleSelectProduct={handleSelectProduct}
            posterFormat={posterFormat}
            setPosterFormat={setPosterFormat}
            posterType={posterType}
            setPosterType={setPosterType}
            showOldPrice={showOldPrice}
            setShowOldPrice={setShowOldPrice}
            discountPercent={discountPercent}
            applyDiscountPercent={applyDiscountPercent}
            customOldPrice={customOldPrice}
            setCustomOldPrice={setCustomOldPrice}
            showImage={showImage}
            setShowImage={setShowImage}
            showQrCode={showQrCode}
            setShowQrCode={setShowQrCode}
            qrContent={qrContent}
            setQrContent={setQrContent}
            customBadge={customBadge}
            setCustomBadge={setCustomBadge}
            customText={customText}
            setCustomText={setCustomText}
            isGenerating={isGenerating}
            handlePrint={handlePrint}
            handleDownload={handleDownload}
            handleShare={handleShare}
            safePrice={safePrice}
            productImage={productImage}
            onEnhanceImage={setCustomProductImage}
          />
        </div>

        {/* Right Column: Live Interactive Poster Simulator */}
        <MarketingPosterPreview
          selectedProduct={selectedProduct}
          posterFormat={posterFormat}
          previewRef={previewRef}
          activeTheme={activeTheme}
          currentBadgeText={currentBadgeText}
          showOldPrice={showOldPrice}
          safeOldPrice={safeOldPrice}
          safePrice={safePrice}
          currency={currency}
          customText={customText}
          showImage={showImage}
          productImage={productImage}
          showQrCode={showQrCode}
          qrContent={qrContent}
          settings={settings}
        />
      </div>

      {/* Share Modal Dialog */}
      <MarketingPosterShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        copyImageToClipboard={copyImageToClipboard}
        shareToSocial={shareToSocial}
      />
    </div>
  );
};
