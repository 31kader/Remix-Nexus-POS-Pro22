import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { localDb } from '../services/LocalDatabase';
import { AuditLog, Product, Transaction } from '../types';
import { 
  AuditPeriodFilter, 
  AuditActionCategory, 
  AuditShiftHourFilter, 
  AuditSortBy, 
  SEVERITY_RANK,
  inferLogSeverity, 
  inferActionCategory, 
  extractAmountFromLog, 
  formatAuditDetails,
  useAuditRollback 
} from './audit';

// Ré-exports rétrocompatibles des types et utilitaires purs
export type {
  AuditPeriodFilter,
  AuditActionCategory,
  AuditShiftHourFilter,
  AuditSortBy,
};
export {
  inferLogSeverity,
  inferActionCategory,
  extractAmountFromLog,
  formatAuditDetails,
};

export function useAuditLogsLogic(logs: AuditLog[] = [], products: Product[] = [], transactions: Transaction[] = []) {
  // 11 Filtres Combinables
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionCategoryFilter, setActionCategoryFilter] = useState<AuditActionCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [periodFilter, setPeriodFilter] = useState<AuditPeriodFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shiftHourFilter, setShiftHourFilter] = useState<AuditShiftHourFilter>('all');
  const [minAmountFilter, setMinAmountFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<AuditSortBy>('newest');

  // Modal State for Inspecting Full Details of Log Action
  const [viewingLog, setViewingLog] = useState<AuditLog | null>(null);

  // Modal State for Editing Log
  const [editingLog, setEditingLog] = useState<AuditLog | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editAction, setEditAction] = useState('');
  const [editModule, setEditModule] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editSeverity, setEditSeverity] = useState<'info' | 'warning' | 'high' | 'critical'>('info');

  // Modal State for Deleting Log
  const [deletingLog, setDeletingLog] = useState<AuditLog | null>(null);

  // Hook d'annulation et Rollback
  const {
    cancellingLog,
    setCancellingLog,
    undoTransactionDetails,
    shouldRestoreStock,
    setShouldRestoreStock,
    isProcessingUndo,
    handleOpenCancelUndo,
    handleConfirmCancelUndo,
  } = useAuditRollback(products, transactions);

  const resetAllFilters = () => {
    setSearchTerm('');
    setModuleFilter('all');
    setUserFilter('all');
    setSeverityFilter('all');
    setActionCategoryFilter('all');
    setStatusFilter('all');
    setPeriodFilter('all');
    setStartDate('');
    setEndDate('');
    setShiftHourFilter('all');
    setMinAmountFilter('');
    setSortBy('newest');
  };

  const modules = useMemo(
    () => Array.from(new Set(logs.map(l => l?.module).filter(Boolean))).sort(),
    [logs]
  );

  const usersList = useMemo(
    () => Array.from(new Set(logs.map(l => l?.userName).filter(Boolean))).sort(),
    [logs]
  );

  const stats = useMemo(() => {
    let criticalCount = 0;
    let deletionsAndPriceCount = 0;
    let nightOpsCount = 0;
    let cancelledCount = 0;

    for (const log of logs) {
      if (!log) continue;
      const sev = inferLogSeverity(log);
      const cat = inferActionCategory(log);
      if (sev === 'critical' || sev === 'high') criticalCount++;
      if (cat === 'deletions' || cat === 'price_discount') deletionsAndPriceCount++;
      if ((log as any).isCancelled) cancelledCount++;
      const d = new Date(log.timestamp);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        if (h >= 22 || h < 6) nightOpsCount++;
      }
    }

    return {
      total: logs.length,
      criticalCount,
      deletionsAndPriceCount,
      nightOpsCount,
      cancelledCount
    };
  }, [logs]);

  // Filter & Sort logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const sevenDaysAgo = todayStart - 7 * 86400000;
    const thirtyDaysAgo = todayStart - 30 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
    const minAmt = minAmountFilter ? parseFloat(minAmountFilter) : 0;
    const searchLow = (searchTerm || '').trim().toLowerCase();

    const enrichedLogs = logs.map(log => {
      if (!log) return log;
      return {
        ...log,
        details: formatAuditDetails(log, transactions)
      };
    });

    const result = enrichedLogs.filter(log => {
      if (!log) return false;

      // 1. Search
      if (searchLow) {
        const haystack = `${log.userName || ''} ${log.action || ''} ${log.details || ''} ${log.module || ''} ${log.id || ''}`.toLowerCase();
        if (!haystack.includes(searchLow)) return false;
      }

      // 2. Module
      if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;

      // 3. User
      if (userFilter !== 'all' && log.userName !== userFilter) return false;

      // 4. Severity
      const sev = inferLogSeverity(log);
      if (severityFilter !== 'all' && sev !== severityFilter) return false;

      // 5. Action Category
      const cat = inferActionCategory(log);
      if (actionCategoryFilter !== 'all' && cat !== actionCategoryFilter) return false;

      // 6. Status (Active vs Rollback/Cancelled)
      const isCancelled = Boolean((log as any).isCancelled);
      if (statusFilter === 'active' && isCancelled) return false;
      if (statusFilter === 'cancelled' && !isCancelled) return false;

      // 7. Timestamp / Period / Custom Date / Shift Hour
      const logDate = new Date(log.timestamp);
      const logMs = logDate.getTime();

      if (!isNaN(logMs)) {
        if (periodFilter === 'today' && logMs < todayStart) return false;
        if (periodFilter === 'yesterday' && (logMs < yesterdayStart || logMs >= todayStart)) return false;
        if (periodFilter === '7d' && logMs < sevenDaysAgo) return false;
        if (periodFilter === '30d' && logMs < thirtyDaysAgo) return false;
        if (periodFilter === 'month' && logMs < monthStart) return false;

        if (startMs && logMs < startMs) return false;
        if (endMs && logMs > endMs) return false;

        if (shiftHourFilter !== 'all') {
          const hour = logDate.getHours();
          if (shiftHourFilter === 'morning' && (hour < 6 || hour >= 14)) return false;
          if (shiftHourFilter === 'afternoon' && (hour < 14 || hour >= 22)) return false;
          if (shiftHourFilter === 'night' && (hour >= 6 && hour < 22)) return false;
        }
      }

      // 8. Minimum Amount
      if (minAmt > 0) {
        const amt = extractAmountFromLog(log);
        if (amt < minAmt) return false;
      }

      return true;
    });

    // 9. Sort
    return result.sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      if (sortBy === 'severity_desc') {
        const diff = (SEVERITY_RANK[inferLogSeverity(b)] || 0) - (SEVERITY_RANK[inferLogSeverity(a)] || 0);
        if (diff !== 0) return diff;
      }
      if (sortBy === 'user_asc') {
        return (a.userName || '').localeCompare(b.userName || '');
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [
    logs,
    searchTerm,
    moduleFilter,
    userFilter,
    severityFilter,
    actionCategoryFilter,
    statusFilter,
    periodFilter,
    startDate,
    endDate,
    shiftHourFilter,
    minAmountFilter,
    sortBy,
    transactions
  ]);

  // Open Edit Modal
  const handleOpenEdit = (log: AuditLog) => {
    setEditingLog(log);
    setEditUserName(log.userName || '');
    setEditAction(log.action || '');
    setEditModule(log.module || '');
    setEditDetails(log.details || '');
    setEditSeverity(inferLogSeverity(log));
  };

  // Save edited log fields
  const handleSaveEdit = async () => {
    if (!editingLog) return;
    try {
      await localDb.update(`auditLogs/${editingLog.id}`, {
        userName: editUserName,
        action: editAction,
        module: editModule,
        details: editDetails,
        severity: editSeverity,
        updatedAt: new Date().toISOString()
      });
      setEditingLog(null);
      toast.success("Journal d'audit mis à jour.");
    } catch (e) {
      console.error("Failed to update audit log:", e);
    }
  };

  // Handle Log Deletion
  const handleDeleteConfirm = async () => {
    if (!deletingLog) return;
    try {
      await localDb.delete(`auditLogs/${deletingLog.id}`);
      setDeletingLog(null);
      toast.success("Entrée supprimée du journal d'audit.");
    } catch (e) {
      console.error("Failed to delete audit log:", e);
    }
  };

  return {
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
  };
}
