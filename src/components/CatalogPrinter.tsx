import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Printer, Search, Plus, Trash2, Sliders, LayoutGrid, Eye, Share2, Download,
  Sparkles, Tag, Palette, Table, Barcode as BarcodeIcon, Phone, FileText, X, Check
} from 'lucide-react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Product, CompanySettings } from '../types';
import { Button } from './ui';
import { SafeImage } from './ui/SafeImage';
import { printCatalog, shareCatalog, exportCatalogAsHtml, CatalogPrintSettings, SocialTarget } from '../services/printService';
import { cn, escapeHtml } from '../lib/utils';
import { toast } from 'sonner';

interface CatalogPrinterProps {
  products: Product[];
  settings: CompanySettings;
  initialSelectedProductIds?: string[];
}

const THEME_PRESETS = [
  { id: '#4f46e5', label: 'Indigo Pro', class: 'bg-indigo-600' },
  { id: '#059669', label: 'Émeraude', class: 'bg-emerald-600' },
  { id: '#dc2626', label: 'Rouge Promo', class: 'bg-red-600' },
  { id: '#d97706', label: 'Or Prestige', class: 'bg-amber-600' },
  { id: '#0f172a', label: 'Noir Élégant', class: 'bg-slate-900' }
];

const BADGE_PRESETS = ['', 'PROMO', 'NOUVEAU', 'TOP VENTE', 'ARRIVAGE', 'PRIX CHOC'];

