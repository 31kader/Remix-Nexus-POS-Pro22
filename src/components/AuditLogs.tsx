import React from 'react';
import { AuditLog, CompanySettings, Product, Transaction } from '../types';
import { ConfirmDialog } from './ui';
import { useAuditLogsLogic } from '../hooks/useAuditLogsLogic';
import { 
  AuditLogsHeader, 
  AuditLogsKpis, 
  AuditLogsFilterPanel, 
  AuditLogsTable, 
  AuditLogDetailsModal, 
  EditLogModal, 
  UndoLogModal 
} from './audit-logs';

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
    userFilter,
    setUserFilter,
    severityFilter,
    setSeverityFilter,
    actionCategoryFilter,
    setActionCategoryFilter,
    statusFilter,
    setStatusFilter,
    periodFilter,
    setPeriodFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    shiftHourFilter,
    setShiftHourFilter,
    minAmountFilter,
    setMinAmountFilter,
    sortBy,
    setSortBy,
    resetAllFilters,
    stats,
    usersList,
    viewingLog,
    setViewingLog,
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

  const hasActiveFilters =
    searchTerm !== '' ||
    moduleFilter !== 'all' ||
    userFilter !== 'all' ||
    severityFilter !== 'all' ||
    actionCategoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    periodFilter !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    shiftHourFilter !== 'all' ||
    minAmountFilter !== '' ||
    sortBy !== 'newest';

  return (
    <div className="space-y-6 text-left">
      {/* Header + Actions d'Export et Impression */}
      <AuditLogsHeader
        logsCount={logs.length}
        filteredLogs={filteredLogs}
        settings={settings}
      />

      {/* 5 Cartes KPIs Interactives Cliquables */}
      <AuditLogsKpis
        stats={stats}
        hasActiveFilters={hasActiveFilters}
        severityFilter={severityFilter}
        actionCategoryFilter={actionCategoryFilter}
        shiftHourFilter={shiftHourFilter}
        statusFilter={statusFilter}
        resetAllFilters={resetAllFilters}
        setSeverityFilter={setSeverityFilter}
        setActionCategoryFilter={setActionCategoryFilter}
        setShiftHourFilter={setShiftHourFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* Panneau de Filtrage Avancé & Table */}
      <div className="space-y-4">
        <AuditLogsFilterPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          periodFilter={periodFilter}
          setPeriodFilter={setPeriodFilter}
          userFilter={userFilter}
          setUserFilter={setUserFilter}
          usersList={usersList}
          actionCategoryFilter={actionCategoryFilter}
          setActionCategoryFilter={setActionCategoryFilter}
          moduleFilter={moduleFilter}
          setModuleFilter={setModuleFilter}
          modules={modules}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          shiftHourFilter={shiftHourFilter}
          setShiftHourFilter={setShiftHourFilter}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          minAmountFilter={minAmountFilter}
          setMinAmountFilter={setMinAmountFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          hasActiveFilters={hasActiveFilters}
          resetAllFilters={resetAllFilters}
          filteredLogsCount={filteredLogs.length}
          currency={settings.currency || 'DA'}
        />

        <AuditLogsTable
          filteredLogs={filteredLogs}
          setViewingLog={setViewingLog}
          handleOpenCancelUndo={handleOpenCancelUndo}
          handleOpenEdit={handleOpenEdit}
          setDeletingLog={setDeletingLog}
        />
      </div>

      {/* MODAL: Consulter les détails complets de l'action d'audit */}
      <AuditLogDetailsModal
        viewingLog={viewingLog}
        onClose={() => setViewingLog(null)}
        transactions={transactions}
        settings={settings}
        onOpenCancelUndo={handleOpenCancelUndo}
      />

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
