import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { enqueueStockAdjustment, enqueueCustomerBalanceAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { usePeopleStore } from '../store/usePeopleStore';
import { AuditLog, Product, Transaction } from '../types';

export type AuditPeriodFilter = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';
export type AuditActionCategory = 'all' | 'sales' | 'stock' | 'price_discount' | 'deletions' | 'returns_undo' | 'auth_security' | 'finance';
export type AuditShiftHourFilter = 'all' | 'morning' | 'afternoon' | 'night';
export type AuditSortBy = 'newest' | 'oldest' | 'severity_desc' | 'user_asc';

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  warning: 2,
  info: 1,
};

export function inferLogSeverity(log: AuditLog): 'info' | 'warning' | 'high' | 'critical' {
  if (log.severity && ['info', 'warning', 'high', 'critical'].includes(log.severity)) {
    return log.severity;
  }
  const text = `${log.action || ''} ${log.details || ''}`.toLowerCase();
  if (text.includes('suppr') || text.includes('delete') || text.includes('purge') || text.includes('annul') || (log as any).isCancelled) {
    return 'critical';
  }
  if (text.includes('prix') || text.includes('remise') || text.includes('marge') || text.includes('retour') || text.includes('ajustement')) {
    return 'high';
  }
  if (text.includes('modif') || text.includes('edit') || text.includes('dépense') || text.includes('ouverture')) {
    return 'warning';
  }
  return 'info';
}

export function inferActionCategory(log: AuditLog): AuditActionCategory {
  const act = `${log.action || ''} ${log.module || ''} ${log.details || ''}`.toLowerCase();
  if (act.includes('suppr') || act.includes('delete') || act.includes('purge') || act.includes('vider')) return 'deletions';
  if (act.includes('retour') || act.includes('annul') || act.includes('rollback') || (log as any).isCancelled) return 'returns_undo';
  if (act.includes('prix') || act.includes('remise') || act.includes('discount') || act.includes('tarif') || act.includes('marge')) return 'price_discount';
  if (act.includes('stock') || act.includes('inventaire') || act.includes('produit') || act.includes('article') || act.includes('audit')) return 'stock';
  if (act.includes('login') || act.includes('connexion') || act.includes('auth') || act.includes('mot de passe') || act.includes('pin') || act.includes('sécurité')) return 'auth_security';
  if (act.includes('dépense') || act.includes('caisse') || act.includes('clôture') || act.includes('fournisseur') || act.includes('versement')) return 'finance';
  if (act.includes('vente') || act.includes('pos') || act.includes('ticket') || act.includes('encaissement')) return 'sales';
  return 'sales';
}

