import { useState, useMemo } from 'react';
import { 
  CompanySettings, Product, Category, Brand, Transaction, Promotion, Customer, Supplier, Employee,
  UserProfile, ProductReturn, PurchaseOrder, OnlineOrder, Purchase, InvoicePattern,
  StockAdjustment, Expense, InventoryAudit, SupplierSync, CashShift, AttendanceRecord,
  AdvanceRecord, SupplierPayment, AuditLog, DamagedRecord
} from '../types';
import { DEFAULT_SETTINGS } from './data-fetching/initialStates';

import { useProductsAndCoreData } from './data-fetching/useProductsAndCoreData';
import { useAdminStaticData } from './data-fetching/useAdminStaticData';
import { useFastChangingData } from './data-fetching/useFastChangingData';
import { useSupplierAndCustomerData } from './data-fetching/useSupplierAndCustomerData';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useFinanceStore } from '../store/useFinanceStore';

// 🛡️ SÉCURISATION DES STORES : Supporte à la fois les Tableaux directs ET les fonctions de mise à jour (prev => next)
const createSafeSetter = (setter: (val: any) => void) => (update: any) => {
  if (typeof update === 'function') {
    setter((prev: any) => {
      const res = update(prev);
      return Array.isArray(res) ? res : [];
    });
  } else {
    setter(Array.isArray(update) ? update : []);
  }
};

