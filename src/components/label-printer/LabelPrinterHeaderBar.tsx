import React from 'react';
import { Printer, CloudDownload } from 'lucide-react';
import { Button } from '../ui';
import { RemoteLabelQueueItem } from '../../services/remoteLabelQueueService';
import { QuickMentionsBar } from './QuickMentionsBar';

interface LabelPrinterHeaderBarProps {
  remoteQueue: RemoteLabelQueueItem[];
  remoteTotalLabels: number;
  handleImportRemoteQueue: (clearAfterImport?: boolean) => void;
  printMedium: 'thermal' | 'a4_sheet';
  setPrintMedium: (m: 'thermal' | 'a4_sheet') => void;
  labelPrinterType: 'receipt_printer' | 'dedicated_label_printer';
  handleSetLabelPrinterType: (t: 'receipt_printer' | 'dedicated_label_printer') => void;
  selectedProductsCount: number;
  clearAllSelected: () => void;
  handlePrint: () => void;
  itemsToPrintCount: number;
  selectedA4Sheet: string;
  setSelectedA4Sheet: (val: string) => void;
  startOffset: number;
  setStartOffset: (val: number) => void;
  packDate: string;
  setPackDate: (val: string) => void;
  expDate: string;
  setExpDate: (val: string) => void;
  applyQuickMention: (type: 'store' | 'dates' | 'promo') => void;
}

export const LabelPrinterHeaderBar: React.FC<LabelPrinterHeaderBarProps> = ({
  remoteQueue,
  remoteTotalLabels,
  handleImportRemoteQueue,
  printMedium,
  setPrintMedium,
  labelPrinterType,
  handleSetLabelPrinterType,
  selectedProductsCount,
  clearAllSelected,
  handlePrint,
  itemsToPrintCount,
  selectedA4Sheet,
  setSelectedA4Sheet,
  startOffset,
  setStartOffset,
  packDate,
  setPackDate,
  expDate,
  setExpDate,
  applyQuickMention
}) => {
  return (
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                onClick={() => handleSetLabelPrinterType('receipt_printer')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  labelPrinterType === 'receipt_printer'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
                title="Pour imprimer sur papier ticket 80mm de la caisse"
              >
                🧾 Imprimante Ticket Caisse (80mm)
              </button>
              <button
                type="button"
                onClick={() => handleSetLabelPrinterType('dedicated_label_printer')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  labelPrinterType === 'dedicated_label_printer'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
                title="Pour rouleau d'étiquettes autocollantes (IDIPOS / Xprinter / Zebra)"
              >
                🏷️ Étiqueteuse Dédiée (IDIPOS / Xprinter)
              </button>
            </div>
          )}

          {selectedProductsCount > 0 && (
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
            disabled={itemsToPrintCount === 0}
            className="bg-indigo-600 hover:bg-indigo-700 font-black disabled:opacity-50 text-white rounded-xl shadow-sm text-xs py-2.5 px-5 cursor-pointer"
          >
            <Printer size={15} className="mr-1.5 inline" />
            Imprimer {itemsToPrintCount} étiquette(s)
          </Button>
        </div>
      </div>

      <QuickMentionsBar
        printMedium={printMedium}
        selectedA4Sheet={selectedA4Sheet}
        setSelectedA4Sheet={setSelectedA4Sheet}
        startOffset={startOffset}
        setStartOffset={setStartOffset}
        packDate={packDate}
        setPackDate={setPackDate}
        expDate={expDate}
        setExpDate={setExpDate}
        applyQuickMention={applyQuickMention}
      />
    </div>
  );
};
