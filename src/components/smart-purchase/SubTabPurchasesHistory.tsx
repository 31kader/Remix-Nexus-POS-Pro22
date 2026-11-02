import React, { useState, useMemo, useEffect } from 'react';
import { Purchase, Supplier } from '../../types';
import { useCoreStore } from '../../store/useCoreStore';
import { 
  PurchasePaymentStatusFilter, 
  PurchaseReceiptStatusFilter, 
  PurchaseSortOption, 
  PurchasesSummary 
} from './purchaseHelpers';
import { 
  PurchasesHistoryKpis, 
  PurchasesHistoryFilterBar, 
  PurchasesHistoryTable 
} from './history';

const PURCHASES_PAGE_SIZE = 50;

interface SubTabPurchasesHistoryProps {
  filteredPurchases: Purchase[];
  suppliers?: Supplier[];
  historySearch: string;
  setHistorySearch: (s: string) => void;
  historyStartDate: string;
  setHistoryStartDate: (s: string) => void;
  historyEndDate: string;
  setHistoryEndDate: (s: string) => void;
  historySupplierId?: string;
  setHistorySupplierId?: (id: string) => void;
  historyPaymentStatus?: PurchasePaymentStatusFilter;
  setHistoryPaymentStatus?: (s: PurchasePaymentStatusFilter) => void;
  historyReceiptStatus?: PurchaseReceiptStatusFilter;
  setHistoryReceiptStatus?: (s: PurchaseReceiptStatusFilter) => void;
  historyQuickDate?: string;
  setQuickDatePeriod?: (period: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'last_month') => void;
  historyMinAmount?: string;
  setHistoryMinAmount?: (v: string) => void;
  historyMaxAmount?: string;
  setHistoryMaxAmount?: (v: string) => void;
  historySortBy?: PurchaseSortOption;
  setHistorySortBy?: (s: PurchaseSortOption) => void;
  isAdvancedFiltersOpen?: boolean;
  setIsAdvancedFiltersOpen?: (v: boolean | ((prev: boolean) => boolean)) => void;
  resetHistoryFilters?: () => void;
  activeFiltersCount?: number;
  purchasesSummary?: PurchasesSummary;
  setViewingPurchaseVoucher: (p: Purchase) => void;
  handleEditPurchaseRequest: (p: Purchase) => void;
  setPurchaseToDelete: (id: string) => void;
}

export function SubTabPurchasesHistory({
  filteredPurchases,
  suppliers = [],
  historySearch,
  setHistorySearch,
  historyStartDate,
  setHistoryStartDate,
  historyEndDate,
  setHistoryEndDate,
  historySupplierId = '',
  setHistorySupplierId,
  historyPaymentStatus = 'all',
  setHistoryPaymentStatus,
  historyReceiptStatus = 'all',
  setHistoryReceiptStatus,
  historyQuickDate = 'all',
  setQuickDatePeriod,
  historyMinAmount = '',
  setHistoryMinAmount,
  historyMaxAmount = '',
  setHistoryMaxAmount,
  historySortBy = 'date-desc',
  setHistorySortBy,
  isAdvancedFiltersOpen,
  setIsAdvancedFiltersOpen,
  resetHistoryFilters,
  activeFiltersCount = 0,
  purchasesSummary,
  setViewingPurchaseVoucher,
  handleEditPurchaseRequest,
  setPurchaseToDelete,
}: SubTabPurchasesHistoryProps) {
  const settings = useCoreStore(s => s.settings);
  const [localFiltersOpen, setLocalFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    historySearch,
    historyStartDate,
    historyEndDate,
    historySupplierId,
    historyPaymentStatus,
    historyReceiptStatus,
    historyQuickDate,
    historyMinAmount,
    historyMaxAmount,
    historySortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / PURCHASES_PAGE_SIZE));
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * PURCHASES_PAGE_SIZE;
    return filteredPurchases.slice(start, start + PURCHASES_PAGE_SIZE);
  }, [filteredPurchases, currentPage]);

  const filtersOpen = isAdvancedFiltersOpen !== undefined ? isAdvancedFiltersOpen : localFiltersOpen;
  const toggleFiltersOpen = () => {
    if (setIsAdvancedFiltersOpen) {
      setIsAdvancedFiltersOpen((prev: boolean) => !prev);
    } else {
      setLocalFiltersOpen(prev => !prev);
    }
  };

  // Calcul KPI par défaut si non fourni
  const summary: PurchasesSummary = purchasesSummary || {
    count: filteredPurchases.length,
    totalAmount: filteredPurchases.reduce((acc, p: any) => acc + Number(p.total ?? p.totalAmount ?? 0), 0),
    totalPaid: filteredPurchases.reduce((acc, p: any) => acc + Number(p.paidAmount ?? 0), 0),
    totalDebt: filteredPurchases.reduce((acc, p: any) => acc + Math.max(0, Number(p.total ?? p.totalAmount ?? 0) - Number(p.paidAmount ?? 0)), 0),
  };

  return (
    <div className="space-y-6">
      {/* 1. Synthèse chiffrée & Indicateurs KPI en temps réel */}
      <PurchasesHistoryKpis summary={summary} />

      {/* 2. Barre de filtres & Actions */}
      <PurchasesHistoryFilterBar
        filteredPurchases={filteredPurchases}
        suppliers={suppliers}
        settings={settings}
        historySearch={historySearch}
        setHistorySearch={setHistorySearch}
        historyStartDate={historyStartDate}
        setHistoryStartDate={setHistoryStartDate}
        historyEndDate={historyEndDate}
        setHistoryEndDate={setHistoryEndDate}
        historySupplierId={historySupplierId}
        setHistorySupplierId={setHistorySupplierId}
        historyPaymentStatus={historyPaymentStatus}
        setHistoryPaymentStatus={setHistoryPaymentStatus}
        historyReceiptStatus={historyReceiptStatus}
        setHistoryReceiptStatus={setHistoryReceiptStatus}
        historyQuickDate={historyQuickDate}
        setQuickDatePeriod={setQuickDatePeriod}
        historyMinAmount={historyMinAmount}
        setHistoryMinAmount={setHistoryMinAmount}
        historyMaxAmount={historyMaxAmount}
        setHistoryMaxAmount={setHistoryMaxAmount}
        historySortBy={historySortBy}
        setHistorySortBy={setHistorySortBy}
        filtersOpen={filtersOpen}
        toggleFiltersOpen={toggleFiltersOpen}
        resetHistoryFilters={resetHistoryFilters}
        activeFiltersCount={activeFiltersCount}
      />

      {/* 3. Tableau des Bons d'Approvisionnement */}
      <PurchasesHistoryTable
        paginatedPurchases={paginatedPurchases}
        filteredPurchasesCount={filteredPurchases.length}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={PURCHASES_PAGE_SIZE}
        setCurrentPage={setCurrentPage}
        setViewingPurchaseVoucher={setViewingPurchaseVoucher}
        handleEditPurchaseRequest={handleEditPurchaseRequest}
        setPurchaseToDelete={setPurchaseToDelete}
        activeFiltersCount={activeFiltersCount}
        resetHistoryFilters={resetHistoryFilters}
      />
    </div>
  );
}
