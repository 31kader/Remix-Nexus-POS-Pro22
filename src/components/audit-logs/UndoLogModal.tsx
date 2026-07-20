import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../ui';
import { AuditLog, Transaction, CompanySettings } from '../../types';
import { formatSafe } from '../../lib/utils';

interface UndoLogModalProps {
  cancellingLog: AuditLog | null;
  setCancellingLog: (log: AuditLog | null) => void;
  undoTransactionDetails: Transaction | null;
  settings: CompanySettings;
  shouldRestoreStock: boolean;
  setShouldRestoreStock: (v: boolean) => void;
  isProcessingUndo: boolean;
  handleConfirmCancelUndo: () => void;
}

export function UndoLogModal({
  cancellingLog,
  setCancellingLog,
  undoTransactionDetails,
  settings,
  shouldRestoreStock,
  setShouldRestoreStock,
  isProcessingUndo,
  handleConfirmCancelUndo
}: UndoLogModalProps) {
  return (
    <Modal 
      isOpen={!!cancellingLog} 
      onClose={() => setCancellingLog(null)} 
      title={cancellingLog && (cancellingLog as any).isCancelled ? "Restaurer l'action" : "Annuler l'action"}
    >
      <div className="space-y-6 text-left">
        <div className="flex items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-black text-amber-500 uppercase tracking-wider">
              {cancellingLog && (cancellingLog as any).isCancelled ? "Restaurer cette opération" : "Confirmer l'annulation de l'opération"}
            </h4>
            <p className="text-xs text-industrial-400 mt-1">
              Le système va tenter de marquer cette ligne comme annulée et d'automatiser le rollback associé si la transaction d'origine est identifiée.
            </p>
          </div>
        </div>

        <div className="font-mono bg-industrial-950 p-4 rounded-xl border border-industrial-800 text-xs text-industrial-400 space-y-1">
          <p><span className="font-black text-white">Utilisateur:</span> {cancellingLog?.userName}</p>
          <p><span className="font-black text-white">Action:</span> {cancellingLog?.action}</p>
          <p><span className="font-black text-white">Date:</span> {cancellingLog ? formatSafe(cancellingLog.timestamp, 'dd/MM/yyyy HH:mm:s') : ''}</p>
          <p className="border-t border-industrial-800 pt-1.5 mt-1.5">
            <span className="font-black text-white">Détails:</span> {cancellingLog?.details}
          </p>
        </div>

        {/* If the system found a related transaction, show details of rollback option */}
        {undoTransactionDetails ? (
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                Transaction Associée Trouvée
              </span>
              <span className="font-mono text-xs font-black text-white">#{undoTransactionDetails.id.slice(-8).toUpperCase()}</span>
            </div>
            <p className="text-xs text-industrial-400">
              Une transaction de <strong className="text-white">{undoTransactionDetails.total.toFixed(2)} {settings.currency}</strong> émise le {formatSafe(undoTransactionDetails.timestamp || (undoTransactionDetails as any).date, 'dd/MM/yyyy HH:mm')} correspond à cette action.
            </p>

            <div className="border-t border-indigo-500/10 pt-3 flex items-center gap-3">
              <input 
                type="checkbox" 
                id="restore-stock"
                checked={shouldRestoreStock}
                onChange={e => setShouldRestoreStock(e.target.checked)}
                className="w-4 h-4 rounded border-industrial-700 bg-industrial-900 text-indigo-600 focus:ring-0 focus:ring-offset-0"
              />
              <label htmlFor="restore-stock" className="text-xs text-industrial-300 font-semibold cursor-pointer select-none">
                {cancellingLog && (cancellingLog as any).isCancelled 
                  ? "Soustraire à nouveau les stocks d'articles vendus"
                  : "Restaurer automatiquement les stocks des articles vendus"
                }
              </label>
            </div>

            <div className="text-[10px] text-industrial-500 leading-relaxed italic">
              {cancellingLog && (cancellingLog as any).isCancelled
                ? "Note: La transaction sera réactivée et marquée comme finalisée."
                : "Note: La transaction sera automatiquement mise en statut \"Retournée/Remboursée\" dans votre base."
              }
            </div>
          </div>
        ) : (
          <div className="p-4 bg-industrial-900 text-industrial-500 rounded-2xl border border-industrial-800 text-xs italic">
            Aucune transaction POS correspondante trouvée automatiquement. L'annulation marquera simplement l'événement comme "ANNULÉ" visuellement sans restaurer de stock physique.
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button onClick={() => setCancellingLog(null)} variant="secondary" disabled={isProcessingUndo}>
            Conserver Tel Quel
          </Button>
          <Button 
            onClick={handleConfirmCancelUndo} 
            variant={cancellingLog && (cancellingLog as any).isCancelled ? "success" : "danger"}
            disabled={isProcessingUndo}
          >
            {isProcessingUndo ? "Traitement..." : cancellingLog && (cancellingLog as any).isCancelled ? "Rétablir Opération" : "Annuler Opération"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
