import React from 'react';
import { 
  FidelityStatsReportProps, 
  useFidelityStatsLogic, 
  FidelityFilterBar, 
  FidelityKpisCards, 
  FidelityCustomersTable, 
  FidelityPromoTransactionsTable, 
  FidelityPagination 
} from './fidelity';

export const FidelityStatsReport = React.memo(function FidelityStatsReport({
  transactions = [],
  customers = [],
  settings,
  marketingFilterDate,
  setMarketingFilterDate,
}: FidelityStatsReportProps) {
  const {
    subView,
    setSubView,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    activeListLength,
    marketingData,
    filteredCustomers,
    filteredPromoTx,
    paginatedCustomers,
    paginatedTransactions,
    handleExportFidelityCSV,
    ITEMS_PER_PAGE,
  } = useFidelityStatsLogic({ transactions, customers, marketingFilterDate });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barre de filtres et sélecteur de vue */}
      <FidelityFilterBar
        subView={subView}
        setSubView={setSubView}
        totalCustomersCount={marketingData.enrichedCustomers.length}
        totalPromoTxCount={marketingData.transactions.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        marketingFilterDate={marketingFilterDate}
        setMarketingFilterDate={setMarketingFilterDate}
        onPageReset={() => setCurrentPage(1)}
        onExportCSV={handleExportFidelityCSV}
      />

      {/* 4 Cartes KPIs */}
      <FidelityKpisCards
        marketingData={marketingData}
        currency={settings.currency}
      />

      {/* Tableau 1 : Classement des Clients Fidèles */}
      {subView === 'customers' ? (
        <FidelityCustomersTable
          customers={paginatedCustomers}
          totalFilteredCount={filteredCustomers.length}
          currentPage={currentPage}
          itemsPerPage={ITEMS_PER_PAGE}
          currency={settings.currency}
        />
      ) : (
        /* Tableau 2 : Historique des Ventes avec Remises / Bons / Points */
        <FidelityPromoTransactionsTable
          transactions={paginatedTransactions}
          totalFilteredCount={filteredPromoTx.length}
          currency={settings.currency}
        />
      )}

      {/* Pagination commune */}
      <FidelityPagination
        currentPage={currentPage}
        totalPages={totalPages}
        activeListLength={activeListLength}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
});
