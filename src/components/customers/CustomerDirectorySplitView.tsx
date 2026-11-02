import React, { memo } from 'react';
import { Customer, Transaction, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { CustomerListPanel, CustomerDetailPanel } from './split-view';

export interface CustomerDirectorySplitViewProps {
  view?: 'list' | 'detail';
  customers: Customer[];
  filteredCustomers: Customer[];
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  selectedCustomer: Customer | null | undefined;
  search: string;
  setSearch: (s: string) => void;
  filterStatus: string;
  setFilterStatus: (f: any) => void;
  sortBy: string;
  setSortBy: (s: any) => void;
  debtorCount: number;
  kpiStats: {
    debtorCount: number;
    totalDebt: number;
    totalPoints: number;
    totalSpentAll: number;
    appUserCount: number;
  };
  isDetailExpanded: boolean;
  setIsDetailExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setDirectoryLayout: (l: 'split' | 'table') => void;
  setFinancialOpType: (op: any) => void;
  setFinancialMethod: (m: any) => void;
  setFinancialNote: (n: any) => void;
  setIsTopUpModalOpen: (open: boolean) => void;
  handleLaunchSale: (c: Customer) => void;
  handlePrintStatement: (c: Customer) => void;
  openWhatsApp: (phone: string, type?: any, c?: Customer) => void;
  setEditingCustomer: (c: Customer | null) => void;
  setIsModalOpen: (open: boolean) => void;
  setCustomerToDelete: (c: Customer | null) => void;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  activeTab: any;
  setActiveTab: (t: any) => void;
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  t: (key: string) => string;
}

export const CustomerDirectorySplitView = memo(function CustomerDirectorySplitView(props: CustomerDirectorySplitViewProps) {
  const {
    view,
    customers,
    filteredCustomers,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedCustomer,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    debtorCount,
    kpiStats,
    isDetailExpanded,
    setIsDetailExpanded,
    setDirectoryLayout,
    setFinancialOpType,
    setFinancialMethod,
    setFinancialNote,
    setIsTopUpModalOpen,
    handleLaunchSale,
    handlePrintStatement,
    openWhatsApp,
    setEditingCustomer,
    setIsModalOpen,
    setCustomerToDelete,
    setIsDeleteConfirmOpen,
    activeTab,
    setActiveTab,
    transactions,
    settings,
    onRestore,
    t
  } = props;

  const listContent = (
    <CustomerListPanel
      customers={customers}
      filteredCustomers={filteredCustomers}
      selectedCustomerId={selectedCustomerId}
      setSelectedCustomerId={setSelectedCustomerId}
      search={search}
      setSearch={setSearch}
      filterStatus={filterStatus}
      setFilterStatus={setFilterStatus}
      sortBy={sortBy}
      setSortBy={setSortBy}
      debtorCount={debtorCount}
      kpiStats={kpiStats}
      setDirectoryLayout={setDirectoryLayout}
    />
  );

  const detailContent = (
    <CustomerDetailPanel
      selectedCustomer={selectedCustomer}
      isDetailExpanded={isDetailExpanded}
      setIsDetailExpanded={setIsDetailExpanded}
      setFinancialOpType={setFinancialOpType}
      setFinancialMethod={setFinancialMethod}
      setFinancialNote={setFinancialNote}
      setIsTopUpModalOpen={setIsTopUpModalOpen}
      handleLaunchSale={handleLaunchSale}
      handlePrintStatement={handlePrintStatement}
      openWhatsApp={openWhatsApp}
      setEditingCustomer={setEditingCustomer}
      setIsModalOpen={setIsModalOpen}
      setCustomerToDelete={setCustomerToDelete}
      setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      transactions={transactions}
      settings={settings}
      onRestore={onRestore}
      t={t}
    />
  );

  if (view === 'list') {
    return listContent;
  }

  if (view === 'detail') {
    return detailContent;
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
      <div className={cn(
        "w-full md:w-1/3 flex flex-col gap-3 bg-white/5 p-4 sm:p-5 rounded-xl shadow-xs/5 border border-white/5 h-full overflow-hidden transition-all duration-300",
        selectedCustomerId ? "hidden md:flex" : "flex",
        isDetailExpanded && "md:hidden"
      )}>
        {listContent}
      </div>

      <div className={cn(
        "bg-workspace rounded-xl shadow-xs/5 border border-white/5 flex flex-col overflow-hidden transition-all duration-300",
        selectedCustomerId ? "flex flex-1 w-full h-full md:w-2/3 md:flex-initial" : "hidden md:flex md:w-2/3 md:h-full",
        isDetailExpanded && "md:w-full"
      )}>
        {detailContent}
      </div>
    </div>
  );
});
