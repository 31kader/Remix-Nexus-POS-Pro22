import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, CompanySettings } from '../types';
import {
  printCatalog,
  shareCatalog,
  exportCatalogAsHtml,
  CatalogPrintSettings,
  SocialTarget
} from '../services/printService';
import { escapeHtml } from '../lib/utils';
import { toast } from 'sonner';
import {
  CatalogPrinterProps,
  CustomOverrides,
  LayoutMode,
  PriceDisplayMode,
  CellBorder,
  Orientation,
  ConfigSection,
  THEME_PRESETS,
  BADGE_PRESETS
} from './catalog-printer/types';
import { CatalogTopBar } from './catalog-printer/CatalogTopBar';
import { CatalogQueueList } from './catalog-printer/CatalogQueueList';
import { CatalogConfigPanel } from './catalog-printer/CatalogConfigPanel';
import { CatalogA4Preview } from './catalog-printer/CatalogA4Preview';

// Ré-exports pour rétrocompatibilité
export { THEME_PRESETS, BADGE_PRESETS };
export type { CatalogPrinterProps };

export function CatalogPrinter({ products, settings, initialSelectedProductIds = [] }: CatalogPrinterProps) {
  // 1. ZERO PRODUCTS LOADED BY DEFAULT — only selectedProductIds are rendered
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialSelectedProductIds);
  const [search, setSearch] = useState('');
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Per-product custom overrides (price, old crossed price, promotional badge)
  const [customOverrides, setCustomOverrides] = useState<CustomOverrides>({});

  // Print Settings State
  const [title, setTitle] = useState(settings.name ? `CATALOGUE — ${settings.name.toUpperCase()}` : 'CATALOGUE PRODUITS');
  const [subtitle, setSubtitle] = useState('Sélection officielle — Offres & Tarifs en vigueur');
  const [validityBanner, setValidityBanner] = useState('');
  const [headerQrLink, setHeaderQrLink] = useState(settings.phone ? `https://wa.me/${settings.phone.replace(/\s+/g, '')}` : '');
  const [showHeaderQr, setShowHeaderQr] = useState(false);
  const [blindInventoryMode] = useState(false);
  const [contactPhone, setContactPhone] = useState(settings.phone || '');
  const [footerText, setFooterText] = useState('Nexus POS Pro — Tarification en Dinars Algériens (DA). Sous réserve de disponibilité.');

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [priceDisplayMode, setPriceDisplayMode] = useState<PriceDisplayMode>('retail');
  const [discountPercent, setDiscountPercent] = useState<number>(15);
  const [themeColor, setThemeColor] = useState<string>('#4f46e5');

  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showLogo, setShowLogo] = useState(true);

  const [columns, setColumns] = useState(3);
  const [rowsPerPage, setRowsPerPage] = useState(3);
  const [pageMargin] = useState(10); // mm
  const [cellGap] = useState(10); // px
  const [cellBorder, setCellBorder] = useState<CellBorder>('thin');
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  // Element Toggles
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showImage, setShowImage] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showStock, setShowStock] = useState(false);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  // Sizing Options
  const [nameFontSize, setNameFontSize] = useState(11);
  const [priceFontSize, setPriceFontSize] = useState(14);
  const [imageHeight, setImageHeight] = useState(95); // px
  const [barcodeHeight, setBarcodeHeight] = useState(24);
  const [barcodeWidth] = useState(1.0);
  const [qrSize, setQrSize] = useState(40);
  const [descFontSize] = useState(9);

  // Preview state
  const [zoom, setZoom] = useState(0.65);
  const [activePreviewPage, setActivePreviewPage] = useState<number>(0);
  const [configSection, setConfigSection] = useState<ConfigSection>('template');

  // Share state
  const [isSharing, setIsSharing] = useState(false);

  // Fast O(1) lookup map for selected products
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      if (p?.id) map.set(p.id, p);
    }
    return map;
  }, [products]);

  // STRICT SEARCH-ONLY RESULTS: Returns EMPTY array when search has < 2 chars! Never renders 11,177 products!
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
        if (results.length >= 25) break; // Cap to 25 results for instant 0ms rendering
      }
    }
    return results;
  }, [products, search]);

  // Categories list for optional bulk category addition
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p?.categoryId) set.add(p.categoryId);
    }
    return Array.from(set).sort();
  }, [products]);

  // Selected products in print queue
  const queueProducts = useMemo(() => {
    return selectedProductIds
      .map(id => productMap.get(id))
      .filter((p): p is Product => !!p);
  }, [selectedProductIds, productMap]);

  const addProductToQueue = (product: Product) => {
    if (!selectedProductIds.includes(product.id)) {
      setSelectedProductIds(prev => [...prev, product.id]);
      toast.success(`"${product.name}" ajouté au catalogue A4`);
    } else {
      toast.info(`"${product.name}" est déjà dans le catalogue`);
    }
  };

  const removeProductFromQueue = (id: string) => {
    setSelectedProductIds(prev => prev.filter(pid => pid !== id));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      const q = search.trim().toLowerCase();
      const exact = searchResults.find(
        p => String(p.barcode || '').toLowerCase() === q || String(p.sku || '').toLowerCase() === q
      );
      addProductToQueue(exact || searchResults[0]);
      setSearch('');
    }
  };

  const handleAddByCategory = () => {
    if (!selectedCategoryToAdd) return;
    const matchingIds = products
      .filter(p => p.categoryId === selectedCategoryToAdd && (Number(p.stock) || 0) > 0)
      .slice(0, 50)
      .map(p => p.id);
    if (matchingIds.length === 0) {
      toast.info('Aucun produit en stock trouvé dans cette catégorie.');
      return;
    }
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...matchingIds])));
    toast.success(`${matchingIds.length} produit(s) de la catégorie ajoutés.`);
    setSelectedCategoryToAdd('');
  };

  const handleQuickPick = (mode: 'top_stock' | 'newest' | 'low_stock') => {
    let picked: Product[] = [];
    if (mode === 'top_stock') {
      picked = [...products]
        .filter(p => (Number(p.stock) || 0) > 0)
        .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0))
        .slice(0, 12);
    } else if (mode === 'newest') {
      picked = [...products]
        .filter(p => (Number(p.stock) || 0) > 0)
        .slice(-12)
        .reverse();
    } else if (mode === 'low_stock') {
      picked = [...products]
        .filter(p => (Number(p.stock) || 0) <= (Number(p.minStock ?? (p as any).lowStockThreshold) || 5))
        .slice(0, 18);
    }
    if (picked.length === 0) {
      toast.info('Aucun article trouvé pour cette sélection rapide.');
      return;
    }
    const ids = picked.map(p => p.id);
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...ids])));
    toast.success(`${picked.length} article(s) ajoutés à la sélection.`);
  };

  const handleSortQueue = (criterion: 'name_asc' | 'price_asc' | 'price_desc' | 'stock_desc') => {
    const sorted = [...queueProducts];
    if (criterion === 'name_asc') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (criterion === 'price_asc') sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (criterion === 'price_desc') sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (criterion === 'stock_desc') sorted.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
    setSelectedProductIds(sorted.map(p => p.id));
    toast.success('Sélection triée avec succès.');
  };

  const handleApplyBadgeToAll = (badge: string) => {
    const nextOverrides = { ...customOverrides };
    for (const id of selectedProductIds) {
      nextOverrides[id] = { ...(nextOverrides[id] || {}), badge };
    }
    setCustomOverrides(nextOverrides);
    toast.success(badge ? `Badge "${badge}" appliqué à toute la sélection.` : 'Badges effacés.');
  };

  const handleSaveTemplatePreset = () => {
    try {
      const presetData = {
        title,
        subtitle,
        validityBanner,
        contactPhone,
        footerText,
        layoutMode,
        priceDisplayMode,
        discountPercent,
        themeColor,
        columns,
        rowsPerPage,
        showBarcode,
        showQr,
        showStock
      };
      localStorage.setItem('nexus_catalog_saved_preset_v1', JSON.stringify(presetData));
      toast.success('Configuration du modèle A4 sauvegardée comme favori !');
    } catch {
      toast.error('Impossible de sauvegarder le modèle.');
    }
  };

  const handleLoadTemplatePreset = () => {
    try {
      const raw = localStorage.getItem('nexus_catalog_saved_preset_v1');
      if (!raw) {
        toast.info('Aucun modèle favori sauvegardé pour le moment.');
        return;
      }
      const d = JSON.parse(raw);
      if (d.title) setTitle(d.title);
      if (d.subtitle) setSubtitle(d.subtitle);
      if (d.validityBanner !== undefined) setValidityBanner(d.validityBanner);
      if (d.contactPhone !== undefined) setContactPhone(d.contactPhone);
      if (d.footerText) setFooterText(d.footerText);
      if (d.layoutMode) setLayoutMode(d.layoutMode);
      if (d.priceDisplayMode) setPriceDisplayMode(d.priceDisplayMode);
      if (d.discountPercent !== undefined) setDiscountPercent(d.discountPercent);
      if (d.themeColor) setThemeColor(d.themeColor);
      if (d.columns) setColumns(d.columns);
      if (d.rowsPerPage) setRowsPerPage(d.rowsPerPage);
      toast.success('Modèle favori chargé avec succès !');
    } catch {
      toast.error('Erreur lors du chargement du modèle.');
    }
  };

  const updateProductOverride = (
    productId: string,
    patch: Partial<{ customPrice?: number; oldPrice?: number; badge?: string }>
  ) => {
    setCustomOverrides(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        ...patch
      }
    }));
  };

  // Partition selected products into A4 pages
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

  const buildPrintSettings = (): CatalogPrintSettings => ({
    title,
    subtitle,
    footerText,
    showHeader,
    showFooter,
    showDate,
    showLogo,
    columns: layoutMode === 'table' || layoutMode === 'inventory_sheet' ? 1 : columns,
    rowsPerPage: layoutMode === 'inventory_sheet' ? 20 : layoutMode === 'table' ? 18 : rowsPerPage,
    pageMargin,
    cellGap,
    cellBorder,
    orientation,
    showName,
    showPrice,
    showImage,
    showSku,
    showStock,
    showBarcode,
    showQr,
    showDescription,
    nameFontSize,
    priceFontSize,
    imageHeight,
    barcodeHeight,
    barcodeWidth,
    qrSize,
    descFontSize,
    layoutMode: layoutMode === 'inventory_sheet' ? 'table' : layoutMode,
    priceDisplayMode,
    themeColor,
    contactPhone,
    discountPercent,
    customOverrides
  });

  const handlePrint = async () => {
    if (queueProducts.length === 0) {
      toast.error("Recherchez et ajoutez au moins un produit avant d'imprimer.");
      return;
    }
    if (layoutMode === 'inventory_sheet') {
      const win = window.open('', '_blank', 'width=1050,height=800');
      if (!win) return;
      const rowsHtml = queueProducts
        .map(
          (p, idx) => `
          <tr>
            <td style="padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-size:11px;">${idx + 1}</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;font-family:monospace;font-size:11px;">${escapeHtml(p.sku || p.barcode || '-')}</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;font-weight:bold;font-size:11px;">${escapeHtml(p.name)}</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-size:11px;">${escapeHtml(p.categoryId || '-')}</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-weight:bold;font-size:11px;">
              ${blindInventoryMode ? '🔒 Masqué' : (p.stock ?? 0)}
            </td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-size:12px;">_________</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-size:12px;">_________</td>
            <td style="padding:6px 8px;border:1px solid #94a3b8;font-size:11px;"></td>
          </tr>`
        )
        .join('');
      win.document.write(`
        <html>
          <head>
            <title>${escapeHtml(title)}</title>
            <style>
              @page { size: A4 ${orientation === 'landscape' ? 'landscape' : 'portrait'}; margin: 12mm; }
              body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th { background: ${escapeHtml(themeColor)}; color: white; padding: 8px; font-size: 10px; text-transform: uppercase; border: 1px solid ${escapeHtml(themeColor)}; }
            </style>
          </head>
          <body>
            <div style="border-bottom:3px solid ${escapeHtml(themeColor)};padding-bottom:10px;display:flex;justify-content:space-between;align-items:flex-end;">
              <div>
                <h2 style="margin:0;color:${escapeHtml(themeColor)};">${escapeHtml(title)}</h2>
                <p style="margin:3px 0 0;font-size:12px;color:#475569;">${escapeHtml(subtitle)}</p>
              </div>
              <div style="text-align:right;font-size:11px;">
                <div>Date : <strong>${new Date().toLocaleDateString('fr-FR')}</strong></div>
                <div>Total Références : <strong>${queueProducts.length}</strong></div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:32px;">N°</th>
                  <th style="width:105px;">Réf / Code</th>
                  <th>Désignation de l'Article</th>
                  <th style="width:95px;">Rayon</th>
                  <th style="width:85px;">Stock Théorique</th>
                  <th style="width:95px;">Stock Compté</th>
                  <th style="width:75px;">Écart</th>
                  <th style="width:130px;">Observations</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <div style="margin-top:28px;display:flex;justify-content:space-between;font-size:12px;">
              <div>Auditeur / Magasinier : _________________________</div>
              <div>Visa Responsable : _________________________</div>
            </div>
            <script>window.onload = () => { window.print(); }</script>
          </body>
        </html>
      `);
      win.document.close();
      return;
    }
    toast.info('Préparation du Catalogue A4...');
    await printCatalog(queueProducts, settings, buildPrintSettings());
  };

  const handleShare = async (target: SocialTarget) => {
    if (queueProducts.length === 0) {
      toast.error('Ajoutez au moins un produit au catalogue.');
      return;
    }
    setIsSharing(true);
    try {
      const result = await shareCatalog(queueProducts, settings, buildPrintSettings(), target);
      if (result.success) toast.success(result.message);
      else toast.warning(result.message);
    } catch {
      toast.error('Erreur lors du partage.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleExportHtml = async () => {
    if (queueProducts.length === 0) {
      toast.error('Ajoutez au moins un produit au catalogue.');
      return;
    }
    await exportCatalogAsHtml(queueProducts, settings, buildPrintSettings());
    toast.success('Catalogue A4 téléchargé en HTML/PDF !');
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. TOP BAR : Title + Search-Only Bar + Quick Picks + Action Buttons */}
      <CatalogTopBar
        themeColor={themeColor}
        queueProductsCount={queueProducts.length}
        pagesCount={pages.length}
        search={search}
        setSearch={setSearch}
        searchInputRef={searchInputRef}
        searchResults={searchResults}
        onSearchKeyDown={handleSearchKeyDown}
        onAddProduct={addProductToQueue}
        selectedCategoryToAdd={selectedCategoryToAdd}
        setSelectedCategoryToAdd={setSelectedCategoryToAdd}
        uniqueCategories={uniqueCategories}
        onAddByCategory={handleAddByCategory}
        onQuickPick={handleQuickPick}
        onApplyInventorySheetPreset={() => {
          setLayoutMode('inventory_sheet');
          setColumns(1);
          setRowsPerPage(20);
          setTitle(settings.name ? `FICHE D'INVENTAIRE PHYSIQUE — ${settings.name.toUpperCase()}` : "FICHE D'INVENTAIRE PHYSIQUE");
          setSubtitle('Feuille de comptage et de vérification des stocks en rayon');
          toast.info("Mode Fiche d'Inventaire Physique A4 activé");
        }}
        layoutMode={layoutMode}
        onSaveTemplatePreset={handleSaveTemplatePreset}
        onLoadTemplatePreset={handleLoadTemplatePreset}
        onExportHtml={handleExportHtml}
        onShare={handleShare}
        isSharing={isSharing}
        onPrint={handlePrint}
      />

      {/* 2. MAIN WORKSPACE: Left = Selected Queue & Options | Right = Live A4 Page Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN (5 cols): Selected Queue + Pro Options Panel */}
        <div className="xl:col-span-5 space-y-6">
          <CatalogQueueList
            queueProducts={queueProducts}
            onClearQueue={() => setSelectedProductIds([])}
            onSortQueue={handleSortQueue}
            onApplyBadgeToAll={handleApplyBadgeToAll}
            customOverrides={customOverrides}
            onUpdateOverride={updateProductOverride}
            onRemoveProduct={removeProductFromQueue}
            themeColor={themeColor}
          />

          <CatalogConfigPanel
            configSection={configSection}
            setConfigSection={setConfigSection}
            layoutMode={layoutMode}
            setLayoutMode={setLayoutMode}
            columns={columns}
            setColumns={setColumns}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            orientation={orientation}
            setOrientation={setOrientation}
            cellBorder={cellBorder}
            setCellBorder={setCellBorder}
            priceDisplayMode={priceDisplayMode}
            setPriceDisplayMode={setPriceDisplayMode}
            setShowPrice={setShowPrice}
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            themeColor={themeColor}
            setThemeColor={setThemeColor}
            title={title}
            setTitle={setTitle}
            subtitle={subtitle}
            setSubtitle={setSubtitle}
            contactPhone={contactPhone}
            setContactPhone={setContactPhone}
            validityBanner={validityBanner}
            setValidityBanner={setValidityBanner}
            headerQrLink={headerQrLink}
            setHeaderQrLink={setHeaderQrLink}
            showHeaderQr={showHeaderQr}
            setShowHeaderQr={setShowHeaderQr}
            footerText={footerText}
            setFooterText={setFooterText}
            showHeader={showHeader}
            setShowHeader={setShowHeader}
            showFooter={showFooter}
            setShowFooter={setShowFooter}
            showDate={showDate}
            setShowDate={setShowDate}
            showLogo={showLogo}
            setShowLogo={setShowLogo}
            showName={showName}
            setShowName={setShowName}
            showPrice={showPrice}
            showImage={showImage}
            setShowImage={setShowImage}
            showSku={showSku}
            setShowSku={setShowSku}
            showStock={showStock}
            setShowStock={setShowStock}
            showBarcode={showBarcode}
            setShowBarcode={setShowBarcode}
            showQr={showQr}
            setShowQr={setShowQr}
            showDescription={showDescription}
            setShowDescription={setShowDescription}
            nameFontSize={nameFontSize}
            setNameFontSize={setNameFontSize}
            priceFontSize={priceFontSize}
            setPriceFontSize={setPriceFontSize}
            imageHeight={imageHeight}
            setImageHeight={setImageHeight}
            barcodeHeight={barcodeHeight}
            setBarcodeHeight={setBarcodeHeight}
            qrSize={qrSize}
            setQrSize={setQrSize}
          />
        </div>

        {/* RIGHT COLUMN (7 cols): Live A4 Preview */}
        <div className="xl:col-span-7">
          <CatalogA4Preview
            settings={settings}
            pages={pages}
            activePreviewPage={activePreviewPage}
            setActivePreviewPage={setActivePreviewPage}
            zoom={zoom}
            setZoom={setZoom}
            orientation={orientation}
            pageMargin={pageMargin}
            showHeader={showHeader}
            themeColor={themeColor}
            showLogo={showLogo}
            title={title}
            subtitle={subtitle}
            showDate={showDate}
            contactPhone={contactPhone}
            layoutMode={layoutMode}
            columns={columns}
            cellGap={cellGap}
            cellBorder={cellBorder}
            customOverrides={customOverrides}
            priceDisplayMode={priceDisplayMode}
            discountPercent={discountPercent}
            showImage={showImage}
            imageHeight={imageHeight}
            showName={showName}
            nameFontSize={nameFontSize}
            showPrice={showPrice}
            priceFontSize={priceFontSize}
            showSku={showSku}
            showBarcode={showBarcode}
            barcodeHeight={barcodeHeight}
            barcodeWidth={barcodeWidth}
            showQr={showQr}
            qrSize={qrSize}
            showFooter={showFooter}
            footerText={footerText}
          />
        </div>
      </div>
    </div>
  );
}
