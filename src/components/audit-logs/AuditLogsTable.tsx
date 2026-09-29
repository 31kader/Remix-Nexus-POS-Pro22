import React, { useMemo } from 'react';
import { RotateCcw, Pencil, Trash2, ShieldAlert, AlertTriangle, Info, Eye } from 'lucide-react';
import { AuditLog } from '../../types';
import { formatSafe, cn } from '../../lib/utils';
import { List } from 'react-window';
import { inferLogSeverity } from '../../hooks/useAuditLogsLogic';

interface AuditLogsTableProps {
  filteredLogs: AuditLog[];
  setViewingLog?: (log: AuditLog) => void;
  handleOpenCancelUndo: (log: AuditLog) => void;
  handleOpenEdit: (log: AuditLog) => void;
  setDeletingLog: (log: AuditLog) => void;
}

export function AuditLogsTable({
  filteredLogs,
  setViewingLog,
  handleOpenCancelUndo,
  handleOpenEdit,
  setDeletingLog
}: AuditLogsTableProps) {
  if (filteredLogs.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-zinc-400 font-bold text-sm">
        Aucun enregistrement d'audit ne correspond aux filtres sélectionnés.
      </div>
    );
  }

  const AuditRow = useMemo(() => {
    return function AuditRowInner({ index, style }: any) {
      const log = filteredLogs[index];
      if (!log) return null;
      const isCancelled = Boolean((log as any).isCancelled);
      const sev = inferLogSeverity(log);

      const sevBadge = {
        critical: { label: 'CRITIQUE', cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', icon: ShieldAlert },
        high: { label: 'ÉLEVÉ', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', icon: AlertTriangle },
        warning: { label: 'ATTENTION', cls: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30', icon: AlertTriangle },
        info: { label: 'INFO', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', icon: Info },
      }[sev];

      const SevIcon = sevBadge.icon;

      return (
        <div
          style={style}
          onClick={() => setViewingLog && setViewingLog(log)}
          className={cn(
            "flex w-full items-center hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors border-b border-slate-100 dark:border-zinc-800/70 cursor-pointer",
            isCancelled && "opacity-60 bg-rose-500/5"
          )}
        >
          <div className="w-[18%] px-4 py-2 text-xs font-mono text-slate-600 dark:text-zinc-400 truncate">
            <div className="font-bold text-slate-800 dark:text-zinc-200">{formatSafe(log.timestamp, 'dd/MM/yyyy HH:mm:ss')}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border", sevBadge.cls)}>
                <SevIcon size={10} />
                {sevBadge.label}
              </span>
              {isCancelled && (
                <span className="inline-block px-1.5 py-0.5 bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[8px] font-black rounded uppercase border border-rose-500/30">
                  ANNULÉ
                </span>
              )}
            </div>
          </div>

          <div className={cn("w-[15%] px-4 py-2 font-black text-slate-900 dark:text-white truncate text-xs", isCancelled && "line-through decoration-rose-500")}>
            {log.userName || 'Système'}
          </div>

          <div className="w-[16%] px-4 py-2 truncate">
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border inline-block max-w-full truncate",
                isCancelled
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 line-through"
                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
              )}
            >
              {log.action}
            </span>
          </div>

          <div className="w-[11%] px-4 py-2 text-xs font-bold text-slate-500 dark:text-zinc-400 truncate uppercase">
            {log.module || 'POS'}
          </div>

          <div
            className={cn(
              "w-[28%] px-4 py-2 text-xs text-slate-700 dark:text-zinc-300 truncate font-mono",
              isCancelled && "line-through text-slate-400"
            )}
            title={String(log.details || '')}
          >
            {String(log.details || '')}
          </div>

          <div className="w-[12%] px-4 py-2 text-right flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setViewingLog && setViewingLog(log)}
              title="Consulter les détails complets de l'action"
              className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition-all cursor-pointer"
            >
              <Eye size={13} />
            </button>

            <button
              onClick={() => handleOpenCancelUndo(log)}
              title={isCancelled ? "Rétablir cette action" : "Annuler l'action (Rollback)"}
              className={cn(
                "p-1.5 rounded-lg transition-all cursor-pointer",
                isCancelled
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
              )}
            >
              <RotateCcw size={13} className={isCancelled ? "rotate-180" : ""} />
            </button>

            <button
              onClick={() => handleOpenEdit(log)}
              title="Modifier les détails du journal"
              className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer"
            >
              <Pencil size={13} />
            </button>

            <button
              onClick={() => setDeletingLog(log)}
              title="Supprimer définitivement l'entrée"
              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      );
    };
  }, [filteredLogs, setViewingLog, handleOpenCancelUndo, handleOpenEdit, setDeletingLog]);

  return (
    <div className="overflow-hidden text-[13px] w-full">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
          <thead>
            <tr className="bg-slate-100 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex w-full">
              <th className="w-[18%] px-4 py-3 text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Date & Criticité</th>
              <th className="w-[15%] px-4 py-3 text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Utilisateur</th>
              <th className="w-[17%] px-4 py-3 text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Opération</th>
              <th className="w-[12%] px-4 py-3 text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Module</th>
              <th className="w-[28%] px-4 py-3 text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Détails & Valeurs</th>
              <th className="w-[10%] px-4 py-3 text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
        </table>

        <List
          rowCount={filteredLogs.length}
          rowHeight={68}
          rowComponent={AuditRow}
          rowProps={{}}
          style={{ height: Math.min(620, Math.max(280, filteredLogs.length * 68)) }}
          className="min-w-[900px]"
        />
      </div>
    </div>
  );
}
