import { Product, CompanySettings } from '../types';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export interface CatalogPrintSettings {
  title: string;
  subtitle: string;
  footerText: string;
  showHeader: boolean;
  showFooter: boolean;
  showDate: boolean;
  showLogo: boolean;
  columns: number;
  rowsPerPage: number;
  pageMargin: number; // in mm
  cellGap: number; // in px
  cellBorder: 'none' | 'thin' | 'shadow';
  orientation: 'portrait' | 'landscape';
  
  // Element toggles
  showName: boolean;
  showPrice: boolean;
  showImage: boolean;
  showSku: boolean;
  showStock: boolean;
  showBarcode: boolean;
  showQr: boolean;
  showDescription: boolean;
  
  // Font sizes & heights
  nameFontSize: number;
  priceFontSize: number;
  imageHeight: number; // in px
  barcodeHeight: number; // in px
  barcodeWidth: number;
  qrSize: number; // in px
  descFontSize: number;
}

export const printCatalog = async (
  products: Product[],
  companySettings: CompanySettings,
  printSettings: CatalogPrintSettings
) => {
  let printWindow: Window | null = null;
  let iframe: HTMLIFrameElement | null = null;
  let doc: Document | null = null;

  // We always use dynamic print iframe to print catalog in background cleanly
  iframe = document.getElementById('print-catalog-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-catalog-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }
  doc = iframe.contentWindow?.document || iframe.contentDocument;

  if (!doc) return;

  const {
    title,
    subtitle,
    footerText,
    showHeader,
    showFooter,
    showDate,
    showLogo,
    columns,
    rowsPerPage,
    pageMargin,
    cellGap,
    cellBorder,
    orientation,
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
    barcodeHeight,
    barcodeWidth,
    qrSize,
    descFontSize
  } = printSettings;

  // Pre-generate barcodes and QR codes offline
  const offlineAssets = await Promise.all(
    products.map(async (p) => {
      const skuForBarcode = p.sku || p.id.substring(0, 8).toUpperCase();
      let barcodeSvg = '';
      let qrSvg = '';

      if (showBarcode && typeof document !== 'undefined') {
        try {
          const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          JsBarcode(tempSvg, skuForBarcode, {
            format: 'CODE128',
            width: barcodeWidth,
            height: barcodeHeight,
            displayValue: true,
            fontSize: 9,
            margin: 0
          });
          barcodeSvg = tempSvg.outerHTML;
        } catch (e) {
          console.error('Catalog Barcode generation failed:', e);
        }
      }

      if (showQr) {
        try {
          qrSvg = await QRCode.toString(p.sku || p.id, {
            type: 'svg',
            margin: 0,
            width: qrSize
          });
        } catch (e) {
          console.error('Catalog QR generation failed:', e);
        }
      }

      return {
        id: p.id,
        barcodeSvg,
        qrSvg
      };
    })
  );

  const assetMap = new Map(offlineAssets.map((a) => [a.id, a]));

  // Partition products across A4 pages to avoid any page overflows
  const partitionProducts = () => {
    const pages: Product[][] = [];
    let currentIndex = 0;
    
    // First page capacity has fewer rows if header is visible
    const firstPageRows = showHeader ? Math.max(1, rowsPerPage - 1) : rowsPerPage;
    const firstPageCapacity = columns * firstPageRows;
    const standardPageCapacity = columns * rowsPerPage;

    if (currentIndex < products.length) {
      const page1Items = products.slice(currentIndex, currentIndex + firstPageCapacity);
      pages.push(page1Items);
      currentIndex += firstPageCapacity;
    }

    while (currentIndex < products.length) {
      const pageItems = products.slice(currentIndex, currentIndex + standardPageCapacity);
      pages.push(pageItems);
      currentIndex += standardPageCapacity;
    }

    return pages;
  };

  const pages = partitionProducts();
  const todayDate = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Build A4 printable pages HTML
  let pagesHtml = '';
  pages.forEach((pageItems, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    
    // Header block
    let headerHtml = '';
    if (isFirstPage && showHeader) {
      const logoTag = showLogo && companySettings.logoUrl 
        ? `<img src="${companySettings.logoUrl}" style="height: 48px; object-fit: contain; margin-right: 15px; border-radius: 4px;" />` 
        : '';
      headerHtml = `
        <div class="catalog-header">
          <div style="display: flex; align-items: center;">
            ${logoTag}
            <div>
              <h1 class="catalog-title">${title || companySettings.name || 'CATALOGUE'}</h1>
              <p class="catalog-subtitle">${subtitle || 'Nos produits disponibles'}</p>
            </div>
          </div>
          ${showDate ? `<div class="catalog-date">${todayDate}</div>` : ''}
        </div>
      `;
    }

    // Grid content
    let gridItemsHtml = '';
    pageItems.forEach((p) => {
      const assets = assetMap.get(p.id);
      const barcodeSvg = assets?.barcodeSvg || '';
      const qrSvg = assets?.qrSvg || '';

      const imgTag = showImage && (p.imageUrl || p.image) 
        ? `<div class="item-image-wrapper"><img src="${p.imageUrl || p.image}" style="height: ${imageHeight}px; width: 100%; object-fit: cover;" referrerpolicy="no-referrer" /></div>` 
        : '';
      const nameTag = showName 
        ? `<div class="item-name" style="font-size: ${nameFontSize}px;">${p.name}</div>` 
        : '';
      const priceTag = showPrice 
        ? `<div class="item-price" style="font-size: ${priceFontSize}px;">${p.price.toFixed(2)} ${companySettings.currency || '€'}</div>` 
        : '';
      const skuTag = showSku 
        ? `<div class="item-sku">REF : ${p.sku || p.id.substring(0, 8).toUpperCase()}</div>` 
        : '';
      const stockTag = showStock 
        ? `<div class="item-stock">Stock disponible : ${p.stock} ${p.unit || 'u'}</div>` 
        : '';
      const descTag = showDescription && p.description 
        ? `<div class="item-desc" style="font-size: ${descFontSize}px;">${p.description.length > 80 ? p.description.slice(0, 77) + '...' : p.description}</div>` 
        : '';
      const barcodeBlock = showBarcode && barcodeSvg 
        ? `<div class="item-barcode-wrapper">${barcodeSvg}</div>` 
        : '';
      const qrBlock = showQr && qrSvg 
        ? `<div class="item-qr-wrapper">${qrSvg}</div>` 
        : '';

      gridItemsHtml += `
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
    });

    // Grid structure
    // CSS Grid variables will control exact row count to fill height perfectly
    const gridStyle = `
      display: grid;
      grid-template-columns: repeat(${columns}, 1fr);
      grid-template-rows: repeat(${isFirstPage && showHeader ? Math.max(1, rowsPerPage - 1) : rowsPerPage}, 1fr);
      gap: ${cellGap}px;
      flex: 1;
      align-content: stretch;
      width: 100%;
    `;

    // Footer block
    let footerHtml = '';
    if (showFooter) {
      footerHtml = `
        <div class="catalog-footer">
          <span>${footerText || ''}</span>
          <span>Page ${pageIdx + 1} sur ${pages.length}</span>
        </div>
      `;
    }

    pagesHtml += `
      <div class="page">
        <div class="page-content">
          ${headerHtml}
          <div style="${gridStyle}">
            ${gridItemsHtml}
          </div>
          ${footerHtml}
        </div>
      </div>
    `;
  });

  const a4Width = orientation === 'portrait' ? '210mm' : '297mm';
  const a4Height = orientation === 'portrait' ? '297mm' : '210mm';

  doc.open();
  doc.write(`
    <html>
      <head>
        <title>Catalogue Produits A4</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            width: ${a4Width} !important;
            height: auto !important;
          }
          .page {
            width: ${a4Width} !important;
            height: ${a4Height} !important;
            padding: ${pageMargin}mm;
            box-sizing: border-box;
            background: white;
            position: relative;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
          }
          .page-content {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            justify-content: space-between;
          }
          .catalog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 12px;
            height: 60px;
            flex-shrink: 0;
          }
          .catalog-title {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: -0.5px;
          }
          .catalog-subtitle {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #64748b;
          }
          .catalog-date {
            font-size: 10px;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
          }
          .grid-item {
            background: #fff;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 8px;
            overflow: hidden;
            height: 100%;
            width: 100%;
          }
          .grid-item.border-thin {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
          }
          .grid-item.border-shadow {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          }
          .item-image-wrapper {
            width: 100%;
            overflow: hidden;
            border-radius: 4px;
            border: 1px solid #f1f5f9;
            flex-shrink: 0;
            margin-bottom: 4px;
          }
          .item-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 0;
          }
          .item-name {
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
          }
          .item-desc {
            color: #475569;
            margin-bottom: 4px;
            line-height: 1.2;
            word-break: break-word;
          }
          .item-price {
            font-weight: 800;
            color: #4f46e5;
          }
          .item-sku {
            font-size: 8px;
            color: #64748b;
            font-family: monospace;
          }
          .item-stock {
            font-size: 9px;
            color: #059669;
            font-weight: 600;
          }
          .codes-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 4px;
            gap: 4px;
            flex-shrink: 0;
          }
          .item-barcode-wrapper {
            flex: 1;
            display: flex;
            justify-content: center;
            overflow: hidden;
          }
          .item-barcode-wrapper svg {
            width: 100%;
            height: auto;
          }
          .item-qr-wrapper {
            display: flex;
            justify-content: center;
            flex-shrink: 0;
          }
          .catalog-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            margin-top: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            color: #64748b;
            height: 20px;
            flex-shrink: 0;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
    </html>
  `);
  doc.close();

  if (iframe?.contentWindow) {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Catalog print trigger failed:', e);
    }
  }
};

/**
 * Builds the full HTML string for the catalog (shared between print, export, share)
 */
export const buildCatalogHtml = async (
  products: Product[],
  companySettings: CompanySettings,
  printSettings: CatalogPrintSettings
): Promise<string> => {
  const {
    title, subtitle, footerText, showHeader, showFooter, showDate, showLogo,
    columns, rowsPerPage, pageMargin, cellGap, cellBorder, orientation,
    showName, showPrice, showImage, showSku, showStock, showBarcode, showQr, showDescription,
    nameFontSize, priceFontSize, imageHeight, barcodeHeight, barcodeWidth, qrSize, descFontSize
  } = printSettings;

  const offlineAssets = await Promise.all(
    products.map(async (p) => {
      const skuForBarcode = p.sku || p.id.substring(0, 8).toUpperCase();
      let barcodeSvg = '';
      let qrSvg = '';
      if (showBarcode && typeof document !== 'undefined') {
        try {
          const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          JsBarcode(tempSvg, skuForBarcode, { format: 'CODE128', width: barcodeWidth, height: barcodeHeight, displayValue: true, fontSize: 9, margin: 0 });
          barcodeSvg = tempSvg.outerHTML;
        } catch (e) { /* ignored */ }
      }
      if (showQr) {
        try { qrSvg = await QRCode.toString(p.sku || p.id, { type: 'svg', margin: 0, width: qrSize }); } catch (e) { /* ignored */ }
      }
      return { id: p.id, barcodeSvg, qrSvg };
    })
  );
  const assetMap = new Map(offlineAssets.map((a) => [a.id, a]));

  const partitionProducts = () => {
    const pages: Product[][] = [];
    let currentIndex = 0;
    const firstPageRows = showHeader ? Math.max(1, rowsPerPage - 1) : rowsPerPage;
    const firstPageCapacity = columns * firstPageRows;
    const standardPageCapacity = columns * rowsPerPage;
    if (currentIndex < products.length) { pages.push(products.slice(currentIndex, currentIndex + firstPageCapacity)); currentIndex += firstPageCapacity; }
    while (currentIndex < products.length) { pages.push(products.slice(currentIndex, currentIndex + standardPageCapacity)); currentIndex += standardPageCapacity; }
    return pages;
  };

  const pages = partitionProducts();
  const todayDate = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  const a4Width = orientation === 'portrait' ? '210mm' : '297mm';
  const a4Height = orientation === 'portrait' ? '297mm' : '210mm';

  let pagesHtml = '';
  pages.forEach((pageItems, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    let headerHtml = '';
    if (isFirstPage && showHeader) {
      const logoTag = showLogo && companySettings.logoUrl ? `<img src="${companySettings.logoUrl}" style="height: 48px; object-fit: contain; margin-right: 15px; border-radius: 4px;" />` : '';
      headerHtml = `<div class="catalog-header"><div style="display: flex; align-items: center;">${logoTag}<div><h1 class="catalog-title">${title || companySettings.name || 'CATALOGUE'}</h1><p class="catalog-subtitle">${subtitle || 'Nos produits disponibles'}</p></div></div>${showDate ? `<div class="catalog-date">${todayDate}</div>` : ''}</div>`;
    }
    let gridItemsHtml = '';
    pageItems.forEach((p) => {
      const assets = assetMap.get(p.id);
      const imgTag = showImage && (p.imageUrl || p.image) ? `<div class="item-image-wrapper"><img src="${p.imageUrl || p.image}" style="height: ${imageHeight}px; width: 100%; object-fit: cover;" /></div>` : '';
      const nameTag = showName ? `<div class="item-name" style="font-size: ${nameFontSize}px;">${p.name}</div>` : '';
      const priceTag = showPrice ? `<div class="item-price" style="font-size: ${priceFontSize}px;">${p.price.toFixed(2)} ${companySettings.currency || '€'}</div>` : '';
      const skuTag = showSku ? `<div class="item-sku">REF : ${p.sku || p.id.substring(0, 8).toUpperCase()}</div>` : '';
      const stockTag = showStock ? `<div class="item-stock">Stock : ${p.stock} ${p.unit || 'u'}</div>` : '';
      const descTag = showDescription && p.description ? `<div class="item-desc" style="font-size: ${descFontSize}px;">${p.description.length > 80 ? p.description.slice(0, 77) + '...' : p.description}</div>` : '';
      const barcodeBlock = showBarcode && assets?.barcodeSvg ? `<div class="item-barcode-wrapper">${assets.barcodeSvg}</div>` : '';
      const qrBlock = showQr && assets?.qrSvg ? `<div class="item-qr-wrapper">${assets.qrSvg}</div>` : '';
      gridItemsHtml += `<div class="grid-item border-${cellBorder}">${imgTag}<div class="item-details">${nameTag}${descTag}<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:4px;">${priceTag}${skuTag}</div>${stockTag ? `<div style="margin-top:2px;">${stockTag}</div>` : ''}<div class="codes-row">${barcodeBlock}${qrBlock}</div></div></div>`;
    });
    const gridStyle = `display:grid;grid-template-columns:repeat(${columns},1fr);grid-template-rows:repeat(${isFirstPage && showHeader ? Math.max(1, rowsPerPage - 1) : rowsPerPage},1fr);gap:${cellGap}px;flex:1;align-content:stretch;width:100%;`;
    const footerHtml = showFooter ? `<div class="catalog-footer"><span>${footerText || ''}</span><span>Page ${pageIdx + 1} sur ${pages.length}</span></div>` : '';
    pagesHtml += `<div class="page"><div class="page-content">${headerHtml}<div style="${gridStyle}">${gridItemsHtml}</div>${footerHtml}</div></div>`;
  });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Catalogue Produits</title><style>
    @page { size: A4 ${orientation}; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; width: ${a4Width} !important; }
    .page { width: ${a4Width} !important; height: ${a4Height} !important; padding: ${pageMargin}mm; box-sizing: border-box; background: white; position: relative; overflow: hidden; page-break-after: always; break-after: page; display: flex; flex-direction: column; }
    .page-content { display: flex; flex-direction: column; width: 100%; height: 100%; justify-content: space-between; }
    .catalog-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 12px; height: 60px; flex-shrink: 0; }
    .catalog-title { margin: 0; font-size: 20px; font-weight: 800; color: #1e293b; text-transform: uppercase; }
    .catalog-subtitle { margin: 2px 0 0 0; font-size: 11px; color: #64748b; }
    .catalog-date { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
    .grid-item { background: #fff; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; padding: 8px; overflow: hidden; height: 100%; width: 100%; }
    .grid-item.border-thin { border: 1px solid #e2e8f0; border-radius: 6px; }
    .grid-item.border-shadow { border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .item-image-wrapper { width: 100%; overflow: hidden; border-radius: 4px; border: 1px solid #f1f5f9; flex-shrink: 0; margin-bottom: 4px; }
    .item-details { flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-height: 0; }
    .item-name { font-weight: bold; color: #0f172a; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
    .item-desc { color: #475569; margin-bottom: 4px; line-height: 1.2; }
    .item-price { font-weight: 800; color: #4f46e5; }
    .item-sku { font-size: 8px; color: #64748b; font-family: monospace; }
    .item-stock { font-size: 9px; color: #059669; font-weight: 600; }
    .codes-row { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; gap: 4px; flex-shrink: 0; }
    .item-barcode-wrapper { flex: 1; display: flex; justify-content: center; overflow: hidden; }
    .item-barcode-wrapper svg { width: 100%; height: auto; }
    .item-qr-wrapper { display: flex; justify-content: center; flex-shrink: 0; }
    .catalog-footer { border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; height: 20px; flex-shrink: 0; }
  </style></head><body>${pagesHtml}</body></html>`;
};

/**
 * Export the catalog as a downloadable HTML file
 */
export const exportCatalogAsHtml = async (
  products: Product[],
  companySettings: CompanySettings,
  printSettings: CatalogPrintSettings
): Promise<void> => {
  const html = await buildCatalogHtml(products, companySettings, printSettings);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `catalogue-${(companySettings.name || 'produits').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.html`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

/**
 * Share catalog via Web Share API (mobile/desktop) or fallback to social links
 */
export type SocialTarget = 'webshare' | 'whatsapp' | 'telegram' | 'email' | 'download';

export const shareCatalog = async (
  products: Product[],
  companySettings: CompanySettings,
  printSettings: CatalogPrintSettings,
  target: SocialTarget
): Promise<{ success: boolean; message: string }> => {
  const catalogName = printSettings.title || companySettings.name || 'Notre Catalogue';
  const shareText = `📦 ${catalogName}\n${printSettings.subtitle || ''}\n\n${products.length} article(s) disponible(s). Catalogue généré le ${new Date().toLocaleDateString('fr-FR')}.`;

  if (target === 'download') {
    await exportCatalogAsHtml(products, companySettings, printSettings);
    return { success: true, message: 'Catalogue téléchargé' };
  }

  if (target === 'webshare') {
    if (navigator.share) {
      try {
        const html = await buildCatalogHtml(products, companySettings, printSettings);
        const blob = new Blob([html], { type: 'text/html' });
        const file = new File([blob], `catalogue-${Date.now()}.html`, { type: 'text/html' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: catalogName, text: shareText, files: [file] });
        } else {
          await navigator.share({ title: catalogName, text: shareText });
        }
        return { success: true, message: 'Catalogue partagé' };
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          return { success: false, message: 'Partage annulé ou non supporté' };
        }
        return { success: false, message: 'Partage annulé' };
      }
    } else {
      return { success: false, message: 'Partage natif non supporté sur ce navigateur' };
    }
  }

  const encodedText = encodeURIComponent(shareText);
  let url = '';
  
  if (target === 'whatsapp') {
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  } else if (target === 'telegram') {
    url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodedText}`;
  } else if (target === 'email') {
    const subject = encodeURIComponent(`Catalogue Produits - ${catalogName}`);
    url = `mailto:?subject=${subject}&body=${encodedText}`;
  }

  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return { success: true, message: 'Lien de partage ouvert' };
  }

  return { success: false, message: 'Cible de partage inconnue' };
};

