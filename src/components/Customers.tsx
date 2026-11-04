import React, { useState, useMemo, useRef, memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { 
  Customer, Transaction, CompanySettings, Product, Expense, StockAdjustment, Category 
} from '../types';
import { ConfirmDialog } from './ui';
import { cn } from '../lib/utils';
import { CustomersEditModal } from './CustomersEditModal';
import { CustomerFinancialModal } from './CustomerFinancialModal';
import { CustomerDebtsLedger } from './customers/CustomerDebtsLedger';
import { CustomerAnalyticsView } from './customers/CustomerAnalyticsView';
import { CustomerGlobalJournalView } from './customers/CustomerGlobalJournalView';
import { CustomerGlobalGeneralView } from './customers/CustomerGlobalGeneralView';
import { CustomerTableView } from './customers/CustomerTableView';
import { CustomerDirectorySplitView } from './customers/CustomerDirectorySplitView';
import { CustomersTopBar } from './customers/CustomersTopBar';
import { useCustomersLogic } from '../hooks/useCustomersLogic';

export interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  products?: Product[];
  expenses?: Expense[];
  stockAdjustments?: StockAdjustment[];
  categories?: Category[];
}

export const Customers = memo(function Customers(props: CustomersProps) {
  const { 
    customers, 
    transactions, 
    settings, 
    onRestore
  } = props;

  const [customerViewMode, setCustomerViewMode] = useState<'directory' | 'journal' | 'general' | 'debts' | 'analytics'>('directory');
  const [directoryLayout, setDirectoryLayout] = useState<'split' | 'table'>('split');
  const [isDetailExpanded, setIsDetailExpanded] = useState<boolean>(false);
  const [tablePage, setTablePage] = useState<number>(1);
  const TABLE_PAGE_SIZE = 50;
  const excelInputRef = useRef<HTMLInputElement>(null);

  const {
    isModalOpen,
    setIsModalOpen,
    selectedCustomerId,
    setSelectedCustomerId,
    activeTab,
    setActiveTab,
    editingCustomer,
    setEditingCustomer,
    showPassword,
    setShowPassword,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    customerToDelete,
    setCustomerToDelete,
    isTopUpModalOpen,
    setIsTopUpModalOpen,
    topUpAmount,
    setTopUpAmount,
    isProcessingTopUp,
    financialOpType,
    setFinancialOpType,
    financialMethod,
    setFinancialMethod,
    financialNote,
    setFinancialNote,
    formData,
    setFormData,
    t,
    handleTopUp,
    selectedCustomer,
    handleSubmit,
    handleDeleteCustomer,
    filteredCustomers,
    openWhatsApp,
    kpiStats,
    handleLaunchSale,
    handlePrintStatement,
    exportCustomersToExcel,
    importCustomersFromExcel
  } = useCustomersLogic(props);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / TABLE_PAGE_SIZE));
  const currentPage = Math.min(tablePage, totalPages);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * TABLE_PAGE_SIZE;
    return filteredCustomers.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredCustomers, currentPage]);

  const debtorCount = kpiStats.debtorCount;

  return (
    <div className="h-full flex flex-col gap-2.5">
      {/* Barre Supérieure Découpée : Navigation & KPIs Inline */}
      <CustomersTopBar
        customerViewMode={customerViewMode}
        setCustomerViewMode={setCustomerViewMode}
        directoryLayout={directoryLayout}
        setDirectoryLayout={setDirectoryLayout}
        customersCount={customers.length}
        debtorCount={debtorCount}
        kpiStats={kpiStats}
        settings={settings}
        excelInputRef={excelInputRef}
        importCustomersFromExcel={importCustomersFromExcel}
        exportCustomersToExcel={exportCustomersToExcel}
        onNewCustomer={() => { setEditingCustomer(null); setIsModalOpen(true); }}
      />

      {customerViewMode === 'analytics' ? (
        <div className="flex-1 overflow-y-auto pr-1">
          <CustomerAnalyticsView
            customers={customers}
            transactions={transactions}
            settings={settings}
            openWhatsApp={openWhatsApp}
            onSelectCustomer={(id) => {
              setSelectedCustomerId(id);
              setCustomerViewMode('directory');
            }}
          />
        </div>
      ) : customerViewMode === 'debts' ? (
        <div className="flex-1 overflow-y-auto">
          <CustomerDebtsLedger
            customers={customers}
            transactions={transactions}
            settings={settings}
            onOpenFinancialModal={(c) => {
              setSelectedCustomerId(c.id);
              setFinancialOpType('encaissement');
              setFinancialMethod('cash');
              setFinancialNote('Règlement de dette');
              setIsTopUpModalOpen(true);
            }}
            openWhatsApp={openWhatsApp}
          />
        </div>
      ) : customerViewMode === 'journal' ? (
        <CustomerGlobalJournalView
          customers={customers}
          transactions={transactions}
          settings={settings}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={(id) => setSelectedCustomerId(id)}
          onRestore={onRestore}
        />
      ) : customerViewMode === 'general' ? (
        <CustomerGlobalGeneralView
          customers={customers}
          settings={settings}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={(id) => setSelectedCustomerId(id)}
          onOpenFinancialModal={(c) => {
            setSelectedCustomerId(c.id);
            setFinancialOpType('encaissement');
            setFinancialMethod('cash');
            setFinancialNote('Règlement de solde client');
            setIsTopUpModalOpen(true);
          }}
        />
      ) : directoryLayout === 'table' ? (
        <CustomerTableView
          filteredCustomers={filteredCustomers}
          paginatedCustomers={paginatedCustomers}
          settings={settings}
          search={search}
          setSearch={setSearch}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
          kpiStats={kpiStats}
          currentPage={currentPage}
          totalPages={totalPages}
          setTablePage={setTablePage}
          TABLE_PAGE_SIZE={TABLE_PAGE_SIZE}
          setSelectedCustomerId={setSelectedCustomerId}
          setDirectoryLayout={setDirectoryLayout}
          setFinancialOpType={setFinancialOpType}
          setFinancialMethod={setFinancialMethod}
          setFinancialNote={setFinancialNote}
          setIsTopUpModalOpen={setIsTopUpModalOpen}
          handleLaunchSale={handleLaunchSale}
          handlePrintStatement={handlePrintStatement}
          openWhatsApp={openWhatsApp}
          setEditingCustomer={setEditingCustomer}
          setIsModalOpen={setIsModalOpen}
        />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-3 overflow-hidden">
          {/* Panneau de gauche (liste) : masqué sur mobile si un client est sélectionné */}
          <div className={cn(
            "w-full md:w-1/3 flex flex-col gap-3 bg-white dark:bg-zinc-900/60 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs h-full overflow-hidden transition-all duration-200",
            selectedCustomerId ? "hidden md:flex" : "flex",
            isDetailExpanded && "md:hidden"
          )}>
            <CustomerDirectorySplitView
              view="list"
              customers={customers}
              filteredCustomers={filteredCustomers}
              selectedCustomerId={selectedCustomerId}
              setSelectedCustomerId={setSelectedCustomerId}
              selectedCustomer={selectedCustomer}
              search={search}
              setSearch={setSearch}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              sortBy={sortBy}
              setSortBy={setSortBy}
              debtorCount={debtorCount}
              kpiStats={kpiStats}
              isDetailExpanded={isDetailExpanded}
              setIsDetailExpanded={setIsDetailExpanded}
              setDirectoryLayout={setDirectoryLayout}
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
          </div>

          {/* Panneau de droite (détail) */}
          <div className={cn(
            "bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col overflow-hidden transition-all duration-200",
            selectedCustomerId ? "flex flex-1 w-full h-full md:w-2/3 md:flex-initial" : "hidden md:flex md:w-2/3 md:h-full",
            isDetailExpanded && "md:w-full"
          )}>
            {selectedCustomer && (
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition-all flex items-center gap-1.5 text-xs font-bold shadow-2xs min-h-[38px] m-2 self-start cursor-pointer"
                title="Retour à la liste"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-500" />
                <span>Retour à la liste</span>
              </button>
            )}

            <CustomerDirectorySplitView
              view="detail"
              customers={customers}
              filteredCustomers={filteredCustomers}
              selectedCustomerId={selectedCustomerId}
              setSelectedCustomerId={setSelectedCustomerId}
              selectedCustomer={selectedCustomer}
              search={search}
              setSearch={setSearch}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              sortBy={sortBy}
              setSortBy={setSortBy}
              debtorCount={debtorCount}
              kpiStats={kpiStats}
              isDetailExpanded={isDetailExpanded}
              setIsDetailExpanded={setIsDetailExpanded}
              setDirectoryLayout={setDirectoryLayout}
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
          </div>
        </div>
      )}

      <CustomersEditModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingCustomer={editingCustomer}
        formData={formData}
        setFormData={setFormData}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        handleSubmit={handleSubmit}
      />

      <CustomerFinancialModal 
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        selectedCustomer={selectedCustomer}
        settings={settings}
        financialOpType={financialOpType}
        setFinancialOpType={setFinancialOpType}
        financialMethod={financialMethod}
        setFinancialMethod={setFinancialMethod}
        financialNote={financialNote}
        setFinancialNote={setFinancialNote}
        topUpAmount={topUpAmount}
        setTopUpAmount={setTopUpAmount}
        isProcessingTopUp={isProcessingTopUp}
        handleTopUp={handleTopUp}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title={t('common.delete')}
        message={`Êtes-vous sûr de vouloir supprimer ${customerToDelete?.name} ?`}
        onConfirm={handleDeleteCustomer}
        onClose={() => { setIsDeleteConfirmOpen(false); setCustomerToDelete(null); }}
        onCancel={() => { setIsDeleteConfirmOpen(false); setCustomerToDelete(null); }}
        confirmText="Supprimer définitivement"
      />
    </div>
  );
});
