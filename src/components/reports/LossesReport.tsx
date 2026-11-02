import React from 'react';
import { 
  LossesReportProps, 
  useLossesReportLogic, 
  LossesFilterBar, 
  LossesKpisCards, 
  LossesCharts, 
  LossesTable 
} from './losses';

export const LossesReport = React.memo(function LossesReport(props: LossesReportProps) {
  const {
    isMounted,
    currency,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    searchTerm,
    setSearchTerm,
    reasonFilter,
    setReasonFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedLosses,
    filteredLosses,
    stats,
    handleExportExcel,
    handleExportCSV,
    ITEMS_PER_PAGE,
  } = useLossesReportLogic(props);

  return (
    <div className="space-y-6 text-left">
      {/* 🧭 BARRE DE FILTRES TEMPORELS ET RECHERCHE */}
      <LossesFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        reasonFilter={reasonFilter}
        setReasonFilter={setReasonFilter}
        hasLosses={filteredLosses.length > 0}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
      />

      {/* 📊 CARTES INDICATEURS (KPIS) SUR LA PÉRIODE SÉLECTIONNÉE */}
      <LossesKpisCards
        stats={stats}
        currency={currency}
        totalRevenue={props.totalRevenue || 0}
        filteredLossesCount={filteredLosses.length}
      />

      {/* 📈 GRAPHIQUES DE RÉPARTITION */}
      <LossesCharts
        stats={stats}
        currency={currency}
        isMounted={isMounted}
      />

      {/* 📜 TABLEAU D'HISTORIQUE DÉTAILLÉ AVEC CODE-BARRES ET PAGINATION */}
      <LossesTable
        losses={paginatedLosses}
        totalFilteredCount={filteredLosses.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        currency={currency}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  );
});
