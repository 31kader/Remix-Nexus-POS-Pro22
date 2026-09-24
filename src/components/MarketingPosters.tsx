import React, { useState, useRef, useMemo } from 'react';
import { 
  Printer, X, Tag, Star, Zap, ShoppingCart, ArrowDown, Download, Share2, 
  Copy, Award, CheckCircle, Image as ImageIcon, QrCode, Percent, Sparkles, Layout
} from 'lucide-react';
import { Card, Button, Modal } from './ui';
import { Product, CompanySettings } from '../types';
import { cn } from '../lib/utils';
import { toPng, toBlob } from 'html-to-image';
import { toast } from 'sonner';
import { SafeImage } from './ui/SafeImage';
import { QRCodeSVG } from 'qrcode.react';

interface MarketingPostersProps {
  products: Product[];
  settings: CompanySettings;
}

type PosterType = 'promo' | 'new' | 'flash' | 'clearance' | 'bestseller' | 'premium';
type PosterFormat = 'a4-portrait' | 'a4-landscape' | 'shelf-tag' | 'social-square';

export const MarketingPosters: React.FC<MarketingPostersProps> = ({ products, settings }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [posterType, setPosterType] = useState<PosterType>('promo');
  const [posterFormat, setPosterFormat] = useState<PosterFormat>('a4-portrait');
  const [customText, setCustomText] = useState('');
  const [customBadge, setCustomBadge] = useState('');
  const [search, setSearch] = useState('');
  
  // Image & QR Toggles
  const [showImage, setShowImage] = useState(true);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrContent, setQrContent] = useState('');

  // Discount & Pricing
  const [discountPercent, setDiscountPercent] = useState<number>(20);
  const [customOldPrice, setCustomOldPrice] = useState<string>('');
  const [showOldPrice, setShowOldPrice] = useState<boolean>(true);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.sku || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);
  }, [products, search]);

  // When a product is selected, initialize the pricing & default QR
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearch('');
    const basePrice = Number(product.price) || 0;
    // Calculate default +25% old price for a 20% discount
    const initialOld = basePrice > 0 ? (basePrice * 1.25).toFixed(2) : '';
    setCustomOldPrice(initialOld);
    if (!qrContent) {
      setQrContent(settings.phone || settings.name || 'https://nexuspospro.com');
    }
  };

  // Quick discount buttons handler
  const applyDiscountPercent = (pct: number) => {
    setDiscountPercent(pct);
    if (!selectedProduct) return;
    const currentPrice = Number(selectedProduct.price) || 0;
    if (pct > 0 && currentPrice > 0) {
      const calculatedOld = (currentPrice / (1 - pct / 100)).toFixed(2);
      setCustomOldPrice(calculatedOld);
      setShowOldPrice(true);
    } else {
      setShowOldPrice(false);
    }
  };

  const themes: Record<PosterType, { 
    label: string; 
    icon: any; 
    bgGradient: string; 
    bgHex: string; 
    badgeDefault: string; 
    badgeStyle: string; 
    textPrimary: string;
    textSecondary: string;
    accent: string;
    border: string;
  }> = {
    promo: {
      label: 'Promotion Choc',
      icon: Tag,
      bgGradient: 'from-rose-600 via-rose-700 to-red-800',
      bgHex: '#e11d48',
      badgeDefault: 'OFFRE SPÉCIALE',
      badgeStyle: 'bg-amber-300 text-black border-amber-400 shadow-amber-900/30',
      textPrimary: 'text-white',
      textSecondary: 'text-rose-100',
      accent: 'text-amber-300',
      border: 'border-rose-400/30'
    },
    new: {
      label: 'Nouveauté',
      icon: Star,
      bgGradient: 'from-indigo-600 via-indigo-700 to-purple-800',
      bgHex: '#4f46e5',
      badgeDefault: 'NOUVEL ARRIVAGE',
      badgeStyle: 'bg-white text-indigo-700 border-white/40 shadow-indigo-950/30',
      textPrimary: 'text-white',
      textSecondary: 'text-indigo-100',
      accent: 'text-indigo-200',
      border: 'border-indigo-400/30'
    },
    flash: {
      label: 'Vente Flash',
      icon: Zap,
      bgGradient: 'from-amber-400 via-amber-500 to-yellow-600',
      bgHex: '#f59e0b',
      badgeDefault: 'VENTE FLASH ⚡',
      badgeStyle: 'bg-black text-amber-400 border-black/40 shadow-black/20',
      textPrimary: 'text-slate-950',
      textSecondary: 'text-slate-900',
      accent: 'text-black',
      border: 'border-amber-600/30'
    },
    clearance: {
      label: 'Déstockage',
      icon: ArrowDown,
      bgGradient: 'from-slate-950 via-zinc-900 to-neutral-950',
      bgHex: '#09090b',
      badgeDefault: 'LIQUIDATION TOTALE',
      badgeStyle: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-yellow-300 font-black',
      textPrimary: 'text-white',
      textSecondary: 'text-zinc-400',
      accent: 'text-yellow-400',
      border: 'border-zinc-700'
    },
    bestseller: {
      label: 'Top Vente',
      icon: Award,
      bgGradient: 'from-emerald-600 via-teal-700 to-emerald-900',
      bgHex: '#059669',
      badgeDefault: 'N°1 DES VENTES 🏆',
      badgeStyle: 'bg-white text-emerald-800 border-emerald-200 shadow-emerald-950/20',
      textPrimary: 'text-white',
      textSecondary: 'text-emerald-100',
      accent: 'text-emerald-200',
      border: 'border-emerald-400/30'
    },
    premium: {
      label: '100% Original',
      icon: CheckCircle,
      bgGradient: 'from-cyan-600 via-blue-700 to-slate-900',
      bgHex: '#0284c7',
      badgeDefault: 'PRODUIT CERTIFIÉ CONFORME',
      badgeStyle: 'bg-cyan-300 text-blue-950 border-cyan-200 shadow-cyan-950/20',
      textPrimary: 'text-white',
      textSecondary: 'text-cyan-100',
      accent: 'text-cyan-300',
      border: 'border-cyan-400/30'
    }
  };

  const activeTheme = themes[posterType];
  const currentBadgeText = customBadge.trim() || activeTheme.badgeDefault;
  const safePrice = Number(selectedProduct?.price) || 0;
  const safeOldPrice = Number(customOldPrice) || (safePrice > 0 ? safePrice * 1.25 : 0);
  const currency = settings.currency || 'DA';
  const productImage = (selectedProduct?.imageUrl || (selectedProduct as any)?.image) || '';

  const handlePrint = () => {
    if (!selectedProduct) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Veuillez autoriser les fenêtres pop-up pour imprimer.");
      return;
    }

    const isLandscape = posterFormat === 'a4-landscape';
    const isShelf = posterFormat === 'shelf-tag';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Affiche - ${selectedProduct.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            @page { 
              size: ${isLandscape ? 'A4 landscape' : isShelf ? 'A5 landscape' : 'A4 portrait'}; 
              margin: 0; 
            }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { 
              margin: 0; 
              font-family: 'Inter', sans-serif; 
              background: ${activeTheme.bgHex}; 
              color: ${posterType === 'flash' ? '#000000' : '#ffffff'}; 
              height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: ${isShelf ? '30px' : '50px'};
              position: relative;
              overflow: hidden;
            }
            .badge {
              display: inline-block;
              background: ${posterType === 'flash' ? '#000000' : '#ffffff'};
              color: ${posterType === 'flash' ? '#f59e0b' : '#000000'};
              padding: 12px 28px;
              font-weight: 900;
              font-size: ${isShelf ? '20px' : '28px'};
              text-transform: uppercase;
              border-radius: 12px;
              letter-spacing: 1px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.15);
              margin-bottom: 20px;
            }
            .content-row {
              display: flex;
              flex: 1;
              gap: 40px;
              align-items: center;
              justify-content: space-between;
              min-height: 0;
            }
            .info-col {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .product-name {
              font-size: ${isShelf ? '38px' : isLandscape ? '56px' : '64px'};
              font-weight: 900;
              line-height: 1.05;
              text-transform: uppercase;
              margin-bottom: 20px;
              letter-spacing: -0.5px;
              word-break: break-word;
            }
            .description {
              font-size: ${isShelf ? '16px' : '22px'};
              opacity: 0.9;
              line-height: 1.4;
              margin-bottom: 30px;
              max-width: 600px;
            }
            .img-container {
              width: ${isShelf ? '180px' : isLandscape ? '300px' : '360px'};
              height: ${isShelf ? '180px' : isLandscape ? '300px' : '360px'};
              background: rgba(255, 255, 255, 0.95);
              border-radius: 24px;
              padding: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 20px 40px rgba(0,0,0,0.25);
              flex-shrink: 0;
            }
            .img-container img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .price-container {
              display: flex;
              align-items: baseline;
              gap: 20px;
              margin-top: 20px;
            }
            .old-price {
              font-size: ${isShelf ? '30px' : '48px'};
              text-decoration: line-through;
              opacity: 0.6;
              font-weight: 700;
            }
            .price {
              font-size: ${isShelf ? '60px' : isLandscape ? '90px' : '110px'};
              font-weight: 900;
              line-height: 1;
              letter-spacing: -2px;
            }
            .currency {
              font-size: ${isShelf ? '28px' : '44px'};
              font-weight: 900;
              margin-left: 10px;
            }
            .footer {
              padding-top: 20px;
              border-top: 3px solid rgba(255, 255, 255, 0.2);
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .store-name {
              font-size: 24px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .promo-text {
              font-size: 16px;
              font-weight: 700;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div>
            <div class="badge">${currentBadgeText}</div>
          </div>
          
          <div class="content-row">
            <div class="info-col">
              <div class="product-name">${selectedProduct.name}</div>
              <div class="description">${customText || selectedProduct.description || 'Profitez de la meilleure qualité au meilleur prix en magasin.'}</div>
              
              <div class="price-container">
                ${showOldPrice && safeOldPrice > safePrice ? `<div class="old-price">${safeOldPrice.toFixed(2)}</div>` : ''}
                <div class="price">
                  ${safePrice.toFixed(2)}<span class="currency">${currency}</span>
                </div>
              </div>
            </div>

            ${showImage && productImage ? `
              <div class="img-container">
                <img src="${productImage}" alt="${selectedProduct.name}" />
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <div>
              <div class="store-name">${settings.name || 'Nexus POS Pro'}</div>
              <div class="promo-text">${settings.address || 'Offre valable selon stocks disponibles'}</div>
            </div>
            <div class="promo-text">${settings.phone ? 'Tél : ' + settings.phone : 'Nexus POS Pro'}</div>
          </div>

          <script>
            window.onload = () => { 
              window.print(); 
              setTimeout(() => window.close(), 600); 
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownload = async () => {
    if (!previewRef.current || !selectedProduct) return;
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 120));
      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: activeTheme.bgHex
      });
      const link = document.createElement('a');
      link.download = `affiche_${posterFormat}_${(selectedProduct?.name || 'produit').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image HD téléchargée avec succès !");
    } catch (err) {
      console.error("Error generating image:", err);
      toast.error("Erreur lors de la génération de l'image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!previewRef.current || !selectedProduct) return;
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 120));
      const blob = await toBlob(previewRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: activeTheme.bgHex
      });

      if (!blob) {
        toast.error("Échec de la génération de l'image.");
        return;
      }

      const file = new File([blob], 'affiche_promo.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${currentBadgeText} - ${selectedProduct.name}`,
          text: `Découvrez ${selectedProduct.name} chez ${settings.name || 'notre magasin'} !`
        });
        toast.success("Partagé avec succès !");
      } else {
        setIsShareModalOpen(true);
      }
    } catch (err) {
      console.error("Error sharing:", err);
      setIsShareModalOpen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyImageToClipboard = async () => {
    if (!previewRef.current) return;
    try {
      const blob = await toBlob(previewRef.current, {
        quality: 0.95,
        backgroundColor: activeTheme.bgHex
      });
      if (blob) {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        toast.success("Image copiée ! Vous pouvez la coller directement (Ctrl+V) sur WhatsApp, Telegram, etc.");
        setIsShareModalOpen(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Votre navigateur ne supporte pas la copie directe d'images.");
    }
  };

  const shareToSocial = (platform: string) => {
    const text = encodeURIComponent(`📢 ${currentBadgeText} : ${selectedProduct?.name || 'Produit'} chez ${settings.name} ! Prix : ${safePrice.toFixed(2)} ${currency}`);
    const url = encodeURIComponent(window.location.origin);
    let shareUrl = '';
    
    if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
    } else if (platform === 'whatsapp') {
      shareUrl = `https://api.whatsapp.com/send?text=${text}`;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank');
      toast.success("Redirection vers le réseau social...");
      setIsShareModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4 shadow-xl">
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
        {/* Left Column: Settings & Controls (5 Cols) */}
        <div className="xl:col-span-6 space-y-5">
          <Card className="p-5 space-y-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            {/* 1. Product Search */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                1. Sélectionner l'article
              </label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Rechercher par nom, SKU ou code-barres..."
                  className="w-full p-3 pl-10 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs font-bold text-white placeholder:text-slate-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
              
              {search && (
                <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-950 shadow-2xl max-h-56 overflow-y-auto custom-scrollbar">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500 font-medium">Aucun article trouvé</div>
                  ) : (
                    filteredProducts.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="w-full p-3 text-left hover:bg-indigo-600/10 flex items-center justify-between transition-colors text-white group"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold text-white group-hover:text-indigo-400 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.sku || p.id.slice(0, 8)}</p>
                        </div>
                        <p className="font-black text-indigo-400 font-mono text-xs whitespace-nowrap">
                          {(Number(p.price) || 0).toFixed(2)} {currency}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedProduct && (
                <div className="p-3 bg-indigo-950/30 rounded-xl border border-indigo-500/30 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 bg-slate-900 rounded-lg flex items-center justify-center border border-indigo-500/30 shrink-0 overflow-hidden">
                      {productImage ? (
                        <SafeImage src={productImage} alt={selectedProduct.name} className="w-full h-full object-contain" />
                      ) : (
                        <Star size={20} className="text-indigo-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white uppercase truncate">{selectedProduct.name}</p>
                      <p className="text-[11px] text-indigo-300 font-mono font-bold">
                        Prix actuel : {safePrice.toFixed(2)} {currency}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-white p-1"><X size={16} /></button>
                </div>
              )}
            </div>

            {/* 2. Format Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                2. Format d'affichage & d'impression
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'a4-portrait', label: 'A4 Vitrine', sub: 'Portrait' },
                  { id: 'a4-landscape', label: 'A4 Paysage', sub: 'Horizontal' },
                  { id: 'shelf-tag', label: 'Chevalet Rayon', sub: 'A5 / Gondole' },
                  { id: 'social-square', label: 'Réseaux Sociaux', sub: 'Carré 1:1' }
                ].map(fmt => (
                  <button
                    key={fmt.id}
                    onClick={() => setPosterFormat(fmt.id as PosterFormat)}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                      posterFormat === fmt.id 
                        ? "border-indigo-500 bg-indigo-600/20 text-white font-bold" 
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                    )}
                  >
                    <p className="text-xs font-bold leading-tight">{fmt.label}</p>
                    <p className="text-[9px] opacity-70 mt-0.5">{fmt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Theme & Style Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                3. Thème & Style Visuel
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(themes) as PosterType[]).map(typeKey => {
                  const t = themes[typeKey];
                  const IconComp = t.icon;
                  return (
                    <button
                      key={typeKey}
                      onClick={() => setPosterType(typeKey)}
                      className={cn(
                        "flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left cursor-pointer",
                        posterType === typeKey 
                          ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/10 text-white" 
                          : "border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400 hover:text-white"
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-md" style={{ backgroundColor: t.bgHex }}>
                        <IconComp size={14} />
                      </div>
                      <span className="text-[11px] font-bold uppercase truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Pricing & Discount Controls */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  4. Remise & Prix Barré
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Afficher ancien prix</span>
                  <input 
                    type="checkbox" 
                    checked={showOldPrice} 
                    onChange={(e) => setShowOldPrice(e.target.checked)} 
                    className="w-3.5 h-3.5 text-indigo-600 bg-slate-950 border-slate-800 rounded" 
                  />
                </div>
              </div>

              {showOldPrice && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Remise Rapide (%)
                    </label>
                    <div className="flex gap-1">
                      {[10, 20, 30, 50].map(pct => (
                        <button
                          key={pct}
                          onClick={() => applyDiscountPercent(pct)}
                          className={cn(
                            "flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all",
                            discountPercent === pct 
                              ? "bg-indigo-600 text-white border-indigo-500" 
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                          )}
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Ancien Prix Barré ({currency})
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="Ex: 2500"
                      value={customOldPrice}
                      onChange={(e) => setCustomOldPrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Custom Elements (Image, Badge, QR Code, Subtitle) */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                5. Éléments Visuels
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <label className="flex items-center gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showImage} 
                    onChange={(e) => setShowImage(e.target.checked)} 
                    className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" 
                  />
                  <span>Photo Produit HD</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showQrCode} 
                    onChange={(e) => setShowQrCode(e.target.checked)} 
                    className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" 
                  />
                  <span>QR Code Contact</span>
                </label>
              </div>

              {showQrCode && (
                <div className="space-y-1">
                  <input 
                    type="text"
                    placeholder="Lien ou N° WhatsApp (ex: https://wa.me/213...)"
                    value={qrContent}
                    onChange={(e) => setQrContent(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input 
                  type="text"
                  placeholder="Texte du badge (défaut : auto)"
                  value={customBadge}
                  onChange={(e) => setCustomBadge(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                />
                <input 
                  type="text"
                  placeholder="Texte promo (ex: Qualité garantie...)"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <Button 
                className="w-full py-3 text-sm font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white"
                disabled={!selectedProduct || isGenerating}
                onClick={handlePrint}
              >
                <Printer size={16} className="mr-2" /> Imprimer l'Affiche ({posterFormat.toUpperCase()})
              </Button>
              
              {selectedProduct && (
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleDownload}
                    disabled={isGenerating}
                    variant="secondary"
                    className="py-2.5 text-xs font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 border border-slate-700 hover:bg-slate-700 rounded-xl"
                  >
                    <Download size={14} className="mr-1.5" /> Télécharger PNG
                  </Button>
                  <Button 
                    onClick={handleShare}
                    disabled={isGenerating}
                    variant="secondary"
                    className="py-2.5 text-xs font-bold uppercase tracking-wider bg-slate-800 text-indigo-400 border border-slate-700 hover:bg-slate-700 rounded-xl"
                  >
                    <Share2 size={14} className="mr-1.5" /> Partager
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Interactive Poster Simulator (7 Cols) */}
        <div className="xl:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col items-center justify-center min-h-[600px]">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={13} className="text-indigo-400" /> Aperçu du visuel ({posterFormat})
            </span>
            {selectedProduct && (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Prêt pour impression
              </span>
            )}
          </div>

          {!selectedProduct ? (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 flex items-center justify-center text-slate-600 border border-slate-800">
                <ImageIcon size={28} />
              </div>
              <h4 className="text-white text-sm font-bold uppercase">Aucun article sélectionné</h4>
              <p className="text-xs text-slate-500 max-w-[240px]">
                Choisissez un produit dans la colonne de gauche pour générer instantanément l'affiche.
              </p>
            </div>
          ) : (
            <div className="w-full flex justify-center overflow-auto p-2">
              <div 
                ref={previewRef}
                className={cn(
                  "rounded-3xl shadow-2xl p-7 flex flex-col justify-between transition-all duration-300 relative overflow-hidden select-none border",
                  `bg-gradient-to-br ${activeTheme.bgGradient}`,
                  activeTheme.textPrimary,
                  activeTheme.border,
                  posterFormat === 'a4-portrait' ? "w-[350px] aspect-[0.707]" :
                  posterFormat === 'a4-landscape' ? "w-[460px] aspect-[1.414]" :
                  posterFormat === 'shelf-tag' ? "w-[360px] aspect-[1.3]" :
                  "w-[350px] aspect-square"
                )}
              >
                {/* Decorative background glows */}
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-black/20 rounded-full blur-3xl pointer-events-none" />

                {/* Top Badge */}
                <div className="flex justify-between items-start z-10">
                  <div className={cn(
                    "px-3.5 py-1 text-[11px] font-black uppercase rounded-xl tracking-wider shadow-lg border",
                    activeTheme.badgeStyle
                  )}>
                    {currentBadgeText}
                  </div>
                  {showOldPrice && safeOldPrice > safePrice && (
                    <div className="bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-black text-amber-300 border border-white/10">
                      -{Math.round(((safeOldPrice - safePrice) / safeOldPrice) * 100)}%
                    </div>
                  )}
                </div>

                {/* Middle Content */}
                <div className={cn(
                  "my-auto z-10 gap-4 flex",
                  (posterFormat === 'a4-landscape' || posterFormat === 'shelf-tag') ? "flex-row items-center justify-between" : "flex-col"
                )}>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "font-black uppercase tracking-tight drop-shadow-md leading-tight",
                      posterFormat === 'shelf-tag' ? "text-2xl" : "text-3xl"
                    )}>
                      {selectedProduct.name}
                    </h3>
                    
                    <p className={cn(
                      "opacity-90 leading-relaxed font-medium mt-1 line-clamp-2",
                      activeTheme.textSecondary,
                      posterFormat === 'shelf-tag' ? "text-[10px]" : "text-xs"
                    )}>
                      {customText || selectedProduct.description || 'Profitez de nos meilleurs tarifs en magasin aujourd\'hui.'}
                    </p>
                  </div>

                  {/* Photo of Product */}
                  {showImage && productImage && (
                    <div className={cn(
                      "rounded-2xl bg-white/95 p-2 shadow-2xl flex items-center justify-center shrink-0 border border-white/20",
                      posterFormat === 'shelf-tag' ? "w-20 h-20" : 
                      posterFormat === 'a4-landscape' ? "w-28 h-28" : "w-32 h-32 self-center my-2"
                    )}>
                      <SafeImage 
                        src={productImage} 
                        alt={selectedProduct.name} 
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Pricing & Footer Bar */}
                <div className="z-10 pt-3 border-t border-white/20">
                  <div className="flex justify-between items-end">
                    <div>
                      {showOldPrice && safeOldPrice > safePrice && (
                        <p className="text-sm line-through opacity-60 font-black font-mono">
                          {safeOldPrice.toFixed(2)} {currency}
                        </p>
                      )}
                      <div className="flex items-baseline">
                        <span className={cn(
                          "font-black tracking-tighter font-mono drop-shadow-lg",
                          posterFormat === 'shelf-tag' ? "text-4xl" : "text-5xl"
                        )}>
                          {safePrice.toFixed(2)}
                        </span>
                        <span className="text-xl font-bold ml-1.5 opacity-90">{currency}</span>
                      </div>
                    </div>

                    {showQrCode ? (
                      <div className="bg-white p-1 rounded-xl shadow-lg shrink-0">
                        <QRCodeSVG value={qrContent || settings.phone || 'https://nexuspospro.com'} size={42} />
                      </div>
                    ) : (
                      <ShoppingCart size={24} className="opacity-40" />
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10 text-[9px] opacity-80">
                    <span className="font-black uppercase tracking-wider truncate max-w-[180px]">
                      {settings.name || 'Nexus POS Pro'}
                    </span>
                    <span className="truncate max-w-[140px]">
                      {settings.phone ? `Tél: ${settings.phone}` : 'Stock limité'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <Modal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          title="Partager le visuel"
        >
          <div className="space-y-5 text-center print:hidden p-2">
            <p className="text-xs text-slate-400 leading-relaxed">
              Sélectionnez une plateforme pour exporter ou copier l'affiche directement.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={copyImageToClipboard}
                className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold uppercase text-xs flex flex-col items-center gap-2 cursor-pointer"
              >
                <Copy size={18} />
                Copier (WhatsApp/Clip)
              </button>
              <button 
                onClick={() => shareToSocial('whatsapp')}
                className="p-3.5 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20 transition-all font-bold uppercase text-xs flex flex-col items-center gap-2 cursor-pointer"
              >
                <span className="text-lg">💬</span>
                WhatsApp
              </button>
              <button 
                onClick={() => shareToSocial('facebook')}
                className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all font-bold uppercase text-xs flex flex-col items-center gap-2 cursor-pointer"
              >
                <span className="text-lg">🔵</span>
                Facebook
              </button>
              <button 
                onClick={() => shareToSocial('twitter')}
                className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-all font-bold uppercase text-xs flex flex-col items-center gap-2 cursor-pointer"
              >
                <span className="text-lg">⚫</span>
                Twitter / X
              </button>
            </div>
            <Button onClick={() => setIsShareModalOpen(false)} className="w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl">
              Fermer
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
