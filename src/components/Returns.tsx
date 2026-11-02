import React from 'react';
import { Product, CompanySettings, ProductReturn } from '../types';
import { 
  ReturnsProps,
  useReturnsLogic, 
  ReturnsHeader, 
  ReturnsFilterBar, 
  ReturnsMobileCards, 
  ReturnsDesktopTable, 
  ReturnDetailsModal 
} from './returns/index';

export { ReturnDetailsModal };

export function Returns({ returns = [], settings, products = [] }: ReturnsProps) {
  const {
    selectedReturn,
    setSelectedReturn,
    dateFilter,
    setDateFilter,
    customRange,
    setCustomRange,
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    safeReturns,
    filteredReturns,
    displayedReturns,
    totalRefundAmount,
    totalPages,
    validPage,
    handlePurgeAllReturns,
    handleExportReturnsExcel,
    handleExportReturnsCSV
  } = useReturnsLogic(returns, products);

  return (
    <div className="space-y-6 text-left">
      {/* En-tête et Boutons d'Action / Export */}
      <ReturnsHeader
        filteredReturnsCount={filteredReturns.length}
        totalRefundAmount={totalRefundAmount}
        settings={settings}
        hasReturns={safeReturns.length > 0}
        onExportExcel={handleExportReturnsExcel}
        onExportCSV={handleExportReturnsCSV}
        onPurgeAll={handlePurgeAllReturns}
      />

      {/* Barre de Filtres Temporels & Recherche */}
      <ReturnsFilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customRange={customRange}
        setCustomRange={setCustomRange}
      />

      {/* Vue Mobile (Cartes tactiles) */}
      <ReturnsMobileCards
        displayedReturns={displayedReturns}
        currency={settings?.currency || 'DA'}
        onSelectReturn={setSelectedReturn}
      />

      {/* Vue Desktop (Tableau complet avec pagination) */}
      <ReturnsDesktopTable
        displayedReturns={displayedReturns}
        currency={settings?.currency || 'DA'}
        pageSize={pageSize}
        setPageSize={setPageSize}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        validPage={validPage}
        totalFilteredCount={filteredReturns.length}
        onSelectReturn={setSelectedReturn}
      />

      {/* Modal Détails d'un Retour */}
      <ReturnDetailsModal 
        isOpen={!!selectedReturn}
        onClose={() => setSelectedReturn(null)}
        returnRecord={selectedReturn}
        settings={settings}
        products={products}
      />
    </div>
  );
}
