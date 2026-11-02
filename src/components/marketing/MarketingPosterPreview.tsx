import React from 'react';
import { Sparkles, Image as ImageIcon, ShoppingCart } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { SafeImage } from '../ui/SafeImage';
import { QRCodeSVG } from 'qrcode.react';
import { PosterFormat, PosterTheme } from './marketingTypes';

export interface MarketingPosterPreviewProps {
  selectedProduct: Product | null;
  posterFormat: PosterFormat;
  previewRef: React.RefObject<HTMLDivElement | null>;
  activeTheme: PosterTheme;
  currentBadgeText: string;
  showOldPrice: boolean;
  safeOldPrice: number;
  safePrice: number;
  currency: string;
  customText: string;
  showImage: boolean;
  productImage: string;
  showQrCode: boolean;
  qrContent: string;
  settings: CompanySettings;
}

export const MarketingPosterPreview: React.FC<MarketingPosterPreviewProps> = ({
  selectedProduct,
  posterFormat,
  previewRef,
  activeTheme,
  currentBadgeText,
  showOldPrice,
  safeOldPrice,
  safePrice,
  currency,
  customText,
  showImage,
  productImage,
  showQrCode,
  qrContent,
  settings
}) => {
  return (
    <div className="xl:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col items-center justify-center min-h-[600px]">
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
        <div className="flex flex-col items-center justify-center text-center p-5 space-y-3">
          <div className="w-16 h-16 rounded-xl bg-slate-950 flex items-center justify-center text-slate-600 border border-slate-800">
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
              "rounded-xl shadow-md p-7 flex flex-col justify-between transition-all duration-300 relative overflow-hidden select-none border",
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
                <div className="bg-black/30 px-2.5 py-1 rounded-xl text-[10px] font-black text-amber-300 border border-white/10">
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
                  "rounded-xl bg-white/95 p-2 shadow-md flex items-center justify-center shrink-0 border border-white/20",
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
  );
};
