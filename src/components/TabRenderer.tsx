import React, { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { isTabAllowed } from '../lib/permissions';

import { useAuthStore } from '../store/useAuthStore';
import { useCoreStore } from '../store/useCoreStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from './ui';

// IMPORTATION SÉCURISÉE DE CHECKOUT
const Checkout = lazy(() =>
import('./Checkout').then(m => ({ default: m.Checkout })));
const DetailedReports = lazy(() => import('./DetailedReports').then(m => ({ default: m.DetailedReports })));
const Inventory = lazy(() => import('./Inventory').then(m => ({ default: m.Inventory })));
const ExpiryManager = lazy(() => import('./ExpiryManager').then(m => ({ default: m.ExpiryManager })));
const InventorySettings = lazy(() => import('./InventorySettings').then(m => ({ default: m.InventorySettings })));
const VoucherManager = lazy(() => import('./VoucherManager').then(m => ({ default: m.VoucherManager })));
const GRNManager = lazy(() => import('./GRNManager').then(m => ({ default: m.GRNManager })));
const InventoryAudit = lazy(() => import('./InventoryAudit').then(m => ({ default: m.InventoryAudit })));
const Promotions = lazy(() => import('./Promotions').then(m => ({ default: m.Promotions })));
const Customers = lazy(() => import('./Customers').then(m => ({ default: m.Customers })));
const Suppliers = lazy(() => import('./Suppliers').then(m => ({ default: m.Suppliers })));
const Employees = lazy(() => import('./Employees').then(m => ({ default: m.Employees })));
const TeamManagement = lazy(() => import('./employees/TeamManagement').then(m => ({ default: m.TeamManagement })));
const TransactionHistory = lazy(() => import('./TransactionHistory').then(m => ({ default: m.TransactionHistory })));
const SmartPurchase = lazy(() => import('./SmartPurchase').then(m => ({ default: m.SmartPurchase })));
const Orders = lazy(() => import('./Orders').then(m => ({ default: m.Orders })));
const Returns = lazy(() => import('./Returns').then(m => ({ default: m.Returns })));
const Expenses = lazy(() => import('./Expenses').then(m => ({ default: m.Expenses })));
const CashManagement = lazy(() => import('./CashManagement').then(m => ({ default: m.CashManagement })));
const CameraPortal = lazy(() => import('./CameraPortal').then(m => ({ default: m.CameraPortal })));
const Settings = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const ArchiveManager = lazy(() => import('./ArchiveManager').then(m => ({ default: m.ArchiveManager })));
const AuditLogs = lazy(() => import('./AuditLogs').then(m => ({ default: m.AuditLogs })));
const Help = lazy(() => import('./Help').then(m => ({ default: m.Help })));
const MarketingPosters = lazy(() => import('./MarketingPosters').then(m => ({ default: m.MarketingPosters })));
const SyncStudio = lazy(() => import('./SyncStudio').then(m => ({ default: m.SyncStudio })));
const CatalogPrinter = lazy(() => import('./CatalogPrinter').then(m => ({ default: m.CatalogPrinter })));

interface TabRendererProps {
  activeTab: string;
  [key: string]: any;
}

// Écran de chargement affiché pendant le chargement d'un module lazy
const loadingFallback = (
  <div className="flex flex-col items-center justify-center min-h-[400px] h-full space-y-4">
    <div className="w-10 h-10 border-4 border-slate-700 border-t-white rounded-full animate-spin" />
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
      Chargement du module…
    </p>
  </div>
);

// Tab Wrappers that only subscribe to what each specific tab needs

const DetailedReportsTab: React.FC<any> = (props) => {
  const transactions = useTransactionStore(s => s.transactions);
  const products = useCoreStore(s => s.products);
  const employees = usePeopleStore(s => s.employees);
  const expenses = useFinanceStore(s => s.expenses);
  const supplierPayments = useFinanceStore(s => s.supplierPayments);
  const returns = useTransactionStore(s => s.returns);
  const settings = useCoreStore(s => s.settings);
  const categories = useCoreStore(s => s.categories);
  const customers = usePeopleStore(s => s.customers);
  const stockAdjustments = useInventoryStore(s => s.stockAdjustments);
  return (
    <DetailedReports
      transactions={transactions || []}
      products={products || []}
      employees={employees || []}
      expenses={expenses || []}
      supplierPayments={supplierPayments || []}
      returns={returns || []}
      settings={settings || {}}
      categories={categories || []}
      customers={customers || []}
      stockAdjustments={stockAdjustments || []}
      setEditingProduct={props.setEditingProduct}
      setIsProductModalOpen={props.setIsProductModalOpen}
    />
  );
};

const ExpiryManagerTab: React.FC<any> = (props) => {
  const products = useCoreStore(s => s.products);
  const categories = useCoreStore(s => s.categories);
  return (
    <ExpiryManager
      products={products || []}
      categories={categories || []}
      onUpdateProduct={props.onUpdateProduct}
      onAdjustStock={props.onAdjustStock}
      onEditProduct={props.onEditProduct}
    />
  );
};

const InventorySettingsTab: React.FC<any> = (props) => {
  const categories = useCoreStore(s => s.categories);
  const brands = useCoreStore(s => s.brands);
  const products = useCoreStore(s => s.products);
  return (
    <InventorySettings
      categories={categories || []}
      brands={brands || []}
      products={products || []}
      onAddCategory={props.onAddCategory}
      onEditCategory={props.onEditCategory}
      onDeleteCategory={props.onDeleteCategory}
      onAddBrand={props.onAddBrand}
      onEditBrand={props.onEditBrand}
      onDeleteBrand={props.onDeleteBrand}
    />
  );
};

const MarketingTab: React.FC<any> = () => {
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  return <MarketingPosters products={products || []} settings={settings || {}} />;
};

const VoucherTab: React.FC<any> = () => {
  const customers = usePeopleStore(s => s.customers);
  return <VoucherManager customers={customers || []} />;
};

const GRNManagerTab: React.FC<any> = (props) => {
  const products = useCoreStore(s => s.products);
  const suppliers = usePeopleStore(s => s.suppliers);
  const settings = useCoreStore(s => s.settings);
  return (
    <GRNManager
      products={products || []}
      suppliers={suppliers || []}
      setIsProductModalOpen={props.setIsProductModalOpen}
      setEditingProduct={props.setEditingProduct}
      settings={settings || {}}
    />
  );
};

const InventoryAuditTab: React.FC<any> = () => {
  const audits = useInventoryStore(s => s.audits);
  const products = useCoreStore(s => s.products);
  const user = useAuthStore(s => s.user);
  const settings = useCoreStore(s => s.settings);
  return <InventoryAudit audits={audits || []} products={products || []} user={user} settings={settings || {}} />;
};

const PromotionsTab: React.FC<any> = () => {
  const promotions = useCoreStore(s => s.promotions);
  const products = useCoreStore(s => s.products);
  const categories = useCoreStore(s => s.categories);
  const transactions = useTransactionStore(s => s.transactions);
  const settings = useCoreStore(s => s.settings);
  return (
    <Promotions
      promotions={Array.isArray(promotions) ? promotions.filter(Boolean) : []}
      products={products || []}
      categories={categories || []}
      transactions={transactions || []}
      settings={settings || {}}
    />
  );
};

const CustomersTab: React.FC<any> = (props) => {
  const customers = usePeopleStore(s => s.customers);
  const transactions = useTransactionStore(s => s.transactions);
  const settings = useCoreStore(s => s.settings);
  const products = useCoreStore(s => s.products);
  const expenses = useFinanceStore(s => s.expenses);
  const stockAdjustments = useInventoryStore(s => s.stockAdjustments);
  const categories = useCoreStore(s => s.categories);
  return (
    <Customers
      customers={customers || []}
      transactions={transactions || []}
      settings={settings || {}}
      onRestore={props.onRestore || props.loadTransactionToCart}
      products={products || []}
      expenses={expenses || []}
      stockAdjustments={stockAdjustments || []}
      categories={categories || []}
    />
  );
};

const SuppliersTab: React.FC<any> = (props) => {
  const suppliers = usePeopleStore(s => s.suppliers);
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  const purchases = useFinanceStore(s => s.purchases);
  const supplierPayments = useFinanceStore(s => s.supplierPayments);
  const categories = useCoreStore(s => s.categories);
  const user = useAuthStore(s => s.user);
  const damagedItems = useInventoryStore(s => s.damagedItems);
  return (
    <Suppliers
      suppliers={suppliers || []}
      products={products || []}
      settings={settings || {}}
      purchases={purchases || []}
      supplierPayments={supplierPayments || []}
      setViewingPurchaseVoucher={props.setViewingPurchaseVoucher}
      categories={categories || []}
      user={user}
      damagedItems={damagedItems || []}
    />
  );
};

const EmployeesTab: React.FC<any> = (props) => {
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

const TransactionHistoryTab: React.FC<any> = (props) => {
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

const SmartPurchaseTab: React.FC<any> = (props) => {
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

const OrdersTab: React.FC<any> = () => {
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

const ReturnsTab: React.FC<any> = () => {
  const returns = useTransactionStore(s => s.returns);
  const settings = useCoreStore(s => s.settings);
  const products = useCoreStore(s => s.products);
  return <Returns returns={returns || []} settings={settings || {}} products={products || []} />;
};

const ExpensesTab: React.FC<any> = () => {
  const expenses = useFinanceStore(s => s.expenses);
  const user = useAuthStore(s => s.user);
  const settings = useCoreStore(s => s.settings);
  return <Expenses expenses={expenses || []} user={user} settings={settings || {}} />;
};

const ShiftsTab: React.FC<any> = () => {
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

const CameraTab: React.FC<any> = () => {
  const settings = useCoreStore(s => s.settings);
  const profile = useAuthStore(s => s.profile);
  return <CameraPortal settings={settings || {}} user={profile!} />;
};

const SettingsTab: React.FC<any> = () => {
  const settings = useCoreStore(s => s.settings);
  return <Settings settings={settings || {}} />;
};

const ArchivesTab: React.FC<any> = () => {
  const user = useAuthStore(s => s.user);
  const settings = useCoreStore(s => s.settings);
  return <ArchiveManager user={user} settings={settings || {}} />;
};

const TeamTab: React.FC<any> = (props) => {
  const users = usePeopleStore(s => s.users);
  const employees = usePeopleStore(s => s.employees);
  const settings = useCoreStore(s => s.settings);
  return <TeamManagement users={users || []} employees={employees || []} settings={settings || {}} setIsAddUserModalOpen={props.setIsAddUserModalOpen} />;
};

const AuditLogsTab: React.FC<any> = () => {
  const auditLogs = useFinanceStore(s => s.auditLogs);
  const settings = useCoreStore(s => s.settings);
  const products = useCoreStore(s => s.products);
  const transactions = useTransactionStore(s => s.transactions);
  return <AuditLogs logs={auditLogs || []} settings={settings || {}} products={products || []} transactions={transactions || []} />;
};

const CatalogPrinterTab: React.FC<any> = () => {
  const products = useCoreStore(s => s.products);
  const settings = useCoreStore(s => s.settings);
  return <CatalogPrinter products={products || []} settings={settings || {}} />;
};

export const TabRenderer: React.FC<TabRendererProps> = ({ activeTab, ...props }) => {
  const profile = useAuthStore(s => s.profile);
  const isAllowed = isTabAllowed(activeTab, props.canAccess, {
    isAdmin: props.isAdmin || profile?.role === 'admin',
    isOwner: props.isOwner,
    isManager: props.isManager || profile?.role === 'manager',
    isCameraAgent: props.isCameraAgent || profile?.role === 'camera_agent'
  });

  const tabName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] h-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-4 shadow-sm my-4">
        <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20 text-rose-500 shadow-sm">
          <ShieldAlert size={28} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Accès Non Autorisé</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto font-medium">
            Votre profil employé ne dispose pas des droits requis pour consulter ce module ({tabName}).
          </p>
        </div>
        <Button
          onClick={() => props.setActiveTab('checkout')}
          className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md"
        >
          Retourner à la caisse
        </Button>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'checkout':
      case 'caisse':
      case 'pos':
      case 'dashboard':
      case 'ai_assistant':
        return (
          <Checkout
            setActiveTab={props.setActiveTab}
            setIsPOSCustomerModalOpen={props.setIsPOSCustomerModalOpen}
            selectedCustomer={props.selectedCustomer}
            setSelectedCustomer={props.setSelectedCustomer}
            setIsProductModalOpen={props.setIsProductModalOpen}
            setEditingProduct={props.setEditingProduct}
            activeStaffId={props.activeStaffId}
            isSidebarOpen={props.isSidebarOpen}
            setIsSidebarOpen={props.setIsSidebarOpen}
          />
        );
      case 'reports':
        return <DetailedReportsTab {...props} />;
      case 'inventory':
        return (
          <Inventory
            setActiveTab={props.setActiveTab}
            setIsProductModalOpen={props.setIsProductModalOpen}
            setEditingProduct={props.setEditingProduct}
            editingProduct={props.editingProduct}
            isProductModalOpen={props.isProductModalOpen}
            setViewingPurchaseVoucher={props.setViewingPurchaseVoucher}
          />
        );
      case 'expiry':
        return <ExpiryManagerTab {...props} />;
      case 'inventory_settings':
        return <InventorySettingsTab {...props} />;
      case 'marketing':
      case 'posters':
        return <MarketingTab {...props} />;
      case 'catalog_printer':
      case 'labels':
        return <CatalogPrinterTab {...props} />;
      case 'vouchers':
        return <VoucherTab {...props} />;
      case 'grns':
      case 'grn':
        return <GRNManagerTab {...props} />;
      case 'audit':
      case 'inventory_audit':
        return <InventoryAuditTab {...props} />;
      case 'promotions':
        return <PromotionsTab {...props} />;
      case 'customers':
        return <CustomersTab {...props} />;
      case 'suppliers':
        return <SuppliersTab {...props} />;
      case 'employees':
        return <EmployeesTab {...props} />;
      case 'transactions':
        return <TransactionHistoryTab {...props} />;
      case 'purchases':
        return <SmartPurchaseTab {...props} />;
      case 'orders':
        return <OrdersTab {...props} />;
      case 'returns':
        return <ReturnsTab {...props} />;
      case 'expenses':
        return <ExpensesTab {...props} />;
      case 'shifts':
        return <ShiftsTab {...props} />;
      case 'camera':
        return <CameraTab {...props} />;
      case 'settings':
        return <SettingsTab {...props} />;
      case 'archives':
        return <ArchivesTab {...props} />;
      case 'team':
        return <TeamTab {...props} />;
      case 'audit_logs':
        return <AuditLogsTab {...props} />;
      case 'sync_studio':
      case 'sync':
        return <SyncStudio setActiveTab={props.setActiveTab} />;
      case 'help':
        return <Help />;
      default:
        return null;
    }
  };

  const fallbackUI = (
    <div className="flex flex-col items-center justify-center min-h-[400px] h-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 text-center space-y-4">
      <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto border border-rose-500/20">
        <AlertTriangle className="text-rose-500" size={24} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Erreur dans le module {tabName}</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
          Ce module a rencontré une erreur d'affichage inattendue. Vous pouvez continuer d'utiliser les autres sections de l'application.
        </p>
      </div>
      <Button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-semibold text-xs"
      >
        Recharger l'application
      </Button>
    </div>
  );

  return (
    <div key={activeTab} className="h-full w-full">
      <ErrorBoundary key={activeTab}>
        <Suspense fallback={loadingFallback}>
          {renderTabContent()}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};