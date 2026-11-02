import { Customer, Transaction, CompanySettings, Expense } from '../../types';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { localDb } from '../../services/LocalDatabase';
import { generateLocalId } from '../../lib/db-converters';
import { parseCashierNotes } from '../../lib/utils';
import { toast } from 'sonner';

interface CustomerTopUpParams {
  selectedCustomer: Customer;
  topUpAmount: string;
  financialOpType: 'encaissement' | 'decaissement';
  financialMethod: 'cash' | 'card' | 'bank' | 'other';
  financialNote: string;
  settings: CompanySettings;
}

export async function executeCustomerTopUp({
  selectedCustomer,
  topUpAmount,
  financialOpType,
  financialMethod,
  financialNote,
  settings
}: CustomerTopUpParams): Promise<boolean> {
  const amount = parseFloat(topUpAmount);
  if (isNaN(amount) || amount <= 0) {
    toast.error("Veuillez saisir un montant valide.");
    return false;
  }

  const change = financialOpType === 'encaissement' ? amount : -amount;
  const newBalance = (selectedCustomer.balance || 0) + change;
  
  const labelOp = financialOpType === 'encaissement' ? 'Encaissement/Versement' : 'Décaissement/Sortie';
  const noteRefStr = `[REGLEMENT] ${labelOp} de ${amount.toFixed(2)} ${settings.currency || 'DA'} (${financialMethod.toUpperCase()}) - ${financialNote || 'Ajustement de solde'}`;
  const noteEntry = {
    note: noteRefStr,
    author: 'Direction/Caisse',
    timestamp: new Date().toISOString()
  };
  
  const currentNotes = parseCashierNotes(selectedCustomer.cashierNotes || (selectedCustomer as any).cashier_notes);
  const newNotes = [...currentNotes, noteEntry];

  const updatedCustomer: Customer = {
    ...selectedCustomer,
    balance: newBalance,
    cashierNotes: newNotes,
    updatedAt: new Date().toISOString()
  };

  let expenseData: Expense | null = null;
  let topUpTx: Transaction | null = null;
  if (financialOpType === 'decaissement') {
    const expenseId = generateLocalId();
    const nowIso = new Date().toISOString();
    expenseData = {
      id: expenseId,
      description: `Décaissement/Retrait Client : ${selectedCustomer.name} (${financialNote || 'Sans note'})`,
      amount: amount,
      category: 'Remboursement Client',
      date: nowIso,
      createdAt: nowIso,
      userId: 'system',
      paymentMethod: financialMethod === 'bank' ? 'transfer' : (financialMethod === 'card' ? 'card' : 'cash')
    };
  } else if (financialOpType === 'encaissement') {
    const txId = generateLocalId();
    const nowIso = new Date().toISOString();
    topUpTx = {
      id: txId,
      items: [],
      total: amount,
      paymentMethod: (financialMethod === 'bank' ? 'transfer' : (financialMethod === 'card' ? 'card' : 'cash')) as any,
      timestamp: nowIso,
      created_at: nowIso,
      userId: 'system',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      status: 'completed',
      employeeName: 'Direction/Caisse',
      amountReceived: amount,
      amountReturned: 0,
      notes: noteRefStr,
      source: 'topup',
      taxAmount: 0,
      subtotal: amount
    };
  }

  usePeopleStore.getState().setCustomers(prev => 
    prev.map(c => c.id === selectedCustomer.id ? updatedCustomer : c)
  );

  try {
    await localDb.update(`customers/${selectedCustomer.id}`, {
      ...updatedCustomer,
      deltaBalance: change
    });
    if (expenseData) {
      await localDb.insert(`expenses/${expenseData.id}`, expenseData);
      useFinanceStore.getState().setExpenses(prev => [expenseData!, ...(prev || [])]);
    }
    if (topUpTx) {
      await localDb.insert(`transactions/${topUpTx.id}`, topUpTx);
      useTransactionStore.getState().setTransactions(prev => [topUpTx!, ...(prev || [])]);
    }
  } catch (localErr) {
    console.warn("Mise à jour locale:", localErr);
  }
  
  toast.success(`Opération enregistrée : ${amount.toFixed(2)} ${settings.currency || 'DA'}`);
  return true;
}
