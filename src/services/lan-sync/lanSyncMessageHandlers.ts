import { LanStockAdjustmentPayload, LanCustomerBalancePayload } from '../../types/lanSync';
import { useCoreStore } from '../../store/useCoreStore';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { localDb } from '../LocalDatabase';

/**
 * Applique un ajustement de stock reçu en direct d'une autre caisse
 */
export function applyStockAdjustment(payload: LanStockAdjustmentPayload): void {
  if (!payload || !payload.productId) return;

  const coreStore = useCoreStore.getState();
  const product = coreStore.products.find(p => p && p.id === payload.productId);
  if (!product) return;

  const delta = Number(payload.adjustment ?? payload.delta ?? 0);
  const mode = payload.mode || 'delta';
  let updatedProduct: any = null;

  // 1. Mise à jour Zustand réactive (UI instantanée) avec calcul atomique dans le mapper
  coreStore.setProducts(prev => 
    prev.map(p => {
      if (!p || p.id !== payload.productId) return p;
      const currentStock = Number(p.stock) || 0;
      const newStock = mode === 'set' && payload.newQuantity !== undefined 
        ? payload.newQuantity 
        : (currentStock + delta);

      updatedProduct = {
        ...p,
        stock: newStock,
        updatedAt: new Date().toISOString()
      };
      return updatedProduct;
    })
  );

  if (!updatedProduct) return;

  // 2. Persistance locale sans ré-émettre dans la file Cloud pour éviter de doubler
  localDb.updateLocalOnly(`products/${payload.productId}`, {
    stock: updatedProduct.stock,
    updatedAt: updatedProduct.updatedAt
  });

  // 3. Déclenchement de l'événement de mise à jour du cache produit
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('product-cache-update', {
      detail: updatedProduct
    }));
  }
}

/**
 * Applique une nouvelle vente encaissée sur un autre poste
 */
export function applyIncomingTransaction(transaction: any): void {
  if (!transaction || !transaction.id) return;

  const txStore = useTransactionStore.getState();
  const existing = Array.isArray(txStore.transactions) 
    ? txStore.transactions.some(t => t && t.id === transaction.id)
    : false;

  if (existing) return;

  // 1. Ajouter à la liste des transactions
  txStore.setTransactions(prev => [transaction, ...(Array.isArray(prev) ? prev : [])]);

  // 2. Persister en IndexedDB localement
  localDb.updateLocalOnly(`transactions/${transaction.id}`, transaction);

  // 3. Notifier l'interface
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-transaction-created', {
      detail: transaction
    }));
  }
}

/**
 * Applique une mise à jour d'un ticket existant (édition / remboursement)
 */
export function applyTransactionUpdate(transaction: any): void {
  if (!transaction || !transaction.id) return;

  const txStore = useTransactionStore.getState();
  txStore.setTransactions(prev => {
    const safe = Array.isArray(prev) ? prev : [];
    return safe.map(t => t && t.id === transaction.id ? { ...t, ...transaction } : t);
  });

  localDb.updateLocalOnly(`transactions/${transaction.id}`, transaction);
}

/**
 * Applique une mise à jour de solde / fidélité client
 */
export function applyCustomerBalanceUpdate(payload: LanCustomerBalancePayload): void {
  if (!payload || !payload.customerId) return;

  const peopleStore = usePeopleStore.getState();
  let updatedCustomer: any = null;

  peopleStore.setCustomers((prev: any[]) =>
    (Array.isArray(prev) ? prev : []).map((c: any) => {
      if (!c || c.id !== payload.customerId) return c;
      const currentBalance = Number(c.balance) || 0;
      const currentSpent = Number(c.totalSpent) || 0;
      const currentPoints = Number(c.loyaltyPoints) || 0;

      const newBalance = currentBalance + Number(payload.deltaBalance || 0);
      const newSpent = currentSpent + Number(payload.deltaSpent || 0);
      const newPoints = currentPoints + Number(payload.deltaPoints || 0);

      updatedCustomer = {
        ...c,
        balance: newBalance,
        totalSpent: newSpent,
        loyaltyPoints: newPoints,
        updatedAt: new Date().toISOString()
      };
      return updatedCustomer;
    })
  );

  if (!updatedCustomer) return;

  localDb.updateLocalOnly(`customers/${payload.customerId}`, {
    balance: updatedCustomer.balance,
    totalSpent: updatedCustomer.totalSpent,
    loyaltyPoints: updatedCustomer.loyaltyPoints,
    updatedAt: updatedCustomer.updatedAt
  });
}
