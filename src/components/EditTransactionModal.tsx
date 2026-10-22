import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { Product, CompanySettings, Transaction } from '../types';
import { Modal, Button } from './ui';
import { toast } from 'sonner';
import { safeGetItems } from '../lib/utils';
import { applyStockAdjustment } from '../services/stockService';
import { localDb } from '../services/LocalDatabase';
import { supabase, isSupabaseConfigured } from '../supabase';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { set as idbSet } from 'idb-keyval';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  products: Product[];
  settings: CompanySettings;
}

export function EditTransactionModal({ isOpen, onClose, transaction, products, settings }: EditTransactionModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (transaction) {
      setItems(safeGetItems(transaction).map((item: any) => ({ ...item })));
    }
  }, [transaction]);

  const subtotal = items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
  const discountTotal = (Number(transaction?.discountAmount) || 0) + (Number(transaction?.pointsDiscount) || 0) + (Number(transaction?.voucherDiscount) || 0);
  const total = Math.max(0, subtotal - discountTotal);

  const handleUpdate = async () => {
    if (!transaction) return;
    setIsProcessing(true);

    try {
      const originalItems = safeGetItems(transaction);

      // 1. Consolidation préalable des deltas de stock par produit (Anti-Écrasement GEMINI.md)
      const originalItemMap = new Map<string, number>();
      for (const orig of originalItems) {
        if (orig.id) {
          originalItemMap.set(orig.id, (originalItemMap.get(orig.id) || 0) + (Number(orig.quantity) || 0));
        }
      }

      const newItemMap = new Map<string, number>();
      for (const item of items) {
        if (item.id && Number(item.quantity) > 0) {
          newItemMap.set(item.id, (newItemMap.get(item.id) || 0) + (Number(item.quantity) || 0));
        }
      }

      const allProductIds = new Set<string>([...originalItemMap.keys(), ...newItemMap.keys()]);
      const consolidatedStockDeltas = new Map<string, number>();

      for (const prodId of allProductIds) {
        const origQty = originalItemMap.get(prodId) || 0;
        const newQty = newItemMap.get(prodId) || 0;
        const stockChange = origQty - newQty; // >0: réintégration en stock; <0: déstockage supplémentaire

        if (stockChange === 0) continue;

        const product = products.find((p: Product) => p.id === prodId);
        if (product) {
          if (product.isBundle && product.bundleItems && product.bundleItems.length > 0) {
            for (const bundleItem of product.bundleItems) {
              if (bundleItem.productId) {
                const compDelta = (Number(bundleItem.quantity) || 1) * stockChange;
                consolidatedStockDeltas.set(
                  bundleItem.productId,
                  (consolidatedStockDeltas.get(bundleItem.productId) || 0) + compDelta
                );
              }
            }
          } else if (product.id) {
            consolidatedStockDeltas.set(
              product.id,
              (consolidatedStockDeltas.get(product.id) || 0) + stockChange
            );
          }
        }
      }

      // Application atomique des ajustements de stock via applyStockAdjustment (mode delta + clé idempotente par révision)
      const editSuffix = (transaction.isEdited || transaction.updatedAt) ? `_${Date.now()}` : '';
      const stockAdjustmentPromises = Array.from(consolidatedStockDeltas.entries()).map(
        ([productId, delta]) => {
          if (delta === 0) return Promise.resolve();
          const adjustmentId = `adj_edit_tx_${transaction.id}_${productId}${editSuffix}`;
          return applyStockAdjustment({
            productId,
            value: delta,
            mode: 'delta',
            adjustmentId,
            reason: `Modification commande #${transaction.id?.slice(0, 8)}`,
          });
        }
      );
      await Promise.all(stockAdjustmentPromises);

      // 2. Mise à jour du solde et des points de fidélité du client si le montant a changé
      const oldTotal = Number(transaction.total || 0);
      const diffTotal = total - oldTotal;
      const loyaltyRatio = settings?.loyaltyPointsPerCurrencyUnit || 1;
      const newPointsEarned = transaction.customerId && transaction.deliveryMethod === 'in_store'
        ? Math.floor(total * loyaltyRatio)
        : Number(transaction.pointsEarned || 0);
      const oldPointsEarned = Number(transaction.pointsEarned || 0);
      const deltaPoints = newPointsEarned - oldPointsEarned;

      let newBalanceUsed = Number(transaction.balanceUsed || 0);
      let deltaBalance = 0;

      if (transaction.customerId) {
        const oldBalanceUsed = Number(transaction.balanceUsed || (transaction.paymentMethod === 'balance' ? oldTotal : 0));
        const oldReceived = Number(transaction.amountReceived || 0);
        const oldReturned = Number(transaction.amountReturned || 0);
        const oldExcess = ((transaction as any).keepExcessInBalance || (oldReceived > oldTotal && oldReturned === 0))
          ? Math.max(0, oldReceived - oldTotal - oldReturned)
          : 0;

        let newExcess = 0;
        if (transaction.paymentMethod === 'balance') {
          newBalanceUsed = total;
        } else if (oldReceived > 0) {
          if (oldReceived >= total) {
            newBalanceUsed = 0;
            if ((transaction as any).keepExcessInBalance) {
              newExcess = oldReceived - total;
            }
          } else {
            newBalanceUsed = total - oldReceived;
          }
        } else if (oldBalanceUsed > 0) {
          newBalanceUsed = Math.max(0, oldBalanceUsed + diffTotal);
        }

        deltaBalance = (oldBalanceUsed - newBalanceUsed) + (newExcess - oldExcess);
      }

      if (transaction.customerId && (diffTotal !== 0 || deltaPoints !== 0 || deltaBalance !== 0)) {
        const cust = (usePeopleStore.getState().customers || []).find(c => c.id === transaction.customerId);
        if (cust) {
          const updatedCustomer = {
            ...cust,
            balance: (Number(cust.balance) || 0) + deltaBalance,
            totalSpent: Math.max(0, (Number(cust.totalSpent) || 0) + diffTotal),
            loyaltyPoints: Math.max(0, (Number(cust.loyaltyPoints) || 0) + deltaPoints),
            deltaBalance,
            deltaSpent: diffTotal,
            deltaPoints,
          };
          await localDb.update(`customers/${cust.id}`, updatedCustomer);
          usePeopleStore.getState().setCustomers(prev =>
            (prev || []).map(c => (c.id === cust.id ? { ...c, ...updatedCustomer } : c))
          );
        }
      }

      // 3. Mise à jour de la persistance locale (Offline-First : localDb.update enfile automatiquement dans SyncService)
      const nowIso = new Date().toISOString();
      const cleanItems = items.filter(i => (Number(i.quantity) || 0) > 0);

      const updatedTransaction: Transaction = {
        ...transaction,
        items: cleanItems,
        total: total,
        balanceUsed: newBalanceUsed,
        pointsEarned: newPointsEarned,
        updatedAt: nowIso,
        isEdited: true,
        editedAt: nowIso,
        originalTotal: transaction.originalTotal ?? oldTotal,
      };

      await localDb.update(`transactions/${transaction.id}`, updatedTransaction);
      useTransactionStore.getState().setTransactions(prev => {
        const next = (prev || []).map(t => (t.id === transaction.id ? updatedTransaction : t));
        if (typeof indexedDB !== 'undefined') {
          idbSet('nexus_transactions_cache', next).catch(() => {});
        }
        return next;
      });

      if (isSupabaseConfigured) {
        try {
          const { error: txError } = await supabase
            .from('transactions')
            .update({
              items: cleanItems,
              total: total,
              updated_at: nowIso,
            })
            .eq('id', transaction.id);
          if (txError) {
            console.warn('[EditTransactionModal] Erreur mise à jour Supabase directe:', txError);
          }
        } catch (err) {
          console.warn('[EditTransactionModal] Exception mise à jour Supabase directe:', err);
        }
      }

      toast.success("Commande mise à jour avec succès !");
      onClose();
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour: " + (error?.message || "Erreur inconnue"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifier la commande (En attente)">
      <div className="space-y-6">
        <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
          <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-4">Articles de la commande</p>
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={`edit-item-${idx}`} className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-zinc-100">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{Number(item.price || 0).toFixed(2)} {settings.currency} / unité</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      const newItems = [...items];
                      newItems[idx].quantity = Math.max(0, newItems[idx].quantity - 1);
                      setItems(newItems);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-10 text-center font-black text-slate-800">{item.quantity}</span>
                  <button 
                    onClick={() => {
                      const newItems = [...items];
                      newItems[idx].quantity += 1;
                      setItems(newItems);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500"
                  >
                    <Plus size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      const newItems = items.filter((_, i) => i !== idx);
                      setItems(newItems);
                    }}
                    className="ml-2 p-1 text-rose-500 hover:bg-rose-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-4">Aucun article dans la commande.</p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Nouveau Total</p>
            <p className="text-2xl font-black text-slate-900">{total.toFixed(2)} {settings.currency}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isProcessing}>Annuler</Button>
            <Button 
              onClick={handleUpdate} 
              disabled={isProcessing || items.length === 0}
              className="px-5"
            >
              {isProcessing ? "Mise à jour..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
