import { useState } from 'react';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { AuditLog, Product, Transaction } from '../types';

export function useAuditLogsLogic(logs: AuditLog[] = [], products: Product[] = [], transactions: Transaction[] = []) {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  // Modal State for Editing Log
  const [editingLog, setEditingLog] = useState<AuditLog | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editAction, setEditAction] = useState('');
  const [editModule, setEditModule] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editSeverity, setEditSeverity] = useState<'info' | 'warning' | 'high' | 'critical'>('info');

  // Modal State for Deleting Log
  const [deletingLog, setDeletingLog] = useState<AuditLog | null>(null);

  // Modal State for Cancelling/Undoing Log Action
  const [cancellingLog, setCancellingLog] = useState<AuditLog | null>(null);
  const [undoTransactionDetails, setUndoTransactionDetails] = useState<Transaction | null>(null);
  const [shouldRestoreStock, setShouldRestoreStock] = useState(true);
  const [isProcessingUndo, setIsProcessingUndo] = useState(false);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (!log) return false;
    
    const searchLow = (searchTerm || '').toLowerCase();
    
    const matchesSearch = 
      (log.userName || '').toLowerCase().includes(searchLow) ||
      (log.action || '').toLowerCase().includes(searchLow) ||
      (log.details || '').toLowerCase().includes(searchLow);
    
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    
    return matchesSearch && matchesModule;
  });

  const modules = Array.from(new Set(logs.map(l => l.module)));

  // Open Edit Modal
  const handleOpenEdit = (log: AuditLog) => {
    setEditingLog(log);
    setEditUserName(log.userName || '');
    setEditAction(log.action || '');
    setEditModule(log.module || '');
    setEditDetails(log.details || '');
    setEditSeverity(log.severity || 'info');
  };

  // Save edited log fields to Supabase
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
    } catch (e) {
      console.error("Failed to delete audit log:", e);
    }
  };

  // Detect and analyze matching transaction when undoing a log
  const handleOpenCancelUndo = (log: AuditLog) => {
    setCancellingLog(log);
    setUndoTransactionDetails(null);
    setShouldRestoreStock(true);

    // Try to find a transaction related to this action
    let foundTx: Transaction | null = null;

    if (log.action.toLowerCase().includes('vente') || log.module.toLowerCase() === 'pos' || log.module.toLowerCase() === 'vente') {
      const logTime = new Date(log.timestamp).getTime();
      
      const candidates = transactions.filter(tx => {
        const txTime = new Date(tx.timestamp || (tx as any).date).getTime();
        const diffMinutes = Math.abs(txTime - logTime) / (60 * 1000);
        return diffMinutes < 30; // Closer than 30 minutes
      });

      if (candidates.length > 0) {
        const priceMatch = log.details.match(/\d+([.,]\d+)?/);
        if (priceMatch) {
          const expectedTotal = parseFloat(priceMatch[0].replace(',', '.'));
          const exactPriceMatch = candidates.find(tx => Math.abs(tx.total - expectedTotal) < 0.1);
          if (exactPriceMatch) {
            foundTx = exactPriceMatch;
          } else {
            foundTx = candidates[0];
          }
        } else {
          foundTx = candidates[0];
        }
      }
    }

    setUndoTransactionDetails(foundTx);
  };

  // Confirm undo / cancellation of action
  const handleConfirmCancelUndo = async () => {
    if (!cancellingLog) return;
    setIsProcessingUndo(true);

    try {
      const isCurrentlyCancelled = (cancellingLog as any).isCancelled;
      
      if (!isCurrentlyCancelled) {
        // 1. Mark the log itself as cancelled
        await localDb.update(`auditLogs/${cancellingLog.id}`, {
          isCancelled: true,
          cancelledAt: new Date().toISOString(),
          details: `[ANNULÉ] ${cancellingLog.details}`
        });

        // 2. Perform derived physical rollback if selected
        if (undoTransactionDetails) {
          await localDb.update(`transactions/${undoTransactionDetails.id}`, {
            status: 'returned',
            auditStatus: 'verified'
          });

          if (shouldRestoreStock && undoTransactionDetails.items) {
            for (const item of undoTransactionDetails.items) {
              const matchedProd = products.find(p => p.id === item.id);
              if (matchedProd) {
                enqueueStockAdjustment(matchedProd.id, item.quantity || 1);
                localDb.update(`products/${matchedProd.id}`, { updatedAt: new Date().toISOString() });
              }
            }
          }
        }
      } else {
        // Restore/Un-cancel
        await localDb.update(`auditLogs/${cancellingLog.id}`, {
          isCancelled: false,
          cancelledAt: null,
          details: cancellingLog.details.replace('[ANNULÉ] ', '')
        });
        
        if (undoTransactionDetails) {
          await localDb.update(`transactions/${undoTransactionDetails.id}`, {
            status: 'completed'
          });

          if (shouldRestoreStock && undoTransactionDetails.items) {
            for (const item of undoTransactionDetails.items) {
              const matchedProd = products.find(p => p.id === item.id);
              if (matchedProd) {
                enqueueStockAdjustment(matchedProd.id, -(item.quantity || 1));
                localDb.update(`products/${matchedProd.id}`, { updatedAt: new Date().toISOString() });
              }
            }
          }
        }
      }

      setCancellingLog(null);
    } catch (e: any) {
      console.error("Action cancellation failed:", e);
      alert("Erreur lors de l'annulation: " + e.message);
    } finally {
      setIsProcessingUndo(false);
    }
  };

  return {
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
  };
}
