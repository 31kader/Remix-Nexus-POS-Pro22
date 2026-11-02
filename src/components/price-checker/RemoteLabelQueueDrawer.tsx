import React from 'react';
import { Plus, Minus, Trash2, CloudUpload, Printer } from 'lucide-react';
import { CompanySettings } from '../../types';
import { RemoteLabelQueueItem, persistQueueToCloud, clearRemoteLabelQueue, updateRemoteLabelQueueQuantity, removeFromRemoteLabelQueue } from '../../services/remoteLabelQueueService';
import { toast } from 'sonner';

interface RemoteLabelQueueDrawerProps {
  remoteQueue: RemoteLabelQueueItem[];
  setRemoteQueue: (q: RemoteLabelQueueItem[]) => void;
  totalLabelsInQueue: number;
  settings: CompanySettings;
  focusScannerInput: () => void;
  handlePrintQueueNow: () => void;
  handleOpenInLabelStudio: () => void;
}

export const RemoteLabelQueueDrawer: React.FC<RemoteLabelQueueDrawerProps> = ({
  remoteQueue,
  setRemoteQueue,
  totalLabelsInQueue,
  settings,
  focusScannerInput,
  handlePrintQueueNow,
  handleOpenInLabelStudio
}) => {
  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border-2 border-indigo-500/40 rounded-xl space-y-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
        <div>
          <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
            📡 File d'Étiquettes Synchronisée ({remoteQueue.length} article(s) • {totalLabelsInQueue} étiquette(s))
          </h4>
          <p className="text-[11px] text-slate-500">
            Envoyez au poste relié à l'imprimante ou imprimez directement.
          </p>
        </div>
        {remoteQueue.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async (e) => {
                e.currentTarget.blur();
                const ok = await persistQueueToCloud(remoteQueue);
                if (ok) {
                  toast.success(`✅ ${remoteQueue.length} article(s) envoyé(s) sur le Cloud ! Allez sur le PC relié à l'imprimante pour imprimer.`);
                } else {
                  toast.warning("File sauvegardée en local.");
                }
                focusScannerInput();
              }}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CloudUpload size={14} /> ☁️ Envoyer au Poste Imprimante
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                handlePrintQueueNow();
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer size={14} /> 🖨️ Imprimer sur cet appareil
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                handleOpenInLabelStudio();
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              🚀 Ouvrir Studio d'Étiquettes
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.currentTarget.blur();
                await clearRemoteLabelQueue();
                setRemoteQueue([]);
                toast.info("File d'impression distante vidée.");
                focusScannerInput();
              }}
              className="px-2.5 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={13} /> Vider
            </button>
          </div>
        )}
      </div>

      {remoteQueue.length > 0 && (
        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
          {remoteQueue.map(item => (
            <div key={item.productId} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0 text-left">
                <p className="text-xs font-black text-slate-800 dark:text-white truncate">{item.name}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black font-mono">
                  Prix: {Number(item.price || 0).toFixed(2)} {settings?.currency || 'DA'} • SKU: {item.sku}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.currentTarget.blur();
                    const next = Math.max(1, item.quantity - 1);
                    setRemoteQueue(await updateRemoteLabelQueueQuantity(item.productId, next));
                    focusScannerInput();
                  }}
                  className="p-1 bg-slate-100 dark:bg-zinc-800 rounded hover:bg-slate-200 cursor-pointer"
                >
                  <Minus size={12} />
                </button>
                <span className="text-xs font-black w-8 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.currentTarget.blur();
                    setRemoteQueue(await updateRemoteLabelQueueQuantity(item.productId, item.quantity + 1));
                    focusScannerInput();
                  }}
                  className="p-1 bg-slate-100 dark:bg-zinc-800 rounded hover:bg-slate-200 cursor-pointer"
                >
                  <Plus size={12} />
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.currentTarget.blur();
                    setRemoteQueue(await removeFromRemoteLabelQueue(item.productId));
                    focusScannerInput();
                  }}
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer ml-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
