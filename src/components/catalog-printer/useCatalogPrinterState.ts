import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product } from '../../types';
import {
  CatalogPrinterProps,
  CustomOverrides
} from './types';
import {
  useCatalogPrinterLayoutConfig,
  useCatalogPrinterExport
} from './hooks';
import { useCatalogQueueManagement } from './useCatalogQueueManagement';

export function useCatalogPrinterState({ products, settings, initialSelectedProductIds = [] }: CatalogPrinterProps) {
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialSelectedProductIds);
  const [search, setSearch] = useState('');
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customOverrides, setCustomOverrides] = useState<CustomOverrides>({});

  // Layout & visual config
  const layoutConfig = useCatalogPrinterLayoutConfig({
    settings,
    customOverrides
  });

  const {
    title,
    setTitle,
    subtitle,
    setSubtitle,
    validityBanner,
    setValidityBanner,
    headerQrLink,
    setHeaderQrLink,
    showHeaderQr,
    setShowHeaderQr,
    blindInventoryMode,
    contactPhone,
    setContactPhone,
    footerText,
    setFooterText,
    layoutMode,
    setLayoutMode,
    priceDisplayMode,
    setPriceDisplayMode,
    discountPercent,
    setDiscountPercent,
    themeColor,
    setThemeColor,
    showHeader,
    setShowHeader,
    showFooter,
    setShowFooter,
    showDate,
    setShowDate,
    showLogo,
    setShowLogo,
    columns,
    setColumns,
    rowsPerPage,
    setRowsPerPage,
    pageMargin,
    cellGap,
    cellBorder,
    setCellBorder,
    orientation,
    setOrientation,
    showName,
    setShowName,
    showPrice,
    setShowPrice,
    showImage,
    setShowImage,
    showSku,
    setShowSku,
    showStock,
    setShowStock,
    showBarcode,
    setShowBarcode,
    showQr,
    setShowQr,
    showDescription,
    setShowDescription,
    nameFontSize,
    setNameFontSize,
    priceFontSize,
    setPriceFontSize,
    imageHeight,
    setImageHeight,
    barcodeHeight,
    setBarcodeHeight,
    barcodeWidth,
    qrSize,
    setQrSize,
    descFontSize,
    zoom,
    setZoom,
    activePreviewPage,
    setActivePreviewPage,
    configSection,
    setConfigSection,
    handleSaveTemplatePreset,
    handleLoadTemplatePreset,
    buildPrintSettings
  } = layoutConfig;

  // Fast O(1) lookup map
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      if (p?.id) map.set(p.id, p);
    }
    return map;
  }, [products]);

  // Search-only capped results
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: Product[] = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p) continue;
      if (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(q)) ||
        (p.sku && String(p.sku).toLowerCase().includes(q))
      ) {
        results.push(p);
        if (results.length >= 25) break;
      }
    }
    return results;
  }, [products, search]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p?.categoryId) set.add(p.categoryId);
    }
    return Array.from(set).sort();
  }, [products]);

  const queueProducts = useMemo(() => {
    return selectedProductIds
      .map(id => productMap.get(id))
      .filter((p): p is Product => !!p);
  }, [selectedProductIds, productMap]);

  // Sub-hook Queue Management
  const {
    addProductToQueue,
    removeProductFromQueue,
    handleSearchKeyDown,
    handleAddByCategory,
    handleQuickPick,
    handleSortQueue,
    handleApplyBadgeToAll,
    updateProductOverride
  } = useCatalogQueueManagement({
    products,
    selectedProductIds,
    setSelectedProductIds,
    queueProducts,
    customOverrides,
    setCustomOverrides,
    selectedCategoryToAdd,
    setSelectedCategoryToAdd,
    searchResults,
    setSearch
  });

  const pages = useMemo(() => {
    const result: Product[][] = [];
    let currentIndex = 0;
    const isTabular = layoutMode === 'table' || layoutMode === 'inventory_sheet';
    const effectiveCols = isTabular ? 1 : columns;
    const effectiveRows = layoutMode === 'inventory_sheet' ? 20 : layoutMode === 'table' ? 18 : rowsPerPage;
    const firstPageRows = showHeader ? Math.max(1, effectiveRows - (isTabular ? 3 : 1)) : effectiveRows;
    const firstPageCapacity = effectiveCols * firstPageRows;
    const standardPageCapacity = effectiveCols * effectiveRows;

    if (currentIndex < queueProducts.length) {
      result.push(queueProducts.slice(currentIndex, currentIndex + firstPageCapacity));
      currentIndex += firstPageCapacity;
    }
    while (currentIndex < queueProducts.length) {
      result.push(queueProducts.slice(currentIndex, currentIndex + standardPageCapacity));
      currentIndex += standardPageCapacity;
    }
    return result;
  }, [queueProducts, showHeader, columns, rowsPerPage, layoutMode]);

  useEffect(() => {
    if (activePreviewPage >= pages.length && pages.length > 0) {
      setActivePreviewPage(pages.length - 1);
    }
  }, [pages.length, activePreviewPage]);

  // Export & share operations
  const { isSharing, handlePrint, handleShare, handleExportHtml } = useCatalogPrinterExport({
    queueProducts,
    settings,
    buildPrintSettings,
    layoutMode,
    title,
    subtitle,
    themeColor,
    orientation,
    blindInventoryMode
  });

  return {
    selectedProductIds,
    setSelectedProductIds,
    search,
    setSearch,
    selectedCategoryToAdd,
    setSelectedCategoryToAdd,
    searchInputRef,
    customOverrides,
    title,
    setTitle,
    subtitle,
    setSubtitle,
    validityBanner,
    setValidityBanner,
    headerQrLink,
    setHeaderQrLink,
    showHeaderQr,
    setShowHeaderQr,
    contactPhone,
    setContactPhone,
    footerText,
    setFooterText,
    layoutMode,
    setLayoutMode,
    priceDisplayMode,
    setPriceDisplayMode,
    discountPercent,
    setDiscountPercent,
    themeColor,
    setThemeColor,
    showHeader,
    setShowHeader,
    showFooter,
    setShowFooter,
    showDate,
    setShowDate,
    showLogo,
    setShowLogo,
    columns,
    setColumns,
    rowsPerPage,
    setRowsPerPage,
    pageMargin,
    cellGap,
    cellBorder,
    setCellBorder,
    orientation,
    setOrientation,
    showName,
    setShowName,
    showPrice,
    setShowPrice,
    showImage,
    setShowImage,
    showSku,
    setShowSku,
    showStock,
    setShowStock,
    showBarcode,
    setShowBarcode,
    showQr,
    setShowQr,
    showDescription,
    setShowDescription,
    nameFontSize,
    setNameFontSize,
    priceFontSize,
    setPriceFontSize,
    imageHeight,
    setImageHeight,
    barcodeHeight,
    setBarcodeHeight,
    barcodeWidth,
    qrSize,
    setQrSize,
    descFontSize,
    zoom,
    setZoom,
    activePreviewPage,
    setActivePreviewPage,
    configSection,
    setConfigSection,
    isSharing,
    searchResults,
    uniqueCategories,
    queueProducts,
    pages,
    addProductToQueue,
    removeProductFromQueue,
    handleSearchKeyDown,
    handleAddByCategory,
    handleQuickPick,
    handleSortQueue,
    handleApplyBadgeToAll,
    handleSaveTemplatePreset,
    handleLoadTemplatePreset,
    updateProductOverride,
    handlePrint,
    handleShare,
    handleExportHtml
  };
}
