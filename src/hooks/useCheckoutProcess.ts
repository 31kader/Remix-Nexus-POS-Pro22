import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { CartItem, Transaction } from '../types';
import { localDb } from '../services/LocalDatabase';
import { useCoreStore } from '../store/useCoreStore';
import { triggerCashDrawer } from '../services/hardwareService';
import {
  UseCheckoutProcessParams,
  CheckoutPaymentMethod,
  validateAndBuildTransaction,
  persistTransaction,
  processCheckoutStock,
  processCheckoutCustomer
} from './checkout';

export { type UseCheckoutProcessParams } from './checkout';

export function useCheckoutProcess({
  cart,
  setCart,
  user,
  profile,
  activeStaffId,
  employees,
  selectedCustomer,
  settings,
  deliveryMethod,
  products,
  receivedAmount,
  keepExcessInBalance,
  total,
  discountAmount,
  pointsDiscount,
  voucherDiscount,
  promotionToApply,
  useLoyaltyPoints,
  isWholesale,
  activeSessionId,
  setPosSessions,
  appliedVoucher,
  setLastTransaction,
  setShowSuccess,
  printReceipt,
  editingTransaction,
  onClearEditingTransaction
}: UseCheckoutProcessParams) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = useCallback(async (method: CheckoutPaymentMethod, shouldPrint: boolean = false) => {
    if (isProcessing) return;
    
    // SÉCURITÉ : Vérification robuste du panier
    const safeCart = Array.isArray(cart) ? cart : [];
    if (safeCart.length === 0) return;
    
    if (method === 'balance' && !selectedCustomer) {
      toast.error("Veuillez sélectionner un client pour payer par solde / dette.");
      return;
    }

    setIsProcessing(true);
    try {
      const isEditing = Boolean(editingTransaction && editingTransaction.id);

      // 1. Validation & Construction de la transaction
      const {
        error,
        transaction,
        unpaidShortfall,
        parsedReceived,
        pointsEarned
      } = validateAndBuildTransaction({
        isEditing,
        editingTransaction,
        safeCart,
        method,
        receivedAmount,
        total,
        discountAmount,
        pointsDiscount,
        voucherDiscount,
        promotionToApply,
        deliveryMethod,
        selectedCustomer,
        user,
        profile,
        isWholesale,
        keepExcessInBalance,
        settings
      });

      if (error || !transaction) {
        if (error) toast.error(error);
        setIsProcessing(false);
        return;
      }

      // 2. Persistance locale et diffusion LAN de la transaction
      await persistTransaction(transaction, isEditing, editingTransaction, user, profile, settings);

      // 3. Déstockage différentiel (édition) ou consolidé (nouvelle vente)
      await processCheckoutStock({
        isEditing,
        safeCart,
        editingTransaction,
        products
      });

      // 4. Gestion du client (fidélité, solde, dettes, rollback ancien client)
      await processCheckoutCustomer({
        isEditing,
        editingTransaction,
        selectedCustomer,
        total,
        unpaidShortfall,
        pointsEarned,
        pointsDiscount,
        useLoyaltyPoints,
        keepExcessInBalance,
        parsedReceived,
        settings
      });

      // 5. Mise à jour des Vouchers & Promotions
      if (appliedVoucher && appliedVoucher.id) {
        const payload = appliedVoucher.type === 'fixed'
          ? (() => {
              const balanceKey = appliedVoucher.currentBalance ?? appliedVoucher.value;
              const rem = Math.max(0, balanceKey - (voucherDiscount || 0));
              return rem <= 0 ? { status: 'used' as const, currentBalance: 0 } : { currentBalance: rem };
            })()
          : { status: 'used' as const };

        const currentPromotions = useCoreStore.getState().promotions || [];
        const isPromotion = currentPromotions.some(p => p.id === appliedVoucher.id);

        if (isPromotion) {
          localDb.update(`promotions/${appliedVoucher.id}`, payload).catch(console.warn);
          useCoreStore.getState().setPromotions(prev =>
            (prev || []).map(p => p.id === appliedVoucher.id ? { ...p, ...payload } : p)
          );
        } else {
          localDb.update(`vouchers/${appliedVoucher.id}`, payload).catch(console.warn);
        }
      }

      // 6. Tiroir-caisse matériel
      if (method === 'cash') {
        triggerCashDrawer().catch(() => {});
      }

      // 7. Impression ticket non-bloquante
      if (shouldPrint && settings) {
        const printTx = { ...transaction };
        const printSt = { ...settings };
        setTimeout(() => {
          try {
            printReceipt(printTx as any, printSt);
          } catch (e) {
            console.error('[Checkout] Erreur lors de l\'impression non-bloquante:', e);
          }
        }, 10);
      }

      // 8. Réinitialisation et transition d'état
      if (typeof onClearEditingTransaction === 'function') {
        onClearEditingTransaction();
      }

      setCart([]);
      
      if (typeof setPosSessions === 'function') {
        setPosSessions((prev: any) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.map((s: any) => 
            s?.id === activeSessionId 
              ? { 
                  ...s, 
                  name: s.name?.includes('(Modif)') ? 'Ticket 1' : s.name,
                  cart: [], 
                  selectedCustomer: null,
                  editingTransaction: null 
                } 
              : s
          );
        });
      }

      setLastTransaction(transaction as any);
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing, cart, selectedCustomer, total, deliveryMethod, settings, receivedAmount,
    keepExcessInBalance, discountAmount, pointsDiscount, voucherDiscount, promotionToApply,
    user, isWholesale, useLoyaltyPoints, appliedVoucher, activeSessionId, setPosSessions,
    setCart, setLastTransaction, setShowSuccess, printReceipt, products, profile,
    editingTransaction, onClearEditingTransaction
  ]);

  return { handleCheckout, isProcessing };
}
