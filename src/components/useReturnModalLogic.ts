import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { Product, CompanySettings, Transaction, ProductReturn, Customer } from '../types';
import { generateUniqueId, logAction } from '../lib/utils';
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
      
      setReturnItems(transaction.items.map((item: any) => {
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

  const totalRefund = returnItems.reduce((sum, item) => sum + (item.price * item.returnQuantity), 0);

  const handleReturn = async () => {
    if (!transaction || returnItems.every(item => item.returnQuantity === 0)) return;
    if (isProcessing) return;
    setIsProcessing(true);

    let parsedDate = new Date().toISOString();
    try {
      if (returnDate) {
        parsedDate = new Date(returnDate).toISOString();
      }
    } catch (e) {
      console.error("Invalid return date", e);
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
        type: returnType || 'refund',
        status: 'completed',
        notes: reason || ''
      };

      await localDb.insert(`returns/${returnId}`, returnData);

      let generatedPromoCode = '';
      if (returnType === 'credit_note' && totalRefund > 0) {
        const promoId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : generateUniqueId();
        
        generatedPromoCode = `AVOIR-${transaction.id.slice(-6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const promoData = {
          id: promoId,
          name: `Avoir - Retour Transaction #${transaction.id.slice(-8).toUpperCase()}`,
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
      }

      if (restockItems) {
        for (const item of returnData.items) {
          const product = products.find((p: Product) => p.id === item.productId);
          if (product) {
            if (product.isBundle && product.bundleItems) {
              for (const bundleItem of product.bundleItems) {
                const componentProduct = products.find((p: Product) => p.id === bundleItem.productId);
                if (componentProduct && componentProduct.id) {
                  enqueueStockAdjustment(componentProduct.id, bundleItem.quantity * item.quantity);
                  await localDb.insert(`products/${componentProduct.id}`, { ...componentProduct, updatedAt: new Date().toISOString() });
                }
              }
            } else if (product.id) {
              enqueueStockAdjustment(product.id, item.quantity);
              await localDb.insert(`products/${product.id}`, { ...product, updatedAt: new Date().toISOString() });
            }
          }
        }
      }

      if (transaction.customerId) {
        const customer = customers.find((c: Customer) => c.id === transaction.customerId);
        if (customer) {
          const pointsToDeduct = Math.floor(totalRefund * (settings.loyaltyPointsPerCurrencyUnit || 1));
          await localDb.insert(`customers/${customer.id}`, {
            ...customer,
            loyaltyPoints: Math.max(0, (customer.loyaltyPoints || 0) - pointsToDeduct),
            totalSpent: Math.max(0, (customer.totalSpent || 0) - totalRefund)
          });
        }
      }

      const totalInitiallySold = transaction.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
      const totalReturnedSoFar = returnItems.reduce((sum: number, i: any) => sum + i.alreadyReturned + i.returnQuantity, 0);
      
      const allItemsReturned = totalReturnedSoFar >= totalInitiallySold;
      await localDb.insert(`transactions/${transaction.id}`, {
        ...transaction,
        status: allItemsReturned ? 'returned' : 'partially_returned'
      });

      if (returnType === 'refund' && totalRefund > 0) {
        const expenseId = localDb.push('expenses').key || generateUniqueId();
        const expenseData = {
          id: expenseId,
          description: `Remboursement Client (Retour #${transaction.id.slice(-6).toUpperCase()})`,
          amount: totalRefund,
          category: 'Remboursement / Retour',
          date: parsedDate,
          userId: user?.uid || 'unknown',
          paymentMethod: transaction.paymentMethod === 'card' ? 'card' : 'cash'
        };
        await localDb.insert(`expenses/${expenseId}`, expenseData);
      }

      logAction(user?.uid || 'unknown', user?.displayName || 'Utilisateur', 'Retour', 'Vente', `Retour de ${totalRefund.toFixed(2)} ${settings.currency} pour la transaction #${transaction.id.slice(-8).toUpperCase()}`);

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
