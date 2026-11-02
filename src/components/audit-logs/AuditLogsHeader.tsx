import React from 'react';
import { Printer, FileSpreadsheet, Database } from 'lucide-react';
import { exportToExcel, exportToCSV, formatSafe, escapeHtml } from '../../lib/utils';
import { AuditLog, CompanySettings } from '../../types';
import { inferLogSeverity } from '../../hooks/useAuditLogsLogic';

interface AuditLogsHeaderProps {
  logsCount: number;
  filteredLogs: AuditLog[];
  settings: CompanySettings;
}

export const AuditLogsHeader: React.FC<AuditLogsHeaderProps> = ({
  logsCount,
  filteredLogs,
  settings,
}) => {
  const handlePrintAuditReport = () => {
    const win = window.open('', '_blank', 'width=1050,height=800');
    if (!win) return;
    const rowsHtml = filteredLogs
      .slice(0, 500)
      .map(
        (l, idx) => `
        <tr>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${idx + 1}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${formatSafe(l.timestamp, 'dd/MM/yyyy HH:mm:ss')}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;">${escapeHtml(inferLogSeverity(l).toUpperCase())}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;">${escapeHtml(l.userName || 'Système')}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${escapeHtml(l.action || '')}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${escapeHtml(l.module || '')}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${escapeHtml(l.details || '')}</td>
        </tr>`
      )
      .join('');

    win.document.write(`
      <html>
        <head>
          <title>Rapport Officiel des Journaux d'Audit — ${escapeHtml(settings.name || 'Nexus POS Pro')}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #1e293b; color: white; padding: 8px; font-size: 11px; text-align: left; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h2 style="margin:0;">RAPPORT D'INVESTIGATION & JOURNAUX D'AUDIT</h2>
          <p style="margin:4px 0 12px;font-size:12px;color:#475569;">
            Établissement : <strong>${escapeHtml(settings.name || 'Nexus POS Pro')}</strong> • Généré le ${new Date().toLocaleString('fr-FR')} • Total filtré : <strong>${filteredLogs.length}</strong> événement(s)
          </p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date & Heure</th>
                <th>Criticité</th>
                <th>Utilisateur</th>
                <th>Opération</th>
                <th>Module</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
      <div>
        <div className="flex items-center gap-2.5">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Journaux d'Audit & Investigation Sécurité
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {filteredLogs.length} / {logsCount} Événements
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Traçabilité intégrale multi-critères : opérations caisse, suppressions, modifications de prix, horaires tardifs et annulations (Rollback).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={handlePrintAuditReport}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all font-black uppercase text-[10px] tracking-wider border border-slate-200 dark:border-zinc-700 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-indigo-500" />
          Imprimer Rapport A4
        </button>
        <button
          onClick={() => exportToExcel(filteredLogs, 'audit_logs_filtres')}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all font-black uppercase text-[10px] tracking-wider shadow-sm cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Excel ({filteredLogs.length})
        </button>
        <button
          onClick={() => exportToCSV(filteredLogs, 'audit_logs_filtres')}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all font-black uppercase text-[10px] tracking-wider shadow-sm cursor-pointer"
        >
          <Database className="w-4 h-4" />
          Export CSV
        </button>
      </div>
    </div>
  );
};
