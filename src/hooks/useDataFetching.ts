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

  // 🛡️ SÉCURISATION DES STORES : On intercepte les données pour s'assurer que ce sont toujours des Tableaux (Arrays)
  const safeSetProducts = (data: any) => setProducts(Array.isArray(data) ? data : []);
  const safeSetCategories = (data: any) => setCategories(Array.isArray(data) ? data : []);
  const safeSetBrands = (data: any) => setBrands(Array.isArray(data) ? data : []);
  const safeSetPromotions = (data: any) => setPromotions(Array.isArray(data) ? data : []);
  
  const safeSetTransactions = (data: any) => setTransactions(Array.isArray(data) ? data : []);
  const safeSetReturns = (data: any) => setReturns(Array.isArray(data) ? data : []);
  const safeSetExpenses = (data: any) => setExpenses(Array.isArray(data) ? data : []);
  const safeSetPurchases = (data: any) => setPurchases(Array.isArray(data) ? data : []);
  
  const safeSetCustomers = (data: any) => setCustomers(Array.isArray(data) ? data : []);
  const safeSetSuppliers = (data: any) => setSuppliers(Array.isArray(data) ? data : []);
  const safeSetUsers = (data: any) => setUsers(Array.isArray(data) ? data : []);
  const safeSetEmployees = (data: any) => setEmployees(Array.isArray(data) ? data : []);

  const safeSetStockAdjustments = (data: any) => setStockAdjustments(Array.isArray(data) ? data : []);
  const safeSetSupplierPayments = (data: any) => setSupplierPayments(Array.isArray(data) ? data : []);
  const safeSetDamagedItems = (data: any) => setDamagedItems(Array.isArray(data) ? data : []);
  const safeSetAuditLogs = (data: any) => setAuditLogs(Array.isArray(data) ? data : []);
  const safeSetPurchaseOrders = (data: any) => setPurchaseOrders(Array.isArray(data) ? data : []);
  const safeSetPatterns = (data: any) => setPatterns(Array.isArray(data) ? data : []);
  const safeSetSupplierSyncs = (data: any) => setSupplierSyncs(Array.isArray(data) ? data : []);
  const safeSetOnlineOrders = (data: any) => setOnlineOrders(Array.isArray(data) ? data : []);
  const safeSetShifts = (data: any) => setShifts(Array.isArray(data) ? data : []);

  // Hook 1: Core real-time subscriptions with caching and syncing
  useProductsAndCoreData({
    loading, appMode, userId: user?.uid,
    setProducts: safeSetProducts,       // 👈 Utilise la version sécurisée
    setCategories: safeSetCategories,   // 👈 Utilise la version sécurisée
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
    loading, appMode, userId: user?.uid, userRole: profile?.role,
    setSettings, 
    setEmployees: safeSetEmployees,    // 👈 Utilise la version sécurisée
    setPatterns: safeSetPatterns, 
    setSupplierSyncs: safeSetSupplierSyncs
  });

  // Hook 3: Subscribing to fast-updating real-time shifts, online orders and live settings
  useFastChangingData({
    loading, userId: user?.uid,
    setOnlineOrders: safeSetOnlineOrders, 
    setShifts: safeSetShifts, 
    setActiveShift, 
    setSettings
  });

  // Hook 4: Loading context-specific purchase orders or client orders depending on current supplier/customer selects
  useSupplierAndCustomerData({
    loading, appMode,
    currentSupplierId: currentSupplier?.id,
    currentCustomerId: currentCustomer?.id,
    setPurchaseOrders: safeSetPurchaseOrders, // 👈 Utilise la version sécurisée
    setTransactions: safeSetTransactions,     // 👈 Utilise la version sécurisée
    setSettings
  });
}

export default useDataFetching;