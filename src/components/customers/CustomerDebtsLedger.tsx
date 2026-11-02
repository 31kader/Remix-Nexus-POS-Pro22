import React from 'react';
import { CustomerDebtsLedgerProps } from './debts/debtsTypes';
import {
  useDebtsLedgerLogic,
  DebtSummaryKpis,
  DebtsControlBar,
  DebtorsTable,
  AddDebtQuickModal
} from './debts';

export { type CustomerDebtsLedgerProps } from './debts/debtsTypes';

export const CustomerDebtsLedger: React.FC<CustomerDebtsLedgerProps> = ({
  customers: propCustomers,
  transactions: propTransactions,
  settings: propSettings,
  onOpenFinancialModal,
  openWhatsApp
}) => {
  const {
    allCustomers,
    settings,
    search,
    setSearch,
    tabView,
    setTabView,
    filterType,
    setFilterType,
    agingFilter,
    setAgingFilter,
    isAddDebtModalOpen,
    setIsAddDebtModalOpen,
    debtTargetType,
    setDebtTargetType,
    selectedCustomerId,
    setSelectedCustomerId,
    newCustomerName,
    setNewCustomerName,
    newCustomerPhone,
    setNewCustomerPhone,
    debtAmount,
    setDebtAmount,
    debtNote,
    setDebtNote,
    isSavingDebt,
    debtorCustomers,
    displayList,
    totalDebt,
    agingCounts,
    handleSendWhatsAppReminder,
    handlePrintStatement,
    handleSaveNewDebt
  } = useDebtsLedgerLogic({
    propCustomers,
    propSettings,
    openWhatsApp
  });

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Header KPIs */}
      <DebtSummaryKpis
        totalDebt={totalDebt}
        debtorCustomers={debtorCustomers}
        allCustomersCount={allCustomers.length}
        settings={settings}
      />

      {/* 2. Barre de Contrôles & Filtres */}
      <DebtsControlBar
        tabView={tabView}
        setTabView={setTabView}
        debtorCustomersCount={debtorCustomers.length}
        allCustomersCount={allCustomers.length}
        filterType={filterType}
        setFilterType={setFilterType}
        agingFilter={agingFilter}
        setAgingFilter={setAgingFilter}
        agingCounts={agingCounts}
        search={search}
        setSearch={setSearch}
        setIsAddDebtModalOpen={setIsAddDebtModalOpen}
        settings={settings}
      />

      {/* 3. Tableau des Débiteurs / Clients */}
      <DebtorsTable
        displayList={displayList}
        tabView={tabView}
        settings={settings}
        onOpenFinancialModal={onOpenFinancialModal}
        handleSendWhatsAppReminder={handleSendWhatsAppReminder}
        handlePrintStatement={handlePrintStatement}
        setIsAddDebtModalOpen={setIsAddDebtModalOpen}
      />

      {/* 4. Modale d'Ajout Rapide de Dette */}
      <AddDebtQuickModal
        isOpen={isAddDebtModalOpen}
        onClose={() => setIsAddDebtModalOpen(false)}
        debtTargetType={debtTargetType}
        setDebtTargetType={setDebtTargetType}
        selectedCustomerId={selectedCustomerId}
        setSelectedCustomerId={setSelectedCustomerId}
        newCustomerName={newCustomerName}
        setNewCustomerName={setNewCustomerName}
        newCustomerPhone={newCustomerPhone}
        setNewCustomerPhone={setNewCustomerPhone}
        debtAmount={debtAmount}
        setDebtAmount={setDebtAmount}
        debtNote={debtNote}
        setDebtNote={setDebtNote}
        isSavingDebt={isSavingDebt}
        handleSaveNewDebt={handleSaveNewDebt}
        allCustomers={allCustomers}
        settings={settings}
      />
    </div>
  );
};

export default CustomerDebtsLedger;
