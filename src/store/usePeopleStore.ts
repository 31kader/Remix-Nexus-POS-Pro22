import { create } from 'zustand';
import { Customer, Supplier, Employee, UserProfile } from '../types';

interface PeopleState {
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  users: UserProfile[];

  setCustomers: (customers: Customer[] | ((prev: Customer[]) => Customer[])) => void;
  setSuppliers: (suppliers: Supplier[] | ((prev: Supplier[]) => Supplier[])) => void;
  setEmployees: (employees: Employee[] | ((prev: Employee[]) => Employee[])) => void;
  setUsers: (users: UserProfile[] | ((prev: UserProfile[]) => UserProfile[])) => void;
}

export const usePeopleStore = create<PeopleState>((set) => ({
  customers: [],
  suppliers: [],
  employees: [],
  users: [],

  setCustomers: (update) => set((state) => ({
    customers: typeof update === 'function' ? update(state.customers) : update
  })),
  setSuppliers: (update) => set((state) => ({
    suppliers: typeof update === 'function' ? update(state.suppliers) : update
  })),
  setEmployees: (update) => set((state) => ({
    employees: typeof update === 'function' ? update(state.employees) : update
  })),
  setUsers: (update) => set((state) => ({
    users: typeof update === 'function' ? update(state.users) : update
  })),
}));
