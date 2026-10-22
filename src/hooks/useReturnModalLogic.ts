import { useTransactionStore } from '../store/useTransactionStore';
import { useCoreStore } from '../store/useCoreStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { Product, CompanySettings, Transaction, ProductReturn, Customer, normalizeBatches } from '../types';
import { generateUniqueId, logAction, safeGetItems } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../supabase';
import { toast } from 'sonner';

interface UseReturnModalLogicProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  user: any;
  products: Product[];
  customers: Customer[];
  settings: CompanySettings;
  allReturns: ProductReturn[];
}

export function useReturnModalLogic({
  isOpen, onClose, transaction, user, products, customers, settings, allReturns
}: UseReturnModalLogicProps) {
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [returnType, setReturnType] = useState<'refund' | 'credit_note'>('refund');
  const [returnDate, setReturnDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [restockItems, setRestockItems] = useState(true);

  useEffect(() => {
    if (isOpen && transaction) {
      const transactionReturns = (allReturns || []).filter((r: any) => r.transactionId === transaction.id);
      
      setReturnItems(safeGetItems(transaction).map((item: any) => {
        const alreadyReturned = transactionReturns.reduce((sum: number, r: any) => {
          const itemsList = Array.isArray(r.items) ? r.items : (
            (r.productId || r.product_id) ? [{
              productId: r.productId || r.product_id,
              quantity: r.quantity || 1
            }] : []
          );
          const matchingItem = itemsList.find((ri: any) => ri.productId === item.id);
          return sum + (matchingItem ? matchingItem.quantity : 0);
        }, 0);

        const availableToReturn = Math.max(0, item.quantity - alreadyReturned);
        return {
          ...item,
          alreadyReturned,
          availableToReturn,
          returnQuantity: availableToReturn
        };
      }));
      setReason('');
      setReturnType('refund');
      setReturnDate(format(new Date(), 'yyyy-MM-dd'));
      setShowConfirmation(false);
    }
  }, [isOpen, transaction?.id]);

  const originalItems = transaction ? safeGetItems(transaction) : [];
  const originalSubtotal = originalItems.reduce((sum: number, item: any) => sum + (Number(item?.price || 0) * Number(item?.quantity || 1)), 0);
  const discountRatio = (transaction && originalSubtotal > 0 && typeof transaction.total === 'number')
    ? Math.min(1, Math.max(0, transaction.total / originalSubtotal))
    : 1;

  const totalRefund = Math.min(
    transaction?.total ?? Infinity,
    returnItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.returnQuantity || 0) * discountRatio), 0)
  );

  const handleReturn = async () => {
    if (!transaction || returnItems.every(item => item.returnQuantity === 0)) return;
    if (isProcessing) return;
    setIsProcessing(true);

    const now = new Date();
    let parsedDate = now.toISOString();
    try {
      if (returnDate) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
          const [y, m, d] = returnDate.split('-').map(Number);
          const fullDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
          parsedDate = fullDate.toISOString();
        } else {
          parsedDate = new Date(returnDate).toISOString();
        }
      }
    } catch (e) {
      console.error("Invalid return date", e);
      parsedDate = now.toISOString();
    }

    try {
      const returnId = localDb.push('returns').key || generateUniqueId();
      const returnData: ProductReturn = {
        id: returnId,
        transactionId: transaction.id || '',
        items: returnItems.filter(item => item.returnQuantity > 0).map(item => ({
          lineId: generateUniqueId(),
          productId: item.id || item.productId || 'unknown',
          name: item.name || 'Produit inconnu',
          quantity: item.returnQuantity || 0,
          price: item.price || 0
        })),
        totalRefund: totalRefund || 0,
        reason: reason || '',
        timestamp: parsedDate,
        date: parsedDate,
        userId: user?.uid || 'unknown',
        customerId: transaction.customerId || null,
        type: returnType === 'credit_note' ? 'credit_note' : (transaction.paymentMethod === 'balance' ? 'credit' : (returnType || 'refund')),
        refundMethod: returnType === 'credit_note' ? 'voucher' : (transaction.paymentMethod === 'balance' ? 'credit' : 'cash'),
        status: 'completed',
        notes: reason || ''
      };

      await localDb.insert(`returns/${returnId}`, returnData);
      useTransactionStore.getState().setReturns(prev => [returnData, ...(prev || [])]);

      let generatedPromoCode = '';
      if (returnType === 'credit_note' && totalRefund > 0) {
        const promoId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : generateUniqueId();
        
        generatedPromoCode = `AVOIR-${String(transaction.id || "").slice(-6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const promoData = {
          id: promoId,
          name: `Avoir - Retour Transaction #${String(transaction.id || "").slice(-8).toUpperCase()}`,
          description: `Avoir de ${totalRefund.toFixed(2)} ${settings.currency} généré le ${format(new Date(), 'dd/MM/yyyy')}`,
          type: 'fixed' as const,
          value: totalRefund,
          code: generatedPromoCode,
          isActive: true,
          active: true,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          applicableCategories: [],
          applicableProducts: [],
          updatedAt: new Date().toISOString()
        };
        
        await localDb.insert(`promotions/${promoId}`, promoData);
        useCoreStore.getState().setPromotions(prev => [promoData as any, ...(prev || [])]);
      }

      if (restockItems) {
        // 🛡️ Consolidation préalable par productId (Règle Anti-Écrasement GEMINI.md)
        const consolidatedRestock = new Map<string, number>();

        for (const item of returnData.items) {
          const product = products.find((p: Product) => p.id === item.productId);
          if (product) {
            if (product.isBundle && product.bundleItems) {
              for (const bundleItem of product.bundleItems) {
                if (bundleItem.productId) {
                  const qtyToAdd = bundleItem.quantity * item.quantity;
                  consolidatedRestock.set(
                    bundleItem.productId,
                    (consolidatedRestock.get(bundleItem.productId) || 0) + qtyToAdd
                  );
                }
              }
            } else if (product.id) {
              consolidatedRestock.set(
                product.id,
                (consolidatedRestock.get(product.id) || 0) + item.quantity
              );
            }
          }
        }

        const nowIso = new Date().toISOString();
        for (const [targetProdId, totalQtyToAdd] of consolidatedRestock.entries()) {
          if (!targetProdId || totalQtyToAdd <= 0) continue;
          const targetProduct = products.find((p: Product) => p.id === targetProdId);
          if (targetProduct) {
            const newStock = (targetProduct.stock || 0) + totalQtyToAdd;
            let updatedBatches = targetProduct.batches;
            if (targetProduct.useMultiExpiry) {
              const normBatches = normalizeBatches(targetProduct.batches).map(b => ({ ...b }));
              if (normBatches.length > 0) {
                normBatches.sort((a, b) => new Date(b.expirationDate || 0).getTime() - new Date(a.expirationDate || 0).getTime());
                normBatches[0].stock = (Number(normBatches[0].stock) || 0) + totalQtyToAdd;
                updatedBatches = normBatches;
                await localDb.update(`products/${targetProdId}`, { batches: updatedBatches, updatedAt: nowIso });
              }
            }
            enqueueStockAdjustment(targetProdId, totalQtyToAdd);
            const updatedProd = { ...targetProduct, stock: newStock, batches: updatedBatches, updatedAt: nowIso };
            await (localDb.updateLocalOnly ?? localDb.update)(`products/${targetProdId}`, { stock: newStock, batches: updatedBatches, updatedAt: nowIso });
            useCoreStore.getState().setProducts(prev => (prev || []).map(p => p.id === targetProdId ? updatedProd : p));
            window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProd }));
          }
        }
      }

      // Si la vente originale utilisait du crédit / solde, rembourser sur le compte client
      // 🛡️ P0-BIZ-2 : Déduire le solde déjà recrédité lors de retours partiels antérieurs sur cette même transaction
      const priorReturns = (useTransactionStore.getState().returns || []).filter(
        (r: any) => r && r.transactionId === transaction.id && r.id !== returnId
      );
      const priorBalanceRefunded = priorReturns.reduce((sum: number, r: any) => {
        if (r.type === 'credit_note') return sum;
        const rRefund = Number(r.totalRefund ?? r.refundAmount ?? 0);
        return sum + rRefund;
      }, 0);

      const totalOriginalBalanceUsed = Number(transaction.balanceUsed) || (transaction.paymentMethod === 'balance' ? Number(transaction.total || 0) : 0);
      const remainingBalanceToRefund = Math.max(0, totalOriginalBalanceUsed - priorBalanceRefunded);

      // 🛡️ P0-BIZ-1 : Si returnType === 'credit_note', l'avoir est déjà émis : ne JAMAIS recréditer le solde client (zéro double remboursement)
      const balanceRefund = returnType === 'credit_note' ? 0 : Math.min(remainingBalanceToRefund, totalRefund);
      const cashRefund = returnType === 'credit_note' ? 0 : Math.max(0, totalRefund - balanceRefund);

      if (transaction.customerId) {
        const customer = customers.find((c: Customer) => c.id === transaction.customerId);
        if (customer) {
          const rawPointsToDeduct = Math.floor(totalRefund * (settings.loyaltyPointsPerCurrencyUnit || 1));
          const maxPointsFromTx = transaction.pointsEarned !== undefined ? Math.max(0, Number(transaction.pointsEarned)) : rawPointsToDeduct;
          const pointsToDeduct = Math.min(rawPointsToDeduct, maxPointsFromTx);
          const updatedCust = {
            ...customer,
            loyaltyPoints: Math.max(0, (customer.loyaltyPoints || 0) - pointsToDeduct),
            totalSpent: Math.max(0, (customer.totalSpent || 0) - totalRefund),
            balance: (customer.balance || 0) + balanceRefund,
            deltaBalance: balanceRefund,
            deltaSpent: -totalRefund,
            deltaPoints: -pointsToDeduct,
            updatedAt: new Date().toISOString()
          };
          await localDb.update(`customers/${customer.id}`, updatedCust);
          usePeopleStore.getState().setCustomers(prev =>
            (prev || []).map(c => c.id === customer.id ? { ...c, ...updatedCust } : c)
          );
        }
      }

      const totalInitiallySold = safeGetItems(transaction).reduce((sum: number, i: any) => sum + (Number(i?.quantity) || 0), 0);
      const totalReturnedSoFar = returnItems.reduce((sum: number, i: any) => sum + (Number(i?.alreadyReturned) || 0) + (Number(i?.returnQuantity) || 0), 0);
      
      const allItemsReturned = totalReturnedSoFar >= totalInitiallySold;
      const newStatus = allItemsReturned ? 'returned' : 'partially_returned';

      useTransactionStore.getState().setTransactions(prev =>
        (prev || []).map(t => t.id === transaction.id ? { ...t, status: newStatus as any } : t)
      );

      if (isSupabaseConfigured && navigator.onLine) {
        try {
          const res = await supabase.from('transactions').update({ status: newStatus }).eq('id', transaction.id);
          if (res?.error) {
            await localDb.update(`transactions/${transaction.id}`, { status: newStatus });
          } else {
            await localDb.updateLocalOnly(`transactions/${transaction.id}`, { status: newStatus });
          }
        } catch (_) {
          await localDb.update(`transactions/${transaction.id}`, { status: newStatus });
        }
      } else {
        await localDb.update(`transactions/${transaction.id}`, { status: newStatus });
      }

      if (returnType === 'refund' && cashRefund > 0) {
        const expenseId = localDb.push('expenses').key || generateUniqueId();
        const expenseData = {
          id: expenseId,
          description: `Remboursement Client (Retour #${String(transaction.id || "").slice(-6).toUpperCase()})`,
          amount: cashRefund,
          category: 'Remboursement / Retour',
          date: parsedDate,
          userId: user?.uid || 'unknown',
          paymentMethod: transaction.paymentMethod === 'card' ? 'card' : 'cash'
        };
        await localDb.insert(`expenses/${expenseId}`, expenseData);
        useFinanceStore.getState().setExpenses(prev => [expenseData as any, ...(prev || [])]);
      }

      logAction(user?.uid || 'unknown', user?.displayName || 'Utilisateur', 'Retour', 'Vente', `Retour de ${totalRefund.toFixed(2)} ${settings.currency} pour la transaction #${String(transaction.id || "").slice(-8).toUpperCase()}`);

      if (generatedPromoCode) {
        toast.success(`Retour enregistré ! Code Avoir : ${generatedPromoCode}`, { duration: 15000 });
      } else {
        toast.success("Retour de marchandise enregistré avec succès !");
      }
      onClose();
    } catch (error) {
      console.error("Error processing return:", error);
      toast.error("Erreur lors de l'enregistrement du retour.");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    returnItems,
    setReturnItems,
    reason,
    setReason,
    returnType,
    setReturnType,
    returnDate,
    setReturnDate,
    isProcessing,
    showConfirmation,
    setShowConfirmation,
    restockItems,
    setRestockItems,
    totalRefund,
    handleReturn
  };
}
