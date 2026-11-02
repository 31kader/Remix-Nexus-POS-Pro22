import { Product } from '../../types';
import { formatPrice } from '../../lib/utils';
import { LabelAsset } from './labelBarcodeGenerator';
import { generateCustomTemplateHtml } from './customLabelTemplate';
import { generateStandardTemplateHtml } from './standardLabelTemplate';

export function generateLabelContentHtml(
  p: Product,
  assets: LabelAsset | undefined,
  settings: any,
  tpl: string,
  isMiniLabel: boolean
): string {
  const barcodeHtml = assets?.barcodeSvg || '';
  const qrHtml = assets?.qrSvg || '';

  if (tpl === 'price-only') {
    return `<div class="price-only">${formatPrice(p.price)} ${settings.currency}</div>`;
  }

  if (tpl === 'shelf-standard') {
    return `
      <div class="shelf-tag shelf-standard">
        <div class="name">${p.name}</div>
        <div class="main-price">${formatPrice(p.price)} <span class="currency">${settings.currency}</span></div>
        <div class="footer-meta">
          <div class="qr-box-inlined">${qrHtml}</div>
          <div class="ref">REF: ${p.sku || String(p.id || "").slice(-6).toUpperCase()}</div>
        </div>
      </div>
    `;
  }

  if (tpl === 'shelf-large') {
    return `
      <div class="shelf-tag shelf-large">
        <div class="brand">${settings.name}</div>
        <div class="name">${p.name}</div>
        <div class="price-row">
          <div class="main-price">${formatPrice(p.price)} <span class="currency">${settings.currency}</span></div>
          <div class="unit-price">${formatPrice(p.price)} ${settings.currency}/${p.unit || 'u'}</div>
        </div>
        <div class="barcode-row">
          <div class="qr-box-inlined">${qrHtml}</div>
          <div class="sku">${p.sku || p.id}</div>
        </div>
      </div>
    `;
  }

  if (tpl === 'shelf-promo') {
    const oldPriceVal = p.originalPrice && p.originalPrice > p.price ? p.originalPrice : (Number(p.price) * 1.2);
    return `
      <div class="shelf-tag shelf-promo">
        <div class="promo-badge">PROMO</div>
        <div class="name">${p.name}</div>
        <div class="price-box">
          <div class="old-price">${formatPrice(oldPriceVal)} ${settings.currency}</div>
          <div class="new-price">${formatPrice(p.price)} <span>${settings.currency}</span></div>
        </div>
      </div>
    `;
  }

  if (tpl === 'barcode-only') {
    return `
      <div class="label-standard" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        ${barcodeHtml}
      </div>
    `;
  }

  if (tpl === 'custom') {
    return generateCustomTemplateHtml(p, barcodeHtml, qrHtml, settings, isMiniLabel);
  }

  // Standard template
  return generateStandardTemplateHtml(p, barcodeHtml, settings, isMiniLabel);
}
