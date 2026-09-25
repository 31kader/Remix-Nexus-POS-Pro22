import { useState } from 'react';
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

export function useDataFetching(
  user: any,
  profile: any,
  appMode: string,
  currentSupplier: Supplier | null,
  currentCustomer: Customer | null,
  loading: boolean,
  playNotificationSound: () => void // Keep for interface compatibility
) {
  const { setSettings, setProducts, setCategories, setBrands, setPromotions, setPatterns, setIsDataLoading } = useCoreStore();
  const { setTransactions, setPurchaseOrders, setReturns, setOnlineOrders, setShifts, setActiveShift } = useTransactionStore();
  const { setCustomers, setSuppliers, setEmployees, setUsers } = usePeopleStore();
  const { setStockAdjustments, setAudits, setDamagedItems, setSupplierSyncs, setAttendance } = useInventoryStore();
  const { setPurchases, setExpenses, setSupplierPayments, setAdvances, setAuditLogs } = useFinanceStore();

  // 🛡️ SÉCURISATION DES STORES : Supporte à la fois les Tableaux directs ET les fonctions de mise à jour (prev => next)
  const safeSetter = (setter: (val: any) => void) => (update: any) => {
    if (typeof update === 'function') {
      setter((prev: any) => {
        const res = update(prev);
        return Array.isArray(res) ? res : [];
      });
    } else {
      setter(Array.isArray(update) ? update : []);
    }
  };

  const safeSetProducts = safeSetter(setProducts);
  const safeSetCategories = safeSetter(setCategories);
  const safeSetBrands = safeSetter(setBrands);
  const safeSetPromotions = safeSetter(setPromotions);
  
  const safeSetTransactions = safeSetter(setTransactions);
  const safeSetReturns = safeSetter(setReturns);
  const safeSetExpenses = safeSetter(setExpenses);
  const safeSetPurchases = safeSetter(setPurchases);
  
  const safeSetCustomers = safeSetter(setCustomers);
  const safeSetSuppliers = safeSetter(setSuppliers);
  const safeSetUsers = safeSetter(setUsers);
  const safeSetEmployees = safeSetter(setEmployees);

  const safeSetStockAdjustments = safeSetter(setStockAdjustments);
  const safeSetSupplierPayments = safeSetter(setSupplierPayments);
  const safeSetDamagedItems = safeSetter(setDamagedItems);
  const safeSetAuditLogs = safeSetter(setAuditLogs);
  const safeSetPurchaseOrders = safeSetter(setPurchaseOrders);
  const safeSetPatterns = safeSetter(setPatterns);
  const safeSetSupplierSyncs = safeSetter(setSupplierSyncs);
  const safeSetOnlineOrders = safeSetter(setOnlineOrders);
  const safeSetShifts = safeSetter(setShifts);

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