import React from 'react';
import { DamagedRecord, Product, Category } from '../types';
import { useLossReportLogic } from './reports/loss/useLossReportLogic';
import { LossReportAnalytics } from './reports/loss/LossReportAnalytics';
import { LossReportHeader } from './reports/loss/LossReportHeader';
import { LossReportTable } from './reports/loss/LossReportTable';

interface LossReportProps {
  damagedRecords: DamagedRecord[];
  products: Product[];
  categories: Category[];
  onPrintReport: (records: DamagedRecord[]) => void;
}

export function LossReport({ damagedRecords, products, categories, onPrintReport }: LossReportProps) {
  const {
    search,
    setSearch,
    dateRange,
    setDateRange,
    selectedCategory,
    setSelectedCategory,
    filteredRecords,
    stats,
    handleExportCSV,
    handlePrintPDF
  } = useLossReportLogic({ damagedRecords, products });

  return (
    <div className="space-y-6">
      <LossReportAnalytics stats={stats} />
      
      <LossReportHeader 
        search={search}
        setSearch={setSearch}
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
      />

      <LossReportTable 
        filteredRecords={filteredRecords}
        products={products}
      />
    </div>
  );
}
