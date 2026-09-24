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

const isAutoReplenishment = (p: any): boolean => {
  if (!p) return false;
  const sId = p.supplierId || p.supplier_id;
  const sName = (p.supplierName || p.supplier_name || '').toLowerCase();
  return sId === 'low-stock-auto' || sName.includes('auto-réapprovisionnement') || sName.includes('auto-reapprovisionnement');
};

export const useFinanceStore = create<FinanceState>((set) => ({
  purchases: [],
  expenses: [],
  supplierPayments: [],
  advances: [],
  auditLogs: [],

  setPurchases: (update) => set((state) => {
    const raw = typeof update === 'function' ? update(state.purchases) : update;
    const clean = Array.isArray(raw) ? raw.filter(p => !isAutoReplenishment(p)) : raw;
    return { purchases: clean };
  }),
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
