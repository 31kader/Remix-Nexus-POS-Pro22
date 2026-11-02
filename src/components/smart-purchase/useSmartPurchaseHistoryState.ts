import { useState, useMemo } from 'react';
import { Purchase } from '../../types';
import {
  filterPurchases,
  calculatePurchasesSummary,
  PurchasePaymentStatusFilter,
  PurchaseReceiptStatusFilter,
  PurchaseSortOption
} from './purchaseHelpers';

export function useSmartPurchaseHistoryState(purchases: Purchase[]) {
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historySupplierId, setHistorySupplierId] = useState('');
  const [historyPaymentStatus, setHistoryPaymentStatus] = useState<PurchasePaymentStatusFilter>('all');
  const [historyReceiptStatus, setHistoryReceiptStatus] = useState<PurchaseReceiptStatusFilter>('all');
  const [historyQuickDate, setHistoryQuickDate] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month' | 'last_month' | 'custom'>('all');
  const [historyMinAmount, setHistoryMinAmount] = useState('');
  const [historyMaxAmount, setHistoryMaxAmount] = useState('');
  const [historySortBy, setHistorySortBy] = useState<PurchaseSortOption>('date-desc');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  const setQuickDatePeriod = (period: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'last_month') => {
    setHistoryQuickDate(period);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (period === 'all') {
      setHistoryStartDate('');
      setHistoryEndDate('');
    } else if (period === 'today') {
      const todayStr = toYMD(now);
      setHistoryStartDate(todayStr);
      setHistoryEndDate(todayStr);
    } else if (period === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toYMD(y);
      setHistoryStartDate(yStr);
      setHistoryEndDate(yStr);
    } else if (period === '7days') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      setHistoryStartDate(toYMD(d7));
      setHistoryEndDate(toYMD(now));
    } else if (period === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setHistoryStartDate(toYMD(firstDay));
      setHistoryEndDate(toYMD(now));
    } else if (period === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setHistoryStartDate(toYMD(firstDayLastMonth));
      setHistoryEndDate(toYMD(lastDayLastMonth));
    }
  };

  const resetHistoryFilters = () => {
    setHistorySearch('');
    setHistoryStartDate('');
    setHistoryEndDate('');
    setHistorySupplierId('');
    setHistoryPaymentStatus('all');
    setHistoryReceiptStatus('all');
    setHistoryQuickDate('all');
    setHistoryMinAmount('');
    setHistoryMaxAmount('');
    setHistorySortBy('date-desc');
  };

  const activeHistoryFiltersCount = useMemo(() => {
    let count = 0;
    if (historySearch.trim()) count++;
    if (historyStartDate || historyEndDate) count++;
    if (historySupplierId && historySupplierId !== 'all') count++;
    if (historyPaymentStatus !== 'all') count++;
    if (historyReceiptStatus !== 'all') count++;
    if (historyMinAmount.trim() || historyMaxAmount.trim()) count++;
    if (historySortBy !== 'date-desc') count++;
    return count;
  }, [
    historySearch, historyStartDate, historyEndDate, historySupplierId,
    historyPaymentStatus, historyReceiptStatus, historyMinAmount, historyMaxAmount, historySortBy
  ]);

  const filteredPurchases = useMemo(() => {
    return filterPurchases(purchases, {
      search: historySearch,
      startDate: historyStartDate,
      endDate: historyEndDate,
      supplierId: historySupplierId,
      paymentStatus: historyPaymentStatus,
      receiptStatus: historyReceiptStatus,
      minAmount: historyMinAmount,
      maxAmount: historyMaxAmount,
      sortBy: historySortBy
    });
  }, [
    purchases,
    historySearch,
    historyStartDate,
    historyEndDate,
    historySupplierId,
    historyPaymentStatus,
    historyReceiptStatus,
    historyMinAmount,
    historyMaxAmount,
    historySortBy
  ]);

  const purchasesSummary = useMemo(() => {
    return calculatePurchasesSummary(filteredPurchases);
  }, [filteredPurchases]);

  return {
    historySearch,
    setHistorySearch,
    historyStartDate,
    setHistoryStartDate,
    historyEndDate,
    setHistoryEndDate,
    historySupplierId,
    setHistorySupplierId,
    historyPaymentStatus,
    setHistoryPaymentStatus,
    historyReceiptStatus,
    setHistoryReceiptStatus,
    historyQuickDate,
    setHistoryQuickDate,
    historyMinAmount,
    setHistoryMinAmount,
    historyMaxAmount,
    setHistoryMaxAmount,
    historySortBy,
    setHistorySortBy,
    isAdvancedFiltersOpen,
    setIsAdvancedFiltersOpen,
    setQuickDatePeriod,
    resetHistoryFilters,
    activeHistoryFiltersCount,
    filteredPurchases,
    purchasesSummary
  };
}
