import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Printer, FileText, Search, Plus, Trash2, Sliders, Check, LayoutGrid, Type, Image as ImageIcon, Sparkles, Eye, Share2, Download, Mail, Send, X } from 'lucide-react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Product, CompanySettings } from '../types';
import { Button } from './ui';
import { SafeImage } from './ui/SafeImage';
import { printCatalog, shareCatalog, exportCatalogAsHtml, CatalogPrintSettings, SocialTarget } from '../services/printService';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface CatalogPrinterProps {
  products: Product[];
  settings: CompanySettings;
  initialSelectedProductIds?: string[];
}

export function CatalogPrinter({ products, settings, initialSelectedProductIds = [] }: CatalogPrinterProps) {
  // Printing queue of products
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialSelectedProductIds);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [activeListTab, setActiveListTab] = useState<'search' | 'queue'>('search');

  // Print Settings State
  const [title, setTitle] = useState('CATALOGUE PRODUITS');
  const [subtitle, setSubtitle] = useState('Nos articles disponibles au meilleur prix');
  const [footerText, setFooterText] = useState('Nexus POS Pro — Tarification en vigueur. Sous réserve de modifications.');
  
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  
  const [columns, setColumns] = useState(3);
  const [rowsPerPage, setRowsPerPage] = useState(4);
  const [pageMargin, setPageMargin] = useState(12); // mm
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
  const [priceFontSize, setPriceFontSize] = useState(13);
  const [imageHeight, setImageHeight] = useState(90); // px
  const [barcodeHeight, setBarcodeHeight] = useState(25);
  const [barcodeWidth, setBarcodeWidth] = useState(1.0);
  const [qrSize, setQrSize] = useState(40);
  const [descFontSize, setDescFontSize] = useState(9);

  // Preview zoom factor
  const [zoom, setZoom] = useState(0.65);
  // Preview pagination (lightweight rendering)
  const [activePreviewPage, setActivePreviewPage] = useState<number>(0);
  const [previewMode, setPreviewMode] = useState<'single' | 'all'>('single');

  // Share/Export panel
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

  // Categories helper
  const uniqueCategories = useMemo(() => {
    const ids = Array.from(new Set(products.map(p => p.categoryId).filter(Boolean)));
    return ids.map(id => {
      return { id, name: id.charAt(0).toUpperCase() + id.slice(1) };
    });
  }, [products]);

  // Filtered products list for sidebar addition with multi-field search and stock filters
  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter(p => {
      const pStock = Number(p.stock) || 0;
      if (stockStatusFilter === 'in_stock' && pStock <= 0) return false;
      if (stockStatusFilter === 'out_of_stock' && pStock > 0) return false;

      const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
      if (!matchCat) return false;

      if (!s) return true;
      const matchName = (p.name || '').toLowerCase().includes(s);
      const matchSku = (p.sku || '').toLowerCase().includes(s);
      const matchBarcode = (p.barcode || '').toLowerCase().includes(s);
      return matchName || matchSku || matchBarcode;
    });
  }, [products, search, categoryFilter, stockStatusFilter]);

  // Products in print queue
  const queueProducts = useMemo(() => {
    return selectedProductIds
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => !!p);
  }, [selectedProductIds, products]);

  const addProductToQueue = (id: string) => {
    if (!selectedProductIds.includes(id)) {
      setSelectedProductIds(prev => [...prev, id]);
    }
  };

  const removeProductFromQueue = (id: string) => {
    setSelectedProductIds(prev => prev.filter(pid => pid !== id));
  };

  const toggleProductQueue = (id: string) => {
    if (selectedProductIds.includes(id)) {
      removeProductFromQueue(id);
    } else {
      addProductToQueue(id);
    }
  };

  const addAllFiltered = () => {
    const toAdd = filteredProducts.map(p => p.id);
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...toAdd])));
    toast.success(`${toAdd.length} article(s) ajouté(s) au catalogue.`);
  };

  const addInStockOnly = () => {
    const inStockIds = filteredProducts.filter(p => (Number(p.stock) || 0) > 0).map(p => p.id);
    if (inStockIds.length === 0) {
      toast.info("Aucun article avec stock positif trouvé.");
      return;
    }
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...inStockIds])));
    toast.success(`${inStockIds.length} article(s) en stock ajouté(s).`);
  };

  const clearQueue = () => {
    setSelectedProductIds([]);
    setActivePreviewPage(0);
    toast.info("File d'impression réinitialisée.");
  };

  // Partition products into A4 pages for preview & printing
  const pages = useMemo(() => {
    const result: Product[][] = [];
    let currentIndex = 0;
    
    // First page fits fewer items if a header is displayed
    const firstPageRows = showHeader ? Math.max(1, rowsPerPage - 1) : rowsPerPage;
    const firstPageCapacity = columns * firstPageRows;
    const standardPageCapacity = columns * rowsPerPage;

    if (currentIndex < queueProducts.length) {
      result.push(queueProducts.slice(currentIndex, currentIndex + firstPageCapacity));
      currentIndex += firstPageCapacity;
    }

    while (currentIndex < queueProducts.length) {
      result.push(queueProducts.slice(currentIndex, currentIndex + standardPageCapacity));
      currentIndex += standardPageCapacity;
    }

    return result;
  }, [queueProducts, showHeader, columns, rowsPerPage]);

  // Keep activePreviewPage clamped within bounds
  useEffect(() => {
    if (activePreviewPage >= pages.length && pages.length > 0) {
      setActivePreviewPage(pages.length - 1);
    }
  }, [pages.length, activePreviewPage]);

  const handlePrint = async () => {
    if (queueProducts.length === 0) {
      toast.error("Veuillez sélectionner au moins un article.");
      return;
    }

    const printSettings: CatalogPrintSettings = {
      title,
      subtitle,
      footerText,
      showHeader,
      showFooter,
      showDate,
      showLogo,
      columns,
      rowsPerPage,
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
      descFontSize
    };

    toast.info("Génération du catalogue A4...");
    await printCatalog(queueProducts, settings, printSettings);
  };

  const buildPrintSettings = (): CatalogPrintSettings => ({
    title, subtitle, footerText, showHeader, showFooter, showDate, showLogo,
    columns, rowsPerPage, pageMargin, cellGap, cellBorder, orientation,
    showName, showPrice, showImage, showSku, showStock, showBarcode, showQr, showDescription,
    nameFontSize, priceFontSize, imageHeight, barcodeHeight, barcodeWidth, qrSize, descFontSize
  });

  const handleShare = async (target: SocialTarget) => {
    if (queueProducts.length === 0) {
      toast.error("Veuillez sélectionner au moins un article.");
      return;
    }
    setIsSharing(true);
    try {
      const result = await shareCatalog(queueProducts, settings, buildPrintSettings(), target);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    } catch (e) {
      toast.error("Erreur lors du partage.");
    } finally {
      setIsSharing(false);
      setIsSharePanelOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white uppercase flex items-center gap-3">
            <FileText className="text-indigo-500 animate-pulse" size={24} /> Studio d'Impression Catalogue A4
          </h2>
          <p className="text-xs text-slate-400 mt-1">Générez des brochures et catalogues produits professionnels 100% hors-ligne en format A4.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {selectedProductIds.length > 0 && (
            <Button 
              onClick={clearQueue}
              className="bg-slate-800 hover:bg-slate-700 font-bold uppercase transition-all px-3 py-2 text-xs border border-slate-700 text-slate-300 rounded-xl"
            >
              Vider le catalogue
            </Button>
          )}
          {/* Share/Export dropdown */}
          <div className="relative" ref={shareDropdownRef}>
            <Button
              onClick={() => setIsSharePanelOpen(prev => !prev)}
              disabled={queueProducts.length === 0}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold uppercase transition-all disabled:opacity-40"
            >
              <Share2 size={15} /> Exporter / Partager
            </Button>
            {isSharePanelOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl min-w-[220px] space-y-2 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1 mb-2">📤 Exporter & Partager</p>
                <button
                  onClick={() => handleShare('download')}
                  disabled={isSharing}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-900/40 text-white text-xs font-bold transition-colors text-left disabled:opacity-50"
                >
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0"><Download size={14} /></span>
                  Télécharger (HTML)
                </button>
                <button
                  onClick={() => handleShare('webshare')}
                  disabled={isSharing}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-800 hover:bg-blue-900/40 text-white text-xs font-bold transition-colors text-left disabled:opacity-50"
                >
                  <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0"><Share2 size={14} /></span>
                  Partage Natif (mobile)
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={() => handleShare('whatsapp')}
                  disabled={isSharing}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-800 hover:bg-green-900/40 text-white text-xs font-bold transition-colors text-left disabled:opacity-50"
                >
                  <span className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0 text-[10px] font-black">W</span>
                  WhatsApp
                </button>
                <button
                  onClick={() => handleShare('telegram')}
                  disabled={isSharing}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-800 hover:bg-sky-900/40 text-white text-xs font-bold transition-colors text-left disabled:opacity-50"
                >
                  <span className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0"><Send size={13} /></span>
                  Telegram
                </button>
                <button
                  onClick={() => handleShare('email')}
                  disabled={isSharing}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-800 hover:bg-orange-900/40 text-white text-xs font-bold transition-colors text-left disabled:opacity-50"
                >
                  <span className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0"><Mail size={13} /></span>
                  Email
                </button>
              </div>
            )}
          </div>
          <Button 
            onClick={handlePrint} 
            disabled={queueProducts.length === 0}
            className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 font-bold uppercase disabled:opacity-50 text-white rounded-xl shadow-xl hover:shadow-indigo-500/20 active:scale-95 transition-all text-sm py-2.5 px-5"
          >
            <Printer size={16} className="mr-2" /> Imprimer le catalogue ({queueProducts.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Column 1: Product Selection Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col h-[650px] space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm uppercase flex items-center gap-2">
                <Plus size={15} className="text-indigo-400" /> 1. Sélection Articles
              </h3>
              <p className="text-[11px] text-slate-400">Recherchez et ajoutez les articles au catalogue.</p>
            </div>
            {selectedProductIds.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                title="Vider la file d'impression"
              >
                <Trash2 size={12} /> Vider
              </button>
            )}
          </div>

          {/* Onglets Sélection : Recherche / File d'attente */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveListTab('search')}
              className={cn(
                "flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer",
                activeListTab === 'search'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Recherche ({filteredProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveListTab('queue')}
              className={cn(
                "flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer",
                activeListTab === 'queue'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Dans le Catalogue ({queueProducts.length})
            </button>
          </div>

          {activeListTab === 'search' ? (
            <>
              {/* Barre de recherche style Inventaire */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input 
                    type="text"
                    placeholder="Rechercher nom, SKU, code-barres..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Filtres Catégorie et Disponibilité */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-indigo-500 truncate"
                  >
                    <option value="all">Toutes catégories</option>
                    {uniqueCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={stockStatusFilter}
                    onChange={(e) => setStockStatusFilter(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-indigo-500"
                  >
                    <option value="all">Tout stock</option>
                    <option value="in_stock">En stock (&gt;0)</option>
                    <option value="out_of_stock">Rupture (0)</option>
                  </select>
                </div>

                <div className="flex justify-between items-center text-[10px] px-1 gap-2 pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400 font-bold truncate">
                    {filteredProducts.length} trouvé(s)
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={addInStockOnly} className="text-emerald-400 font-bold hover:underline uppercase text-[9px] cursor-pointer">
                      + En stock
                    </button>
                    <span className="text-slate-700">|</span>
                    <button onClick={addAllFiltered} className="text-indigo-400 font-bold hover:underline uppercase text-[9px] cursor-pointer">
                      + Tout ajouter
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Items List (Limitée à 30 pour fluidité max) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                {filteredProducts.slice(0, 30).map(p => {
                  const inQueue = selectedProductIds.includes(p.id);
                  const pStock = Number(p.stock) || 0;
                  const isOutOfStock = pStock <= 0;
                  return (
                    <div 
                      key={p.id}
                      onClick={() => toggleProductQueue(p.id)}
                      className={cn(
                        "p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer select-none",
                        inQueue 
                          ? "bg-indigo-950/40 border-indigo-500/50 text-indigo-300 shadow-sm" 
                          : "bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-950/80"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold truncate text-white">{p.name}</p>
                          <span className={cn(
                            "text-[8px] font-bold px-1.5 py-0.2 rounded-full font-mono shrink-0",
                            isOutOfStock 
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          )}>
                            {isOutOfStock ? "Rupture" : `${pStock} en stock`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-slate-400">
                          <span>REF: {p.sku || p.id.substring(0,8).toUpperCase()}</span>
                          <span className="text-emerald-400 font-bold font-sans">
                            {Number(p.price || 0).toFixed(2)} {settings?.currency || 'DA'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {inQueue ? (
                          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-indigo-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                            <Plus size={14} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredProducts.length > 30 && (
                  <div className="p-2 text-center text-[10px] text-slate-500 font-mono italic bg-slate-950/50 rounded-xl border border-slate-800">
                    Affichage des 30 premiers articles. Affinez votre recherche pour cibler des articles spécifiques.
                  </div>
                )}

                {filteredProducts.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-xs italic">
                    Aucun article ne correspond à votre recherche.
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Queue Tab */
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
              {queueProducts.map(p => (
                <div 
                  key={p.id}
                  className="p-2.5 rounded-xl border bg-indigo-950/20 border-indigo-500/30 text-indigo-300 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate text-white">{p.name}</p>
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-0.5">
                      <span>REF: {p.sku || p.id.substring(0,8).toUpperCase()}</span>
                      <span className="text-emerald-400 font-bold font-sans">
                        {Number(p.price || 0).toFixed(2)} {settings?.currency || 'DA'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProductFromQueue(p.id)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Retirer du catalogue"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {queueProducts.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  La file d'impression est vide. Ajoutez des articles depuis l'onglet Recherche.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column 2: Layout / Print Studio Design Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col h-[650px] overflow-y-auto custom-scrollbar space-y-5">
          <div>
            <h3 className="font-bold text-white text-sm uppercase flex items-center gap-2">
              <Sliders size={15} className="text-indigo-400" /> 2. Configuration Design
            </h3>
            <p className="text-[11px] text-slate-400">Configurez et ayez le contrôle complet du catalogue.</p>
          </div>

          {/* Settings Section: Template Headers */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">1. En-tête & Pied</span>
            
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Afficher l'En-tête</span>
              <input type="checkbox" checked={showHeader} onChange={(e) => setShowHeader(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
            </div>
            {showHeader && (
              <div className="space-y-2 border-l border-slate-800 pl-2 pt-1">
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Titre Principal"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:border-indigo-500 outline-none"
                />
                <input 
                  type="text" 
                  value={subtitle} 
                  onChange={(e) => setSubtitle(e.target.value)} 
                  placeholder="Sous-titre"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:border-indigo-500 outline-none"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Afficher Logo</span>
                  <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="w-3 h-3 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Afficher Date</span>
                  <input type="checkbox" checked={showDate} onChange={(e) => setShowDate(e.target.checked)} className="w-3 h-3 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
              <span>Afficher Pied de page</span>
              <input type="checkbox" checked={showFooter} onChange={(e) => setShowFooter(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
            </div>
            {showFooter && (
              <div className="border-l border-slate-800 pl-2 pt-1">
                <input 
                  type="text" 
                  value={footerText} 
                  onChange={(e) => setFooterText(e.target.value)} 
                  placeholder="Texte de bas de page"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:border-indigo-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Settings Section: Layout Grid */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">2. Grille & Marges</span>
            
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Colonnes : {columns}</span>
              <span className="text-slate-400">Lignes/Page : {rowsPerPage}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={columns} 
                onChange={(e) => setColumns(Number(e.target.value))} 
                className="bg-slate-900 border border-slate-800 rounded-lg p-1 text-[10px] text-white focus:border-indigo-500 outline-none"
              >
                <option value={1}>1 Colonne</option>
                <option value={2}>2 Colonnes</option>
                <option value={3}>3 Colonnes</option>
                <option value={4}>4 Colonnes</option>
                <option value={5}>5 Colonnes</option>
              </select>
              <select 
                value={rowsPerPage} 
                onChange={(e) => setRowsPerPage(Number(e.target.value))} 
                className="bg-slate-900 border border-slate-800 rounded-lg p-1 text-[10px] text-white focus:border-indigo-500 outline-none"
              >
                {[2, 3, 4, 5, 6, 7, 8].map(r => (
                  <option key={r} value={r}>{r} Lignes/Page</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Marges de page</span>
                <span className="text-white font-mono">{pageMargin} mm</span>
              </div>
              <input type="range" min={5} max={25} value={pageMargin} onChange={(e) => setPageMargin(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Espacement cellules (Gap)</span>
                <span className="text-white font-mono">{cellGap} px</span>
              </div>
              <input type="range" min={0} max={30} value={cellGap} onChange={(e) => setCellGap(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer" />
            </div>

            <div className="space-y-1 text-[10px]">
              <span className="text-slate-400 block mb-1">Style de bordure</span>
              <select 
                value={cellBorder} 
                onChange={(e: any) => setCellBorder(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-[10px] text-white focus:border-indigo-500 outline-none"
              >
                <option value="none">Aucune</option>
                <option value="thin">Bordure fine grise</option>
                <option value="shadow">Cadre ombré léger</option>
              </select>
            </div>

            <div className="space-y-1 text-[10px]">
              <span className="text-slate-400 block mb-1">Orientation A4</span>
              <div className="grid grid-cols-2 gap-2 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button onClick={() => setOrientation('portrait')} className={`py-1 text-[9px] font-bold rounded ${orientation === 'portrait' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Portrait</button>
                <button onClick={() => setOrientation('landscape')} className={`py-1 text-[9px] font-bold rounded ${orientation === 'landscape' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Paysage</button>
              </div>
            </div>
          </div>

          {/* Settings Section: Fields selection */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">3. Éléments du produit</span>
            
            {/* Show Image */}
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Afficher Image</span>
              <input type="checkbox" checked={showImage} onChange={(e) => setShowImage(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
            </div>
            {showImage && (
              <div className="space-y-1 border-l border-slate-800 pl-2 pt-1 pb-1">
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Hauteur Image</span>
                  <span>{imageHeight} px</span>
                </div>
                <input type="range" min={60} max={200} value={imageHeight} onChange={(e) => setImageHeight(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer" />
              </div>
            )}

            {/* Show Name */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900/50">
              <span>Afficher Nom</span>
              <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
            </div>
            {showName && (
              <div className="space-y-1 border-l border-slate-800 pl-2 pt-1 pb-1">
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Taille Police</span>
                  <span>{nameFontSize} px</span>
                </div>
                <input type="range" min={8} max={18} value={nameFontSize} onChange={(e) => setNameFontSize(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer" />
              </div>
            )}

            {/* Show Price */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900/50">
              <span>Afficher Prix</span>
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
            </div>
            {showPrice && (
              <div className="space-y-1 border-l border-slate-800 pl-2 pt-1 pb-1">
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Taille Police</span>
                  <span>{priceFontSize} px</span>
                </div>
                <input type="range" min={10} max={24} value={priceFontSize} onChange={(e) => setPriceFontSize(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer" />
              </div>
            )}

            {/* Show Description */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900/50">
              <span>Afficher Description</span>
              <input type="checkbox" checked={showDescription} onChange={(e) => setShowDescription(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
            </div>
            {showDescription && (
              <div className="space-y-1 border-l border-slate-800 pl-2 pt-1 pb-1">
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Taille Police</span>
                  <span>{descFontSize} px</span>
                </div>
                <input type="range" min={8} max={14} value={descFontSize} onChange={(e) => setDescFontSize(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer" />
              </div>
            )}

            {/* Show Barcode */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900/50">
              <span>Afficher Code-barres</span>
              <input type="checkbox" checked={showBarcode} onChange={(e) => { setShowBarcode(e.target.checked); if(e.target.checked) setShowQr(false); }} className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
            </div>
            {showBarcode && (
              <div className="space-y-2 border-l border-slate-800 pl-2 pt-1 pb-1">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Hauteur Code</span>
                    <span>{barcodeHeight} px</span>
                  </div>
                  <input type="range" min={15} max={50} value={barcodeHeight} onChange={(e) => setBarcodeHeight(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Épaisseur barres</span>
                    <span>{barcodeWidth}x</span>
                  </div>
                  <input type="range" min={0.7} max={2.0} step={0.1} value={barcodeWidth} onChange={(e) => setBarcodeWidth(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer" />
                </div>
              </div>
            )}

            {/* Show QR Code */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900/50">
              <span>Afficher QR Code</span>
              <input type="checkbox" checked={showQr} onChange={(e) => { setShowQr(e.target.checked); if(e.target.checked) setShowBarcode(false); }} className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
            </div>
            {showQr && (
              <div className="space-y-1 border-l border-slate-800 pl-2 pt-1 pb-1">
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Taille QR Code</span>
                  <span>{qrSize} px</span>
                </div>
                <input type="range" min={25} max={80} value={qrSize} onChange={(e) => setQrSize(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer" />
              </div>
            )}

            {/* SKU and Stock checkboxes */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900/50">
              <span>Afficher SKU/Référence</span>
              <input type="checkbox" checked={showSku} onChange={(e) => setShowSku(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900/50">
              <span>Afficher Quantité Stock</span>
              <input type="checkbox" checked={showStock} onChange={(e) => setShowStock(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" />
            </div>
          </div>
        </div>

        {/* Columns 3 & 4: Live Paginated A4 Print Simulator Preview */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col h-[650px] space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="font-bold text-white text-sm uppercase flex items-center gap-2">
                <Eye size={15} className="text-indigo-400" /> 3. Aperçu A4 ({pages.length} page{pages.length > 1 ? 's' : ''})
              </h3>
              <p className="text-[11px] text-slate-400">Simulation dynamique du catalogue avant l'impression.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Pagination toolbar */}
              {pages.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                  <button
                    disabled={activePreviewPage === 0}
                    onClick={() => setActivePreviewPage(p => Math.max(0, p - 1))}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                    title="Page précédente"
                  >
                    ◀
                  </button>
                  <span className="text-[10px] font-bold text-white px-1">
                    {activePreviewPage + 1} / {pages.length}
                  </span>
                  <button
                    disabled={activePreviewPage >= pages.length - 1}
                    onClick={() => setActivePreviewPage(p => Math.min(pages.length - 1, p + 1))}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                    title="Page suivante"
                  >
                    ▶
                  </button>
                </div>
              )}

              {/* Preview mode toggle */}
              {pages.length > 1 && (
                <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                  <button
                    onClick={() => setPreviewMode('single')}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${previewMode === 'single' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    1 Page (Fluide)
                  </button>
                  <button
                    onClick={() => setPreviewMode('all')}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${previewMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    Tout voir
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold">Zoom :</span>
                <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                  {[0.4, 0.5, 0.65, 0.8].map(z => (
                    <button 
                      key={z} 
                      onClick={() => setZoom(z)} 
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${zoom === z ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      {Math.round(z * 100)}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Simulated pages stack viewport */}
          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800/80 p-6 overflow-auto custom-scrollbar flex flex-col items-center gap-8">
            {queueProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-slate-600 border border-slate-800">
                  <FileText size={22} />
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold uppercase">Aucun article dans le catalogue</h4>
                  <p className="text-[10px] text-slate-500 max-w-[200px] mt-1">Ajoutez des produits depuis la colonne de gauche pour commencer la conception.</p>
                </div>
              </div>
            ) : (
              (previewMode === 'single'
                ? (pages[activePreviewPage] ? [{ pageItems: pages[activePreviewPage], pageIdx: activePreviewPage }] : [])
                : pages.map((pageItems, pageIdx) => ({ pageItems, pageIdx }))
              ).map(({ pageItems, pageIdx }) => {
                const isFirstPage = pageIdx === 0;
                
                // Define A4 proportions (Width: 210mm = 794px, Height: 297mm = 1123px at 96 DPI)
                const pageW = orientation === 'portrait' ? 794 : 1123;
                const pageH = orientation === 'portrait' ? 1123 : 794;

                const firstPageRows = showHeader ? Math.max(1, rowsPerPage - 1) : rowsPerPage;
                const activeRows = isFirstPage && showHeader ? firstPageRows : rowsPerPage;

                return (
                  <div 
                    key={pageIdx}
                    style={{
                      width: `${pageW}px`,
                      height: `${pageH}px`,
                      padding: `${pageMargin * 3.78}px`, // 1mm ≈ 3.78px
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top center',
                      marginBottom: `${(pageH * (zoom - 1))}px` // adjust flow offset caused by scale transform
                    }}
                    className="bg-white text-black shadow-2xl rounded-sm border border-slate-400/20 relative flex flex-col justify-between shrink-0 font-sans"
                  >
                    <div className="flex flex-col h-full justify-between">
                      {/* Catalog Title Header */}
                      {isFirstPage && showHeader && (
                        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-3 h-[50px] shrink-0">
                          <div className="flex items-center">
                            {showLogo && settings.logoUrl && (
                              <SafeImage src={settings.logoUrl} className="h-8 object-contain mr-2 rounded border border-slate-200" alt="logo" />
                            )}
                            <div className="text-left">
                              <h1 className="text-sm font-black uppercase text-slate-800 tracking-tight leading-none">{title || settings.name || 'CATALOGUE'}</h1>
                              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">{subtitle || 'Nos produits disponibles'}</p>
                            </div>
                          </div>
                          {showDate && (
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                              {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Products Grid */}
                      <div 
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${columns}, 1fr)`,
                          gridTemplateRows: `repeat(${activeRows}, 1fr)`,
                          gap: `${cellGap}px`,
                          flex: 1,
                          width: '100%',
                          alignContent: 'stretch'
                        }}
                      >
                        {pageItems.map(p => {
                          const skuVal = p.sku || p.id.substring(0, 6).toUpperCase();
                          return (
                            <div 
                              key={p.id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '6px',
                                overflow: 'hidden',
                                height: '100%',
                                width: '100%'
                              }}
                              className={`bg-white ${
                                cellBorder === 'thin' 
                                  ? 'border border-slate-200 rounded-lg' 
                                  : cellBorder === 'shadow' 
                                  ? 'border border-slate-200 rounded-lg shadow-sm' 
                                  : ''
                              }`}
                            >
                              {showImage && (p.imageUrl || p.image) && (
                                <div 
                                  className="w-full overflow-hidden rounded-md border border-slate-100 flex-shrink-0 mb-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900"
                                  style={{ height: `${imageHeight}px` }}
                                >
                                  <SafeImage 
                                    src={p.imageUrl || p.image} 
                                    className="max-h-full max-w-full object-contain"
                                    style={{ maxHeight: `${imageHeight}px`, maxWidth: '100%', objectFit: 'contain' }} 
                                    alt={p.name}
                                  />
                                </div>
                              )}
                              <div className="flex-1 flex flex-col justify-between min-h-0 text-left">
                                <div>
                                  {showName && (
                                    <div style={{ fontSize: `${nameFontSize}px` }} className="font-bold text-slate-800 truncate">
                                      {p.name}
                                    </div>
                                  )}
                                  {showDescription && p.description && (
                                    <div style={{ fontSize: `${descFontSize}px` }} className="text-slate-500 leading-tight mt-0.5 line-clamp-2">
                                      {p.description}
                                    </div>
                                  )}
                                </div>

                                <div className="mt-auto">
                                  <div className="flex justify-between items-baseline mt-1">
                                    {showPrice && (
                                      <span style={{ fontSize: `${priceFontSize}px` }} className="font-black text-indigo-600">
                                        {(Number(p.price) || 0).toFixed(2)} {settings?.currency || 'DA'}
                                      </span>
                                    )}
                                    {showSku && (
                                      <span className="text-[7px] text-slate-400 font-mono">
                                        REF : {skuVal}
                                      </span>
                                    )}
                                  </div>
                                  {showStock && (
                                    <p className="text-[8px] text-emerald-600 font-bold mt-0.5">
                                      Stock : {p.stock} {p.unit || 'u'}
                                    </p>
                                  )}
                                  <div className="flex justify-between items-center mt-1 gap-1">
                                    {showBarcode && (
                                      <div className="flex-1 flex justify-center scale-[0.75] origin-center overflow-hidden h-[30px]">
                                        <Barcode value={skuVal} format="CODE128" height={barcodeHeight} width={barcodeWidth} margin={0} displayValue={false} />
                                      </div>
                                    )}
                                    {showQr && (
                                      <div className="shrink-0 flex justify-center">
                                        <QRCodeSVG value={p.sku || p.id} size={qrSize} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Catalog Footer */}
                      {showFooter && (
                        <div className="border-t border-slate-100 pt-1.5 mt-2 flex justify-between items-center text-[8px] text-slate-400 h-[15px] shrink-0 font-sans">
                          <span>{footerText}</span>
                          <span className="font-bold">Page {pageIdx + 1} sur {pages.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