export function useDataFetching(
  user: any,
  profile: any,
  appMode: string,
  currentSupplier: Supplier | null,
  currentCustomer: Customer | null,
  loading: boolean,
  playNotificationSound: () => void // Keep for interface compatibility
) {
  // Sélecteurs atomiques pour éliminer les re-renders inutiles à la racine App.tsx
  const setSettings = useCoreStore(s => s.setSettings);
  const setProducts = useCoreStore(s => s.setProducts);
  const setCategories = useCoreStore(s => s.setCategories);
  const setBrands = useCoreStore(s => s.setBrands);
  const setPromotions = useCoreStore(s => s.setPromotions);
  const setPatterns = useCoreStore(s => s.setPatterns);
  const setIsDataLoading = useCoreStore(s => s.setIsDataLoading);

  const setTransactions = useTransactionStore(s => s.setTransactions);
  const setPurchaseOrders = useTransactionStore(s => s.setPurchaseOrders);
  const setReturns = useTransactionStore(s => s.setReturns);
  const setOnlineOrders = useTransactionStore(s => s.setOnlineOrders);
  const setShifts = useTransactionStore(s => s.setShifts);
  const setActiveShift = useTransactionStore(s => s.setActiveShift);

  const setCustomers = usePeopleStore(s => s.setCustomers);
  const setSuppliers = usePeopleStore(s => s.setSuppliers);
  const setEmployees = usePeopleStore(s => s.setEmployees);
  const setUsers = usePeopleStore(s => s.setUsers);

  const setStockAdjustments = useInventoryStore(s => s.setStockAdjustments);
  const setAudits = useInventoryStore(s => s.setAudits);
  const setDamagedItems = useInventoryStore(s => s.setDamagedItems);
  const setSupplierSyncs = useInventoryStore(s => s.setSupplierSyncs);
  const setAttendance = useInventoryStore(s => s.setAttendance);

  const setPurchases = useFinanceStore(s => s.setPurchases);
  const setExpenses = useFinanceStore(s => s.setExpenses);
  const setSupplierPayments = useFinanceStore(s => s.setSupplierPayments);
  const setAdvances = useFinanceStore(s => s.setAdvances);
  const setAuditLogs = useFinanceStore(s => s.setAuditLogs);

  // Setters stabilisés via useMemo évitant la recréation de closures à chaque rendu
  const safeSetProducts = useMemo(() => createSafeSetter(setProducts), [setProducts]);
  const safeSetCategories = useMemo(() => createSafeSetter(setCategories), [setCategories]);
  const safeSetBrands = useMemo(() => createSafeSetter(setBrands), [setBrands]);
  const safeSetPromotions = useMemo(() => createSafeSetter(setPromotions), [setPromotions]);
  
  const safeSetTransactions = useMemo(() => createSafeSetter(setTransactions), [setTransactions]);
  const safeSetReturns = useMemo(() => createSafeSetter(setReturns), [setReturns]);
  const safeSetExpenses = useMemo(() => createSafeSetter(setExpenses), [setExpenses]);
  const safeSetPurchases = useMemo(() => createSafeSetter(setPurchases), [setPurchases]);
  
  const safeSetCustomers = useMemo(() => createSafeSetter(setCustomers), [setCustomers]);
  const safeSetSuppliers = useMemo(() => createSafeSetter(setSuppliers), [setSuppliers]);
  const safeSetUsers = useMemo(() => createSafeSetter(setUsers), [setUsers]);
  const safeSetEmployees = useMemo(() => createSafeSetter(setEmployees), [setEmployees]);

  const safeSetStockAdjustments = useMemo(() => createSafeSetter(setStockAdjustments), [setStockAdjustments]);
  const safeSetSupplierPayments = useMemo(() => createSafeSetter(setSupplierPayments), [setSupplierPayments]);
  const safeSetDamagedItems = useMemo(() => createSafeSetter(setDamagedItems), [setDamagedItems]);
  const safeSetAuditLogs = useMemo(() => createSafeSetter(setAuditLogs), [setAuditLogs]);
  const safeSetAdvances = useMemo(() => createSafeSetter(setAdvances), [setAdvances]);
  const safeSetAttendance = useMemo(() => createSafeSetter(setAttendance), [setAttendance]);
  const safeSetAudits = useMemo(() => createSafeSetter(setAudits), [setAudits]);
  const safeSetPurchaseOrders = useMemo(() => createSafeSetter(setPurchaseOrders), [setPurchaseOrders]);
  const safeSetPatterns = useMemo(() => createSafeSetter(setPatterns), [setPatterns]);
  const safeSetSupplierSyncs = useMemo(() => createSafeSetter(setSupplierSyncs), [setSupplierSyncs]);
  const safeSetOnlineOrders = useMemo(() => createSafeSetter(setOnlineOrders), [setOnlineOrders]);
  const safeSetShifts = useMemo(() => createSafeSetter(setShifts), [setShifts]);

  const activeUserId = user?.uid || user?.id || profile?.uid || profile?.id || 'unauthenticated';

  // Hook 1: Core real-time subscriptions with caching and syncing
  useProductsAndCoreData({
    loading, 
    appMode, 
    userId: activeUserId,
    setProducts: safeSetProducts,
    setCategories: safeSetCategories,
    setBrands: safeSetBrands, 
    setTransactions: safeSetTransactions, 
    setPromotions: safeSetPromotions, 
    setCustomers: safeSetCustomers, 
    setSuppliers: safeSetSuppliers,
    setUsers: safeSetUsers, 
    setReturns: safeSetReturns, 
    setExpenses: safeSetExpenses, 
    setStockAdjustments: safeSetStockAdjustments, 
    setPurchases: safeSetPurchases, 
    setSupplierPayments: safeSetSupplierPayments, 
    setDamagedItems: safeSetDamagedItems, 
    setAuditLogs: safeSetAuditLogs,
    setAdvances: safeSetAdvances,
    setAttendance: safeSetAttendance,
    setAudits: safeSetAudits,
    setIsDataLoading
  });

  // Hook 2: Loading static admin configurations
  useAdminStaticData({
    loading, 
    appMode, 
    userId: activeUserId, 
    userRole: profile?.role,
    setSettings, 
    setEmployees: safeSetEmployees,
    setPatterns: safeSetPatterns, 
    setSupplierSyncs: safeSetSupplierSyncs
  });

  // Hook 3: Subscribing to fast-updating real-time shifts, online orders and live settings
  useFastChangingData({
    loading, 
    userId: activeUserId,
    setOnlineOrders: safeSetOnlineOrders, 
    setShifts: safeSetShifts, 
    setActiveShift, 
    setSettings
  });

  // Hook 4: Loading context-specific purchase orders or client orders depending on current supplier/customer selects
  useSupplierAndCustomerData({
    loading, 
    appMode,
    currentSupplierId: currentSupplier?.id,
    currentCustomerId: currentCustomer?.id,
    setPurchaseOrders: safeSetPurchaseOrders,
    setTransactions: safeSetTransactions,
    setSettings
  });
}

export default useDataFetching;