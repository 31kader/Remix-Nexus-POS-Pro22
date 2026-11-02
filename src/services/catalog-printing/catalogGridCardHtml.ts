import { Product, CompanySettings } from '../../types';
import { escapeHtml } from '../receiptPrintService';
import { CatalogPrintSettings } from './catalogTypes';
import { CatalogAsset } from './catalogAssetsGenerator';

export function renderCatalogGridCard(
  p: Product,
  assets: CatalogAsset | undefined,
  printSettings: CatalogPrintSettings,
  companySettings: CompanySettings,
  accentColor: string,
  priceMode: string,
  discountPct: number,
  overrides: Record<string, any>
): string {
  const {
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
    descFontSize,
    cellBorder
  } = printSettings;

  const barcodeSvg = assets?.barcodeSvg || '';
  const qrSvg = assets?.qrSvg || '';
  const ov = overrides[p.id] || {};
  const effectivePrice = ov.customPrice !== undefined ? ov.customPrice : Number(p.price || 0);
  const wholesalePrice = Number((p as any).wholesalePrice || effectivePrice * 0.9);
  const oldPrice = ov.oldPrice !== undefined
    ? ov.oldPrice
    : priceMode === 'promo' && discountPct > 0
      ? Math.round(effectivePrice / (1 - discountPct / 100))
      : 0;
  const hasPromo = oldPrice > effectivePrice;

  const badgeOverlay = ov.badge
    ? `<div style="position:absolute;top:6px;left:6px;background:${accentColor};color:#fff;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:900;text-transform:uppercase;z-index:2;">${escapeHtml(ov.badge)}</div>`
    : '';

  const imgTag = showImage && (p.imageUrl || p.image) 
    ? `<div class="item-image-wrapper" style="position:relative;height: ${imageHeight}px; width: 100%; display: flex; align-items: center; justify-content: center; background-color: #f8fafc; border-radius: 4px; overflow: hidden; margin-bottom: 4px;">${badgeOverlay}<img src="${p.imageUrl || p.image}" style="max-height: ${imageHeight}px; max-width: 100%; object-fit: contain;" referrerpolicy="no-referrer" /></div>` 
    : badgeOverlay ? `<div style="margin-bottom:4px;">${badgeOverlay}</div>` : '';
  const nameTag = showName 
    ? `<div class="item-name" style="font-size: ${nameFontSize}px;">${escapeHtml(p.name)}</div>` 
    : '';

  let priceTag = '';
  if (showPrice && priceMode !== 'none') {
    if (priceMode === 'wholesale') {
      priceTag = `<div class="item-price" style="font-size: ${priceFontSize}px; color: #059669;">Gros: ${wholesalePrice.toFixed(2)} ${companySettings.currency || 'DA'}</div>`;
    } else if (priceMode === 'both') {
      priceTag = `<div>
        <div class="item-price" style="font-size: ${priceFontSize}px; color: ${accentColor};">${hasPromo ? `<span style="font-size: 10px; color: #ef4444; text-decoration: line-through; margin-right: 4px;">${oldPrice.toFixed(0)}</span>` : ''}${effectivePrice.toFixed(2)} ${companySettings.currency || 'DA'}</div>
        <div style="font-size: 10px; font-weight: 800; color: #059669;">Gros: ${wholesalePrice.toFixed(2)} ${companySettings.currency || 'DA'}</div>
      </div>`;
    } else if (hasPromo) {
      priceTag = `<div>
        <span style="font-size: 10px; color: #ef4444; font-weight: bold; text-decoration: line-through; margin-right: 4px;">${oldPrice.toFixed(0)}</span>
        <span class="item-price" style="font-size: ${priceFontSize}px; color: #dc2626;">${effectivePrice.toFixed(2)} ${companySettings.currency || 'DA'}</span>
      </div>`;
    } else {
      priceTag = `<div class="item-price" style="font-size: ${priceFontSize}px; color: ${accentColor};">${effectivePrice.toFixed(2)} ${companySettings.currency || 'DA'}</div>`;
    }
  }

  const skuTag = showSku 
    ? `<div class="item-sku">REF : ${escapeHtml(p.sku || p.id.substring(0, 8).toUpperCase())}</div>` 
    : '';
  const stockTag = showStock 
    ? `<div class="item-stock">Stock : ${p.stock} ${escapeHtml(p.unit || 'u')}</div>` 
    : '';
  const descTag = showDescription && p.description 
    ? `<div class="item-desc" style="font-size: ${descFontSize}px;">${escapeHtml(p.description.length > 80 ? p.description.slice(0, 77) + '...' : p.description)}</div>` 
    : '';
  const barcodeBlock = showBarcode && barcodeSvg 
    ? `<div class="item-barcode-wrapper">${barcodeSvg}</div>` 
    : '';
  const qrBlock = showQr && qrSvg 
    ? `<div class="item-qr-wrapper">${qrSvg}</div>` 
    : '';

  return `
    <div class="grid-item border-${cellBorder}">
      ${imgTag}
      <div class="item-details">
        ${nameTag}
        ${descTag}
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
          ${priceTag}
          ${skuTag}
        </div>
        ${stockTag ? `<div style="margin-top: 2px;">${stockTag}</div>` : ''}
        <div class="codes-row">
          ${barcodeBlock}
          ${qrBlock}
        </div>
      </div>
    </div>
  `;
}
