import React from 'react';
import { 
  Package, ShoppingCart, FileSpreadsheet, Database, ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import { Card, Button } from '../ui';
import { Transaction, Product, Category, CompanySettings, Employee } from '../../types';
import { useGroupedSalesAndBasketsLogic } from './useGroupedSalesAndBasketsLogic';
import { GroupedSalesKpis } from './GroupedSalesKpis';
import { GroupedSalesFilterBar } from './GroupedSalesFilterBar';
import { GroupedProductsTable } from './GroupedProductsTable';
import { BasketProfitsTable } from './BasketProfitsTable';

export interface GroupedSalesAndBasketsReportProps {
  transactions: Transaction[];
  products: Product[];
  categories: Category[];
  settings: CompanySettings;
  employees?: Employee[];
}

export function GroupedSalesAndBasketsReport({
  transactions = [],
  products = [],
  categories = [],
  settings,
  employees = []
}: GroupedSalesAndBasketsReportProps) {
  const {
    activeSubTab,
    setActiveSubTab,
    dateFilter,
    setDateFilter,
    customRange,
    setCustomRange,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    expandedBasketId,
    setExpandedBasketId,
    groupedTotals,
    basketTotals,
    currentList,
    pagedList,
    totalPages,
    validPage,
    handleExportExcel,
    handleExportCSV,
    resolveCostPerUnit
  } = useGroupedSalesAndBasketsLogic({
    transactions,
    products,
    categories,
    settings,
    employees
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Sub-tab switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Layers className="text-indigo-400" size={28} />
            Analyse Avancée : Ventes Groupées & Bénéfice Panier
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Visualisez les volumes cumulés par produit et la rentabilité nette de chaque panier client.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shadow-xl">
            <button
              onClick={() => { setActiveSubTab('grouped_products'); setCurrentPage(1); }}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeSubTab === 'grouped_products'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package size={15} /> Produits Groupés
            </button>
            <button
              onClick={() => { setActiveSubTab('basket_profits'); setCurrentPage(1); }}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeSubTab === 'basket_profits'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart size={15} /> Bénéfice par Panier
            </button>
          </div>

          <Button variant="secondary" onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold">
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 text-xs font-bold">
            <Database size={15} /> CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <GroupedSalesKpis
        activeSubTab={activeSubTab}
        groupedTotals={groupedTotals}
        basketTotals={basketTotals}
        settings={settings}
      />

      {/* Filters Bar */}
      <GroupedSalesFilterBar
        activeSubTab={activeSubTab}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customRange={customRange}
        setCustomRange={setCustomRange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categories={categories}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        setCurrentPage={setCurrentPage}
      />

      {/* Main Table */}
      <Card className="overflow-hidden bg-slate-900/60 border border-slate-800">
        <div className="w-full overflow-x-auto">
          {activeSubTab === 'grouped_products' ? (
            <GroupedProductsTable
              pagedList={pagedList}
              settings={settings}
            />
          ) : (
            <BasketProfitsTable
              pagedList={pagedList}
              expandedBasketId={expandedBasketId}
              setExpandedBasketId={setExpandedBasketId}
              resolveCostPerUnit={resolveCostPerUnit}
              settings={settings}
            />
          )}
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Lignes par page :</span>
            {[50, 100, 200].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => { setPageSize(size); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  pageSize === size
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {currentList.length > 0
                ? `${(validPage - 1) * pageSize + 1}-${Math.min(validPage * pageSize, currentList.length)} sur ${currentList.length}`
                : '0 sur 0'}
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold"
                >
                  <ChevronLeft size={16} /> Précédent
                </button>
                <span className="text-xs font-bold text-indigo-400 px-2">
                  Page {validPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={validPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold"
                >
                  Suivant <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
