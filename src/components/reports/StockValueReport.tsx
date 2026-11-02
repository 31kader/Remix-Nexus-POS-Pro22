import React from 'react';
import { 
  StockValueReportProps, 
  useStockValueLogic, 
  StockValueFilterBar, 
  StockValueKpisCards, 
  StockValueCategoryTable, 
  StockValueProductsTable 
} from './stock-value';

export const StockValueReport = React.memo(function StockValueReport({
  products = [],
  categories = [],
  settings,
  onEditProduct,
}: StockValueReportProps) {
  const {
    stockFilterCategory,
    setStockFilterCategory,
    stockFilterStatus,
    setStockFilterStatus,
    stockFilterSearch,
    setStockFilterSearch,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedProducts,
    stockSummary,
    filteredStockProductsCount,
    exportStockValuationCSV,
    ITEMS_PER_PAGE,
  } = useStockValueLogic({ products, categories, settings, onEditProduct });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barre de Filtres & Recherche Haute Visibilité */}
      <StockValueFilterBar
        categories={categories}
        totalProductsCount={products.length}
        stockFilterSearch={stockFilterSearch}
        setStockFilterSearch={setStockFilterSearch}
        stockFilterCategory={stockFilterCategory}
        setStockFilterCategory={setStockFilterCategory}
        stockFilterStatus={stockFilterStatus}
        setStockFilterStatus={setStockFilterStatus}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onPageReset={() => setCurrentPage(1)}
        onExportCSV={exportStockValuationCSV}
      />

      {/* 4 Cartes KPIs Valorisation Stock */}
      <StockValueKpisCards
        stockSummary={stockSummary}
        currency={settings.currency}
      />

      {/* Tableau 1 : Valorisation Synthétique par Catégorie */}
      <StockValueCategoryTable
        categoryRows={stockSummary.categoryRows}
        totalSaleVal={stockSummary.totalSaleVal}
        totalCostVal={stockSummary.totalCostVal}
        totalProfitVal={stockSummary.totalProfitVal}
        totalQty={stockSummary.totalQty}
        filteredProductsCount={filteredStockProductsCount}
        stockFilterCategory={stockFilterCategory}
        setStockFilterCategory={setStockFilterCategory}
        onPageReset={() => setCurrentPage(1)}
        currency={settings.currency}
      />

      {/* Tableau 2 : Liste Détaillée des Produits Valorisés (50 produits / page) */}
      <StockValueProductsTable
        products={paginatedProducts}
        totalProductsCount={stockSummary.enrichedProducts.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        currency={settings.currency}
        itemsPerPage={ITEMS_PER_PAGE}
        onEditProduct={onEditProduct}
      />
    </div>
  );
});
