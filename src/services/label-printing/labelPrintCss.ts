import { LabelDimensionsResult } from './labelDimensions';

export function generateLabelPrintStyles(dim: LabelDimensionsResult): string {
  const { pageSizeCss, bodyWidthCss, width, height, safeHeight, isReceiptPrinterMode } = dim;

  return `
    @page { 
      size: ${pageSizeCss}; 
      margin: 0mm !important; 
    }
    @media print {
      @page {
        size: ${pageSizeCss};
        margin: 0mm !important;
      }
      html, body {
        width: ${bodyWidthCss} !important;
        height: auto !important;
        margin: 0mm !important;
        padding: 0mm !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    * { 
      box-sizing: border-box; 
      margin: 0;
      padding: 0;
    }
    html, body { 
      margin: 0 !important; 
      padding: 0 !important; 
      background: white !important;
      font-family: Arial, sans-serif;
      width: ${bodyWidthCss} !important;
      height: auto !important;
      font-size: 0 !important;
      line-height: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    svg {
      max-width: 100% !important;
      max-height: 100% !important;
      display: block;
      margin: 0 auto;
    }
    .label-container {
      width: ${width} !important; 
      height: ${safeHeight} !important;
      max-width: ${width} !important;
      max-height: ${safeHeight} !important;
      min-height: ${safeHeight} !important;
      padding: 0 !important;
      margin: ${isReceiptPrinterMode ? '0 auto' : '0'} !important;
      box-sizing: border-box !important;
      background: white !important;
      position: relative !important;
      overflow: hidden !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: auto !important;
      break-after: auto !important;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px !important;
      line-height: normal !important;
      ${isReceiptPrinterMode ? 'border-bottom: 1px dashed #ccc;' : ''}
    }
    /* Saut de page AVANT chaque étiquette sauf la 1ère : jamais de page blanche finale */
    .label-container + .label-container {
      page-break-before: always !important;
      break-before: page !important;
    }
    .label-container:last-child {
      border-bottom: none !important;
    }
    .label-wrapper {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      background: white;
    }
    .label-wrapper.rot-90 {
      width: ${height} !important;
      height: ${width} !important;
      transform: rotate(90deg);
      transform-origin: center center;
    }
    .label-wrapper.rot-180 {
      width: 100% !important;
      height: 100% !important;
      transform: rotate(180deg);
      transform-origin: center center;
    }
    .label-wrapper.rot-270 {
      width: ${height} !important;
      height: ${width} !important;
      transform: rotate(270deg);
      transform-origin: center center;
    }
    .shelf-tag { width: 100%; height: 100%; padding: 5px; border: 1px solid #ddd; position: relative; }
    .shelf-standard .name { font-size: 10px; font-weight: bold; margin-bottom: 2px; height: 2.4em; overflow: hidden; text-align: left; }
    .shelf-standard .main-price { font-size: 18px; font-weight: 900; text-align: left; }
    .shelf-standard .currency { font-size: 10px; font-weight: 700; }
    .shelf-standard .footer-meta { display: flex; justify-content: space-between; align-items: flex-end; position: absolute; bottom: 5px; width: calc(100% - 10px); }
    .shelf-standard .ref { font-size: 7px; color: #666; font-family: monospace; }
    .shelf-large .brand { font-size: 10px; font-weight: 800; color: #4f46e5; margin-bottom: 2px; }
    .shelf-large .name { font-size: 14px; font-weight: bold; margin-bottom: 5px; text-align: left; }
    .shelf-large .price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
    .shelf-large .main-price { font-size: 32px; font-weight: 950; letter-spacing: -1px; }
    .shelf-large .unit-price { font-size: 10px; color: #666; font-weight: bold; }
    .shelf-large .barcode-row { display: flex; align-items: center; gap: 10px; }
    .shelf-large .sku { font-size: 9px; font-family: monospace; }
    .shelf-promo { background: #fee2e2; border: 2px solid #ef4444; }
    .shelf-promo .promo-badge { background: #ef4444; color: white; padding: 2px 8px; font-size: 10px; font-weight: 900; display: inline-block; margin-bottom: 5px; }
    .shelf-promo .name { font-size: 12px; font-weight: bold; text-align: left; }
    .shelf-promo .price-box { margin-top: 5px; text-align: left; }
    .shelf-promo .old-price { font-size: 11px; text-decoration: line-through; color: #991b1b; }
    .shelf-promo .new-price { font-size: 24px; font-weight: 900; color: #ef4444; }
    .label-standard { text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 2px; }
    .label-standard .name { font-weight: bold; font-size: 11px; margin-bottom: 2px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .label-standard .price { font-size: 16px; font-weight: 900; margin-bottom: 4px; }
    .label-standard .sku { font-size: 8px; color: #666; margin-top: 2px; }
    .price-only { font-size: 28px; font-weight: 900; display: flex; align-items: center; justify-content: center; height: 100%; }
  `;
}
