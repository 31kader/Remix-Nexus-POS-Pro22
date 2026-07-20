import React, { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

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
const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const AIAssistant = lazy(() => import('./AIAssistant').then(m => ({ default: m.AIAssistant })));
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
// CORRIGÉ : TeamManagement vient de son propre fichier
const TeamManagement = lazy(() => import('./Employees').then(m => ({ default: m.TeamManagement })));const TransactionHistory = lazy(() => import('./TransactionHistory').then(m => ({ default: m.TransactionHistory })));
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

export const TabRenderer: React.FC<TabRendererProps> = ({ activeTab, ...props }) => {
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);

  const settings = useCoreStore(s => s.settings);
  const products = useCoreStore(s => s.products);
  const categories = useCoreStore(s => s.categories);
  const brands = useCoreStore(s => s.brands);
  const promotions = useCoreStore(s => s.promotions);
  const patterns = useCoreStore(s => s.patterns);

  const transactions = useTransactionStore(s => s.transactions);
  const purchaseOrders = useTransactionStore(s => s.purchaseOrders);
  const returns = useTransactionStore(s => s.returns);
  const onlineOrders = useTransactionStore(s => s.onlineOrders);
  const shifts = useTransactionStore(s => s.shifts);
  const activeShift = useTransactionStore(s => s.activeShift);

  const customers = usePeopleStore(s => s.customers);
  const suppliers = usePeopleStore(s => s.suppliers);
  const employees = usePeopleStore(s => s.employees);
  const users = usePeopleStore(s => s.users);

  const stockAdjustments = useInventoryStore(s => s.stockAdjustments);
  const audits = useInventoryStore(s => s.audits);
  const damagedItems = useInventoryStore(s => s.damagedItems);
  const supplierSyncs = useInventoryStore(s => s.supplierSyncs);
  const attendance = useInventoryStore(s => s.attendance);

  const purchases = useFinanceStore(s => s.purchases);
  const expenses = useFinanceStore(s => s.expenses);
  const supplierPayments = useFinanceStore(s => s.supplierPayments);
  const advances = useFinanceStore(s => s.advances);
  const auditLogs = useFinanceStore(s => s.auditLogs);

  const finalProps: any = {
    ...props,
    user, profile, settings, products, categories, brands, promotions, patterns,
    transactions, purchaseOrders, returns, onlineOrders, shifts, activeShift,
    customers, suppliers, employees, users,
    stockAdjustments, audits, damagedItems, supplierSyncs, attendance,
    purchases, expenses, supplierPayments, advances, auditLogs
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'checkout':
        return (
          <Checkout
            setActiveTab={finalProps.setActiveTab}
            setIsPOSCustomerModalOpen={finalProps.setIsPOSCustomerModalOpen}
            selectedCustomer={finalProps.selectedCustomer}
            setSelectedCustomer={finalProps.setSelectedCustomer}
            setIsProductModalOpen={finalProps.setIsProductModalOpen}
            setEditingProduct={finalProps.setEditingProduct}
            activeStaffId={finalProps.activeStaffId}
          />
        );
      case 'dashboard':
        return <Dashboard transactions={finalProps.transactions || []} products={finalProps.products || []} settings={finalProps.settings || {}} returns={finalProps.returns || []} isStandalone={finalProps.isStandalone} deferredPrompt={finalProps.deferredPrompt} handleInstallApp={finalProps.handleInstallApp} />;
      case 'ai_assistant':
        return <AIAssistant products={finalProps.products || []} transactions={finalProps.transactions || []} expenses={finalProps.expenses || []} settings={finalProps.settings || {}} stockAdjustments={finalProps.stockAdjustments || []} />;
      case 'reports':
        return <DetailedReports transactions={finalProps.transactions || []} products={finalProps.products || []} employees={finalProps.employees || []} expenses={finalProps.expenses || []} supplierPayments={finalProps.supplierPayments || []} returns={finalProps.returns || []} settings={finalProps.settings || {}} categories={finalProps.categories || []} customers={finalProps.customers || []} stockAdjustments={finalProps.stockAdjustments || []} />;
      case 'inventory':
        return <Inventory setActiveTab={finalProps.setActiveTab} setIsProductModalOpen={finalProps.setIsProductModalOpen} setEditingProduct={finalProps.setEditingProduct} editingProduct={finalProps.editingProduct} isProductModalOpen={finalProps.isProductModalOpen} setViewingPurchaseVoucher={finalProps.setViewingPurchaseVoucher} />;
      case 'expiry':
        return (
          <ExpiryManager
            products={finalProps.products || []}
            categories={finalProps.categories || []}
            onUpdateProduct={finalProps.onUpdateProduct}
            onAdjustStock={finalProps.onAdjustStock}
            onEditProduct={finalProps.onEditProduct}
          />
        );
      case 'inventory_settings':
        return (
          <InventorySettings
            categories={finalProps.categories || []}
            brands={finalProps.brands || []}
            onAddCategory={finalProps.onAddCategory}
            onEditCategory={finalProps.onEditCategory}
            onDeleteCategory={finalProps.onDeleteCategory}
            onAddBrand={finalProps.onAddBrand}
            onEditBrand={finalProps.onEditBrand}
            onDeleteBrand={finalProps.onDeleteBrand}
          />
        );
      case 'marketing':
        return <MarketingPosters products={finalProps.products || []} settings={finalProps.settings || {}} />;
      case 'vouchers':
        return <VoucherManager customers={finalProps.customers || []} />;
      case 'grns':
        return <GRNManager products={finalProps.products || []} suppliers={finalProps.suppliers || []} setIsProductModalOpen={finalProps.setIsProductModalOpen} setEditingProduct={finalProps.setEditingProduct} settings={finalProps.settings || {}} />;
      case 'audit':
        return <InventoryAudit audits={finalProps.audits || []} products={finalProps.products || []} user={finalProps.user} settings={finalProps.settings || {}} />;
      case 'promotions':
        return <Promotions promotions={finalProps.promotions || []} products={finalProps.products || []} categories={finalProps.categories || []} transactions={finalProps.transactions || []} settings={finalProps.settings || {}} />;
      case 'customers':
        return <Customers customers={finalProps.customers || []} transactions={finalProps.transactions || []} settings={finalProps.settings || {}} onRestore={finalProps.loadTransactionToCart} products={finalProps.products || []} expenses={finalProps.expenses || []} stockAdjustments={finalProps.stockAdjustments || []} categories={finalProps.categories || []} />;
      case 'suppliers':
        return <Suppliers suppliers={finalProps.suppliers || []} products={finalProps.products || []} settings={finalProps.settings || {}} purchases={finalProps.purchases || []} supplierPayments={finalProps.supplierPayments || []} setViewingPurchaseVoucher={finalProps.setViewingPurchaseVoucher} categories={finalProps.categories || []} user={finalProps.user} damagedItems={finalProps.damagedItems || []} />;
      case 'employees':
        return <Employees employees={finalProps.employees || []} transactions={finalProps.transactions || []} attendance={finalProps.attendance || []} advances={finalProps.advances || []} settings={finalProps.settings || {}} users={finalProps.users || []} setIsAddUserModalOpen={finalProps.setIsAddUserModalOpen} />;
      case 'transactions':
        return (
          <TransactionHistory
            transactions={finalProps.transactions || []}
            onReturn={finalProps.onReturn}
            onMarkAsDelivered={finalProps.onMarkAsDelivered}
            onEdit={finalProps.onEdit}
            onRestore={finalProps.onRestore}
            settings={finalProps.settings || {}}
            canAccess={finalProps.canAccess}
            profile={finalProps.profile}
          />
        );
      case 'purchases':
        return <SmartPurchase
          products={finalProps.products || []}
          suppliers={finalProps.suppliers || []}
          patterns={finalProps.patterns || []}
          purchases={finalProps.purchases || []}
          purchaseOrders={finalProps.purchaseOrders || []}
          settings={finalProps.settings || {}}
          user={finalProps.user}
          categories={finalProps.categories || []}
          supplierPayments={finalProps.supplierPayments || []}
          setIsProductModalOpen={finalProps.setIsProductModalOpen}
          setEditingProduct={finalProps.setEditingProduct}
          isProductModalOpen={finalProps.isProductModalOpen}
          editingProduct={finalProps.editingProduct}
          setViewingPurchaseVoucher={finalProps.setViewingPurchaseVoucher}
        />;
      case 'orders':
        return <Orders orders={finalProps.onlineOrders || []} products={finalProps.products || []} settings={finalProps.settings || {}} employees={finalProps.employees || []} customers={finalProps.customers || []} user={finalProps.user} profile={finalProps.profile} />;
      case 'returns':
        return <Returns returns={finalProps.returns || []} settings={finalProps.settings || {}} products={finalProps.products || []} />;
      case 'expenses':
        return <Expenses expenses={finalProps.expenses || []} user={finalProps.user} settings={finalProps.settings || {}} />;
      case 'shifts':
        return <CashManagement activeShift={finalProps.activeShift} shifts={finalProps.shifts || []} transactions={finalProps.transactions || []} expenses={finalProps.expenses || []} user={finalProps.profile!} settings={finalProps.settings || {}} />;
      case 'camera':
        return <CameraPortal settings={finalProps.settings || {}} user={finalProps.profile!} />;
      case 'settings':
        return <Settings settings={finalProps.settings || {}} />;
      case 'archives':
        return <ArchiveManager user={finalProps.user} settings={finalProps.settings || {}} />;
      case 'team':
        return <TeamManagement users={finalProps.users || []} employees={finalProps.employees || []} settings={finalProps.settings || {}} setIsAddUserModalOpen={finalProps.setIsAddUserModalOpen} />;
      case 'audit_logs':
        return <AuditLogs logs={finalProps.auditLogs || []} settings={finalProps.settings || {}} products={finalProps.products || []} transactions={finalProps.transactions || []} />;
      case 'help':
        return <Help />;
      default:
        return null;
    }
  };

  const tabName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  const fallbackUI = (
    <div className="flex flex-col items-center justify-center min-h-[400px] h-full bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 text-center space-y-6">
      <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
        <AlertTriangle className="text-rose-500" size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-black text-white uppercase italic">Erreur dans le module {tabName}</h3>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest max-w-sm mx-auto">
          Ce module a rencontré une erreur d'affichage inattendue. Vous pouvez continuer d'utiliser les autres sections de l'application.
        </p>
      </div>
      <Button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-white text-black hover:bg-slate-200 rounded-xl font-black uppercase tracking-widest text-xs shadow-md transition-all active:scale-95"
      >
        Recharger l'application
      </Button>
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="h-full w-full"
      >
        <ErrorBoundary key={activeTab}>
          <Suspense fallback={loadingFallback}>
            {renderTabContent()}
          </Suspense>
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );
};