import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { logAction, generateUniqueId } from '../lib/utils';
import { CartItem, Product, Customer, CompanySettings, Promotion, Transaction } from '../types';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { set as idbSet } from 'idb-keyval';
import { getTerminalId, getTerminalName } from '../services/terminalService';
import { triggerCashDrawer } from '../services/hardwareService';

interface UseCheckoutProcessParams {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  user: any;
  profile: any;
  activeStaffId: string;
  employees: any[];
  selectedCustomer: Customer | null;
  settings: CompanySettings;
  deliveryMethod: 'in_store' | 'delivery' | 'pickup';
  products: Product[];
  receivedAmount: string;
  keepExcessInBalance: boolean;
  total: number;
  discountAmount: number;
  pointsDiscount: number;
  voucherDiscount: number;
  promotionToApply: Promotion | null;
  useLoyaltyPoints: boolean;
  isWholesale: boolean;
  activeSessionId: string;
  setPosSessions: React.Dispatch<React.SetStateAction<any[]>>;
  appliedVoucher: any;
  setLastTransaction: (t: Transaction | null) => void;
  setShowSuccess: (s: boolean) => void;
  printReceipt: (t: Transaction, s: CompanySettings) => void;
  editingTransaction?: Transaction | null;
  onClearEditingTransaction?: () => void;
}

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

  const handleCheckout = useCallback(async (method: 'cash' | 'card' | 'balance', shouldPrint: boolean = false) => {
    if (isProcessing) return;
    
    // SÉCURITÉ : Vérification robuste du panier
    const safeCart = Array.isArray(cart) ? cart : [];
    if (safeCart.length === 0) return;
    
    if (method === 'balance') {
      if (!selectedCustomer) {
        toast.error("Veuillez sélectionner un client pour payer par solde / dette.");
        return;
      }
      const currentBalance = Number(selectedCustomer.balance) || 0;
      const creditLimit = Number(selectedCustomer.creditLimit) || 0;
      // Si une limite de crédit est fixée (> 0), vérifier que le nouveau solde ne descend pas sous -creditLimit
      if (creditLimit > 0 && (currentBalance - total) < -creditLimit) {
        const currencySymbol = settings?.currency || 'DA';
        toast.error(`Plafond de dette dépassé. Limite autorisée : ${creditLimit.toFixed(2)} ${currencySymbol}`);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const isEditing = Boolean(editingTransaction && editingTransaction.id);
      const transactionId = isEditing ? editingTransaction!.id : generateUniqueId();
      
      const sanitizedCart = safeCart.map((item: CartItem) => {
        if (!item) return {} as CartItem;
        const { imageUrl, imageUrls, description, bundleItems, ...rest } = item;
        return rest;
      }) as CartItem[];

      const loyaltyRatio = settings?.loyaltyPointsPerCurrencyUnit || 1;
      const pointsEarned = (selectedCustomer && deliveryMethod === 'in_store') 
        ? (total >= 0 ? Math.floor(total * loyaltyRatio) : -Math.floor(Math.abs(total) * loyaltyRatio))
        : 0;
        
      const parsedReceived = receivedAmount !== '' ? (parseFloat(receivedAmount) || 0) : (method === 'balance' ? 0 : total);
      const unpaidShortfall = method === 'balance'
        ? Math.max(0, total - (receivedAmount !== '' ? Math.max(0, parsedReceived) : 0))
        : ((receivedAmount !== '' && parsedReceived < total && total > 0) ? Math.max(0, total - Math.max(0, parsedReceived)) : 0);

      if (unpaidShortfall > 0 && !selectedCustomer) {
        toast.error("Montant reçu insuffisant. Veuillez sélectionner un client pour enregistrer le reste en dette.");
        setIsProcessing(false);
        return;
      }

      const parsedReturned = (receivedAmount !== '' && parsedReceived > total && !keepExcessInBalance) ? parsedReceived - total : 0;

      const currentUserId = user?.uid || 'local-cashier';
      const currentUserDisplayName = user?.displayName || profile?.displayName || 'Caisse';

      const transaction: Transaction = {
        ...(isEditing ? editingTransaction : {}),
        id: transactionId,
        items: sanitizedCart,
        total,
        discountAmount: discountAmount || 0,
        pointsDiscount: pointsDiscount || 0,
        balanceUsed: unpaidShortfall,
        voucherDiscount: voucherDiscount || 0,
        promotionId: promotionToApply?.id || null,
        paymentMethod: method,
        deliveryMethod: deliveryMethod || 'in_store',
        status: isEditing ? (editingTransaction!.status || (deliveryMethod === 'in_store' ? 'delivered' : 'pending')) : (deliveryMethod === 'in_store' ? 'delivered' : 'pending'),
        pointsEarned,
        amountReceived: parsedReceived,
        amountReturned: parsedReturned,
        timestamp: isEditing ? (editingTransaction!.timestamp || new Date().toISOString()) : new Date().toISOString(),
        userId: isEditing ? (editingTransaction!.userId || currentUserId) : currentUserId,
        isWholesale: !!isWholesale,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || null,
        isEdited: isEditing ? true : (editingTransaction?.isEdited || false),
        editedAt: isEditing ? new Date().toISOString() : undefined,
        editedBy: isEditing ? currentUserDisplayName : undefined,
        originalTotal: isEditing ? (editingTransaction!.originalTotal || editingTransaction!.total) : undefined,
        terminalId: isEditing ? (editingTransaction!.terminalId || getTerminalId()) : getTerminalId(),
        terminalName: isEditing ? (editingTransaction!.terminalName || getTerminalName()) : getTerminalName(),
      };
      
      if (isEditing) {
        // Mise à jour de la transaction existante (PAS DE NOUVELLE VENTE)
        localDb.update(`transactions/${transactionId}`, transaction).catch(console.error);
        useTransactionStore.getState().setTransactions(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const next = safePrev.map(t => t && t.id === transactionId ? { ...t, ...transaction } : t);
          if (typeof indexedDB !== 'undefined') {
            idbSet('nexus_transactions_cache', next).catch(() => {});
          }
          return next;
        });
      } else {
        localDb.insert(`transactions/${transactionId}`, transaction).catch(console.error);
        useTransactionStore.getState().setTransactions(prev => {
          const next = [transaction as any, ...(Array.isArray(prev) ? prev : [])];
          if (typeof indexedDB !== 'undefined') {
            idbSet('nexus_transactions_cache', next).catch(() => {});
          }
          return next;
        });
      }

      const currencySymbol = settings?.currency || 'DZD';
      const actionLabel = isEditing ? 'Modification Vente' : 'Vente';
      const actionMsg = isEditing 
        ? `Mise à jour ticket #${transactionId.slice(-6).toUpperCase()} (Total: ${total.toFixed(2)} ${currencySymbol}, Original: ${Number(editingTransaction!.total || 0).toFixed(2)} ${currencySymbol})`
        : `Vente de ${total.toFixed(2)} ${currencySymbol} via ${method}`;
      logAction(currentUserId, currentUserDisplayName, actionLabel, 'POS', actionMsg);
      
      // SÉCURITÉ : Protection de la liste globale des produits
      const tempProducts = [...(products || [])];
      const getProductFromTemp = (id: string) => tempProducts.find((p: Product) => p && p.id === id);
      const updateTempProductStock = (id: string, newStock: number, newBatches?: any[]) => {
        const idx = tempProducts.findIndex((p: Product) => p && p.id === id);
        if (idx > -1) {
          tempProducts[idx] = { 
            ...tempProducts[idx], 
            stock: newStock, 
            updatedAt: new Date().toISOString() 
          };
          if (newBatches) {
            tempProducts[idx].batches = newBatches;
          }
        }
      };

      // GESTION DU STOCK : Différentiel si modification d'une vente existante, standard si nouvelle vente
      if (isEditing) {
        let oldItems: CartItem[] = [];
        if (editingTransaction && editingTransaction.items) {
          if (typeof editingTransaction.items === 'string') {
            try { oldItems = JSON.parse(editingTransaction.items); } catch { oldItems = []; }
          } else if (Array.isArray(editingTransaction.items)) {
            oldItems = editingTransaction.items;
          }
        }

        const oldQtyMap = new Map<string, { qty: number; isBundle?: boolean; bundleItems?: any[] }>();
        for (const item of oldItems) {
          if (!item || !item.id || item.id === 'undefined') continue;
          const ex = oldQtyMap.get(item.id);
          const q = Number(item.quantity || 1);
          if (ex) {
            ex.qty += q;
          } else {
            oldQtyMap.set(item.id, { qty: q, isBundle: item.isBundle, bundleItems: item.bundleItems });
          }
        }

        const newQtyMap = new Map<string, { qty: number; isBundle?: boolean; bundleItems?: any[] }>();
        for (const item of safeCart) {
          if (!item || !item.id || item.id === 'undefined') continue;
          const ex = newQtyMap.get(item.id);
          const q = Number(item.quantity || 1);
          if (ex) {
            ex.qty += q;
          } else {
            newQtyMap.set(item.id, { qty: q, isBundle: item.isBundle, bundleItems: item.bundleItems });
          }
        }

        const allItemIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
        for (const itemId of allItemIds) {
          const oldInfo = oldQtyMap.get(itemId);
          const newInfo = newQtyMap.get(itemId);
          const oldQty = oldInfo ? oldInfo.qty : 0;
          const newQty = newInfo ? newInfo.qty : 0;
          const delta = newQty - oldQty; // > 0 : plus d'articles vendus (déduire du stock), < 0 : articles réintégrés

          if (delta === 0) continue;

          const isBundle = (newInfo && newInfo.isBundle) || (oldInfo && oldInfo.isBundle);
          const bundleItems = (newInfo && newInfo.bundleItems) || (oldInfo && oldInfo.bundleItems);

          if (isBundle && bundleItems) {
            const safeBundleItems = Array.isArray(bundleItems) ? bundleItems : [];
            for (const bundleItem of safeBundleItems) {
              if (!bundleItem) continue;
              const comp = getProductFromTemp(bundleItem.productId);
              if (comp) {
                const compDelta = bundleItem.quantity * delta;
                const newCompStock = comp.stock - compDelta;
                enqueueStockAdjustment(comp.id, -compDelta);
                updateTempProductStock(comp.id, newCompStock);

                localDb.update(`products/${comp.id}`, {
                  stock: newCompStock,
                  updatedAt: new Date().toISOString()
                });

                window.dispatchEvent(new CustomEvent('product-cache-update', {
                  detail: getProductFromTemp(comp.id)
                }));
              }
            }
          } else {
            const product = getProductFromTemp(itemId);
            if (product) {
              const newStock = product.stock - delta;
              enqueueStockAdjustment(itemId, -delta);
              updateTempProductStock(itemId, newStock, product.batches);

              localDb.update(`products/${itemId}`, {
                stock: newStock,
                updatedAt: new Date().toISOString()
              });

              window.dispatchEvent(new CustomEvent('product-cache-update', {
                detail: getProductFromTemp(itemId)
              }));
            }
          }
        }
      } else {
        // Parcours sécurisé du panier pour les stocks (Nouvelle Vente)
        for (const item of safeCart) {
          if (!item || !item.id || item.id === 'undefined') continue;

          if (item.isBundle && item.bundleItems) {
            const safeBundleItems = Array.isArray(item.bundleItems) ? item.bundleItems : [];
            for (const bundleItem of safeBundleItems) {
              if (!bundleItem) continue;
              const comp = getProductFromTemp(bundleItem.productId);
              if (comp) {
                const qtyDeducted = bundleItem.quantity * item.quantity;
                const newCompStock = comp.stock - qtyDeducted;
                enqueueStockAdjustment(comp.id, -qtyDeducted);
                updateTempProductStock(comp.id, newCompStock);
                
                localDb.update(`products/${comp.id}`, {
                  stock: newCompStock,
                  updatedAt: new Date().toISOString()
                });
                
                window.dispatchEvent(new CustomEvent('product-cache-update', {
                  detail: getProductFromTemp(comp.id)
                }));
              }
            }
          } else {
            const product = getProductFromTemp(item.id);
            if (product) {
              let updatedBatches = product.batches ? product.batches.map(b => ({ ...b })) : [];
              if (product.useMultiExpiry && updatedBatches.length > 0) {
                let rem = item.quantity;
                updatedBatches.sort((a, b) => new Date(a.expirationDate || 0).getTime() - new Date(b.expirationDate || 0).getTime());
                for (let b of updatedBatches) {
                  if (rem <= 0) break;
                  if (b && b.stock > 0) {
                    const deduct = Math.min(b.stock, rem);
                    b.stock -= deduct;
                    rem -= deduct;
                  }
                }
                if (rem > 0 && updatedBatches[updatedBatches.length - 1]) {
                  updatedBatches[updatedBatches.length - 1].stock -= rem;
                }
              }

              const newStock = product.stock - item.quantity;
              if (newStock < 0 && product.autoUnpack && product.parentId && product.unitsPerParent) {
                const parent = getProductFromTemp(product.parentId);
                if (parent) {
                  const parentsNeeded = Math.ceil(-newStock / product.unitsPerParent);
                  const newParentStock = parent.stock - parentsNeeded;
                  enqueueStockAdjustment(parent.id, -parentsNeeded);
                  updateTempProductStock(parent.id, newParentStock);
                  
                  localDb.update(`products/${parent.id}`, {
                    stock: newParentStock,
                    updatedAt: new Date().toISOString()
                  });
                  
                  window.dispatchEvent(new CustomEvent('product-cache-update', {
                    detail: getProductFromTemp(parent.id)
                  }));
                  
                  const adjustedQty = -item.quantity + (parentsNeeded * product.unitsPerParent);
                  const finalStock = product.stock + adjustedQty;
                  enqueueStockAdjustment(item.id, adjustedQty);
                  updateTempProductStock(item.id, finalStock, product.useMultiExpiry ? updatedBatches : product.batches);
                  
                  localDb.update(`products/${item.id}`, {
                    stock: finalStock,
                    updatedAt: new Date().toISOString(),
                    batches: product.useMultiExpiry ? updatedBatches : product.batches
                  });
                  
                  window.dispatchEvent(new CustomEvent('product-cache-update', {
                    detail: getProductFromTemp(item.id)
                  }));
                }
              } else {
                enqueueStockAdjustment(item.id, -item.quantity);
                updateTempProductStock(item.id, newStock, product.useMultiExpiry ? updatedBatches : product.batches);
                
                localDb.update(`products/${item.id}`, {
                  stock: newStock,
                  updatedAt: new Date().toISOString(),
                  batches: product.useMultiExpiry ? updatedBatches : product.batches
                });
                
                window.dispatchEvent(new CustomEvent('product-cache-update', {
                  detail: getProductFromTemp(item.id)
                }));
              }
            }
          }
        }
      }

      // Customer Updates : Différentiel si modification de vente
      if (selectedCustomer) {
        const pointVal = settings?.loyaltyPointValue || 0.01;
        const pointsSpent = useLoyaltyPoints ? Math.floor((pointsDiscount || 0) / pointVal) : 0;
        let deltaBalance = 0;
        let deltaSpent = 0;
        let deltaPoints = 0;

        if (isEditing) {
          const oldTotal = Number(editingTransaction!.total || 0);
          const oldPointsEarned = Number(editingTransaction!.pointsEarned || 0);
          const oldPointsSpent = editingTransaction!.pointsDiscount ? Math.floor(editingTransaction!.pointsDiscount / pointVal) : 0;
          const oldBalanceUsed = Number(editingTransaction!.balanceUsed || (editingTransaction!.paymentMethod === 'balance' ? oldTotal : 0));
          const newBalanceUsed = unpaidShortfall;

          deltaSpent = total - oldTotal;
          deltaPoints = (pointsEarned - pointsSpent) - (oldPointsEarned - oldPointsSpent);
          deltaBalance = (oldBalanceUsed - newBalanceUsed);
          if (keepExcessInBalance && parsedReceived > total) deltaBalance += (parsedReceived - total);
        } else {
          if (unpaidShortfall > 0) deltaBalance -= unpaidShortfall;
          if (keepExcessInBalance && parsedReceived > total) deltaBalance += (parsedReceived - total);
          deltaSpent = total;
          deltaPoints = pointsEarned - pointsSpent;
        }

        const finalBalance = (selectedCustomer.balance || 0) + deltaBalance;

        const updatedCustomerData = {
           name: selectedCustomer.name || 'Client',
           loyaltyPoints: Math.max(0, (selectedCustomer.loyaltyPoints || 0) + deltaPoints),
           totalSpent: Math.max(0, (selectedCustomer.totalSpent || 0) + deltaSpent),
           lastVisit: new Date().toISOString(),
           balance: finalBalance,
           deltaBalance,
           deltaSpent,
           deltaPoints
        };

        localDb.update(`customers/${selectedCustomer.id}`, updatedCustomerData);

        // Mise à jour immédiate du store local usePeopleStore pour actualiser l'interface client en caisse
        usePeopleStore.getState().setCustomers(prev => 
          (prev || []).map(c => c.id === selectedCustomer.id ? { ...c, ...updatedCustomerData } : c)
        );
      }

      // Voucher Updates
      if (appliedVoucher) {
        if (appliedVoucher.type === 'fixed') {
          const balanceKey = appliedVoucher.currentBalance ?? appliedVoucher.value;
          const rem = Math.max(0, balanceKey - (voucherDiscount || 0));
          const payload = rem <= 0 ? { status: 'used', currentBalance: 0 } : { currentBalance: rem };
          localDb.update(`vouchers/${appliedVoucher.id}`, payload).catch(console.warn);
          localDb.update(`promotions/${appliedVoucher.id}`, payload).catch(console.warn);
        } else {
          localDb.update(`vouchers/${appliedVoucher.id}`, { status: 'used' }).catch(console.warn);
          localDb.update(`promotions/${appliedVoucher.id}`, { status: 'used' }).catch(console.warn);
        }
      }

      if (method === 'cash') {
        triggerCashDrawer().catch(() => {});
      }

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