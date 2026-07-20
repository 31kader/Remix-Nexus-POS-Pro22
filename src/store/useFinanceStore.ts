import { create } from 'zustand';
import { Purchase, Expense, SupplierPayment, AdvanceRecord, AuditLog } from '../types';

interface FinanceState {
  purchases: Purchase[];
  expenses: Expense[];
  supplierPayments: SupplierPayment[];
  advances: AdvanceRecord[];
  auditLogs: AuditLog[];

  setPurchases: (purchases: Purchase[] | ((prev: Purchase[]) => Purchase[])) => void;
  setExpenses: (expenses: Expense[] | ((prev: Expense[]) => Expense[])) => void;
  setSupplierPayments: (payments: SupplierPayment[] | ((prev: SupplierPayment[]) => SupplierPayment[])) => void;
  setAdvances: (advances: AdvanceRecord[] | ((prev: AdvanceRecord[]) => AdvanceRecord[])) => void;
  setAuditLogs: (logs: AuditLog[] | ((prev: AuditLog[]) => AuditLog[])) => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  purchases: [],
  expenses: [],
  supplierPayments: [],
  advances: [],
  auditLogs: [],

  setPurchases: (update) => set((state) => ({
    purchases: typeof update === 'function' ? update(state.purchases) : update
  })),
  setExpenses: (update) => set((state) => ({
    expenses: typeof update === 'function' ? update(state.expenses) : update
  })),
  setSupplierPayments: (update) => set((state) => ({
    supplierPayments: typeof update === 'function' ? update(state.supplierPayments) : update
  })),
  setAdvances: (update) => set((state) => ({
    advances: typeof update === 'function' ? update(state.advances) : update
  })),
  setAuditLogs: (update) => set((state) => ({
    auditLogs: typeof update === 'function' ? update(state.auditLogs) : update
  })),
}));
