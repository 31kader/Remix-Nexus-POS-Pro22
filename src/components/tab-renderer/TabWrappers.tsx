import React, { lazy } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCoreStore } from '../../store/useCoreStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { usePeopleStore } from '../../store/usePeopleStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useInventoryStore } from '../../store/useInventoryStore';

// Re-export des onglets extraits
export * from './TabWrappersInventoryReports';

// Lazy imports des modules métier
const Employees = lazy(() => import('../Employees').then(m => ({ default: m.Employees })));
const TeamManagement = lazy(() => import('../employees/TeamManagement').then(m => ({ default: m.TeamManagement })));
const TransactionHistory = lazy(() => import('../TransactionHistory').then(m => ({ default: m.TransactionHistory })));
const SmartPurchase = lazy(() => import('../SmartPurchase').then(m => ({ default: m.SmartPurchase })));
const Orders = lazy(() => import('../Orders').then(m => ({ default: m.Orders })));
const Returns = lazy(() => import('../Returns').then(m => ({ default: m.Returns })));
const Expenses = lazy(() => import('../Expenses').then(m => ({ default: m.Expenses })));
const CashManagement = lazy(() => import('../CashManagement').then(m => ({ default: m.CashManagement })));
const CameraPortal = lazy(() => import('../CameraPortal').then(m => ({ default: m.CameraPortal })));
const Settings = lazy(() => import('../Settings').then(m => ({ default: m.Settings })));
const ArchiveManager = lazy(() => import('../ArchiveManager').then(m => ({ default: m.ArchiveManager })));
const AuditLogs = lazy(() => import('../AuditLogs').then(m => ({ default: m.AuditLogs })));
const CatalogPrinter = lazy(() => import('../CatalogPrinter').then(m => ({ default: m.CatalogPrinter })));
const MobileCartonReception = lazy(() => import('../mobile/MobileCartonReception').then(m => ({ default: m.MobileCartonReception })));

export const EmployeesTab: React.FC<any> = (props) => {
  const employees = usePeopleStore(s => s.employees);
  const transactions = useTransactionStore(s => s.transactions);
  const attendance = useInventoryStore(s => s.attendance);
  const advances = useFinanceStore(s => s.advances);
  const settings = useCoreStore(s => s.settings);
  const users = usePeopleStore(s => s.users);
  return (
    <Employees
      employees={employees || []}
      transactions={transactions || []}
      attendance={attendance || []}
      advances={advances || []}
      settings={settings || {}}
      users={users || []}
      setIsAddUserModalOpen={props.setIsAddUserModalOpen}
    />
  );
};

export const TransactionHistoryTab: React.FC<any> = (props) => {
  const transactions = useTransactionStore(s => s.transactions);
  const settings = useCoreStore(s => s.settings);
  const profile = useAuthStore(s => s.profile);
  return (
    <TransactionHistory
      transactions={transactions || []}
      onReturn={props.onReturn}
      onMarkAsDelivered={props.onMarkAsDelivered}
      onEdit={props.onEdit}
      onRestore={props.onRestore}
      settings={settings || {}}
      canAccess={props.canAccess}
      profile={profile || undefined}
    />
  );
};

export const CartonReceptionTab: React.FC<any> = (props) => {
  const products = useCoreStore(s => s.products);
  const suppliers = usePeopleStore(s => s.suppliers);
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  return (
    <MobileCartonReception
      products={products || []}
      suppliers={suppliers || []}
      onBackToPos={() => props.setActiveTab('inventory')}
      currentUserId={user?.uid}
      currentUserName={user?.displayName || profile?.displayName || 'Agent Dépôt'}
      isStandalone={false}
    />
  );
};

