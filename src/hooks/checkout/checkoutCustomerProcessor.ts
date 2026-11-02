import { Customer, CompanySettings, Transaction } from '../../types';
import { localDb } from '../../services/LocalDatabase';
import { usePeopleStore } from '../../store/usePeopleStore';

export interface CheckoutCustomerProcessorParams {
  isEditing: boolean;
  editingTransaction?: Transaction | null;
  selectedCustomer: Customer | null;
  total: number;
  unpaidShortfall: number;
  pointsEarned: number;
  pointsDiscount: number;
  useLoyaltyPoints: boolean;
  keepExcessInBalance: boolean;
  parsedReceived: number;
  settings?: CompanySettings;
}

export async function processCheckoutCustomer({
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
}: CheckoutCustomerProcessorParams) {
  const pointVal = settings?.loyaltyPointValue || 0.01;

  // 1. Rollback de l'ancien client en cas de changement de client lors d'une édition
  if (isEditing && editingTransaction?.customerId && editingTransaction.customerId !== selectedCustomer?.id) {
    const oldCustId = editingTransaction.customerId;
    const oldTotal = Number(editingTransaction.total || 0);
    const oldPointsEarned = Number(editingTransaction.pointsEarned || 0);
    const oldPointsSpent = editingTransaction.pointsDiscount ? Math.floor(editingTransaction.pointsDiscount / pointVal) : 0;
    const oldBalanceUsed = Number(editingTransaction.balanceUsed || (editingTransaction.paymentMethod === 'balance' ? oldTotal : 0));
    const oldReceived = Number(editingTransaction.amountReceived || 0);
    const oldReturned = Number(editingTransaction.amountReturned || 0);
    const oldExcess = ((editingTransaction as any).keepExcessInBalance || (oldReceived > oldTotal && oldReturned === 0))
      ? Math.max(0, oldReceived - oldTotal - oldReturned)
      : 0;

    const rollbackDeltaBalance = oldBalanceUsed - oldExcess;
    const rollbackDeltaSpent = -oldTotal;
    const rollbackDeltaPoints = -(oldPointsEarned - oldPointsSpent);

    const oldCust = (usePeopleStore.getState().customers || []).find(c => c.id === oldCustId);
    if (oldCust) {
      const updatedOldCust = {
        ...oldCust,
        balance: (oldCust.balance || 0) + rollbackDeltaBalance,
        totalSpent: Math.max(0, (oldCust.totalSpent || 0) + rollbackDeltaSpent),
        loyaltyPoints: Math.max(0, (oldCust.loyaltyPoints || 0) + rollbackDeltaPoints),
        deltaBalance: rollbackDeltaBalance,
        deltaSpent: rollbackDeltaSpent,
        deltaPoints: rollbackDeltaPoints
      };
      await localDb.update(`customers/${oldCustId}`, updatedOldCust);
      usePeopleStore.getState().setCustomers(prev =>
        (prev || []).map(c => c.id === oldCustId ? { ...c, ...updatedOldCust } : c)
      );
    }
  }

  // 2. Mise à jour du client sélectionné
  if (selectedCustomer) {
    const pointsSpent = useLoyaltyPoints ? Math.floor((pointsDiscount || 0) / pointVal) : 0;
    let deltaBalance = 0;
    let deltaSpent = 0;
    let deltaPoints = 0;

    if (isEditing && editingTransaction?.customerId === selectedCustomer.id) {
      const oldTotal = Number(editingTransaction!.total || 0);
      const oldPointsEarned = Number(editingTransaction!.pointsEarned || 0);
      const oldPointsSpent = editingTransaction!.pointsDiscount ? Math.floor(editingTransaction!.pointsDiscount / pointVal) : 0;
      const oldBalanceUsed = Number(editingTransaction!.balanceUsed || (editingTransaction!.paymentMethod === 'balance' ? oldTotal : 0));
      const oldReceived = Number(editingTransaction!.amountReceived || 0);
      const oldReturned = Number(editingTransaction!.amountReturned || 0);
      const oldExcess = ((editingTransaction as any).keepExcessInBalance || (oldReceived > oldTotal && oldReturned === 0))
        ? Math.max(0, oldReceived - oldTotal - oldReturned)
        : 0;
      const newBalanceUsed = unpaidShortfall;

      deltaSpent = total - oldTotal;
      deltaPoints = (pointsEarned - pointsSpent) - (oldPointsEarned - oldPointsSpent);
      deltaBalance = (oldBalanceUsed - newBalanceUsed) - oldExcess;
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

    await localDb.update(`customers/${selectedCustomer.id}`, updatedCustomerData);

    // Mise à jour immédiate du store local usePeopleStore pour actualiser l'interface client en caisse
    usePeopleStore.getState().setCustomers(prev => 
      (prev || []).map(c => c.id === selectedCustomer.id ? { ...c, ...updatedCustomerData } : c)
    );
  }
}
