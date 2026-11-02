import { Product } from '../../types';
import { escapeHtml } from '../../lib/utils';
import { toast } from 'sonner';

export interface A4StickerSheetDef {
  id: string;
  label: string;
  cols: number;
  rows: number;
  w: number;
  h: number;
}

export const A4_STICKER_SHEETS: A4StickerSheetDef[] = [
  { id: 'a4-65', label: 'Planche A4 — 65 étiq. (38.1 × 21.2 mm)', cols: 5, rows: 13, w: 38.1, h: 21.2 },
  { id: 'a4-40', label: 'Planche A4 — 40 étiq. (52.5 × 29.7 mm)', cols: 4, rows: 10, w: 52.5, h: 29.7 },
  { id: 'a4-24', label: 'Planche A4 — 24 étiq. (70 × 37 mm)', cols: 3, rows: 8, w: 70, h: 37 },
  { id: 'a4-16', label: 'Planche A4 Gondole — 16 étiq. (99 × 34 mm)', cols: 2, rows: 8, w: 99, h: 34 }
];

export function printA4StickerSheet(
  itemsToPrint: Product[],
  selectedA4Sheet: string,
  startOffset: number,
  currency: string,
  customText?: string
) {
  if (itemsToPrint.length === 0) {
    toast.error('Ajoutez au moins un article à imprimer.');
    return;
  }
  const sheet = A4_STICKER_SHEETS.find(s => s.id === selectedA4Sheet) || A4_STICKER_SHEETS[1];
  const skipCells = Math.max(0, (Number(startOffset) || 1) - 1);
  const allCells: (Product | null)[] = [
    ...Array(skipCells).fill(null),
    ...itemsToPrint
  ];
  const perPage = sheet.cols * sheet.rows;
  const pages: (Product | null)[][] = [];
  for (let i = 0; i < allCells.length; i += perPage) {
    pages.push(allCells.slice(i, i + perPage));
  }

  const win = window.open('', '_blank', 'width=950,height=750');
  if (!win) {
    toast.error('Veuillez autoriser les fenêtres pop-up pour lancer l’impression.');
    return;
  }

  const pagesHtml = pages
    .map(pageCells => {
      const cellsHtml = pageCells
        .map(item => {
          if (!item) {
            return `<div class="sticker empty"></div>`;
          }
          const code = item.barcode || item.sku || item.id.slice(0, 8).toUpperCase();
          const oldPriceHtml =
            item.originalPrice && item.originalPrice > item.price
              ? `<span class="old-price">${Number(item.originalPrice).toFixed(0)}</span>`
              : '';
          return `<div class="sticker">
            ${customText ? `<div class="custom-line">${escapeHtml(customText)}</div>` : ''}
            <div class="prod-name">${escapeHtml(item.name)}</div>
            <div class="price-line">${oldPriceHtml}<span class="price">${Number(item.price).toFixed(2)} ${escapeHtml(currency || '')}</span></div>
            <div class="code-line">*${escapeHtml(code)}*</div>
          </div>`;
        })
        .join('');

      return `<div class="a4-page" style="grid-template-columns: repeat(${sheet.cols}, ${sheet.w}mm); grid-auto-rows: ${sheet.h}mm;">
        ${cellsHtml}
      </div>`;
    })
    .join('');

  win.document.write(`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Planche Étiquettes A4 — ${escapeHtml(sheet.label)}</title>
        <style>
          @page { size: A4 portrait; margin: 4mm; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #fff; }
          .a4-page {
            display: grid;
            justify-content: center;
            align-content: start;
            page-break-after: always;
            width: 202mm;
            min-height: 288mm;
          }
          .sticker {
            border: 0.5px dashed #cbd5e1;
            box-sizing: border-box;
            padding: 1.5mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            overflow: hidden;
          }
          .sticker.empty { border-color: transparent; }
          .custom-line { font-size: 7px; font-weight: 800; color: #475569; text-transform: uppercase; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .prod-name { font-size: 9px; font-weight: 800; color: #0f172a; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .price-line { display: flex; align-items: baseline; gap: 4px; }
          .old-price { font-size: 8px; color: #94a3b8; text-decoration: line-through; }
          .price { font-size: 13px; font-weight: 900; color: #000; }
          .code-line { font-family: monospace; font-size: 8px; font-weight: 700; letter-spacing: 1px; color: #334155; }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>`);
  win.document.close();
}
