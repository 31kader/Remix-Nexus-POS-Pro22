import React from 'react';
import { AuditLog, CompanySettings, Product, Transaction } from '../types';
import { Card, ConfirmDialog } from './ui';
import { Search, FileSpreadsheet, Database } from 'lucide-react';
import { exportToExcel, exportToCSV } from '../lib/utils';
import { EditLogModal } from './audit-logs/EditLogModal';
import { UndoLogModal } from './audit-logs/UndoLogModal';
import { AuditLogsTable } from './audit-logs/AuditLogsTable';
import { useAuditLogsLogic } from './useAuditLogsLogic';

interface AuditLogsProps {
  logs: AuditLog[];
  settings: CompanySettings;
  products?: Product[];
  transactions?: Transaction[];
}

export function AuditLogs({ logs = [], settings, products = [], transactions = [] }: AuditLogsProps) {
  const {
    searchTerm,
    setSearchTerm,
    moduleFilter,
    setModuleFilter,
    editingLog,
    setEditingLog,
    editUserName,
    setEditUserName,
    editAction,
    setEditAction,
    editModule,
    setEditModule,
    editDetails,
    setEditDetails,
    editSeverity,
    setEditSeverity,
    deletingLog,
    setDeletingLog,
    cancellingLog,
    setCancellingLog,
    undoTransactionDetails,
    shouldRestoreStock,
    setShouldRestoreStock,
    isProcessingUndo,
    filteredLogs,
    modules,
    handleOpenEdit,
    handleSaveEdit,
    handleDeleteConfirm,
    handleOpenCancelUndo,
    handleConfirmCancelUndo
  } = useAuditLogsLogic(logs, products, transactions);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight uppercase">Journaux d'Audit</h3>
          <p className="text-sm text-industrial-500">Suivi des actions et de la sécurité</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToExcel(logs, 'audit_logs')}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => exportToCSV(logs, 'audit_logs')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20"
          >
            <Database className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      <Card className="p-0 industrial-card overflow-hidden">
        <div className="p-6 bg-industrial-800/50 border-b border-industrial-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-industrial-500" size={18} />
              <input
                type="text"
                placeholder="RECHERCHER..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-industrial-700 bg-industrial-900 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="p-3 rounded-xl border border-industrial-700 bg-industrial-900 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <option value="all">TOUS LES MODULES</option>
              {modules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <AuditLogsTable
          filteredLogs={filteredLogs}
          handleOpenCancelUndo={handleOpenCancelUndo}
          handleOpenEdit={handleOpenEdit}
          setDeletingLog={setDeletingLog}
        />
      </Card>

      {/* MODAL: Modifier le Log */}
      <EditLogModal
        editingLog={editingLog}
        setEditingLog={setEditingLog}
        editUserName={editUserName}
        setEditUserName={setEditUserName}
        editModule={editModule}
        setEditModule={setEditModule}
        editAction={editAction}
        setEditAction={setEditAction}
        editDetails={editDetails}
        setEditDetails={setEditDetails}
        editSeverity={editSeverity}
        setEditSeverity={setEditSeverity}
        handleSaveEdit={handleSaveEdit}
      />

      {/* CONFIRM: Deleting Log */}
      <ConfirmDialog 
        isOpen={!!deletingLog} 
        onClose={() => setDeletingLog(null)} 
        onConfirm={handleDeleteConfirm}
        title="Supprimer Entrée Journal"
        message={`Voulez-vous vraiment supprimer définitivement cet enregistrement du journal d'audit de ${deletingLog?.userName} (${deletingLog?.action}) ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Conserver"
        variant="danger"
      />

      {/* MODAL: Cancel / Undo / Revert Action */}
      <UndoLogModal
        cancellingLog={cancellingLog}
        setCancellingLog={setCancellingLog}
        undoTransactionDetails={undoTransactionDetails}
        settings={settings}
        shouldRestoreStock={shouldRestoreStock}
        setShouldRestoreStock={setShouldRestoreStock}
        isProcessingUndo={isProcessingUndo}
        handleConfirmCancelUndo={handleConfirmCancelUndo}
      />
    </div>
  );
}
