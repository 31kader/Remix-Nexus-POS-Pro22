import { useState } from 'react';
import { toast } from 'sonner';
import { enqueueStockAdjustment, enqueueCustomerBalanceAdjustment } from '../../services/SyncService';
import { localDb } from '../../services/LocalDatabase';
import { usePeopleStore } from '../../store/usePeopleStore';
import { AuditLog, Product, Transaction } from '../../types';

export function useAuditRollback(products: Product[] = [], transactions: Transaction[] = []) {
  const [cancellingLog, setCancellingLog] = useState<AuditLog | null>(null);
  const [undoTransactionDetails, setUndoTransactionDetails] = useState<Transaction | null>(null);
  const [shouldRestoreStock, setShouldRestoreStock] = useState(true);
  const [isProcessingUndo, setIsProcessingUndo] = useState(false);

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
      const ticketMatch = log.details?.match(/(?:#|ID:\s*|tx_|ticket\s*#?)([A-Za-z0-9_-]{6,})/i);
      if (ticketMatch) {
        const needle = ticketMatch[1].toUpperCase();
        foundTx = transactions.find(tx => tx.id && (tx.id.toUpperCase() === needle || tx.id.toUpperCase().endsWith(needle))) || null;
      }

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
            // Consolidation préalable par productId avec décomposition des bundles (GEMINI.md)
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

          // Rollback du solde client (dette) et des points de fidélité consommés/gagnés
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
            // Consolidation préalable par productId avec décomposition des bundles (GEMINI.md)
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
    cancellingLog,
    setCancellingLog,
    undoTransactionDetails,
    shouldRestoreStock,
    setShouldRestoreStock,
    isProcessingUndo,
    handleOpenCancelUndo,
    handleConfirmCancelUndo,
  };
}
