import React from 'react';
import { Product, Category } from '../types';
import { useExpiryManagerLogic } from './useExpiryManagerLogic';
import { ExpiryStats } from './expiry/ExpiryStats';
import { ExpiryControls } from './expiry/ExpiryControls';
import { ExpiryListView } from './expiry/ExpiryListView';
import { ExpiryCalendarView } from './expiry/ExpiryCalendarView';
import { ExpiryAnalyticsView } from './expiry/ExpiryAnalyticsView';

interface ExpiryManagerProps {
  products: Product[];
  categories: Category[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onAdjustStock: (product: Product) => void;
  onEditProduct: (product: Product) => void;
}

export function ExpiryManager({ products, categories, onUpdateProduct, onAdjustStock, onEditProduct }: ExpiryManagerProps) {
  const {
    view,
    setView,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    currentMonth,
    setCurrentMonth,
    calendarDays,
    stats,
    handleExportCSV,
    handlePrintPDF,
    handleBatchDiscount,
    analyzedProducts,
    handleApplyPromo,
    handleRestorePrice,
    now
  } = useExpiryManagerLogic({ products, categories, onUpdateProduct, onAdjustStock, onEditProduct });
  
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <ExpiryStats stats={stats} />

      {/* Controls */}
      <ExpiryControls
        view={view}
        setView={setView}
        search={search}
        setSearch={setSearch}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        handleExportCSV={handleExportCSV}
        handlePrintPDF={handlePrintPDF}
        handleBatchDiscount={handleBatchDiscount}
      />

      {view === 'list' ? (
        <ExpiryListView
          analyzedProducts={analyzedProducts}
          products={products}
          handleApplyPromo={handleApplyPromo}
          handleRestorePrice={handleRestorePrice}
          onEditProduct={onEditProduct}
          onAdjustStock={onAdjustStock}
        />
      ) : view === 'calendar' ? (
        <ExpiryCalendarView
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          calendarDays={calendarDays}
          analyzedProducts={analyzedProducts}
          now={now}
        />
      ) : (
        <ExpiryAnalyticsView
          analyzedProducts={analyzedProducts}
          categories={categories}
          stats={stats}
          handleBatchDiscount={handleBatchDiscount}
        />
      )}
    </div>
  );
}
