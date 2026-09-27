import React, { useState } from 'react';
import { cn } from '../../../lib/utils';
import {
  RefreshCw,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  Brain,
  Clock,
  Table2,
  CheckCircle2,
  Key,
  Camera
} from 'lucide-react';
import { getStoredAiVisionKey, setStoredAiVisionKey } from '../../../services/geminiService';
import { toast } from 'sonner';

interface PurchaseScanAreaProps {
  scanMethod: 'ai' | 'ocr';
  isScanning: boolean;
  isOfflineScanning: boolean;
  offlineScanProgress: string;
  error: string | null;
  showMockOption: boolean;
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  processFile: (file: File) => void;
  processFileOffline: (file: File) => void;
  simulateInvoiceScanning: () => void;
}

export function PurchaseScanArea({
  scanMethod,
  isScanning,
  isOfflineScanning,
  offlineScanProgress,
  error,
  showMockOption,
  file,
  fileInputRef,
  handleFileChange,
  processFile,
  processFileOffline
}: PurchaseScanAreaProps) {
  const isImportMode = scanMethod === 'ocr';
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getStoredAiVisionKey());
  const [showKeyConfig, setShowKeyConfig] = useState<boolean>(false);

  const activeKey = apiKeyInput.trim();
  const detectedProvider = activeKey.startsWith('gsk_')
    ? 'Groq Vision IA (Gratuit)'
    : activeKey.startsWith('sk-or-')
      ? 'OpenRouter Vision IA'
      : activeKey.startsWith('AIza')
        ? 'Google Gemini Vision'
        : 'OCR Local 100% Hors-Ligne (Sans Clé)';

  const handleSaveKey = () => {
    setStoredAiVisionKey(apiKeyInput);
    setShowKeyConfig(false);
    if (apiKeyInput.trim()) {
      toast.success(`Clé ${detectedProvider} enregistrée avec succès !`);
    } else {
      toast.info('Mode OCR Local 100% Hors-Ligne (sans clé API) activé par défaut.');
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={
          isImportMode
            ? '.csv,.xlsx,.xls,.tsv,.txt,.pdf,image/*'
            : 'image/*,application/pdf,.csv,.xlsx,.xls'
        }
        onChange={handleFileChange}
      />

      {!isImportMode && (
        <div className="p-3.5 bg-industrial-950/80 border border-industrial-800 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={12} /> Moteur actif : {detectedProvider}
              </span>
              <span className="text-[10px] text-industrial-400 font-medium">
                • Bascule automatique sur l&apos;OCR Local (11 177 produits) si hors-ligne ou sans clé
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-industrial-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Key size={12} className="text-amber-400" />
              {showKeyConfig ? 'Masquer Clé IA' : '🔑 Configurer Clé IA Gratuite (Groq / Gemini)'}
            </button>
          </div>

          {showKeyConfig && (
            <div className="p-3 bg-industrial-900 border border-industrial-800 rounded-xl space-y-2">
              <p className="text-[11px] text-industrial-300 leading-relaxed">
                💡 <strong>Astuce Algérie (100% Gratuit sans Carte Bancaire)</strong> : Créez une clé gratuite sur{' '}
                <span className="text-emerald-400 font-mono font-bold">console.groq.com</span> (commence par{' '}
                <code className="text-amber-300">gsk_...</code>) pour lire les factures en 1,2s, ou collez une clé Gemini (<code className="text-indigo-300">AIza...</code>). Si laissé vide, l&apos;application utilise automatiquement le <strong>Moteur OCR Local Hors-Ligne</strong>.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="Collez votre clé gsk_... (Groq Gratuit) ou AIza... (Gemini) — ou laissez vide pour OCR Local"
                  className="flex-1 bg-industrial-950 border border-industrial-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        onClick={() => {
          if (!isScanning && !isOfflineScanning) fileInputRef.current?.click();
        }}
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={e => {
          e.preventDefault();
          e.stopPropagation();
          if (isScanning || isOfflineScanning) return;
          const droppedFile = e.dataTransfer.files?.[0];
          if (droppedFile) {
            if (scanMethod === 'ai') {
              processFile(droppedFile);
            } else {
              processFileOffline(droppedFile);
            }
          }
        }}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative group',
          isOfflineScanning
            ? 'border-emerald-500 bg-emerald-500/5'
            : isScanning
              ? 'border-violet-500 bg-violet-500/5'
              : isImportMode
                ? 'border-emerald-500/40 bg-industrial-900/50 hover:border-emerald-400 hover:bg-industrial-800'
                : 'border-violet-500/40 bg-industrial-900/50 hover:border-violet-400 hover:bg-industrial-800'
        )}
      >
        {isOfflineScanning ? (
          <div className="space-y-4 animate-fade-in">
            <RefreshCw className="w-16 h-16 text-emerald-400 mx-auto animate-spin" />
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Lecture OCR & Correspondance Catalogue...
              </h3>
              <p className="text-sm text-emerald-400 font-mono font-black uppercase tracking-wider mt-1">
                {offlineScanProgress}
              </p>
            </div>
          </div>
        ) : isScanning ? (
          <div className="space-y-4">
            <RefreshCw className="w-16 h-16 text-violet-500 mx-auto animate-spin" />
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Analyse de la photo en cours...
              </h3>
              <p className="text-sm text-industrial-400 font-mono">
                Extraction des lignes articles ({detectedProvider})
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={cn(
                'w-20 h-20 rounded-xl flex items-center justify-center mx-auto border transition-transform group-hover:scale-110',
                isImportMode
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-violet-500/10 border-violet-500/30 text-violet-400'
              )}
            >
              {isImportMode ? <FileSpreadsheet size={32} /> : <Upload size={32} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                {isImportMode
                  ? 'Importer un Fichier (Excel, CSV, PDF) ou Photo OCR'
                  : 'Cliquez ou déposez la Photo de votre Facture / Bon de Livraison'}
              </h3>
              <p className="text-sm text-industrial-400 uppercase tracking-widest text-[10px] mt-1">
                {isImportMode
                  ? 'CSV, Excel (.xlsx), PDF ou Photo • 100% Hors-ligne + Matching Catalogue'
                  : 'Photos (JPG, PNG, WebP) supportées • Groq Vision / Gemini IA + Bascule automatique OCR Local Hors-Ligne'}
              </p>
            </div>
            {error && (
              <div className="mt-4 flex flex-col items-center gap-3 w-full">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 justify-center text-rose-500 text-[10px] font-black uppercase text-center w-full max-w-xl">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
                {showMockOption && file && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      processFileOffline(file);
                    }}
                    className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 border border-emerald-400/20 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <FileSpreadsheet size={14} />
                    Forcer la lecture en OCR Local Hors-Ligne
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-xl flex items-center gap-4">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              isImportMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'
            )}
          >
            {isImportMode ? <Table2 size={22} /> : <Brain size={22} />}
          </div>
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">Méthode</p>
            <p className="text-sm font-black text-white uppercase">
              {isImportMode ? 'Import Direct (Excel/CSV/OCR)' : detectedProvider}
            </p>
          </div>
        </div>
        <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-xl flex items-center gap-4">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              isImportMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'
            )}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">Catalogue</p>
            <p className="text-sm font-black text-white uppercase">Relié à vos 11 177 Produits</p>
          </div>
        </div>
        <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-xl flex items-center gap-4">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              isImportMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'
            )}
          >
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">Résilience</p>
            <p className="text-sm font-black text-white uppercase">Bascule OCR Local Auto</p>
          </div>
        </div>
      </div>
    </div>
  );
}
