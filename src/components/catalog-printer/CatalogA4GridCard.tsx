import React from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Product } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { cn } from '../../lib/utils';
import { CellBorder, PriceDisplayMode } from './types';

interface CatalogA4GridCardProps {
  product: Product;
  customOverrides: Record<string, any>;
  themeColor: string;
  cellBorder: CellBorder;
  showImage: boolean;
  imageHeight: number;
  showName: boolean;
  nameFontSize: number;
  showPrice: boolean;
  priceFontSize: number;
  priceDisplayMode: PriceDisplayMode;
  discountPercent: number;
  showSku: boolean;
  showBarcode: boolean;
  barcodeHeight: number;
  barcodeWidth: number;
  showQr: boolean;
  qrSize: number;
  currency: string;
}

export function CatalogA4GridCard({
  product: p,
  customOverrides,
  themeColor,
  cellBorder,
  showImage,
  imageHeight,
  showName,
  nameFontSize,
  showPrice,
  priceFontSize,
  priceDisplayMode,
  discountPercent,
  showSku,
  showBarcode,
  barcodeHeight,
  barcodeWidth,
  showQr,
  qrSize,
  currency
}: CatalogA4GridCardProps) {
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
}
