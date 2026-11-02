import React from 'react';
import {
  CatalogPrinterProps,
  THEME_PRESETS,
  BADGE_PRESETS,
  CatalogTopBar,
  CatalogQueueList,
  CatalogConfigPanel,
  CatalogA4Preview,
  useCatalogPrinterState
} from './catalog-printer';
import { toast } from 'sonner';

// Ré-exports pour rétrocompatibilité
export { THEME_PRESETS, BADGE_PRESETS };
export type { CatalogPrinterProps };

export function CatalogPrinter(props: CatalogPrinterProps) {
  const { settings } = props;
  const s = useCatalogPrinterState(props);

  return (
    <div className="space-y-6 text-left">
      {/* 1. TOP BAR : Title + Search-Only Bar + Quick Picks + Action Buttons */}
      <CatalogTopBar
        themeColor={s.themeColor}
        queueProductsCount={s.queueProducts.length}
        pagesCount={s.pages.length}
        search={s.search}
        setSearch={s.setSearch}
        searchInputRef={s.searchInputRef}
        searchResults={s.searchResults}
        onSearchKeyDown={s.handleSearchKeyDown}
        onAddProduct={s.addProductToQueue}
        selectedCategoryToAdd={s.selectedCategoryToAdd}
        setSelectedCategoryToAdd={s.setSelectedCategoryToAdd}
        uniqueCategories={s.uniqueCategories}
        onAddByCategory={s.handleAddByCategory}
        onQuickPick={s.handleQuickPick}
        onApplyInventorySheetPreset={() => {
          s.setLayoutMode('inventory_sheet');
          s.setColumns(1);
          s.setRowsPerPage(20);
          s.setTitle(settings.name ? `FICHE D'INVENTAIRE PHYSIQUE — ${settings.name.toUpperCase()}` : "FICHE D'INVENTAIRE PHYSIQUE");
          s.setSubtitle('Feuille de comptage et de vérification des stocks en rayon');
          toast.info("Mode Fiche d'Inventaire Physique A4 activé");
        }}
        layoutMode={s.layoutMode}
        onSaveTemplatePreset={s.handleSaveTemplatePreset}
        onLoadTemplatePreset={s.handleLoadTemplatePreset}
        onExportHtml={s.handleExportHtml}
        onShare={s.handleShare}
        isSharing={s.isSharing}
        onPrint={s.handlePrint}
      />

      {/* 2. MAIN WORKSPACE: Left = Selected Queue & Options | Right = Live A4 Page Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN (5 cols): Selected Queue + Pro Options Panel */}
        <div className="xl:col-span-5 space-y-6">
          <CatalogQueueList
            queueProducts={s.queueProducts}
            onClearQueue={() => s.setSelectedProductIds([])}
            onSortQueue={s.handleSortQueue}
            onApplyBadgeToAll={s.handleApplyBadgeToAll}
            customOverrides={s.customOverrides}
            onUpdateOverride={s.updateProductOverride}
            onRemoveProduct={s.removeProductFromQueue}
            themeColor={s.themeColor}
          />

          <CatalogConfigPanel
            configSection={s.configSection}
            setConfigSection={s.setConfigSection}
            layoutMode={s.layoutMode}
            setLayoutMode={s.setLayoutMode}
            columns={s.columns}
            setColumns={s.setColumns}
            rowsPerPage={s.rowsPerPage}
            setRowsPerPage={s.setRowsPerPage}
            orientation={s.orientation}
            setOrientation={s.setOrientation}
            cellBorder={s.cellBorder}
            setCellBorder={s.setCellBorder}
            priceDisplayMode={s.priceDisplayMode}
            setPriceDisplayMode={s.setPriceDisplayMode}
            setShowPrice={s.setShowPrice}
            discountPercent={s.discountPercent}
            setDiscountPercent={s.setDiscountPercent}
            themeColor={s.themeColor}
            setThemeColor={s.setThemeColor}
            title={s.title}
            setTitle={s.setTitle}
            subtitle={s.subtitle}
            setSubtitle={s.setSubtitle}
            contactPhone={s.contactPhone}
            setContactPhone={s.setContactPhone}
            validityBanner={s.validityBanner}
            setValidityBanner={s.setValidityBanner}
            headerQrLink={s.headerQrLink}
            setHeaderQrLink={s.setHeaderQrLink}
            showHeaderQr={s.showHeaderQr}
            setShowHeaderQr={s.setShowHeaderQr}
            footerText={s.footerText}
            setFooterText={s.setFooterText}
            showHeader={s.showHeader}
            setShowHeader={s.setShowHeader}
            showFooter={s.showFooter}
            setShowFooter={s.setShowFooter}
            showDate={s.showDate}
            setShowDate={s.setShowDate}
            showLogo={s.showLogo}
            setShowLogo={s.setShowLogo}
            showName={s.showName}
            setShowName={s.setShowName}
            showPrice={s.showPrice}
            showImage={s.showImage}
            setShowImage={s.setShowImage}
            showSku={s.showSku}
            setShowSku={s.setShowSku}
            showStock={s.showStock}
            setShowStock={s.setShowStock}
            showBarcode={s.showBarcode}
            setShowBarcode={s.setShowBarcode}
            showQr={s.showQr}
            setShowQr={s.setShowQr}
            showDescription={s.showDescription}
            setShowDescription={s.setShowDescription}
            nameFontSize={s.nameFontSize}
            setNameFontSize={s.setNameFontSize}
            priceFontSize={s.priceFontSize}
            setPriceFontSize={s.setPriceFontSize}
            imageHeight={s.imageHeight}
            setImageHeight={s.setImageHeight}
            barcodeHeight={s.barcodeHeight}
            setBarcodeHeight={s.setBarcodeHeight}
            qrSize={s.qrSize}
            setQrSize={s.setQrSize}
          />
        </div>

        {/* RIGHT COLUMN (7 cols): Live A4 Preview */}
        <div className="xl:col-span-7">
          <CatalogA4Preview
            settings={settings}
            pages={s.pages}
            activePreviewPage={s.activePreviewPage}
            setActivePreviewPage={s.setActivePreviewPage}
            zoom={s.zoom}
            setZoom={s.setZoom}
            orientation={s.orientation}
            pageMargin={s.pageMargin}
            showHeader={s.showHeader}
            themeColor={s.themeColor}
            showLogo={s.showLogo}
            title={s.title}
            subtitle={s.subtitle}
            showDate={s.showDate}
            contactPhone={s.contactPhone}
            layoutMode={s.layoutMode}
            columns={s.columns}
            cellGap={s.cellGap}
            cellBorder={s.cellBorder}
            customOverrides={s.customOverrides}
            priceDisplayMode={s.priceDisplayMode}
            discountPercent={s.discountPercent}
            showImage={s.showImage}
            imageHeight={s.imageHeight}
            showName={s.showName}
            nameFontSize={s.nameFontSize}
            showPrice={s.showPrice}
            priceFontSize={s.priceFontSize}
            showSku={s.showSku}
            showBarcode={s.showBarcode}
            barcodeHeight={s.barcodeHeight}
            barcodeWidth={s.barcodeWidth}
            showQr={s.showQr}
            qrSize={s.qrSize}
            showFooter={s.showFooter}
            footerText={s.footerText}
          />
        </div>
      </div>
    </div>
  );
}

export default CatalogPrinter;
