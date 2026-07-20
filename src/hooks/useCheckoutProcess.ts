import { useState, useCallback } from 'react';
import { enqueueStockAdjustment } from '../services/SyncService';
import { localDb } from '../services/LocalDatabase';
import { logAction, generateUniqueId } from '../lib/utils';
import { CartItem, Product, Customer, CompanySettings, Promotion, Transaction } from '../types';

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
  printReceipt
}: UseCheckoutProcessParams) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = useCallback(async (method: 'cash' | 'card' | 'balance', shouldPrint: boolean = false) => {
    if (isProcessing) return;
    
    // SÉCURITÉ : Vérification robuste du panier
    const safeCart = Array.isArray(cart) ? cart : [];
    if (safeCart.length === 0) return;
    
    if (method === 'balance') {
      if (!selectedCustomer) {
        alert("Veuillez sélectionner un client pour payer par solde.");
        return;
      }
      if ((selectedCustomer.balance || 0) < total) {
        alert("Solde insuffisant.");
        return;
      }
    }

    setIsProcessing(true);
    try {
      const transactionId = generateUniqueId();
      
      const sanitizedCart = safeCart.map((item: CartItem) => {
        if (!item) return {} as CartItem;
        const { imageUrl, imageUrls, description, bundleItems, ...rest } = item;
        return rest;
      }) as CartItem[];

      const loyaltyRatio = settings?.loyaltyPointsPerCurrencyUnit || 1;
      const pointsEarned = (selectedCustomer && deliveryMethod === 'in_store') 
        ? Math.floor(total * loyaltyRatio) 
        : 0;
        
      const parsedReceived = receivedAmount !== '' ? parseFloat(receivedAmount) || 0 : total;
      const parsedReturned = (receivedAmount !== '' && parsedReceived > total && !keepExcessInBalance) ? parsedReceived - total : 0;

      const currentUserId = user?.uid || 'local-cashier';
      const currentUserDisplayName = user?.displayName || profile?.displayName || 'Caisse';

      const transaction = {
        id: transactionId,
        items: sanitizedCart,
        total,
        discountAmount: discountAmount || 0,
        pointsDiscount: pointsDiscount || 0,
        balanceUsed: method === 'balance' ? total : 0,
        voucherDiscount: voucherDiscount || 0,
        promotionId: promotionToApply?.id || null,
        paymentMethod: method,
        deliveryMethod: deliveryMethod || 'in_store',
        status: deliveryMethod === 'in_store' ? 'delivered' : 'pending',
        pointsEarned,
        amountReceived: parsedReceived,
        amountReturned: parsedReturned,
        timestamp: new Date().toISOString(),
        userId: currentUserId,
        isWholesale: !!isWholesale,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || null,
      };
      
      await localDb.insert(`transactions/${transactionId}`, transaction);

      const currencySymbol = settings?.currency || 'DZD';
      logAction(currentUserId, currentUserDisplayName, 'Vente', 'POS', `Vente de ${total.toFixed(2)} ${currencySymbol} via ${method}`);
      
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

      // Parcours sécurisé du panier pour les stocks
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

      // Customer Updates
      if (selectedCustomer) {
        const pointVal = settings?.loyaltyPointValue || 0.01;
        const pointsSpent = useLoyaltyPoints ? Math.floor((pointsDiscount || 0) / pointVal) : 0;
        let finalBalance = (selectedCustomer.balance || 0);
        if (method === 'balance') finalBalance -= total;
        if (keepExcessInBalance && parsedReceived > total) finalBalance += (parsedReceived - total);

        localDb.update(`customers/${selectedCustomer.id}`, {
           loyaltyPoints: Math.max(0, (selectedCustomer.loyaltyPoints || 0) - pointsSpent + pointsEarned),
           totalSpent: (selectedCustomer.totalSpent || 0) + total,
           lastVisit: new Date().toISOString(),
           balance: finalBalance
        });
      }

      // Voucher Updates
      if (appliedVoucher) {
        if (appliedVoucher.type === 'fixed') {
          const balanceKey = appliedVoucher.currentBalance ?? appliedVoucher.value;
          const rem = Math.max(0, balanceKey - (total + (discountAmount || 0) + (pointsDiscount || 0)));
          localDb.update(`promotions/${appliedVoucher.id}`, rem <= 0 ? { status: 'used' } : { currentBalance: rem });
        } else {
          localDb.update(`promotions/${appliedVoucher.id}`, { status: 'used' });
        }
      }

      if (shouldPrint && settings) {
        printReceipt(transaction as any, settings);
      }

      setCart([]);
      
      if (typeof setPosSessions === 'function') {
        setPosSessions((prev: any) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.map((s: any) => 
            s?.id === activeSessionId 
              ? { ...s, cart: [], selectedCustomer: null } 
              : s
          );
        });
      }

      setLastTransaction(transaction as any);
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Erreur lors de la validation');
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing, cart, selectedCustomer, total, deliveryMethod, settings, receivedAmount,
    keepExcessInBalance, discountAmount, pointsDiscount, voucherDiscount, promotionToApply,
    user, isWholesale, useLoyaltyPoints, appliedVoucher, activeSessionId, setPosSessions,
    setCart, setLastTransaction, setShowSuccess, printReceipt, products, profile
  ]);

  return { handleCheckout, isProcessing };
}