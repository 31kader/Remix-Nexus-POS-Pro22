import React from 'react';
import { cn } from '../../../lib/utils';
import { RefreshCw, FileSpreadsheet, Upload, AlertCircle, Brain, Clock, FileText, Table2, CheckCircle2 } from 'lucide-react';

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
  processFileOffline,
  simulateInvoiceScanning
}: PurchaseScanAreaProps) {
  const isImportMode = scanMethod === 'ocr';

  return (
    <div className="space-y-4">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept={isImportMode 
          ? ".csv,.xlsx,.xls,.tsv,.txt,.pdf" 
          : "image/*,application/pdf"
        }
        onChange={handleFileChange} 
      />
      
      <div 
        onClick={() => { if (!isScanning && !isOfflineScanning) fileInputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { 
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
          "border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer relative group",
          isOfflineScanning ? "border-emerald-500 bg-emerald-500/5" :
          isScanning ? "border-indigo-500 bg-indigo-500/5" : 
          isImportMode ? "border-emerald-500/40 bg-industrial-900/50 hover:border-emerald-400 hover:bg-industrial-800" :
          "border-industrial-700 bg-industrial-900/50 hover:border-indigo-500/40 hover:bg-industrial-800"
        )}
      >
        {isOfflineScanning ? (
          <div className="space-y-4 animate-fade-in">
            <RefreshCw className="w-16 h-16 text-emerald-400 mx-auto animate-spin" />
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Import en cours...</h3>
              <p className="text-sm text-emerald-400 font-mono font-black uppercase tracking-wider mt-1">{offlineScanProgress}</p>
            </div>
          </div>
        ) : isScanning ? (
          <div className="space-y-4">
            <RefreshCw className="w-16 h-16 text-indigo-500 mx-auto animate-spin" />
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Analyse IA en cours...</h3>
              <p className="text-sm text-industrial-500 font-mono">L'IA déchiffre votre facture</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={cn(
              "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border transition-transform group-hover:scale-110",
              isImportMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-industrial-800 border-industrial-700 text-industrial-400 group-hover:text-indigo-400"
            )}>
              {isImportMode ? (
                <FileSpreadsheet size={32} />
              ) : (
                <Upload size={32} />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                {isImportMode ? "Importer un Fichier (CSV / Excel / PDF)" : "Cliquez ou déposez votre facture (Image)"}
              </h3>
              <p className="text-sm text-industrial-500 uppercase tracking-widest text-[10px] mt-1">
                {isImportMode 
                  ? "Glissez-déposez ou cliquez • CSV, Excel (.xlsx), PDF • 100% Hors-ligne" 
                  : "Images (JPG, PNG) ou PDF supportés • Vision IA Gemini (Internet requis)"
                }
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
                    onClick={(e) => {
                      e.stopPropagation();
                      processFileOffline(file);
                    }}
                    className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 border border-emerald-400/20 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <FileSpreadsheet size={14} />
                    Ré-essayer en import fichier local
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl flex items-center gap-4">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            isImportMode ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
          )}>
            {isImportMode ? <Table2 size={22} /> : <Brain size={22} />}
          </div>
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">Méthode</p>
            <p className="text-sm font-black text-white uppercase">
              {isImportMode ? "Import Direct (CSV/Excel)" : "Vision IA Gemini Cloud"}
            </p>
          </div>
        </div>
        <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl flex items-center gap-4">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            isImportMode ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
          )}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">Précision</p>
            <p className="text-sm font-black text-white uppercase">
              {isImportMode ? "100% exact (données structurées)" : "Très élevée (IA multimodale)"}
            </p>
          </div>
        </div>
        <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl flex items-center gap-4">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            isImportMode ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
          )}>
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-industrial-500 uppercase tracking-widest">Connexion</p>
            <p className="text-sm font-black text-white uppercase">
              {isImportMode ? "Aucune (100% hors-ligne)" : "Internet requis"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
