import { Product, CompanySettings } from '../../types';
import { escapeHtml } from '../receiptPrintService';
import { CatalogPrintSettings } from './catalogTypes';
import { generateCatalogAssets, CatalogAsset } from './catalogAssetsGenerator';
import { buildCatalogCss } from './catalogPrintStyles';
import { renderCatalogGridCard } from './catalogGridCardHtml';

export function partitionProductsForA4(
  products: Product[],
  columns: number,
  rowsPerPage: number,
  showHeader: boolean
): Product[][] {
  const pages: Product[][] = [];
  let currentIndex = 0;
  
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
}

export async function buildCatalogHtml(
  products: Product[],
  companySettings: CompanySettings,
  printSettings: CatalogPrintSettings
): Promise<string> {
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

  const accentColor = printSettings.themeColor || '#4f46e5';
  const priceMode = printSettings.priceDisplayMode || 'retail';
  const discountPct = Number(printSettings.discountPercent || 0);
  const overrides = printSettings.customOverrides || {};

  const assetMap = await generateCatalogAssets(
    products,
    showBarcode,
    barcodeWidth,
    barcodeHeight,
    showQr,
    qrSize
  );

  const pages = partitionProductsForA4(products, columns, rowsPerPage, showHeader);
  const todayDate = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const a4Width = orientation === 'portrait' ? '210mm' : '297mm';
  const a4Height = orientation === 'portrait' ? '297mm' : '210mm';

  let pagesHtml = '';

  pages.forEach((pageItems, pageIdx) => {
    const isFirstPage = pageIdx === 0;

    let headerHtml = '';
    if (isFirstPage && showHeader) {
      const logoTag = showLogo && companySettings.logoUrl 
        ? `<img src="${companySettings.logoUrl}" style="height: 48px; object-fit: contain; margin-right: 15px; border-radius: 4px;" />` 
        : '';
      const phoneTag = printSettings.contactPhone
        ? `<div style="font-size: 11px; font-weight: 800; color: ${accentColor}; margin-top: 2px;">📞 ${escapeHtml(printSettings.contactPhone)}</div>`
        : '';
      headerHtml = `
        <div class="catalog-header" style="border-bottom: 3px solid ${accentColor};">
          <div style="display: flex; align-items: center;">
            ${logoTag}
            <div>
              <h1 class="catalog-title" style="color: ${accentColor};">${escapeHtml(title || companySettings.name || 'CATALOGUE')}</h1>
              <p class="catalog-subtitle">${escapeHtml(subtitle || 'Nos produits disponibles')}</p>
            </div>
          </div>
          <div style="text-align: right;">
            ${showDate ? `<div class="catalog-date">${todayDate}</div>` : ''}
            ${phoneTag}
          </div>
        </div>
      `;
    }

    let gridItemsHtml = '';
    if (printSettings.layoutMode === 'table') {
      const rowsHtml = pageItems.map((p) => {
        const ov = overrides[p.id] || {};
        const retailPrice = ov.customPrice !== undefined ? ov.customPrice : Number(p.price || 0);
        const wholesalePrice = Number((p as any).wholesalePrice || retailPrice * 0.9);
        const badgeHtml = ov.badge
          ? `<span style="background:${accentColor};color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:800;">${escapeHtml(ov.badge)}</span>`
          : '';
        return `<tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:6px 8px;font-size:10px;font-family:monospace;color:#475569;">${escapeHtml(p.sku || p.barcode || p.id.substring(0, 8).toUpperCase())}</td>
          <td style="padding:6px 8px;font-size:12px;font-weight:700;color:#0f172a;">${escapeHtml(p.name)} ${badgeHtml}</td>
          <td style="padding:6px 8px;font-size:11px;text-align:center;color:#475569;">${escapeHtml(p.unit || 'Unité')}</td>
          ${priceMode === 'both' || priceMode === 'wholesale' ? `<td style="padding:6px 8px;font-size:12px;font-weight:800;text-align:right;color:#059669;">${wholesalePrice.toFixed(2)} ${companySettings.currency || 'DA'}</td>` : ''}
          ${priceMode !== 'wholesale' && priceMode !== 'none' ? `<td style="padding:6px 8px;font-size:12px;font-weight:800;text-align:right;color:${accentColor};">${retailPrice.toFixed(2)} ${companySettings.currency || 'DA'}</td>` : ''}
        </tr>`;
      }).join('');

      gridItemsHtml = `
        <div style="grid-column: 1 / -1; width: 100%;">
          <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;">
            <thead>
              <tr style="background:${accentColor};color:#fff;">
                <th style="padding:8px;text-align:left;font-size:10px;">RÉF / CODE</th>
                <th style="padding:8px;text-align:left;font-size:10px;">DÉSIGNATION ARTICLE</th>
                <th style="padding:8px;text-align:center;font-size:10px;">UNITÉ</th>
                ${priceMode === 'both' || priceMode === 'wholesale' ? `<th style="padding:8px;text-align:right;font-size:10px;">PRIX GROS</th>` : ''}
                ${priceMode !== 'wholesale' && priceMode !== 'none' ? `<th style="padding:8px;text-align:right;font-size:10px;">PRIX PUBLIC</th>` : ''}
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `;
    } else {
      pageItems.forEach((p) => {
        gridItemsHtml += renderCatalogGridCard(
          p,
          assetMap.get(p.id),
          printSettings,
          companySettings,
          accentColor,
          priceMode,
          discountPct,
          overrides
        );
      });
    }

    const gridStyle = printSettings.layoutMode === 'table'
      ? 'display: block; width: 100%; flex: 1;'
      : `display: grid; grid-template-columns: repeat(${columns}, 1fr); grid-template-rows: repeat(${isFirstPage && showHeader ? Math.max(1, rowsPerPage - 1) : rowsPerPage}, 1fr); gap: ${cellGap}px; flex: 1; align-content: stretch; width: 100%;`;

    const footerHtml = showFooter 
      ? `<div class="catalog-footer">
          <span>${escapeHtml(footerText || '')}</span>
          <span>Page ${pageIdx + 1} sur ${pages.length}</span>
        </div>` 
      : '';

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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Catalogue Produits</title>
        ${buildCatalogCss(orientation, a4Width, a4Height, pageMargin)}
      </head>
      <body>
        ${pagesHtml}
      </body>
    </html>
  `;
}
