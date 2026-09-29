import React, { useState, useEffect } from 'react';
import { Printer, Grid, Calendar, Store, Tag, Sparkles, CloudDownload, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { Button } from './ui';
import Barcode from 'react-barcode';
import { printLabels } from '../services/printService';
import { LabelPrinterProps } from './label-printer/types';
import { useLabelPrinter } from './label-printer/useLabelPrinter';
import { ProductSelectionPanel } from './label-printer/ProductSelectionPanel';
import { SettingsPanel } from './label-printer/SettingsPanel';
import { LabelSimulator } from './label-printer/LabelSimulator';
import { toast } from 'sonner';
import {
  RemoteLabelQueueItem,
  fetchRemoteLabelQueue,
  clearRemoteLabelQueue,
  subscribeToRemoteLabelQueue
} from '../services/remoteLabelQueueService';

export * from './label-printer/types';

export const SingleLabel = ({ product, currency }: { product: Product; currency?: string }) => {
  return (
    <div
      style={{
        width: '40mm',
        height: '30mm',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#fff',
        padding: '0',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#000',
        fontFamily: 'Arial, sans-serif',
        breakAfter: 'page',
        pageBreakAfter: 'always',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        margin: 0
      }}
    >
      <div
        style={{
          width: '30mm',
          height: '40mm',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          WebkitTransform: 'translate(-50%, -50%) rotate(90deg)',
          padding: '2mm',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff'
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%'
          }}
        >
          {product.name}
        </div>

        <div
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: '2mm',
            marginBottom: '2mm'
          }}
        >
          {product.price.toFixed(2)} {currency || 'DA'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden', width: '100%' }}>
          <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
            <Barcode
              value={product.sku || product.id.substring(0, 6).toUpperCase()}
              format="CODE128"
              width={1.2}
              height={30}
              margin={0}
              displayValue={true}
              fontSize={12}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const getCommonStyles = () => `
  @media print {
    @page { 
      size: 40mm 30mm;
      margin: 0;
    }
    html, body { 
      margin: 0 !important; 
      padding: 0 !important; 
      width: 40mm !important;
      height: auto !important;
      overflow: visible !important;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

const A4_STICKER_SHEETS = [
  { id: 'a4-65', label: 'Planche A4 — 65 étiq. (38.1 × 21.2 mm)', cols: 5, rows: 13, w: 38.1, h: 21.2 },
  { id: 'a4-40', label: 'Planche A4 — 40 étiq. (52.5 × 29.7 mm)', cols: 4, rows: 10, w: 52.5, h: 29.7 },
  { id: 'a4-24', label: 'Planche A4 — 24 étiq. (70 × 37 mm)', cols: 3, rows: 8, w: 70, h: 37 },
  { id: 'a4-16', label: 'Planche A4 Gondole — 16 étiq. (99 × 34 mm)', cols: 2, rows: 8, w: 99, h: 34 }
];

export function LabelPrinter({ products, settings, initialSelectedProductIds = [] }: LabelPrinterProps) {
  const {
    stateContext,
    selectedProducts,
    filteredProducts,
    addProduct,
    deleteProductFromList,
    updateQuantity,
    setExactQuantity,
    updateCustomPrice,
    syncQuantitiesWithStock,
    clearAllSelected,
    itemsToPrint,
    previewProduct,
    handlePresetChange,
    handlePaddingBaseChange
  } = useLabelPrinter(products, initialSelectedProductIds);

  // High-value Pro Additions: Thermal Roll vs A4 Sticker Sheet + Start Offset + Quick Mentions
  const [printMedium, setPrintMedium] = useState<'thermal' | 'a4_sheet'>('thermal');
  const [labelPrinterType, setLabelPrinterType] = useState<'receipt_printer' | 'dedicated_label_printer'>('receipt_printer');
  const [selectedA4Sheet, setSelectedA4Sheet] = useState('a4-40');
  const [startOffset, setStartOffset] = useState(1); // 1-indexed cell offset to reuse partially used A4 sticker sheets
  const [packDate, setPackDate] = useState('');
  const [expDate, setExpDate] = useState('');
  const [remoteQueue, setRemoteQueue] = useState<RemoteLabelQueueItem[]>([]);

  useEffect(() => {
    fetchRemoteLabelQueue().then(setRemoteQueue).catch(() => {});
    const unsub = subscribeToRemoteLabelQueue(setRemoteQueue);
    return () => unsub();
  }, []);

  const handleImportRemoteQueue = async (clearAfterImport: boolean = true) => {
    const queue = await fetchRemoteLabelQueue();
    if (!queue || queue.length === 0) {
      toast.info('Aucun article en attente dans la file du Vérificateur de Prix.');
      return;
    }

    let importedCount = 0;
    queue.forEach(item => {
      const found = (products || []).find(p => p && p.id === item.productId) ||
                    (products || []).find(p => p && p.sku === item.sku);
      if (found) {
        addProduct(found);
        setExactQuantity(found.id, Math.max(1, item.quantity || 1));
        importedCount++;
      }
    });

    if (clearAfterImport) {
      await clearRemoteLabelQueue();
      setRemoteQueue([]);
    }

    toast.success(`${importedCount} article(s) importé(s) depuis le Vérificateur de Prix avec leurs quantités !`);
  };

  useEffect(() => {
    if (sessionStorage.getItem('nexus_auto_import_remote_labels') === 'true' && products && products.length > 0) {
      sessionStorage.removeItem('nexus_auto_import_remote_labels');
      handleImportRemoteQueue(false);
    }
  }, [products]);

  const applyQuickMention = (type: 'store' | 'dates' | 'promo') => {
    if (type === 'store') {
      stateContext.setCustomText(settings.name || 'MAGASIN');
    } else if (type === 'dates') {
      const today = packDate || new Date().toLocaleDateString('fr-FR');
      const exp = expDate || 'Voir emballage';
      stateContext.setCustomText(`FAB: ${today} | EXP: ${exp}`);
    } else if (type === 'promo') {
      stateContext.setCustomText('🔥 OFFRE SPÉCIALE PROMO 🔥');
    }
    toast.success('Mention ajoutée sur le modèle d’étiquette !');
  };

  // Print on A4 Sticker Sheet (65 / 40 / 24 / 16 labels per page with startOffset!)
  const handlePrintA4StickerSheet = () => {
    if (itemsToPrint.length === 0) {
      toast.error('Ajoutez au moins un article à imprimer.');
      return;
    }
    const sheet = A4_STICKER_SHEETS.find(s => s.id === selectedA4Sheet) || A4_STICKER_SHEETS[1];
    const currency = settings.currency || 'DA';
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
              ${stateContext.customText ? `<div class="custom-line">${stateContext.customText}</div>` : ''}
              <div class="prod-name">${item.name}</div>
              <div class="price-line">${oldPriceHtml}<span class="price">${Number(item.price).toFixed(2)} ${currency}</span></div>
              <div class="code-line">*${code}*</div>
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
          <title>Planche Étiquettes A4 — ${sheet.label}</title>
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
  };

  const handlePrint = async () => {
    if (printMedium === 'a4_sheet') {
      handlePrintA4StickerSheet();
      return;
    }

    const dynamicSettings = {
      ...settings,
      labelPrinterType,
      labelTemplate: 'custom',
      labelWidthCustom: stateContext.customWidth,
      labelHeightCustom: stateContext.customHeight,
      labelOrientation: stateContext.customOrientation,
      labelRotation: stateContext.customRotation,

      customShowName: stateContext.showName,
      customShowPrice: stateContext.showPrice,
      customShowBarcode: stateContext.showBarcode,
      customShowQr: stateContext.showQr,
      customShowImage: stateContext.showImage,
      customText: stateContext.customText,
      customBorder: stateContext.showBorder,

      customNameSize: stateContext.nameFontSize,
      customPriceSize: stateContext.priceFontSize,
      customTextSize: stateContext.customTextSize,
      customBarcodeHeight: stateContext.barcodeHeight,
      customPadding: stateContext.customPadding,
      customPaddingTop: stateContext.paddingTop,
      customPaddingBottom: stateContext.paddingBottom,
      customPaddingLeft: stateContext.paddingLeft,
      customPaddingRight: stateContext.paddingRight,
      customLayoutStructure: stateContext.layoutStructure,
      customAlignment: stateContext.contentAlignment,
      customTextAlign: stateContext.customTextAlign,
      customTextBold: stateContext.customTextBold,
      customTextItalic: stateContext.customTextItalic,

      customBarcodeWidth: stateContext.barcodeWidth,
      customGap: stateContext.customGap,
      nameLineClamp: stateContext.nameLineClamp,
      customLetterSpacing: stateContext.customLetterSpacing
    };
    await printLabels(itemsToPrint, dynamicSettings as any);
  };

  const remoteTotalLabels = remoteQueue.reduce((acc, i) => acc + (i.quantity || 1), 0);

  const handlePrintRemoteQueueDirect = async () => {
    const queue = await fetchRemoteLabelQueue();
    if (!queue || queue.length === 0) {
      toast.info('Aucun article en attente dans la file Cloud.');
      return;
    }
    const expanded: Product[] = [];
    queue.forEach(item => {
      const found = (products || []).find(p => p && String(p.id) === String(item.productId)) ||
                    (products || []).find(p => p && p.sku === item.sku) || ({
                      id: item.productId,
                      name: item.name,
                      sku: item.sku,
                      barcode: item.barcode,
                      price: item.price,
                      unit: item.unit || 'pcs',
                      stock: 1,
                      categoryId: 'uncategorized'
                    } as Product);
      const count = Math.max(1, Number(item.quantity) || 1);
      for (let i = 0; i < count; i++) {
        expanded.push(found);
      }
    });

    await printLabels(expanded, {
      ...settings,
      labelPrinterType
    } as any);
    await clearRemoteLabelQueue();
    setRemoteQueue([]);
    toast.success(`Impression lancée (${expanded.length} étiquette(s)) et file Cloud vidée !`);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Bannière Cloud Multi-Postes (Appareil sans imprimante -> Poste avec imprimante) */}
      {remoteQueue.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 border-2 border-emerald-500/60 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shrink-0">
              <CloudDownload size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-slate-950">
                  ☁️ File Synchronisée Multi-Postes Active
                </span>
                <span className="text-xs font-bold text-emerald-200">
                  Reçue depuis un autre appareil (Vérificateur de Prix / Mobile / Rayon)
                </span>
              </div>
              <h3 className="text-base md:text-lg font-black text-white mt-1">
                {remoteQueue.length} article(s) ({remoteTotalLabels} étiquette(s)) prêt(s) à imprimer sur ce poste
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={handlePrintRemoteQueueDirect}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Printer size={16} />
              🖨️ Imprimer Directement & Vider ({remoteTotalLabels} étiq.)
            </button>
            <button
              type="button"
              onClick={() => handleImportRemoteQueue(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <CloudDownload size={15} />
              📥 Importer dans l'Éditeur
            </button>
          </div>
        </div>
      )}

      {/* Header + Mode Selector */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <Printer className="text-indigo-600 dark:text-indigo-400" size={24} />
                Studio de Création d'Étiquettes (Thermique & Planche A4)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ⚡ Mode Recherche Rapide
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Imprimez sur rouleau ticket de caisse 80mm (anti-rotation 20cm), étiqueteuse dédiée ou planche A4 autocollante.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Bouton d'importation de la file d'attente du Vérificateur de Prix (Multi-Postes) */}
            <button
              type="button"
              onClick={() => handleImportRemoteQueue(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer border ${
                remoteQueue.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm animate-pulse'
                  : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
              }`}
              title="Charger les articles scannés depuis le Vérificateur de Prix (autre poste ou mobile)"
            >
              <CloudDownload size={15} />
              Importer File Vérificateur ({remoteQueue.length} art. / {remoteTotalLabels} étiq.)
            </button>

            <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setPrintMedium('thermal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  printMedium === 'thermal'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
              >
                🖨️ Rouleau Thermique
              </button>
              <button
                type="button"
                onClick={() => setPrintMedium('a4_sheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  printMedium === 'a4_sheet'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
              >
                📄 Planche A4 Autocollante
              </button>
            </div>

            {printMedium === 'thermal' && (
              <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setLabelPrinterType('receipt_printer')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    labelPrinterType === 'receipt_printer'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                  title="Empêche le pilote d'imprimante de ticket de caisse 80mm de tourner en Paysage (20cm)"
                >
                  🧾 Imprimante Ticket Caisse (80mm Anti-20cm)
                </button>
                <button
                  type="button"
                  onClick={() => setLabelPrinterType('dedicated_label_printer')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    labelPrinterType === 'dedicated_label_printer'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                  title="Pour imprimante d'étiquettes autocollantes dédiée (Zebra / Xprinter XP-365B)"
                >
                  🏷️ Étiqueteuse Dédiée
                </button>
              </div>
            )}

            {selectedProducts.length > 0 && (
              <Button
                onClick={clearAllSelected}
                variant="secondary"
                className="font-bold px-3 py-2 text-xs rounded-xl"
              >
                Vider la file
              </Button>
            )}

            <Button
              onClick={handlePrint}
              disabled={itemsToPrint.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 font-black disabled:opacity-50 text-white rounded-xl shadow-sm text-xs py-2.5 px-5"
            >
              <Printer size={15} className="mr-1.5 inline" />
              Imprimer {itemsToPrint.length} étiquette(s)
            </Button>
          </div>
        </div>

        {/* High-Value Quick Tools Bar: A4 Sticker Sheet Config + Dates FAB/EXP & Store Mentions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
          {printMedium === 'a4_sheet' ? (
            <div className="lg:col-span-7 flex flex-wrap items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300">
                  Format de la Planche A4 Autocollante
                </label>
                <select
                  value={selectedA4Sheet}
                  onChange={e => setSelectedA4Sheet(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {A4_STICKER_SHEETS.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-44">
                <label className="block text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300">
                  Commencer à la case N°
                </label>
                <input
                  type="number"
                  min={1}
                  max={65}
                  value={startOffset}
                  onChange={e => setStartOffset(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-black text-slate-900 dark:text-white"
                  title="Permet de réutiliser une feuille A4 dont les premières étiquettes ont déjà été décollées"
                />
              </div>
            </div>
          ) : (
            <div className="lg:col-span-7 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400 mr-1">
                Ajouts Rapides :
              </span>
              <button
                type="button"
                onClick={() => applyQuickMention('store')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Store size={13} /> + Nom du Magasin
              </button>
              <button
                type="button"
                onClick={() => applyQuickMention('promo')}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Tag size={13} /> + Bandeau PROMO
              </button>
            </div>
          )}

          {/* FAB / EXP Date Stamp Generator for Repackaged Goods */}
          <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={packDate}
              onChange={e => setPackDate(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white"
              title="Date d'emballage (FAB)"
            />
            <input
              type="date"
              value={expDate}
              onChange={e => setExpDate(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white"
              title="Date d'expiration (EXP)"
            />
            <button
              type="button"
              onClick={() => applyQuickMention('dates')}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
            >
              <Calendar size={13} /> Appliquer FAB/EXP
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Studio Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ProductSelectionPanel
          state={stateContext}
          filteredProducts={filteredProducts}
          selectedProducts={selectedProducts}
          products={products}
          itemsToPrint={itemsToPrint}
          addProduct={addProduct}
          deleteProductFromList={deleteProductFromList}
          updateQuantity={updateQuantity}
          setExactQuantity={setExactQuantity}
          updateCustomPrice={updateCustomPrice}
          syncQuantitiesWithStock={syncQuantitiesWithStock}
          currency={settings.currency || 'DA'}
        />

        <SettingsPanel
          state={stateContext}
          handlePresetChange={handlePresetChange}
          handlePaddingBaseChange={handlePaddingBaseChange}
        />

        <LabelSimulator
          state={stateContext}
          previewProduct={previewProduct}
          settings={settings}
        />
      </div>
    </div>
  );
}
