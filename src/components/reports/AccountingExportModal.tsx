import React, { useState } from 'react';
import { Transaction, PurchaseOrder } from '../../types';
import { ScfExportService, ScfJournalEntry } from '../../services/accounting/scfExportService';
import { FileSpreadsheet, Download, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  purchases: PurchaseOrder[];
}

export const AccountingExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  transactions,
  purchases
}) => {
  if (!isOpen) return null;

  const [journalType, setJournalType] = useState<'all' | 'sales' | 'purchases'>('all');
  const [softwareTarget, setSoftwareTarget] = useState<'pc_compta' | 'dlg' | 'scf_csv'>('pc_compta');

  let entries: ScfJournalEntry[] = [];
  if (journalType === 'all' || journalType === 'sales') {
    entries = entries.concat(ScfExportService.generateSalesJournalEntries(transactions));
  }
  if (journalType === 'all' || journalType === 'purchases') {
    entries = entries.concat(ScfExportService.generatePurchasesJournalEntries(purchases));
  }

  const totalDebit = entries.reduce((acc, e) => acc + e.debit, 0);
  const totalCredit = entries.reduce((acc, e) => acc + e.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.05;

  const handleExport = () => {
    const today = new Date().toISOString().split('T')[0];
    if (softwareTarget === 'pc_compta') {
      const content = ScfExportService.exportPcComptaFormat(entries);
      ScfExportService.downloadFile(content, `PC_COMPTA_NEXUS_${today}.txt`, 'text/plain');
    } else {
      const content = ScfExportService.exportScfCsvFormat(entries);
      ScfExportService.downloadFile(content, `COMPTA_SCF_NEXUS_${today}.csv`, 'text/csv');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Export Comptable Algérie (SCF)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Génération des écritures PC Compta & DLG
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Journal à exporter</label>
              <select
                value={journalType}
                onChange={(e) => setJournalType(e.target.value as any)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold dark:text-white"
              >
                <option value="all">Tous (Ventes + Achats)</option>
                <option value="sales">Ventes Uniquement (VE)</option>
                <option value="purchases">Achats Uniquement (AC)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Logiciel Cible</label>
              <select
                value={softwareTarget}
                onChange={(e) => setSoftwareTarget(e.target.value as any)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold dark:text-white"
              >
                <option value="pc_compta">PC Compta (.txt)</option>
                <option value="dlg">DLG Compta (.csv)</option>
                <option value="scf_csv">Grand Livre SCF (.csv)</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Nombre d'écritures :</span>
              <span className="font-bold font-mono dark:text-white">{entries.length} lignes</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Total Débit :</span>
              <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">{totalDebit.toFixed(2)} DA</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Total Crédit :</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{totalCredit.toFixed(2)} DA</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Équilibre Comptable :</span>
              {isBalanced ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Parfaitement Équilibré (0.00 DA)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Écart : {Math.abs(totalDebit - totalCredit).toFixed(2)} DA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={entries.length === 0}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
          >
            <Download className="w-4 h-4" /> Exporter le Fichier
          </button>
        </div>
      </div>
    </div>
  );
};