export const SmartPurchaseTab: React.FC<any> = (props) => {
  const products = useCoreStore(s => s.products);
  const suppliers = usePeopleStore(s => s.suppliers);
  const patterns = useCoreStore(s => s.patterns);
  const purchases = useFinanceStore(s => s.purchases);
  const purchaseOrders = useTransactionStore(s => s.purchaseOrders);
  const settings = useCoreStore(s => s.settings);
  const user = useAuthStore(s => s.user);
  const categories = useCoreStore(s => s.categories);
  const supplierPayments = useFinanceStore(s => s.supplierPayments);
  return (
    <SmartPurchase
      products={products || []}
      suppliers={suppliers || []}
      patterns={patterns || []}
      purchases={purchases || []}
      purchaseOrders={purchaseOrders || []}
      settings={settings || {}}
      user={user}
      categories={categories || []}
      supplierPayments={supplierPayments || []}
      setIsProductModalOpen={props.setIsProductModalOpen}
      setEditingProduct={props.setEditingProduct}
      isProductModalOpen={props.isProductModalOpen}
      editingProduct={props.editingProduct}
      setViewingPurchaseVoucher={props.setViewingPurchaseVoucher}
    />
  );
};

export const OrdersTab: React.FC<any> = () => {
  const onlineOrders = useTransactionStore(s => s.onlineOrders);
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  const employees = usePeopleStore(s => s.employees);
  const customers = usePeopleStore(s => s.customers);
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  return (
    <Orders
      orders={onlineOrders || []}
      products={products || []}
      settings={settings || {}}
      employees={employees || []}
      customers={customers || []}
      user={user}
      profile={profile || undefined}
    />
  );
};

export const ReturnsTab: React.FC<any> = () => {
  const returns = useTransactionStore(s => s.returns);
  const settings = useCoreStore(s => s.settings);
  const products = useCoreStore(s => s.products);
  return <Returns returns={returns || []} settings={settings || {}} products={products || []} />;
};

export const ExpensesTab: React.FC<any> = () => {
  const expenses = useFinanceStore(s => s.expenses);
  const user = useAuthStore(s => s.user);
  const settings = useCoreStore(s => s.settings);
  return <Expenses expenses={expenses || []} user={user} settings={settings || {}} />;
};

export const ShiftsTab: React.FC<any> = () => {
  const activeShift = useTransactionStore(s => s.activeShift);
  const shifts = useTransactionStore(s => s.shifts);
  const transactions = useTransactionStore(s => s.transactions);
  const expenses = useFinanceStore(s => s.expenses);
  const profile = useAuthStore(s => s.profile);
  const settings = useCoreStore(s => s.settings);
  return (
    <CashManagement
      activeShift={activeShift}
      shifts={shifts || []}
      transactions={transactions || []}
      expenses={expenses || []}
      user={profile!}
      settings={settings || {}}
    />
  );
};

export const CameraTab: React.FC<any> = () => {
  const settings = useCoreStore(s => s.settings);
  const profile = useAuthStore(s => s.profile);
  return <CameraPortal settings={settings || {}} user={profile!} />;
};

export const SettingsTab: React.FC<any> = () => {
  const settings = useCoreStore(s => s.settings);
  return <Settings settings={settings || {}} />;
};

export const ArchivesTab: React.FC<any> = () => {
  const user = useAuthStore(s => s.user);
  const settings = useCoreStore(s => s.settings);
  return <ArchiveManager user={user} settings={settings || {}} />;
};

export const TeamTab: React.FC<any> = (props) => {
  const users = usePeopleStore(s => s.users);
  const employees = usePeopleStore(s => s.employees);
  const settings = useCoreStore(s => s.settings);
  return <TeamManagement users={users || []} employees={employees || []} settings={settings || {}} setIsAddUserModalOpen={props.setIsAddUserModalOpen} />;
};

export const AuditLogsTab: React.FC<any> = () => {
  const auditLogs = useFinanceStore(s => s.auditLogs);
  const settings = useCoreStore(s => s.settings);
  const products = useCoreStore(s => s.products);
  const transactions = useTransactionStore(s => s.transactions);
  return <AuditLogs logs={auditLogs || []} settings={settings || {}} products={products || []} transactions={transactions || []} />;
};

export const CatalogPrinterTab: React.FC<any> = () => {
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  return <CatalogPrinter products={products || []} settings={settings || {}} />;
};
