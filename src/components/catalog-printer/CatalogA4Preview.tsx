import React from 'react';
import { Eye, Sparkles } from 'lucide-react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Product, CompanySettings } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { cn } from '../../lib/utils';
import {
  LayoutMode,
  PriceDisplayMode,
  Orientation,
  CellBorder,
  CustomOverrides
} from './types';

interface CatalogA4PreviewProps {
  settings: CompanySettings;
  pages: Product[][];
  activePreviewPage: number;
  setActivePreviewPage: React.Dispatch<React.SetStateAction<number>>;
  zoom: number;
  setZoom: (z: number) => void;
  orientation: Orientation;
  pageMargin: number;
  showHeader: boolean;
  themeColor: string;
  showLogo: boolean;
  title: string;
  subtitle: string;
  showDate: boolean;
  contactPhone: string;
  layoutMode: LayoutMode;
  columns: number;
  cellGap: number;
  cellBorder: CellBorder;
  customOverrides: CustomOverrides;
  priceDisplayMode: PriceDisplayMode;
  discountPercent: number;
  showImage: boolean;
  imageHeight: number;
  showName: boolean;
  nameFontSize: number;
  showPrice: boolean;
  priceFontSize: number;
  showSku: boolean;
  showBarcode: boolean;
  barcodeHeight: number;
  barcodeWidth: number;
  showQr: boolean;
  qrSize: number;
  showFooter: boolean;
  footerText: string;
}

export const CatalogA4Preview: React.FC<CatalogA4PreviewProps> = ({
  settings,
  pages,
  activePreviewPage,
  setActivePreviewPage,
  zoom,
  setZoom,
  orientation,
  pageMargin,
  showHeader,
  themeColor,
  showLogo,
  title,
  subtitle,
  showDate,
  contactPhone,
  layoutMode,
  columns,
  cellGap,
  cellBorder,
  customOverrides,
  priceDisplayMode,
  discountPercent,
  showImage,
  imageHeight,
  showName,
  nameFontSize,
  showPrice,
  priceFontSize,
  showSku,
  showBarcode,
  barcodeHeight,
  barcodeWidth,
  showQr,
  qrSize,
  showFooter,
  footerText
}) => {
  const currency = settings.currency || 'DA';
  const currentPageItems = pages[activePreviewPage] || [];

  return (
    <div className="bg-slate-100 dark:bg-zinc-950 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 flex flex-col items-center">
      {/* PREVIEW TOOLBAR */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 px-2">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
            Aperçu Direct A4 Haute Définition
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
            Page {activePreviewPage + 1} / {Math.max(1, pages.length)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {pages.length > 1 && (
            <div className="flex items-center gap-1">
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
                  <SafeImage src={settings.logoUrl} alt="Logo" className="h-12 object-contain" />
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
  );
};
