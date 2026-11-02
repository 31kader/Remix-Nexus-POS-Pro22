import React, { lazy, Suspense } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { isTabAllowed } from '../lib/permissions';
import { useAuthStore } from '../store/useAuthStore';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from './ui';

import {
  DetailedReportsTab,
  ExpiryManagerTab,
  InventorySettingsTab,
  MarketingTab,
  VoucherTab,
  GRNManagerTab,
  InventoryAuditTab,
  PromotionsTab,
  CustomersTab,
  SuppliersTab,
  EmployeesTab,
  TransactionHistoryTab,
  CartonReceptionTab,
  SmartPurchaseTab,
  OrdersTab,
  ReturnsTab,
  ExpensesTab,
  ShiftsTab,
  CameraTab,
  SettingsTab,
  ArchivesTab,
  TeamTab,
  AuditLogsTab,
  CatalogPrinterTab
} from './tab-renderer/TabWrappers';

// Modules lazy principaux
const Checkout = lazy(() => import('./Checkout').then(m => ({ default: m.Checkout })));
const Inventory = lazy(() => import('./Inventory').then(m => ({ default: m.Inventory })));
const SyncStudio = lazy(() => import('./SyncStudio').then(m => ({ default: m.SyncStudio })));
const Help = lazy(() => import('./Help').then(m => ({ default: m.Help })));

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
      case 'cartons':
      case 'carton_reception':
        return <CartonReceptionTab {...props} />;
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
