import React from 'react';
import { CloudDownload, Printer } from 'lucide-react';
import { RemoteLabelQueueItem } from '../../services/remoteLabelQueueService';

export interface RemoteLabelQueueBannerProps {
  remoteQueue: RemoteLabelQueueItem[];
  remoteTotalLabels: number;
  onPrintDirect: () => void;
  onImportToEditor: () => void;
}

export function RemoteLabelQueueBanner({
  remoteQueue,
  remoteTotalLabels,
  onPrintDirect,
  onImportToEditor
}: RemoteLabelQueueBannerProps) {
  if (remoteQueue.length === 0) return null;

  return (
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
          onClick={onPrintDirect}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <Printer size={16} />
          🖨️ Imprimer Directement & Vider ({remoteTotalLabels} étiq.)
        </button>
        <button
          type="button"
          onClick={onImportToEditor}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <CloudDownload size={15} />
          📥 Importer dans l'Éditeur
        </button>
      </div>
    </div>
  );
}
