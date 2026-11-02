import React from 'react';
import { Sparkles } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import {
  LayoutMode,
  PriceDisplayMode,
  Orientation,
  CellBorder,
  CustomOverrides
} from './types';
import { CatalogA4PreviewToolbar } from './CatalogA4PreviewToolbar';
import { CatalogA4InventorySheetTable, CatalogA4SummaryTable } from './CatalogA4Tables';
import { CatalogA4GridCard } from './CatalogA4GridCard';

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
      <CatalogA4PreviewToolbar
        activePreviewPage={activePreviewPage}
        setActivePreviewPage={setActivePreviewPage}
        totalPages={pages.length}
        zoom={zoom}
        setZoom={setZoom}
      />

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
              <CatalogA4InventorySheetTable
                currentPageItems={currentPageItems}
                pages={pages}
                activePreviewPage={activePreviewPage}
                themeColor={themeColor}
              />
            ) : layoutMode === 'table' ? (
              <CatalogA4SummaryTable
                currentPageItems={currentPageItems}
                customOverrides={customOverrides}
                themeColor={themeColor}
                priceDisplayMode={priceDisplayMode}
                discountPercent={discountPercent}
                currency={currency}
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${cellGap}px`,
                  height: '100%'
                }}
              >
                {currentPageItems.map(p => (
                  <CatalogA4GridCard
                    key={p.id}
                    product={p}
                    customOverrides={customOverrides}
                    themeColor={themeColor}
                    cellBorder={cellBorder}
                    showImage={showImage}
                    imageHeight={imageHeight}
                    showName={showName}
                    nameFontSize={nameFontSize}
                    showPrice={showPrice}
                    priceFontSize={priceFontSize}
                    priceDisplayMode={priceDisplayMode}
                    discountPercent={discountPercent}
                    showSku={showSku}
                    showBarcode={showBarcode}
                    barcodeHeight={barcodeHeight}
                    barcodeWidth={barcodeWidth}
                    showQr={showQr}
                    qrSize={qrSize}
                    currency={currency}
                  />
                ))}
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
