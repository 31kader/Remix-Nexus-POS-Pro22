import React, { useMemo } from 'react';
import { RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { AuditLog } from '../../types';
import { formatSafe } from '../../lib/utils';
import { List } from 'react-window';

interface AuditLogsTableProps {
  filteredLogs: AuditLog[];
  handleOpenCancelUndo: (log: AuditLog) => void;
  handleOpenEdit: (log: AuditLog) => void;
  setDeletingLog: (log: AuditLog) => void;
}

export function AuditLogsTable({
  filteredLogs,
  handleOpenCancelUndo,
  handleOpenEdit,
  setDeletingLog
}: AuditLogsTableProps) {
  if (filteredLogs.length === 0) {
    return (
      <div className="p-12 text-center text-industrial-600 italic font-mono text-sm">
        AUCUN JOURNAL D'AUDIT TROUVÉ.
      </div>
    );
  }

  // react-window v2 requires a rowComponent (not children render function)
  // and rowProps must be an object (not undefined) or Object.values() crashes.
  const AuditRow = useMemo(() => {
    return function AuditRowInner({ index, style, ...rest }: any) {
      const log = filteredLogs[index];
      if (!log) return null;
      const isCancelled = (log as any).isCancelled;
      return (
        <div 
          style={style} 
          className={`flex w-full items-center hover:bg-industrial-800/30 transition-colors border-b border-industrial-800 ${isCancelled ? 'opacity-40 bg-rose-950/5' : ''}`}
        >
          <div className="w-1/5 p-4 text-xs font-mono text-industrial-400 truncate">
            <div>{formatSafe(log.timestamp, 'dd/MM/yyyy HH:mm:ss')}</div>
            {isCancelled && (
              <span className="inline-block mt-0.5 px-1 py-0.5 bg-rose-500/20 text-rose-400 text-[7px] font-black rounded uppercase tracking-widest border border-rose-500/20">
                ANNULÉ / ROLLBACK
              </span>
            )}
          </div>
          <div className={`w-1/6 p-4 font-black text-white truncate ${isCancelled ? 'line-through decoration-rose-500' : ''}`}>
            {log.userName}
          </div>
          <div className="w-1/6 p-4 truncate">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
              isCancelled 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 line-through' 
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              {log.action}
            </span>
          </div>
          <div className="w-1/8 p-4 text-xs font-bold text-industrial-500 truncate">
            {log.module}
          </div>
          <div className={`w-1/4 p-4 text-xs text-industrial-400 truncate font-mono ${isCancelled ? 'line-through text-industrial-600' : ''}`} title={log.details}>
            {log.details}
          </div>
          <div className="w-1/12 p-4 text-right flex items-center justify-end gap-1 pr-6">
            <button
              onClick={() => handleOpenCancelUndo(log)}
              title={isCancelled ? "Rétablir cette action" : "Annuler l'action"}
              className={`p-1.5 rounded-lg transition-all ${
                isCancelled 
                  ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
              }`}
            >
              <RotateCcw size={13} className={isCancelled ? "rotate-180" : ""} />
            </button>

            <button
              onClick={() => handleOpenEdit(log)}
              title="Modifier les détails de la log"
              className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
            >
              <Pencil size={13} />
            </button>

            <button
              onClick={() => setDeletingLog(log)}
              title="Supprimer définitivement l'entrée"
              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-50/20 border border-rose-500/20 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      );
    };
  }, [filteredLogs, handleOpenCancelUndo, handleOpenEdit, setDeletingLog]);

  return (
    <div className="overflow-hidden text-[13px] w-full">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
          <thead>
            <tr className="bg-industrial-950 border-b border-industrial-800 flex w-full">
              <th className="w-1/5 p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest">Date / Statut</th>
              <th className="w-1/6 p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest">Utilisateur</th>
              <th className="w-1/6 p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest">Action</th>
              <th className="w-1/8 p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest">Module</th>
              <th className="w-1/4 p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest">Détails</th>
              <th className="w-1/12 p-4 text-[10px] font-black text-industrial-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
        </table>

        <List
          rowCount={filteredLogs.length}
          rowHeight={65}
          rowComponent={AuditRow}
          rowProps={{}}
          className="min-w-[800px]"
        />
      </div>
    </div>
  );
}
