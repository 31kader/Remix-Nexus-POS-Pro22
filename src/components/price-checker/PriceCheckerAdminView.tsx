import React from 'react';
import { 
  Search, Camera, Printer, CloudUpload, Sparkles, Monitor
} from 'lucide-react';
import { Product, CompanySettings, Category, Brand } from '../../types';
import { cn } from '../../lib/utils';
import { Modal } from '../ui';
import { RemoteLabelQueueItem } from '../../services/remoteLabelQueueService';
import { RemoteLabelQueueDrawer } from './RemoteLabelQueueDrawer';
import { ScannedProductPriceCard } from './ScannedProductPriceCard';

interface PriceCheckerAdminViewProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: CompanySettings;
  categories: Category[];
  brands: Brand[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  foundProduct: Product | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  focusScannerInput: () => void;
  executeProductLookup: (term: string, isFromEnterOrScanner?: boolean) => boolean;
  isScanning: boolean;
  setIsScanning: (s: boolean) => void;
  cameraError: string | null;
  toggleKioskMode: (enabled: boolean) => void;
  autoQueueOnScan: boolean;
  setAutoQueueOnScan: (val: boolean) => void;
  labelQty: number;
  setLabelQty: (q: number) => void;
  remoteQueue: RemoteLabelQueueItem[];
  setRemoteQueue: (q: RemoteLabelQueueItem[]) => void;
  totalLabelsInQueue: number;
  showQueueDrawer: boolean;
  setShowQueueDrawer: (val: boolean) => void;
  handleAddToRemoteQueue: (prod: Product, qty?: number, isDiscreet?: boolean) => Promise<void>;
  handlePrintQueueNow: () => void;
  handleOpenInLabelStudio: () => void;
}

export const PriceCheckerAdminView: React.FC<PriceCheckerAdminViewProps> = ({
  isOpen,
  onClose,
  settings,
  searchTerm,
  setSearchTerm,
  foundProduct,
  inputRef,
  focusScannerInput,
  executeProductLookup,
  isScanning,
  setIsScanning,
  cameraError,
  toggleKioskMode,
  autoQueueOnScan,
  setAutoQueueOnScan,
  labelQty,
  setLabelQty,
  remoteQueue,
  setRemoteQueue,
  totalLabelsInQueue,
  showQueueDrawer,
  setShowQueueDrawer,
  handleAddToRemoteQueue,
  handlePrintQueueNow,
  handleOpenInLabelStudio
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vérificateur de Prix & Gestion Rayon"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Bandeau d'information & Bascule Borne Kiosque Plein Écran */}
        <div className="p-3.5 bg-gradient-to-r from-indigo-900/80 via-slate-900 to-indigo-950 border border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Monitor size={18} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide">Mode Gestion Rayon (Staff)</p>
              <p className="text-[11px] text-indigo-200">Verrouille le poste en plein écran avec sécurité PIN pour les clients en rayon.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleKioskMode(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
          >
            <Sparkles size={14} /> 🖥️ Activer Plein Écran Borne
          </button>
        </div>

        {/* 1. Champ de Scan Code-Barres */}
        <form onSubmit={(e) => { e.preventDefault(); if (searchTerm.trim()) executeProductLookup(searchTerm, true); }} className="relative group flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input
              ref={inputRef}
              id="price-checker-input"
              type="text"
              placeholder="Bipez un code-barres avec la douchette ou tapez le nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-zinc-900 border-2 border-indigo-500/50 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-black text-lg text-slate-900 dark:text-white"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                if (searchTerm.trim()) executeProductLookup(searchTerm, true);
                focusScannerInput();
              }}
              className="px-5 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Vérifier Prix
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setIsScanning(!isScanning);
                focusScannerInput();
              }}
              className={`p-4 rounded-xl border transition-colors flex items-center justify-center cursor-pointer ${isScanning ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-100'}`}
              title={isScanning ? "Arrêter la caméra" : "Activer la caméra"}
            >
              <Camera size={22} />
            </button>
          </div>
        </form>

        {/* 2. Affichage Produit Scanné en Mode Gestion */}
        {foundProduct && (
          <ScannedProductPriceCard
            foundProduct={foundProduct}
            settings={settings}
            labelQty={labelQty}
            handleAddToRemoteQueue={handleAddToRemoteQueue}
          />
        )}

        {/* 3. Barre d'outils : Collecte d'Étiquettes & Impression */}
        <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setAutoQueueOnScan(!autoQueueOnScan);
                focusScannerInput();
              }}
              className={cn(
                "px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border",
                autoQueueOnScan
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                  : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-zinc-700"
              )}
            >
              <CloudUpload size={15} />
              {autoQueueOnScan ? "⚡ Auto-Enregistrement Scan : ACTIF" : "Auto-Enregistrer au Scan (Rayon)"}
            </button>

            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
              <span className="text-[10px] font-black text-slate-500 uppercase">Qté étiq/scan :</span>
              {[1, 2, 5].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setLabelQty(q);
                    focusScannerInput();
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-black cursor-pointer",
                    labelQty === q ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  )}
                >
                  x{q}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {remoteQueue.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handlePrintQueueNow();
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={15} />
                🖨️ Imprimer ({totalLabelsInQueue})
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setShowQueueDrawer(!showQueueDrawer);
                focusScannerInput();
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Printer size={15} />
              File d'Impression ({remoteQueue.length} art. / {totalLabelsInQueue} étiq.)
            </button>
          </div>
        </div>

        {/* 4. Liste des articles enregistrés (Tiroir) */}
        {showQueueDrawer && (
          <RemoteLabelQueueDrawer
            remoteQueue={remoteQueue}
            setRemoteQueue={setRemoteQueue}
            totalLabelsInQueue={totalLabelsInQueue}
            settings={settings}
            focusScannerInput={focusScannerInput}
            handlePrintQueueNow={handlePrintQueueNow}
            handleOpenInLabelStudio={handleOpenInLabelStudio}
          />
        )}

        {isScanning && !cameraError && (
          <div className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border-2 border-indigo-500 bg-black aspect-video flex items-center justify-center">
            <video id="camera-reader-price" className="w-full h-full object-cover"></video>
          </div>
        )}
      </div>
    </Modal>
  );
};
