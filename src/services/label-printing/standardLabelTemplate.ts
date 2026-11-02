import { Product } from '../../types';
import { formatPrice } from '../../lib/utils';

export function generateStandardTemplateHtml(
  p: Product,
  barcodeHtml: string,
  settings: any,
  isMiniLabel: boolean
): string {
  const name = p.name || '';
  const matchUnit = name.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo|g|gramme|l|litre|ml|cl)\b/i);
  let unitPriceText = '';
  if (matchUnit) {
    const val = parseFloat(matchUnit[1].replace(',', '.'));
    const unit = matchUnit[2].toLowerCase();
    if (val > 0) {
      if (unit === 'kg' || unit === 'kilo') {
        unitPriceText = `(${formatPrice(p.price / val)} ${settings.currency}/kg)`;
      } else if (unit === 'g' || unit === 'gramme') {
        unitPriceText = `(${formatPrice((p.price / val) * 1000)} ${settings.currency}/kg)`;
      } else if (unit === 'l' || unit === 'litre') {
        unitPriceText = `(${formatPrice(p.price / val)} ${settings.currency}/L)`;
      } else if (unit === 'cl') {
        unitPriceText = `(${formatPrice((p.price / val) * 100)} ${settings.currency}/L)`;
      } else if (unit === 'ml') {
        unitPriceText = `(${formatPrice((p.price / val) * 1000)} ${settings.currency}/L)`;
      }
    }
  }

  const stdNameSize = isMiniLabel ? '8px' : '11px';
  const stdPriceSize = isMiniLabel ? '12px' : '16px';
  const stdImgSize = isMiniLabel ? '18px' : '28px';

  return `
    <div class="label-standard" style="
      width: 100%; 
      height: 100%; 
      box-sizing: border-box; 
      padding: ${isMiniLabel ? '1px' : '2px'}; 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: space-between; 
      overflow: hidden;
    ">
      <div style="width: 100%; text-align: center; overflow: hidden;">
        <div class="name" style="font-weight: bold; font-size: ${stdNameSize}; line-height: 1.1; margin: 0; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin: 1px 0;">
          ${(p.imageUrl || p.image) ? `<div style="width: ${stdImgSize}; height: ${stdImgSize}; display: inline-flex; align-items: center; justify-content: center; background: #fff; border-radius: 2px; border: 1px solid #ddd; overflow: hidden;"><img src="${p.imageUrl || p.image}" style="max-width: 100%; max-height: 100%; object-fit: contain;" referrerpolicy="no-referrer" /></div>` : ''}
          <div class="price" style="font-size: ${stdPriceSize}; font-weight: 900; line-height: 1.1; margin: 0;">${formatPrice(p.price)} ${settings.currency}</div>
        </div>
        ${(!isMiniLabel && unitPriceText) ? `<div style="font-size: 7.5px; font-weight: 800; color: #444; margin-top: 1px;">${unitPriceText}</div>` : ''}
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; overflow: hidden;">
        ${barcodeHtml}
        <div class="sku" style="font-size: ${isMiniLabel ? '7px' : '8px'}; color: #666; line-height: 1; margin: 0;">${p.sku || p.id}</div>
      </div>
    </div>
  `;
}