export function CatalogPrinter({ products, settings, initialSelectedProductIds = [] }: CatalogPrinterProps) {
  // 1. ZERO PRODUCTS LOADED BY DEFAULT — only selectedProductIds are rendered
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialSelectedProductIds);
  const [search, setSearch] = useState('');
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Per-product custom overrides (price, old crossed price, promotional badge)
  const [customOverrides, setCustomOverrides] = useState<
    Record<string, { customPrice?: number; oldPrice?: number; badge?: string }>
  >({});

  // Print Settings State
  const [title, setTitle] = useState(settings.name ? `CATALOGUE — ${settings.name.toUpperCase()}` : 'CATALOGUE PRODUITS');
  const [subtitle, setSubtitle] = useState('Sélection officielle — Offres & Tarifs en vigueur');
  const [validityBanner, setValidityBanner] = useState('');
  const [headerQrLink, setHeaderQrLink] = useState(settings.phone ? `https://wa.me/${settings.phone.replace(/\s+/g, '')}` : '');
  const [showHeaderQr, setShowHeaderQr] = useState(false);
  const [blindInventoryMode, setBlindInventoryMode] = useState(false);
  const [contactPhone, setContactPhone] = useState(settings.phone || '');
  const [footerText, setFooterText] = useState('Nexus POS Pro — Tarification en Dinars Algériens (DA). Sous réserve de disponibilité.');

  const [layoutMode, setLayoutMode] = useState<'grid' | 'table' | 'inventory_sheet'>('grid');
  const [priceDisplayMode, setPriceDisplayMode] = useState<'retail' | 'wholesale' | 'both' | 'promo' | 'none'>('retail');
  const [discountPercent, setDiscountPercent] = useState<number>(15);
  const [themeColor, setThemeColor] = useState<string>('#4f46e5');

  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showLogo, setShowLogo] = useState(true);

  const [columns, setColumns] = useState(3);
  const [rowsPerPage, setRowsPerPage] = useState(3);
  const [pageMargin, setPageMargin] = useState(10); // mm
  const [cellGap, setCellGap] = useState(10); // px
  const [cellBorder, setCellBorder] = useState<'none' | 'thin' | 'shadow'>('thin');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

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
  const [barcodeWidth, setBarcodeWidth] = useState(1.0);
  const [qrSize, setQrSize] = useState(40);
  const [descFontSize, setDescFontSize] = useState(9);

  // Preview state
  const [zoom, setZoom] = useState(0.65);
  const [activePreviewPage, setActivePreviewPage] = useState<number>(0);
  const [configSection, setConfigSection] = useState<'template' | 'pricing' | 'header' | 'elements'>('template');

  // Share dropdown
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSharePanelOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setIsSharePanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isSharePanelOpen]);

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
      // Exact barcode/SKU match or first result
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

  const applyLayoutPreset = (preset: '2x2' | '3x3' | '4x4' | '5x5' | 'table' | 'inventory_sheet') => {
    if (preset === 'inventory_sheet') {
      setLayoutMode('inventory_sheet');
      setColumns(1);
      setRowsPerPage(20);
      setTitle(settings.name ? `FICHE D'INVENTAIRE PHYSIQUE — ${settings.name.toUpperCase()}` : "FICHE D'INVENTAIRE PHYSIQUE");
      setSubtitle('Feuille de comptage et de vérification des stocks en rayon');
      toast.info("Mode Fiche d'Inventaire Physique A4 activé");
      return;
    }
    if (preset === 'table') {
      setLayoutMode('table');
      setColumns(1);
      setRowsPerPage(18);
      toast.info('Mode Liste Tarifaire Grossiste (Tableau A4) activé');
      return;
    }
    setLayoutMode('grid');
    if (preset === '2x2') {
      setColumns(2);
      setRowsPerPage(2);
      setImageHeight(155);
      setNameFontSize(14);
      setPriceFontSize(18);
    } else if (preset === '3x3') {
      setColumns(3);
      setRowsPerPage(3);
      setImageHeight(95);
      setNameFontSize(11);
      setPriceFontSize(14);
    } else if (preset === '4x4') {
      setColumns(4);
      setRowsPerPage(4);
      setImageHeight(68);
      setNameFontSize(10);
      setPriceFontSize(12);
    } else if (preset === '5x5') {
      setColumns(5);
      setRowsPerPage(5);
      setImageHeight(50);
      setNameFontSize(9);
      setPriceFontSize(11);
      setShowBarcode(false);
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
      setIsSharePanelOpen(false);
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

  const currency = settings.currency || 'DA';
  const currentPageItems = pages[activePreviewPage] || [];

  return (
    <div className="space-y-6 text-left">
      {/* TOP BAR: Title + Search-Only Bar + Print/Export Buttons */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ backgroundColor: themeColor }}
            >
              <Printer size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Studio d'Impression Catalogue & Prospectus A4
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ⚡ Mode Recherche Rapide (0 produit préchargé)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Recherchez uniquement les articles à inclure, personnalisez leurs prix/badges promo et imprimez en A4 haute définition
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleExportHtml}
              variant="secondary"
              disabled={queueProducts.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700"
            >
              <Download size={15} /> Exporter HTML
            </Button>

            <div className="relative" ref={shareDropdownRef}>
              <Button
                onClick={() => setIsSharePanelOpen(v => !v)}
                variant="secondary"
                disabled={queueProducts.length === 0 || isSharing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700"
              >
                <Share2 size={15} /> Partager
              </Button>
              {isSharePanelOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 z-50 space-y-1">
                  <button
                    type="button"
                    onClick={() => handleShare('whatsapp')}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >
                    📱 Partager via WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare('email')}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  >
                    ✉️ Envoyer par Email
                  </button>
                </div>
              )}
            </div>

            <Button
              onClick={handlePrint}
              disabled={queueProducts.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm"
              style={{ backgroundColor: themeColor }}
            >
              <Printer size={16} /> Imprimer le Catalogue A4 ({queueProducts.length} art. • { Math.max(1, pages.length) } p.)
            </Button>
          </div>
        </div>

        {/* DEDICATED SEARCH BAR (No products loaded until user searches!) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <div className="lg:col-span-8 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="🔍 Tapez le nom d'un produit, scannez un code-barres ou saisissez un SKU (Puis Entrée pour ajouter)..."
              className="w-full pl-11 pr-10 py-3.5 rounded-xl border-2 border-indigo-500/30 focus:border-indigo-600 bg-slate-50 dark:bg-zinc-800/90 text-slate-900 dark:text-white text-sm font-bold outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            )}

            {/* Instant Search Results Dropdown */}
            {search.trim().length >= 2 && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-h-80 overflow-y-auto z-40 divide-y divide-slate-100 dark:divide-zinc-800">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-zinc-400">
                    Aucun article trouvé pour « {search} ».
                  </div>
                ) : (
                  searchResults.map(p => {
                    const isAdded = selectedProductIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => addProductToQueue(p)}
                        className="p-3 hover:bg-indigo-50/70 dark:hover:bg-zinc-800 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-zinc-700">
                            {p.imageUrl || p.image ? (
                              <SafeImage src={p.imageUrl || p.image} alt={p.name} className="w-full h-full object-contain" />
                            ) : (
                              <BarcodeIcon size={16} className="text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">{p.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                              Réf: {p.sku || p.barcode || 'N/A'} • Stock: {p.stock || 0} •{' '}
                              <strong className="text-indigo-600 dark:text-indigo-400">
                                {Number(p.price || 0).toFixed(2)} {currency}
                              </strong>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0',
                            isAdded
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          )}
                        >
                          {isAdded ? (
                            <>
                              <Check size={13} /> Ajouté
                            </>
                          ) : (
                            <>
                              <Plus size={13} /> Ajouter
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Optional Quick Add by Category */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <select
              value={selectedCategoryToAdd}
              onChange={e => setSelectedCategoryToAdd(e.target.value)}
              className="flex-1 py-3.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
            >
              <option value="">+ Ajouter par rayon / catégorie...</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>
                  Rayon : {cat}
                </option>
              ))}
            </select>
            <Button
              onClick={handleAddByCategory}
              disabled={!selectedCategoryToAdd}
              variant="secondary"
              className="py-3.5 px-4 rounded-xl text-xs font-bold shrink-0"
            >
              Ajouter
            </Button>
          </div>
        </div>

        {/* BARRE DE SÉLECTIONS INTELLIGENTES EN 1 CLIC & MODÈLES FAVORIS */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Ajouts Rapides :</span>
            <button
              type="button"
              onClick={() => handleQuickPick('top_stock')}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold cursor-pointer"
            >
              + Top 12 En Stock
            </button>
            <button
              type="button"
              onClick={() => handleQuickPick('newest')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold cursor-pointer"
            >
              + 12 Nouveautés
            </button>
            <button
              type="button"
              onClick={() => handleQuickPick('low_stock')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold cursor-pointer"
            >
              + Alertes Stock (Fiche Inventaire)
            </button>
            <button
              type="button"
              onClick={() => applyLayoutPreset('inventory_sheet')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer transition-all",
                layoutMode === 'inventory_sheet'
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700"
              )}
            >
              📋 Mode Fiche d'Inventaire A4
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleSaveTemplatePreset}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-xs font-bold cursor-pointer"
            >
              💾 Sauver Modèle
            </button>
            <button
              type="button"
              onClick={handleLoadTemplatePreset}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-xs font-bold cursor-pointer"
            >
              📂 Charger Modèle
            </button>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE: Left = Selected Products & Options | Right = Live A4 Page Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN (5 cols): Selected Queue + Pro Options */}
        <div className="xl:col-span-5 space-y-6">
          {/* Selected Products List with Per-Item Price/Badge Editor */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 space-y-3 bg-slate-50/50 dark:bg-zinc-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Articles Sélectionnés ({queueProducts.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Personnalisez le prix affiché ou ajoutez un badge promo par article
                  </p>
                </div>
                {queueProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedProductIds([])}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} /> Tout vider
                  </button>
                )}
              </div>

              {queueProducts.length > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-zinc-700">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 mr-1">Trier :</span>
                    <button
                      type="button"
                      onClick={() => handleSortQueue('name_asc')}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
                    >
                      A → Z
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSortQueue('price_asc')}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
                    >
                      Prix ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSortQueue('price_desc')}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
                    >
                      Prix ↓
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <select
                      onChange={e => {
                        handleApplyBadgeToAll(e.target.value);
                      }}
                      defaultValue=""
                      className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 outline-none"
                    >
                      <option value="" disabled>
                        🏷️ Badge sur tout...
                      </option>
                      <option value="PROMO">Tout en PROMO</option>
                      <option value="NOUVEAU">Tout en NOUVEAU</option>
                      <option value="ARRIVAGE">Tout en ARRIVAGE</option>
                      <option value="PRIX CHOC">Tout en PRIX CHOC</option>
                      <option value="">Effacer les badges</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
              {queueProducts.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Search size={28} className="mx-auto text-indigo-400 opacity-70" />
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Votre sélection est vide (aucun produit chargé inutilement)
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
                    Utilisez la barre de recherche ci-dessus pour chercher un produit par son nom ou scanner son code-barres.
                  </p>
                </div>
              ) : (
                queueProducts.map((p, idx) => {
                  const ov = customOverrides[p.id] || {};
                  const displayPrice = ov.customPrice !== undefined ? ov.customPrice : p.price;
                  return (
                    <div key={p.id} className="p-3 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {p.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProductFromQueue(p.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                          title="Retirer du catalogue"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Inline Controls: Custom Price, Crossed Price, Badge */}
                      <div className="grid grid-cols-3 gap-2 pl-7">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Prix Catalogue ({currency})</label>
                          <input
                            type="number"
                            value={displayPrice}
                            onChange={e => updateProductOverride(p.id, { customPrice: Number(e.target.value) })}
                            className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-black"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Ancien Prix Barré</label>
                          <input
                            type="number"
                            placeholder="Optionnel"
                            value={ov.oldPrice || ''}
                            onChange={e =>
                              updateProductOverride(p.id, {
                                oldPrice: e.target.value ? Number(e.target.value) : undefined
                              })
                            }
                            className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Badge Promo</label>
                          <select
                            value={ov.badge || ''}
                            onChange={e => updateProductOverride(p.id, { badge: e.target.value })}
                            className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
                          >
                            {BADGE_PRESETS.map(b => (
                              <option key={b} value={b}>
                                {b || 'Aucun badge'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pro Options Panel */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 p-1.5 gap-1">
              {[
                { id: 'template', label: '1. Format & Grille', icon: LayoutGrid },
                { id: 'pricing', label: '2. Prix & Promo', icon: Tag },
                { id: 'header', label: '3. En-tête & Couleur', icon: Palette },
                { id: 'elements', label: '4. Détails & Codes', icon: Sliders }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setConfigSection(t.id as any)}
                  className={cn(
                    'flex-1 py-2 px-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1',
                    configSection === t.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {/* TAB 1: FORMAT & GRID PRESETS */}
              {configSection === 'template' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-zinc-200 uppercase mb-2">
                      Modèles de Mise en Page A4 (1 clic)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: '2x2', title: '2×2 Prospectus', desc: '4 grands visuels/page' },
                        { id: '3x3', title: '3×3 Standard', desc: '9 articles/page' },
                        { id: '4x4', title: '4×4 Compact', desc: '16 articles/page' },
                        { id: '5x5', title: '5×5 Grossiste', desc: '25 articles/page' },
                        { id: 'table', title: '📊 Liste Tarifaire', desc: 'Tableau 18 lignes/page' },
                        { id: 'inventory_sheet', title: '📋 Fiche d\'Inventaire', desc: 'Comptage physique 22 lignes' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyLayoutPreset(p.id as any)}
                          className={cn(
                            'p-2.5 rounded-xl border text-left transition-all',
                            (p.id === 'table' && layoutMode === 'table') ||
                              (p.id === 'inventory_sheet' && layoutMode === 'inventory_sheet') ||
                              (layoutMode === 'grid' && `${columns}x${rowsPerPage}` === p.id)
                              ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                              : 'border-slate-200 dark:border-zinc-700 hover:border-indigo-400 text-slate-800 dark:text-zinc-200'
                          )}
                        >
                          <div className="text-xs font-black">{p.title}</div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {layoutMode === 'grid' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Colonnes ({columns})</label>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={columns}
                          onChange={e => setColumns(Number(e.target.value))}
                          className="w-full mt-1 accent-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Lignes / Page ({rowsPerPage})</label>
                        <input
                          type="range"
                          min={1}
                          max={6}
                          value={rowsPerPage}
                          onChange={e => setRowsPerPage(Number(e.target.value))}
                          className="w-full mt-1 accent-indigo-600"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Orientation A4</label>
                      <select
                        value={orientation}
                        onChange={e => setOrientation(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
                      >
                        <option value="portrait">Portrait (Vertical)</option>
                        <option value="landscape">Paysage (Horizontal)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bordure des Cartes</label>
                      <select
                        value={cellBorder}
                        onChange={e => setCellBorder(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
                      >
                        <option value="thin">Cadre Fin Pro</option>
                        <option value="shadow">Ombre Légère</option>
                        <option value="none">Sans Bordure</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRICING & PROMO OPTIONS */}
              {configSection === 'pricing' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-zinc-200 uppercase mb-2">
                      Mode d'Affichage des Prix sur le Catalogue
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'retail', label: '💰 Prix Détail (Public)', desc: 'Affiche le prix de vente standard' },
                        { id: 'wholesale', label: '📦 Prix de Gros', desc: 'Pour vos clients revendeurs' },
                        { id: 'both', label: '⚖️ Double Prix (Public + Gros)', desc: 'Affiche les 2 tarifs sur chaque carte' },
                        { id: 'promo', label: '🔥 Mode Promo (Prix Barré)', desc: 'Affiche un ancien prix barré + prix promo' },
                        { id: 'none', label: '🖼️ Catalogue Vitrine (Sans Prix)', desc: 'Photos et références uniquement' }
                      ].map(mode => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            setPriceDisplayMode(mode.id as any);
                            setShowPrice(mode.id !== 'none');
                          }}
                          className={cn(
                            'p-3 rounded-xl border text-left transition-all',
                            priceDisplayMode === mode.id
                              ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                              : 'border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
                          )}
                        >
                          <div className="text-xs font-black">{mode.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{mode.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {priceDisplayMode === 'promo' && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                      <label className="block text-xs font-black text-rose-700 dark:text-rose-300">
                        Remise Promo Automatique par Défaut : -{discountPercent}%
                      </label>
                      <input
                        type="range"
                        min={5}
                        max={60}
                        step={5}
                        value={discountPercent}
                        onChange={e => setDiscountPercent(Number(e.target.value))}
                        className="w-full accent-rose-600"
                      />
                      <p className="text-[10px] text-slate-600 dark:text-zinc-300">
                        Simule automatiquement un ancien prix barré (+{discountPercent}%) si vous n'avez pas saisi d'ancien prix spécifique sur l'article.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HEADER, FOOTER & THEME COLOR */}
              {configSection === 'header' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                      Couleur Thème du Catalogue A4
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {THEME_PRESETS.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setThemeColor(t.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-transform',
                            t.class,
                            themeColor === t.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : 'opacity-80'
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Titre du Catalogue</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sous-titre / Slogan</label>
                      <input
                        type="text"
                        value={subtitle}
                        onChange={e => setSubtitle(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tél / WhatsApp Commandes</label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        placeholder="Ex: 0550 00 00 00"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pied de page (Conditions)</label>
                    <input
                      type="text"
                      value={footerText}
                      onChange={e => setFooterText(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: ELEMENT TOGGLES & SIZES */}
              {configSection === 'elements' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Photo Produit', val: showImage, set: setShowImage },
                      { label: 'Nom du Produit', val: showName, set: setShowName },
                      { label: 'Code-barres EAN', val: showBarcode, set: setShowBarcode },
                      { label: 'Code QR', val: showQr, set: setShowQr },
                      { label: 'Référence SKU', val: showSku, set: setShowSku },
                      { label: 'Quantité en Stock', val: showStock, set: setShowStock },
                      { label: 'En-tête Magasin', val: showHeader, set: setShowHeader },
                      { label: 'Pied de Page', val: showFooter, set: setShowFooter }
                    ].map((el, i) => (
                      <label
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 cursor-pointer text-xs font-bold text-slate-800 dark:text-zinc-200"
                      >
                        <span>{el.label}</span>
                        <input
                          type="checkbox"
                          checked={el.val}
                          onChange={e => el.set(e.target.checked)}
                          className="accent-indigo-600 w-4 h-4"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">
                        Hauteur Photo ({imageHeight}px)
                      </label>
                      <input
                        type="range"
                        min={45}
                        max={180}
                        value={imageHeight}
                        onChange={e => setImageHeight(Number(e.target.value))}
                        className="w-full mt-1 accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">
                        Taille Police Prix ({priceFontSize}px)
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={22}
                        value={priceFontSize}
                        onChange={e => setPriceFontSize(Number(e.target.value))}
                        className="w-full mt-1 accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Live A4 Preview */}
        <div className="xl:col-span-7 bg-slate-100 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 flex flex-col items-center">
          <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-indigo-500" />
              <span className="text-xs font-black uppercase text-slate-700 dark:text-zinc-300">
                Aperçu A4 en Direct ({pages.length > 0 ? `Page ${activePreviewPage + 1} / ${pages.length}` : '0 page'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {pages.length > 1 && (
                <div className="flex items-center gap-1 mr-2">
                  <button
                    type="button"
                    disabled={activePreviewPage === 0}
                    onClick={() => setActivePreviewPage(p => Math.max(0, p - 1))}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold disabled:opacity-40"
                  >
                    ◀ Préc.
                  </button>
                  <button
                    type="button"
                    disabled={activePreviewPage >= pages.length - 1}
                    onClick={() => setActivePreviewPage(p => Math.min(pages.length - 1, p + 1))}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold disabled:opacity-40"
                  >
                    Suiv. ▶
                  </button>
                </div>
              )}
              <span className="text-[11px] font-bold text-slate-500">Zoom :</span>
              <input
                type="range"
                min={0.45}
                max={0.9}
                step={0.05}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="w-24 accent-indigo-600"
              />
            </div>
          </div>

          {/* A4 Sheet Container */}
          <div className="overflow-auto w-full flex justify-center py-2">
            <div
              style={{
                width: orientation === 'portrait' ? '210mm' : '297mm',
                height: orientation === 'portrait' ? '297mm' : '210mm',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                padding: `${pageMargin}mm`
              }}
              className="bg-white text-slate-900 shadow-2xl rounded-sm flex flex-col justify-between shrink-0"
            >
              {/* A4 Header */}
              {showHeader && activePreviewPage === 0 && (
                <div
                  className="flex items-center justify-between pb-3 mb-3 shrink-0"
                  style={{ borderBottom: `3px solid ${themeColor}` }}
                >
                  <div className="flex items-center gap-3">
                    {showLogo && settings.logoUrl && (
                      <img src={settings.logoUrl} alt="Logo" className="h-12 object-contain" />
                    )}
                    <div>
                      <h1 className="text-xl font-black uppercase tracking-tight" style={{ color: themeColor }}>
                        {title}
                      </h1>
                      <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {showDate && (
                      <div className="text-[10px] font-bold text-slate-500 uppercase">
                        {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    )}
                    {contactPhone && (
                      <div className="text-xs font-black mt-0.5" style={{ color: themeColor }}>
                        📞 {contactPhone}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* A4 Body: Empty State vs Inventory Sheet vs Table Mode vs Grid Mode */}
              <div className="flex-1 min-h-0">
                {currentPageItems.length === 0 ? (
                  <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center">
                    <Sparkles size={40} className="text-indigo-400 mb-3" />
                    <h4 className="text-lg font-black text-slate-700">Aperçu de votre Page A4</h4>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Recherchez un article dans la barre ci-dessus ou utilisez un bouton d'ajout rapide 1-clic pour le voir apparaître sur cette feuille A4.
                    </p>
                  </div>
                ) : layoutMode === 'inventory_sheet' ? (
                  <div className="space-y-3">
                    <table className="w-full border-collapse border border-slate-300 text-left">
                      <thead>
                        <tr style={{ backgroundColor: themeColor }} className="text-white text-[9px] font-black uppercase">
                          <th className="p-1.5">N°</th>
                          <th className="p-1.5">Code / SKU</th>
                          <th className="p-1.5">Désignation Article</th>
                          <th className="p-1.5">Rayon</th>
                          <th className="p-1.5 text-center">Stock Théorique</th>
                          <th className="p-1.5 text-center">Comptage Physique</th>
                          <th className="p-1.5 text-center">Écart</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[10px]">
                        {currentPageItems.map((p, idx) => (
                          <tr key={p.id}>
                            <td className="p-1.5 font-mono text-slate-500">
                              {pages.slice(0, activePreviewPage).reduce((acc, pg) => acc + pg.length, 0) + idx + 1}
                            </td>
                            <td className="p-1.5 font-mono text-slate-600">{p.sku || p.barcode || p.id.slice(0, 8)}</td>
                            <td className="p-1.5 font-bold text-slate-900">{p.name}</td>
                            <td className="p-1.5 text-slate-500">{p.categoryId || (p as any).category || 'Général'}</td>
                            <td className="p-1.5 text-center font-black text-slate-800">{p.stock} {p.unit || 'u'}</td>
                            <td className="p-1.5 text-center">
                              <div className="h-4 border-b border-dashed border-slate-400 mx-auto w-16" />
                            </td>
                            <td className="p-1.5 text-center">
                              <div className="h-4 border-b border-dashed border-slate-400 mx-auto w-12" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : layoutMode === 'table' ? (
                  <table className="w-full border-collapse border border-slate-300 text-left">
                    <thead>
                      <tr style={{ backgroundColor: themeColor }} className="text-white text-[10px] font-black uppercase">
                        <th className="p-2">Réf / SKU</th>
                        <th className="p-2">Désignation</th>
                        <th className="p-2 text-center">Unité</th>
                        {(priceDisplayMode === 'both' || priceDisplayMode === 'wholesale') && (
                          <th className="p-2 text-right">Prix Gros</th>
                        )}
                        {priceDisplayMode !== 'wholesale' && priceDisplayMode !== 'none' && (
                          <th className="p-2 text-right">Prix Public</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {currentPageItems.map(p => {
                        const ov = customOverrides[p.id] || {};
                        const effPrice = ov.customPrice !== undefined ? ov.customPrice : Number(p.price || 0);
                        const wholesale = Number((p as any).wholesalePrice || effPrice * 0.9);
                        const oldPrice =
                          ov.oldPrice !== undefined
                            ? ov.oldPrice
                            : priceDisplayMode === 'promo' && discountPercent > 0
                              ? Math.round(effPrice / (1 - discountPercent / 100))
                              : 0;
                        const hasPromo = oldPrice > effPrice;
                        return (
                          <tr key={p.id}>
                            <td className="p-2 font-mono text-[10px] text-slate-500">
                              {p.sku || p.barcode || p.id.slice(0, 8)}
                            </td>
                            <td className="p-2 font-bold text-slate-900">
                              {p.name}{' '}
                              {ov.badge && (
                                <span
                                  style={{ backgroundColor: themeColor }}
                                  className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] text-white font-black uppercase"
                                >
                                  {ov.badge}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center text-slate-500">{p.unit || 'Unité'}</td>
                            {(priceDisplayMode === 'both' || priceDisplayMode === 'wholesale') && (
                              <td className="p-2 text-right font-black text-emerald-600">
                                {wholesale.toFixed(2)} {currency}
                              </td>
                            )}
                            {priceDisplayMode !== 'wholesale' && priceDisplayMode !== 'none' && (
                              <td className="p-2 text-right font-black" style={{ color: hasPromo ? '#dc2626' : themeColor }}>
                                {hasPromo && (
                                  <span className="text-[10px] text-slate-400 line-through mr-1.5">
                                    {oldPrice.toFixed(0)}
                                  </span>
                                )}
                                {effPrice.toFixed(2)} {currency}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${columns}, 1fr)`,
                      gap: `${cellGap}px`,
                      height: '100%'
                    }}
                  >
                    {currentPageItems.map(p => {
                      const ov = customOverrides[p.id] || {};
                      const effPrice = ov.customPrice !== undefined ? ov.customPrice : Number(p.price || 0);
                      const wholesale = Number((p as any).wholesalePrice || effPrice * 0.9);
                      const oldPrice =
                        ov.oldPrice !== undefined
                          ? ov.oldPrice
                          : priceDisplayMode === 'promo' && discountPercent > 0
                            ? Math.round(effPrice / (1 - discountPercent / 100))
                            : 0;
                      const hasPromo = oldPrice > effPrice;

                      return (
                        <div
                          key={p.id}
                          className={cn(
                            'p-2.5 bg-white flex flex-col justify-between relative overflow-hidden',
                            cellBorder === 'thin' && 'border border-slate-200 rounded-lg',
                            cellBorder === 'shadow' && 'border border-slate-200 rounded-lg shadow-sm'
                          )}
                        >
                          {ov.badge && (
                            <span
                              style={{ backgroundColor: themeColor }}
                              className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[9px] font-black text-white uppercase shadow-xs"
                            >
                              {ov.badge}
                            </span>
                          )}

                          {showImage && (
                            <div
                              style={{ height: `${imageHeight}px` }}
                              className="w-full bg-slate-50 rounded flex items-center justify-center overflow-hidden mb-1.5"
                            >
                              {p.imageUrl || p.image ? (
                                <SafeImage
                                  src={p.imageUrl || p.image}
                                  alt={p.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-300 font-bold">SANS IMAGE</span>
                              )}
                            </div>
                          )}

                          <div className="space-y-1">
                            {showName && (
                              <div
                                style={{ fontSize: `${nameFontSize}px` }}
                                className="font-black text-slate-900 truncate"
                              >
                                {p.name}
                              </div>
                            )}

                            <div className="flex items-baseline justify-between gap-1">
                              {showPrice && priceDisplayMode !== 'none' && (
                                <div>
                                  {hasPromo && (
                                    <span className="text-[10px] text-rose-500 font-bold line-through mr-1.5">
                                      {oldPrice.toFixed(0)}
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      fontSize: `${priceFontSize}px`,
                                      color: hasPromo ? '#dc2626' : themeColor
                                    }}
                                    className="font-black"
                                  >
                                    {(priceDisplayMode === 'wholesale' ? wholesale : effPrice).toFixed(2)} {currency}
                                  </span>
                                  {priceDisplayMode === 'both' && (
                                    <div className="text-[10px] font-black text-emerald-600">
                                      Gros: {wholesale.toFixed(2)} {currency}
                                    </div>
                                  )}
                                </div>
                              )}

                              {showSku && (
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {p.sku || p.id.slice(0, 6).toUpperCase()}
                                </span>
                              )}
                            </div>

                            {showBarcode && (
                              <div className="pt-1 flex justify-center overflow-hidden">
                                <Barcode
                                  value={p.barcode || p.sku || p.id.slice(0, 8).toUpperCase()}
                                  height={barcodeHeight}
                                  width={barcodeWidth}
                                  fontSize={8}
                                  margin={0}
                                />
                              </div>
                            )}

                            {showQr && (
                              <div className="pt-1 flex justify-center">
                                <QRCodeSVG value={p.sku || p.id} size={qrSize} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* A4 Footer */}
              {showFooter && (
                <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-[9px] font-bold text-slate-400 shrink-0">
                  <span>{footerText}</span>
                  <span>
                    Page {activePreviewPage + 1} / {Math.max(1, pages.length)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
