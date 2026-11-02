import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { formatSafe } from '../../lib/utils';
import { AuditLog, CompanySettings, Transaction } from '../../types';
import { inferLogSeverity } from '../../hooks/useAuditLogsLogic';

interface AuditLogDetailsModalProps {
  viewingLog: AuditLog | null;
  onClose: () => void;
  transactions: Transaction[];
  settings: CompanySettings;
  onOpenCancelUndo: (log: AuditLog) => void;
}

export const AuditLogDetailsModal: React.FC<AuditLogDetailsModalProps> = ({
  viewingLog,
  onClose,
  transactions,
  settings,
  onOpenCancelUndo,
}) => {
  if (!viewingLog) return null;

  const logTime = new Date(viewingLog.timestamp || 0).getTime();
  const relatedTx = transactions.find(t => {
    const txTime = new Date(t.timestamp || (t as any).date || 0).getTime();
    return !isNaN(txTime) && !isNaN(logTime) && Math.abs(txTime - logTime) < 120000;
  });
  const sev = inferLogSeverity(viewingLog);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-left" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Fiche d'Investigation & Traçabilité Sécurité
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mt-0.5">
              {viewingLog.action || 'Action Système'}
            </h3>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              ID Événement : #{viewingLog.id} • {formatSafe(viewingLog.timestamp, 'dd/MM/yyyy à HH:mm:ss')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50">
            <p className="text-[10px] font-black uppercase text-slate-400">Opérateur</p>
            <p className="text-xs font-black text-slate-900 dark:text-white mt-1 truncate">{viewingLog.userName || 'Système'}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50">
            <p className="text-[10px] font-black uppercase text-slate-400">Module</p>
            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase">{viewingLog.module || 'POS'}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50">
            <p className="text-[10px] font-black uppercase text-slate-400">Niveau Criticité</p>
            <p className="text-xs font-black uppercase mt-1 text-amber-600 dark:text-amber-400">{sev}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50">
            <p className="text-[10px] font-black uppercase text-slate-400">Statut</p>
            <p className="text-xs font-black uppercase mt-1 text-emerald-600 dark:text-emerald-400">
              {(viewingLog as any).isCancelled ? 'ANNULÉ (ROLLBACK)' : 'ACTIF & VALIDÉ'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 border border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Détails complets de l'opération enregistrée :</p>
          <p className="leading-relaxed whitespace-pre-wrap break-words text-sm text-white font-bold">
            {String(viewingLog.details || 'Aucun détail supplémentaire')}
          </p>
        </div>

        {relatedTx && (
          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                🧾 Détail du Ticket / Transaction Associée (#{String(relatedTx.id).slice(-8)})
              </span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                Total : {Number(relatedTx.total || 0).toFixed(2)} {settings.currency} ({relatedTx.paymentMethod || 'Espèces'})
              </span>
            </div>
            {Array.isArray(relatedTx.items) && relatedTx.items.length > 0 && (
              <div className="max-h-40 overflow-y-auto divide-y divide-indigo-200/50 dark:divide-indigo-800/40 text-xs">
                {relatedTx.items.map((item: any, idx: number) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">{item.name || 'Article'}</span>
                    <span className="font-mono text-slate-600 dark:text-zinc-400">
                      {item.quantity || 1} x {Number(item.price || 0).toFixed(2)} {settings.currency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <button
            onClick={() => {
              const target = viewingLog;
              onClose();
              onOpenCancelUndo(target);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw size={14} /> {(viewingLog as any).isCancelled ? "Rétablir l'opération" : "Annuler l'opération (Rollback)"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