export function extractAmountFromLog(log: AuditLog): number {
  const details = String(log.details || '');
  const match = details.match(/(\d[\d\s]*([.,]\d+)?)\s*(DA|DZD)/i) || details.match(/(\d{3,}([.,]\d+)?)/);
  if (!match) return 0;
  const cleaned = match[1].replace(/\s+/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatAuditDetails(log: AuditLog, transactions: Transaction[] = []): string {
  const raw: any = log?.details;
  let str = '';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed !== '' && trimmed !== '[]' && trimmed !== '{}' && trimmed !== 'null') {
      str = trimmed;
    }
  } else if (Array.isArray(raw) && raw.length > 0) {
    str = raw.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' • ');
  } else if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
    str = JSON.stringify(raw);
  }

  if (str) return str;

  // Enrichissement automatique si details était vide/[] sur d'anciens logs
  const act = String(log?.action || 'Opération').trim();
  const mod = String(log?.module || 'POS').trim();
  const usr = String(log?.userName || 'Opérateur').trim();
  const logTime = new Date(log?.timestamp || 0).getTime();

  if (act.toLowerCase().includes('vente') && !isNaN(logTime) && transactions.length > 0) {
    const matchedTx = transactions.find(t => {
      const txTime = new Date(t.timestamp || (t as any).date || 0).getTime();
      return !isNaN(txTime) && Math.abs(txTime - logTime) < 120000;
    });
    if (matchedTx) {
      const itemsCount = Array.isArray(matchedTx.items) ? matchedTx.items.reduce((s, i) => s + (Number(i.quantity) || 1), 0) : 0;
      const itemNames = Array.isArray(matchedTx.items) ? matchedTx.items.slice(0, 3).map(i => `${i.name} (x${i.quantity || 1})`).join(', ') : '';
      return `Ticket #${String(matchedTx.id).slice(-8)} • Total: ${Number(matchedTx.total || 0).toFixed(2)} DA • Paiement: ${matchedTx.paymentMethod || 'Espèces'} • ${itemsCount} art. (${itemNames})`;
    }
  }

  return `Action "${act}" exécutée dans le module [${mod}] par ${usr}`;
}

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

  // Modal State for Cancelling/Undoing Log Action
  const [cancellingLog, setCancellingLog] = useState<AuditLog | null>(null);
  const [undoTransactionDetails, setUndoTransactionDetails] = useState<Transaction | null>(null);
  const [shouldRestoreStock, setShouldRestoreStock] = useState(true);
  const [isProcessingUndo, setIsProcessingUndo] = useState(false);

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
    sortBy
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

  // Detect and analyze matching transaction when undoing a log
  const handleOpenCancelUndo = (log: AuditLog) => {
    setCancellingLog(log);
    setUndoTransactionDetails(null);
    setShouldRestoreStock(true);

    let foundTx: Transaction | null = null;
    const act = (log.action || '').toLowerCase();
    const mod = (log.module || '').toLowerCase();
    const explicitTargetId = (log as any).targetId || (log as any).transactionId;

    if (explicitTargetId) {
      foundTx = transactions.find(tx => tx.id === explicitTargetId) || null;
    }

    if (!foundTx && (act.includes('vente') || mod === 'pos' || mod === 'vente')) {
      // 1. Chercher un ID explicite dans le texte (ex: ticket #ABCDEF ou tx_12345)
      const ticketMatch = log.details?.match(/(?:#|ID:\s*|tx_|ticket\s*#?)([A-Za-z0-9_-]{6,})/i);
      if (ticketMatch) {
        const needle = ticketMatch[1].toUpperCase();
        foundTx = transactions.find(tx => tx.id && (tx.id.toUpperCase() === needle || tx.id.toUpperCase().endsWith(needle))) || null;
      }

      // 2. Fallback sécurisé : fenêtre temporelle avec correspondance stricte de montant
      if (!foundTx) {
        const logTime = new Date(log.timestamp).getTime();
        const priceMatch = log.details.match(/\d+([.,]\d+)?/);
        if (priceMatch) {
          const expectedTotal = parseFloat(priceMatch[0].replace(',', '.'));
          const candidates = transactions.filter(tx => {
            const txTime = new Date(tx.timestamp || (tx as any).date).getTime();
            const diffMinutes = Math.abs(txTime - logTime) / (60 * 1000);
            return diffMinutes < 30 && Math.abs(Number(tx.total) - expectedTotal) < 0.05;
          });
          if (candidates.length === 1) {
            foundTx = candidates[0];
          }
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
        await localDb.update(`auditLogs/${cancellingLog.id}`, {
          isCancelled: true,
          cancelledAt: new Date().toISOString(),
          details: `[ANNULÉ] ${cancellingLog.details}`
        });

        if (undoTransactionDetails) {
          await localDb.update(`transactions/${undoTransactionDetails.id}`, {
            status: 'returned',
            auditStatus: 'verified'
          });

          if (shouldRestoreStock && undoTransactionDetails.items) {
            // 🛡️ Consolidation préalable par productId avec décomposition des bundles (GEMINI.md)
            const consolidatedRestore = new Map<string, number>();
            for (const item of undoTransactionDetails.items) {
              const prodId = (item as any).productId || item.id;
              const matchedProd = products.find(p => p.id === prodId);
              const qty = Number(item.quantity) || 1;
              if (matchedProd?.isBundle && matchedProd.bundleItems && matchedProd.bundleItems.length > 0) {
                for (const bi of matchedProd.bundleItems) {
                  if (bi.productId) {
                    consolidatedRestore.set(
                      bi.productId,
                      (consolidatedRestore.get(bi.productId) || 0) + (bi.quantity * qty)
                    );
                  }
                }
              } else if (prodId) {
                consolidatedRestore.set(prodId, (consolidatedRestore.get(prodId) || 0) + qty);
              }
            }
            const nowIso = new Date().toISOString();
            for (const [prodId, totalQty] of consolidatedRestore.entries()) {
              const matchedProd = products.find(p => p.id === prodId);
              if (matchedProd) {
                const nextStock = (Number(matchedProd.stock) || 0) + totalQty;
                enqueueStockAdjustment(matchedProd.id, totalQty);
                await localDb.updateLocalOnly(`products/${matchedProd.id}`, {
                  ...matchedProd,
                  stock: nextStock,
                  updatedAt: nowIso
                });
              }
            }
          }

          // 🛡️ Rollback du solde client (dette) et des points de fidélité consommés/gagnés
          if (undoTransactionDetails.customerId) {
            const custId = undoTransactionDetails.customerId;
            const currentCust = (usePeopleStore.getState().customers || []).find(c => c.id === custId);
            if (currentCust) {
              const txTotal = Number(undoTransactionDetails.total || 0);
              const pointsEarned = Number(undoTransactionDetails.pointsEarned || 0);
              const pointVal = 0.01;
              const pointsSpent = undoTransactionDetails.pointsDiscount ? Math.floor(undoTransactionDetails.pointsDiscount / pointVal) : 0;
              const balanceUsed = Number(undoTransactionDetails.balanceUsed || (undoTransactionDetails.paymentMethod === 'balance' ? txTotal : 0));
              const received = Number(undoTransactionDetails.amountReceived || 0);
              const returned = Number(undoTransactionDetails.amountReturned || 0);
              const excess = ((undoTransactionDetails as any).keepExcessInBalance || (received > txTotal && returned === 0))
                ? Math.max(0, received - txTotal - returned)
                : 0;

              const rollbackDeltaBalance = balanceUsed - excess;
              const rollbackDeltaSpent = -txTotal;
              const rollbackDeltaPoints = -(pointsEarned - pointsSpent);

              const updatedCust = {
                ...currentCust,
                balance: (currentCust.balance || 0) + rollbackDeltaBalance,
                totalSpent: Math.max(0, (currentCust.totalSpent || 0) + rollbackDeltaSpent),
                loyaltyPoints: Math.max(0, (currentCust.loyaltyPoints || 0) + rollbackDeltaPoints),
                deltaBalance: rollbackDeltaBalance,
                deltaSpent: rollbackDeltaSpent,
                deltaPoints: rollbackDeltaPoints
              };

              usePeopleStore.getState().setCustomers(prev =>
                (prev || []).map(c => c.id === custId ? updatedCust : c)
              );
              await localDb.update(`customers/${custId}`, updatedCust);
              enqueueCustomerBalanceAdjustment(custId, rollbackDeltaBalance, rollbackDeltaSpent, rollbackDeltaPoints);
            }
          }
        }
      } else {
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
            // 🛡️ Consolidation préalable par productId avec décomposition des bundles (GEMINI.md)
            const consolidatedDeduct = new Map<string, number>();
            for (const item of undoTransactionDetails.items) {
              const prodId = (item as any).productId || item.id;
              const matchedProd = products.find(p => p.id === prodId);
              const qty = Number(item.quantity) || 1;
              if (matchedProd?.isBundle && matchedProd.bundleItems && matchedProd.bundleItems.length > 0) {
                for (const bi of matchedProd.bundleItems) {
                  if (bi.productId) {
                    consolidatedDeduct.set(
                      bi.productId,
                      (consolidatedDeduct.get(bi.productId) || 0) + (bi.quantity * qty)
                    );
                  }
                }
              } else if (prodId) {
                consolidatedDeduct.set(prodId, (consolidatedDeduct.get(prodId) || 0) + qty);
              }
            }
            const nowIso = new Date().toISOString();
            for (const [prodId, totalQty] of consolidatedDeduct.entries()) {
              const matchedProd = products.find(p => p.id === prodId);
              if (matchedProd) {
                const nextStock = (Number(matchedProd.stock) || 0) - totalQty;
                enqueueStockAdjustment(matchedProd.id, -totalQty);
                await localDb.updateLocalOnly(`products/${matchedProd.id}`, {
                  ...matchedProd,
                  stock: nextStock,
                  updatedAt: nowIso
                });
              }
            }
          }

          // Rétablir le débit client et les points
          if (undoTransactionDetails.customerId) {
            const custId = undoTransactionDetails.customerId;
            const currentCust = (usePeopleStore.getState().customers || []).find(c => c.id === custId);
            if (currentCust) {
              const txTotal = Number(undoTransactionDetails.total || 0);
              const pointsEarned = Number(undoTransactionDetails.pointsEarned || 0);
              const pointVal = 0.01;
              const pointsSpent = undoTransactionDetails.pointsDiscount ? Math.floor(undoTransactionDetails.pointsDiscount / pointVal) : 0;
              const balanceUsed = Number(undoTransactionDetails.balanceUsed || (undoTransactionDetails.paymentMethod === 'balance' ? txTotal : 0));
              const received = Number(undoTransactionDetails.amountReceived || 0);
              const returned = Number(undoTransactionDetails.amountReturned || 0);
              const excess = ((undoTransactionDetails as any).keepExcessInBalance || (received > txTotal && returned === 0))
                ? Math.max(0, received - txTotal - returned)
                : 0;

              const applyDeltaBalance = -(balanceUsed - excess);
              const applyDeltaSpent = txTotal;
              const applyDeltaPoints = pointsEarned - pointsSpent;

              const updatedCust = {
                ...currentCust,
                balance: (currentCust.balance || 0) + applyDeltaBalance,
                totalSpent: Math.max(0, (currentCust.totalSpent || 0) + applyDeltaSpent),
                loyaltyPoints: Math.max(0, (currentCust.loyaltyPoints || 0) + applyDeltaPoints),
                deltaBalance: applyDeltaBalance,
                deltaSpent: applyDeltaSpent,
                deltaPoints: applyDeltaPoints
              };

              usePeopleStore.getState().setCustomers(prev =>
                (prev || []).map(c => c.id === custId ? updatedCust : c)
              );
              await localDb.update(`customers/${custId}`, updatedCust);
              enqueueCustomerBalanceAdjustment(custId, applyDeltaBalance, applyDeltaSpent, applyDeltaPoints);
            }
          }
        }
      }

      setCancellingLog(null);
    } catch (e: any) {
      console.error("Action cancellation failed:", e);
      toast.error("Erreur lors de l'annulation: " + e.message);
    } finally {
      setIsProcessingUndo(false);
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
