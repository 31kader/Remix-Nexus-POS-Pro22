import { CartItem, Customer, CompanySettings, Promotion, Transaction } from '../../types';
import { localDb } from '../../services/LocalDatabase';
import { logAction, generateUniqueId } from '../../lib/utils';
import { useTransactionStore } from '../../store/useTransactionStore';
import { getTerminalId, getTerminalName } from '../../services/terminalService';
import { lanSyncService } from '../../services/lanSyncService';
import { set as idbSet } from 'idb-keyval';

export interface BuildTransactionParams {
  isEditing: boolean;
  editingTransaction?: Transaction | null;
  safeCart: CartItem[];
  method: 'cash' | 'card' | 'balance';
  receivedAmount: string;
  total: number;
  discountAmount: number;
  pointsDiscount: number;
  voucherDiscount: number;
  promotionToApply: Promotion | null;
  deliveryMethod: 'in_store' | 'delivery' | 'pickup';
  selectedCustomer: Customer | null;
  user: any;
  profile: any;
  isWholesale: boolean;
  keepExcessInBalance: boolean;
  settings: CompanySettings;
}

export function validateAndBuildTransaction({
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
}: BuildTransactionParams): { error?: string; transaction?: Transaction; unpaidShortfall: number; parsedReceived: number; pointsEarned: number } {
  const loyaltyRatio = settings?.loyaltyPointsPerCurrencyUnit || 1;
  const pointsEarned = (selectedCustomer && deliveryMethod === 'in_store') 
    ? (total >= 0 ? Math.floor(total * loyaltyRatio) : -Math.floor(Math.abs(total) * loyaltyRatio))
    : 0;
    
  const parsedReceived = receivedAmount !== '' ? (parseFloat(receivedAmount) || 0) : (method === 'balance' ? 0 : total);
  const unpaidShortfall = method === 'balance'
    ? Math.max(0, total - (receivedAmount !== '' ? Math.max(0, parsedReceived) : 0))
    : ((receivedAmount !== '' && parsedReceived < total && total > 0) ? Math.max(0, total - Math.max(0, parsedReceived)) : 0);

  if (unpaidShortfall > 0) {
    if (!selectedCustomer) {
      return {
        error: "Montant reçu insuffisant. Veuillez sélectionner un client pour enregistrer le reste en dette.",
        unpaidShortfall,
        parsedReceived,
        pointsEarned
      };
    }
    const currentBalance = Number(selectedCustomer.balance) || 0;
    const creditLimit = Number(selectedCustomer.creditLimit) || 0;
    if (creditLimit > 0) {
      const isSameCustomerEditing = isEditing && editingTransaction?.customerId === selectedCustomer.id;
      const oldBalanceUsed = isSameCustomerEditing ? Number(editingTransaction!.balanceUsed || (editingTransaction!.paymentMethod === 'balance' ? editingTransaction!.total : 0)) : 0;
      const projectedBalance = currentBalance + oldBalanceUsed - unpaidShortfall;
      if (projectedBalance < -creditLimit) {
        const currencySymbol = settings?.currency || 'DA';
        return {
          error: `Plafond de dette dépassé. Limite autorisée : ${creditLimit.toFixed(2)} ${currencySymbol} (Dette résultante: ${Math.abs(projectedBalance).toFixed(2)} ${currencySymbol})`,
          unpaidShortfall,
          parsedReceived,
          pointsEarned
        };
      }
    }
  }

  const sanitizedCart = safeCart.map((item: CartItem) => {
    if (!item) return {} as CartItem;
    const { imageUrl, imageUrls, description, ...rest } = item;
    return rest;
  }) as CartItem[];

  const parsedReturned = (receivedAmount !== '' && parsedReceived > total && !keepExcessInBalance) ? parsedReceived - total : 0;

  const currentUserId = user?.uid || 'local-cashier';
  const currentUserDisplayName = user?.displayName || profile?.displayName || 'Caisse';
  const transactionId = isEditing ? editingTransaction!.id : generateUniqueId();

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

  return { transaction, unpaidShortfall, parsedReceived, pointsEarned };
}

export async function persistTransaction(
  transaction: Transaction,
  isEditing: boolean,
  editingTransaction?: Transaction | null,
  user?: any,
  profile?: any,
  settings?: CompanySettings
) {
  const transactionId = transaction.id;
  const currentUserId = user?.uid || 'local-cashier';
  const currentUserDisplayName = user?.displayName || profile?.displayName || 'Caisse';

  if (isEditing) {
    // Mise à jour de la transaction existante (PAS DE NOUVELLE VENTE)
    await localDb.update(`transactions/${transactionId}`, transaction).catch(console.error);
    useTransactionStore.getState().setTransactions(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const next = safePrev.map(t => t && t.id === transactionId ? { ...t, ...transaction } : t);
      if (typeof indexedDB !== 'undefined') {
        idbSet('nexus_transactions_cache', next).catch(() => {});
      }
      return next;
    });
  } else {
    await localDb.insert(`transactions/${transactionId}`, transaction).catch(console.error);
    useTransactionStore.getState().setTransactions(prev => {
      const next = [transaction as any, ...(Array.isArray(prev) ? prev : [])];
      if (typeof indexedDB !== 'undefined') {
        idbSet('nexus_transactions_cache', next).catch(() => {});
      }
      return next;
    });
  }

  // 🟢 Diffusion immédiate sur le réseau local LAN (Ethernet / Wi-Fi)
  try {
    if (isEditing) {
      lanSyncService.broadcastTransactionUpdate(transaction);
    } else {
      lanSyncService.broadcastTransaction(transaction);
    }
  } catch (_) {}

  const currencySymbol = settings?.currency || 'DZD';
  const actionLabel = isEditing ? 'Modification Vente' : 'Vente';
  const actionMsg = isEditing 
    ? `Mise à jour ticket #${transactionId.slice(-6).toUpperCase()} (Total: ${transaction.total.toFixed(2)} ${currencySymbol}, Original: ${Number(editingTransaction!.total || 0).toFixed(2)} ${currencySymbol})`
    : `Vente de ${transaction.total.toFixed(2)} ${currencySymbol} via ${transaction.paymentMethod}`;
  logAction(currentUserId, currentUserDisplayName, actionLabel, 'POS', actionMsg, 'info', transactionId);
}
