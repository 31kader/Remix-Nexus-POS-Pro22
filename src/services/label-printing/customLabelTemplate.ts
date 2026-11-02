import { Product } from '../../types';
import { formatPrice } from '../../lib/utils';

export function generateCustomTemplateHtml(
  p: Product,
  barcodeHtml: string,
  qrHtml: string,
  settings: any,
  isMiniLabel: boolean
): string {
  const showName = settings.customShowName !== false;
  const showPrice = settings.customShowPrice !== false;
  const showBarcode = settings.customShowBarcode !== false;
  const showQr = settings.customShowQr === true;
  const showImage = settings.customShowImage === true;
  const customText = settings.customText || '';
  const borderStyle = settings.customBorder ? '1px solid #000' : 'none';

  let nameSize = settings.customNameSize || (isMiniLabel ? 8 : 11);
  let priceSize = settings.customPriceSize || (isMiniLabel ? 12 : 16);
  let textSize = settings.customTextSize || (isMiniLabel ? 7 : 9);
  let paddingVal = settings.customPadding !== undefined ? settings.customPadding : (isMiniLabel ? 1 : 2);

  if (isMiniLabel) {
    if (nameSize > 9) nameSize = 8;
    if (priceSize > 13) priceSize = 12;
    if (textSize > 8) textSize = 7;
    if (paddingVal > 1) paddingVal = 1;
  }

  const pTop = settings.customPaddingTop !== undefined ? (isMiniLabel ? Math.min(settings.customPaddingTop, 1) : settings.customPaddingTop) : paddingVal;
  const pBottom = settings.customPaddingBottom !== undefined ? (isMiniLabel ? Math.min(settings.customPaddingBottom, 1) : settings.customPaddingBottom) : paddingVal;
  const pLeft = settings.customPaddingLeft !== undefined ? (isMiniLabel ? Math.min(settings.customPaddingLeft, 1) : settings.customPaddingLeft) : paddingVal;
  const pRight = settings.customPaddingRight !== undefined ? (isMiniLabel ? Math.min(settings.customPaddingRight, 1) : settings.customPaddingRight) : paddingVal;

  const struct = settings.customLayoutStructure || 'classic';
  const align = settings.customAlignment || 'center';
  const tAlign = settings.customTextAlign || 'center';
  const isBold = settings.customTextBold ? 'bold' : 'normal';
  const isItalic = settings.customTextItalic ? 'italic' : 'normal';

  const customGap = settings.customGap !== undefined ? (isMiniLabel ? Math.min(settings.customGap, 1) : settings.customGap) : (isMiniLabel ? 1 : 4);
  const nameLineClamp = settings.nameLineClamp !== undefined ? settings.nameLineClamp : 1;
  const customLetterSpacing = settings.customLetterSpacing !== undefined ? settings.customLetterSpacing : 0;

  const imgSize = isMiniLabel ? 20 : 32;
  const imageHtml = showImage && (p.imageUrl || p.image) ? `<div style="width: ${imgSize}px; height: ${imgSize}px; display: inline-flex; align-items: center; justify-content: center; background: #fff; border-radius: 3px; border: 1px solid #ddd; overflow: hidden;"><img src="${p.imageUrl || p.image}" style="max-width: 100%; max-height: 100%; object-fit: contain;" referrerpolicy="no-referrer" /></div>` : '';

  const crossedPriceHtml = (p.originalPrice && Number(p.originalPrice) > Number(p.price))
    ? `<span style="font-size: ${Math.max(7, Math.round(priceSize * 0.65))}px; text-decoration: line-through; color: #555; font-weight: bold; margin-right: 3px;">${formatPrice(p.originalPrice)}</span>`
    : '';

  if (struct === 'split') {
    return `
      <div class="label-custom" style="
        display: flex; 
        flex-direction: row; 
        align-items: center; 
        justify-content: space-between; 
        height: 100%; 
        width: 100%; 
        padding: ${pTop}mm ${pRight}mm ${pBottom}mm ${pLeft}mm; 
        box-sizing: border-box;
        background: #fff;
        color: #000;
        font-family: Arial, sans-serif;
        border: ${borderStyle};
        gap: ${customGap}px;
      ">
        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: left; height: 100%;">
          ${showName ? `
            <div class="name" style="
              font-weight: bold; 
              font-size: ${nameSize}px; 
              width: 100%; 
              margin-bottom: 2px;
              letter-spacing: ${customLetterSpacing}px;
              ${nameLineClamp === 2 ? `
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                white-space: normal;
              ` : `
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            ">${p.name}</div>
          ` : ''}
          <div style="display: flex; align-items: center; justify-content: flex-start; gap: 6px; margin: 3px 0; width: 100%;">
            ${imageHtml}
            ${showPrice ? `<div class="price" style="font-size: ${priceSize}px; font-weight: 900; margin: 0; white-space: nowrap;">${crossedPriceHtml}${formatPrice(p.price)} ${settings.currency}</div>` : ''}
          </div>
          ${customText ? `<div class="custom-text" style="font-size: ${textSize}px; font-weight: ${isBold}; font-style: ${isItalic}; color: #333; margin: 1px 0; width: 100%; word-break: break-word;">${customText}</div>` : ''}
        </div>

        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; max-width: 48%; min-width: 32%; gap: 4px;">
          ${showBarcode ? `
            <div style="display: flex; justify-content: center; overflow: hidden; width: 100%;">
              ${barcodeHtml}
            </div>
          ` : ''}
          ${showQr ? `
            <div style="display: flex; justify-content: center; width: 100%;">
              ${qrHtml}
            </div>
          ` : ''}
          ${(!showBarcode && !showQr) ? `<div class="sku" style="font-size: 8px; color: #666; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${p.sku || p.id}</div>` : ''}
        </div>
      </div>
    `;
  }

  if (struct === 'price-heavy') {
    return `
      <div class="label-custom" style="
        display: flex; 
        flex-direction: row; 
        align-items: center; 
        justify-content: space-between; 
        height: 100%; 
        width: 100%; 
        padding: ${pTop}mm ${pRight}mm ${pBottom}mm ${pLeft}mm; 
        box-sizing: border-box;
        background: #fff;
        color: #000;
        font-family: Arial, sans-serif;
        border: ${borderStyle};
        gap: ${customGap}px;
      ">
        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f1f5f9; border: 1.5px solid #000; border-radius: 4px; padding: 4px; min-width: 45%; height: 100%; box-sizing: border-box;">
          ${showPrice ? `
            ${p.originalPrice && Number(p.originalPrice) > Number(p.price) ? `<div style="font-size: ${Math.max(8, Math.round(priceSize * 0.65))}px; text-decoration: line-through; color: #555; font-weight: bold; margin-bottom: 2px;">${formatPrice(p.originalPrice)}</div>` : ''}
            <div class="price" style="font-size: ${Math.round(priceSize * 1.25)}px; font-weight: 900; line-height: 1; text-align: center; color: #000;">${formatPrice(p.price)}</div>
            <div style="font-size: 9px; font-weight: bold; margin-top: 3px; text-transform: uppercase; color: #475569;">${settings.currency}</div>
          ` : '<div style="font-weight: bold; font-size: 11px;">PROMO</div>'}
        </div>

        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; height: 100%; gap: 4px;">
          ${showName ? `
            <div class="name" style="
              font-weight: bold; 
              font-size: ${nameSize}px; 
              width: 100%;
              letter-spacing: ${customLetterSpacing}px;
              ${nameLineClamp === 2 ? `
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                white-space: normal;
              ` : `
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            ">${p.name}</div>
          ` : ''}
          ${customText ? `<div class="custom-text" style="font-size: ${textSize}px; font-weight: ${isBold}; font-style: ${isItalic}; color: #333; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${customText}</div>` : ''}
          
          <div style="width: 100%; display: flex; justify-content: flex-start; margin-top: auto;">
            ${showBarcode ? barcodeHtml : ''}
            ${showQr && !showBarcode ? qrHtml : ''}
            ${(!showBarcode && !showQr) ? `<div class="sku" style="font-size: 8px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${p.sku || p.id}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  if (struct === 'barcode-centric') {
    return `
      <div class="label-custom" style="
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: space-between; 
        height: 100%; 
        width: 100%; 
        padding: ${pTop}mm ${pRight}mm ${pBottom}mm ${pLeft}mm; 
        box-sizing: border-box;
        background: #fff;
        color: #000;
        font-family: Arial, sans-serif;
        border: ${borderStyle};
        gap: ${customGap}px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 6px; margin-bottom: 2px;">
          ${showName ? `
            <div class="name" style="
              font-weight: bold; 
              font-size: ${nameSize}px; 
              flex: 1; 
              text-align: left;
              letter-spacing: ${customLetterSpacing}px;
              ${nameLineClamp === 2 ? `
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                white-space: normal;
              ` : `
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            ">${p.name}</div>
          ` : ''}
          ${showPrice ? `<div class="price" style="font-size: ${priceSize}px; font-weight: 950; text-align: right; white-space: nowrap;">${crossedPriceHtml}${formatPrice(p.price)} ${settings.currency}</div>` : ''}
        </div>

        ${customText ? `<div class="custom-text" style="font-size: ${textSize}px; font-weight: ${isBold}; font-style: ${isItalic}; color: #333; width: 100%; text-align: center; margin-bottom: 2px;">${customText}</div>` : ''}

        ${showBarcode ? `
          <div style="display: flex; justify-content: center; width: 100%; overflow: hidden; flex: 1; align-items: center;">
            ${barcodeHtml}
          </div>
        ` : ''}
        ${showQr && !showBarcode ? `
          <div style="display: flex; justify-content: center; width: 100%; flex: 1; align-items: center;">
            ${qrHtml}
          </div>
        ` : ''}
        ${(!showBarcode && !showQr) ? `<div class="sku" style="font-size: 8px; color: #666; text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.sku || p.id}</div>` : ''}
      </div>
    `;
  }

  // Classic vertical stack
  return `
    <div class="label-custom" style="
      display: flex; 
      flex-direction: column; 
      align-items: ${align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'}; 
      justify-content: space-between; 
      height: 100%; 
      width: 100%; 
      padding: ${pTop}mm ${pRight}mm ${pBottom}mm ${pLeft}mm; 
      box-sizing: border-box;
      background: #fff;
      color: #000;
      font-family: Arial, sans-serif;
      border: ${borderStyle};
      gap: ${customGap}px;
    ">
      ${showName ? `
        <div class="name" style="
          font-weight: bold; 
          font-size: ${nameSize}px; 
          width: 100%; 
          text-align: ${align}; 
          letter-spacing: ${customLetterSpacing}px;
          ${nameLineClamp === 2 ? `
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            white-space: normal;
          ` : `
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        ">${p.name}</div>
      ` : ''}
      
      <div style="display: flex; align-items: center; justify-content: ${align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'}; gap: 8px; margin: auto; width: 100%;">
        ${imageHtml}
        ${showPrice ? `<div class="price" style="font-size: ${priceSize}px; font-weight: 900; margin: 0; white-space: nowrap;">${crossedPriceHtml}${formatPrice(p.price)} ${settings.currency}</div>` : ''}
      </div>

      ${customText ? `<div class="custom-text" style="font-size: ${textSize}px; text-align: ${tAlign}; font-weight: ${isBold}; font-style: ${isItalic}; color: #333; margin: 2px 0; width: 100%; word-break: break-word;">${customText}</div>` : ''}

      ${showBarcode ? `
        <div style="display: flex; justify-content: ${align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'}; width: 100%; overflow: hidden; margin: 2px 0;">
          ${barcodeHtml}
        </div>
      ` : ''}
      
      ${showQr ? `
        <div style="display: flex; justify-content: ${align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'}; width: 100%; margin: 2px 0;">
          ${qrHtml}
        </div>
      ` : ''}

      ${(!showBarcode && !showQr) ? `<div class="sku" style="font-size: 8px; color: #666; width: 100%; text-align: ${align}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.sku || p.id}</div>` : ''}
    </div>
  `;
}
