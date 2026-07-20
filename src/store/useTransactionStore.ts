import { create } from 'zustand';
import { Transaction, PurchaseOrder, ProductReturn, OnlineOrder, CashShift } from '../types';

interface TransactionState {
  transactions: Transaction[];
  purchaseOrders: PurchaseOrder[];
  returns: ProductReturn[];
  onlineOrders: OnlineOrder[];
  shifts: CashShift[];
  activeShift: CashShift | null;

  setTransactions: (transactions: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  setPurchaseOrders: (purchaseOrders: PurchaseOrder[] | ((prev: PurchaseOrder[]) => PurchaseOrder[])) => void;
  setReturns: (returns: ProductReturn[] | ((prev: ProductReturn[]) => ProductReturn[])) => void;
  setOnlineOrders: (onlineOrders: OnlineOrder[] | ((prev: OnlineOrder[]) => OnlineOrder[])) => void;
  setShifts: (shifts: CashShift[] | ((prev: CashShift[]) => CashShift[])) => void;
  setActiveShift: (activeShift: CashShift | null | ((prev: CashShift | null) => CashShift | null)) => void;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  purchaseOrders: [],
  returns: [],
  onlineOrders: [],
  shifts: [],
  activeShift: null,

  setTransactions: (update) => set((state) => {
    let incoming: Transaction[];
    if (typeof update === 'function') {
      incoming = update(state.transactions);
    } else {
      incoming = update;
    }

    let offlineTxs: Transaction[] = [];
    try {
      offlineTxs = JSON.parse(localStorage.getItem('nexus_offline_transactions') || '[]');
    } catch (err) {
      console.warn('Failed parsing local offline transactions', err);
    }

    const merged = [...offlineTxs, ...incoming];
    const uniqueMap = new Map<string, Transaction>();
    merged.forEach(t => {
      if (t && t.id) {
        uniqueMap.set(t.id, t);
      }
    });
    const unique = Array.from(uniqueMap.values());

    unique.sort((a, b) => {
      const d1 = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const d2 = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return d2 - d1;
    });

    return { transactions: unique };
  }),
  setPurchaseOrders: (update) => set((state) => ({
    purchaseOrders: typeof update === 'function' ? update(state.purchaseOrders) : update
  })),
  setReturns: (update) => set((state) => ({
    returns: typeof update === 'function' ? update(state.returns) : update
  })),
  setOnlineOrders: (update) => set((state) => ({
    onlineOrders: typeof update === 'function' ? update(state.onlineOrders) : update
  })),
  setShifts: (update) => set((state) => ({
    shifts: typeof update === 'function' ? update(state.shifts) : update
  })),
  setActiveShift: (update) => set((state) => ({
    activeShift: typeof update === 'function' ? update(state.activeShift) : update
  })),
}));
