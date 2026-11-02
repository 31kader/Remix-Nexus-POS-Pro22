import React, { useState } from 'react';
import { 
  X, Tag, Star
} from 'lucide-react';
import { Card } from '../ui';
import { Product } from '../../types';
import { cn } from '../../lib/utils';
import { SafeImage } from '../ui/SafeImage';
import { PosterType, PosterFormat, MARKETING_THEMES } from './marketingTypes';
import { ImageEnhancerModal } from '../image-enhancer';
import { PosterDiscountControls } from './PosterDiscountControls';
import { PosterVisualElementsControls } from './PosterVisualElementsControls';
import { PosterActionButtons } from './PosterActionButtons';

export interface MarketingPosterControlsProps {
  products: Product[];
  currency: string;
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  search: string;
  setSearch: (s: string) => void;
  filteredProducts: Product[];
  handleSelectProduct: (p: Product) => void;
  posterFormat: PosterFormat;
  setPosterFormat: (f: PosterFormat) => void;
  posterType: PosterType;
  setPosterType: (t: PosterType) => void;
  showOldPrice: boolean;
  setShowOldPrice: (show: boolean) => void;
  discountPercent: number;
  applyDiscountPercent: (pct: number) => void;
  customOldPrice: string;
  setCustomOldPrice: (p: string) => void;
  showImage: boolean;
  setShowImage: (show: boolean) => void;
  showQrCode: boolean;
  setShowQrCode: (show: boolean) => void;
  qrContent: string;
  setQrContent: (c: string) => void;
  customBadge: string;
  setCustomBadge: (b: string) => void;
  customText: string;
  setCustomText: (t: string) => void;
  isGenerating: boolean;
  handlePrint: () => void;
  handleDownload: () => void;
  handleShare: () => void;
  safePrice: number;
  productImage: string;
  onEnhanceImage?: (previewUrl: string) => void;
}

export const MarketingPosterControls: React.FC<MarketingPosterControlsProps> = ({
  currency,
  selectedProduct,
  setSelectedProduct,
  search,
  setSearch,
  filteredProducts,
  handleSelectProduct,
  posterFormat,
  setPosterFormat,
  posterType,
  setPosterType,
  showOldPrice,
  setShowOldPrice,
  discountPercent,
  applyDiscountPercent,
  customOldPrice,
  setCustomOldPrice,
  showImage,
  setShowImage,
  showQrCode,
  setShowQrCode,
  qrContent,
  setQrContent,
  customBadge,
  setCustomBadge,
  customText,
  setCustomText,
  isGenerating,
  handlePrint,
  handleDownload,
  handleShare,
  safePrice,
  productImage,
  onEnhanceImage
}) => {
  const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);

  return (
    <Card className="p-5 space-y-5 bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
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
          <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-950 shadow-md max-h-56 overflow-y-auto custom-scrollbar">
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
          {(Object.keys(MARKETING_THEMES) as PosterType[]).map(typeKey => {
            const t = MARKETING_THEMES[typeKey];
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
      <PosterDiscountControls
        currency={currency}
        showOldPrice={showOldPrice}
        setShowOldPrice={setShowOldPrice}
        discountPercent={discountPercent}
        applyDiscountPercent={applyDiscountPercent}
        customOldPrice={customOldPrice}
        setCustomOldPrice={setCustomOldPrice}
      />

      {/* 5. Custom Elements (Image, Badge, QR Code, Subtitle) */}
      <PosterVisualElementsControls
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
        productImage={productImage}
        onOpenEnhancer={() => setIsEnhancerOpen(true)}
      />

      {/* Action Buttons */}
      <PosterActionButtons
        selectedProduct={selectedProduct}
        isGenerating={isGenerating}
        posterFormat={posterFormat}
        handlePrint={handlePrint}
        handleDownload={handleDownload}
        handleShare={handleShare}
      />

      {isEnhancerOpen && productImage && (
        <ImageEnhancerModal
          isOpen={true}
          onClose={() => setIsEnhancerOpen(false)}
          imageUrl={productImage}
          onApply={(res) => {
            if (onEnhanceImage) {
              onEnhanceImage(res.previewUrl || res.dataUrl);
            }
          }}
          title="Dépixéliser l'image de l'affiche A4"
          defaultPreset="hd-photo"
        />
      )}
    </Card>
  );
};
