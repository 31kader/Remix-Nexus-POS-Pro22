import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, CompanySettings, RolePermissions, UserProfile, isTopUpTransaction } from '../types';
import { printReceipt } from '../services/printService';
import { parseISO, isWithinInterval, startOfDay, endOfDay, isToday, isYesterday, subDays } from 'date-fns';
import { useTransactionStore } from '../store/useTransactionStore';
import { 
  printInvoicePDF, 
  printTransactionsReportList, 
  fetchFilteredTransactionsFromNetwork, 
  fetchOlderTransactionsFromNetwork 
} from './transaction-history';

export interface TransactionHistoryProps {
  transactions: Transaction[];
  onReturn: (t: Transaction) => void;
  onMarkAsDelivered: (id: string) => Promise<void>;
  onEdit: (t: Transaction) => void;
  onRestore: (id: string) => Promise<void>;
  settings: CompanySettings;
  canAccess: (permission: keyof RolePermissions) => boolean;
  profile?: UserProfile;
}

export function useTransactionHistoryLogic(props: TransactionHistoryProps) {
  const { transactions, onReturn, onMarkAsDelivered, onEdit, onRestore, settings, canAccess, profile } = props;
  const [dateFilter, setDateFilter] = useState('today');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [customerNameSearch, setCustomerNameSearch] = useState('');
  const [amountSearch, setAmountSearch] = useState('');

  // Temporary filter states for explicit apply action
  const [tempDateFilter, setTempDateFilter] = useState('today');
  const [tempPaymentMethodFilter, setTempPaymentMethodFilter] = useState('all');
  const [tempDeliveryMethodFilter, setTempDeliveryMethodFilter] = useState('all');
  const [tempCustomRange, setTempCustomRange] = useState({ start: '', end: '' });
  const [tempCustomerNameSearch, setTempCustomerNameSearch] = useState('');
  const [tempAmountSearch, setTempAmountSearch] = useState('');

  const [historicalTransactions, setHistoricalTransactions] = useState<Transaction[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);

  const applyFilters = async () => {
    setDateFilter(tempDateFilter);
    setPaymentMethodFilter(tempPaymentMethodFilter);
    setDeliveryMethodFilter(tempDeliveryMethodFilter);
    setCustomRange(tempCustomRange);
    setCustomerNameSearch(tempCustomerNameSearch);
    setAmountSearch(tempAmountSearch);

    setIsLoadingMore(true);
    try {
      const camelData = await fetchFilteredTransactionsFromNetwork(
        {
          dateFilter: tempDateFilter,
          paymentMethod: tempPaymentMethodFilter,
          deliveryMethod: tempDeliveryMethodFilter,
          customRange: tempCustomRange,
          customerName: tempCustomerNameSearch,
          amount: tempAmountSearch,
        },
        profile
      );
      setHistoricalTransactions(camelData);
      setLastVisible(camelData.length > 0 ? camelData[camelData.length - 1].timestamp : 'DONE');
    } catch (err) {
      console.error("Error fetching filtered transactions from network", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadOlderTransactions = async () => {
    setIsLoadingMore(true);
    try {
      let oldestTs: string;
      if (lastVisible && lastVisible !== 'DONE') {
        oldestTs = lastVisible;
      } else {
        const validTransactions = (transactions || []).filter((t: any) => t && t.timestamp);
        if (validTransactions.length > 0) {
          oldestTs = validTransactions.reduce((oldest: string, current: Transaction) => {
            const currTime = new Date(current.timestamp).getTime();
            const oldestTime = new Date(oldest).getTime();
            if (isNaN(currTime) || isNaN(oldestTime)) return oldest;
            return currTime < oldestTime ? current.timestamp : oldest;
          }, validTransactions[0].timestamp);
        } else {
          oldestTs = new Date().toISOString();
        }
      }

      const newDocs = await fetchOlderTransactionsFromNetwork(oldestTs);

      if (newDocs.length === 0) {
        setLastVisible('DONE');
        return;
      }

      setHistoricalTransactions(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const filteredNewDocs = newDocs.filter(t => !existingIds.has(t.id));
        return [...prev, ...filteredNewDocs];
      });

      setLastVisible(newDocs[newDocs.length - 1].timestamp);
    } catch (error) {
      console.error("Error loading historical transactions", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const resetFilters = () => {
    setTempDateFilter('all');
    setTempPaymentMethodFilter('all');
    setTempDeliveryMethodFilter('all');
    setTempCustomRange({ start: '', end: '' });
    setTempCustomerNameSearch('');
    setTempAmountSearch('');

    setDateFilter('all');
    setPaymentMethodFilter('all');
    setDeliveryMethodFilter('all');
    setCustomRange({ start: '', end: '' });
    setCustomerNameSearch('');
    setAmountSearch('');

    setHistoricalTransactions([]);
    setLastVisible(null);

    setTimeout(() => {
      loadOlderTransactions();
    }, 50);
  };

  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | 'id_display'; direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'desc' });

  useEffect(() => {
    if (historicalTransactions.length === 0 && !isLoadingMore) {
      loadOlderTransactions();
    }
  }, []);

  const allCombinedTransactions = useMemo(() => {
    if (!transactions) return historicalTransactions || [];
    const historicalMap = new Map((historicalTransactions || []).map(t => [t.id, t]));
    transactions.forEach((t: Transaction) => {
      if (t && t.id) historicalMap.set(t.id, t);
    });
    let combined = Array.from(historicalMap.values());
    
    // Si c'est un caissier, il ne voit que ses propres transactions
    if (profile?.role === 'cashier') {
      combined = combined.filter((t: Transaction) => 
        t.userId === profile.uid
      );
    }
    
    return combined;
  }, [transactions, historicalTransactions, profile]);

  const filteredTransactions = useMemo(() => {
    const raw = allCombinedTransactions.filter((t: Transaction) => {
      if (!t || !t.timestamp) return false;
      let date: Date;
      try {
        date = typeof t.timestamp === 'string' ? parseISO(t.timestamp) : new Date(t.timestamp);
        if (isNaN(date.getTime())) return false;
      } catch (_) {
        return false;
      }
      const now = new Date();

      // Date filter
      let dateMatch = true;
      try {
        if (dateFilter === 'custom') {
          if (customRange.start && customRange.end) {
            dateMatch = isWithinInterval(date, {
              start: startOfDay(parseISO(customRange.start)),
              end: endOfDay(parseISO(customRange.end))
            });
          }
        } else if (dateFilter === 'today') {
          dateMatch = isToday(date);
        } else if (dateFilter === 'yesterday') {
          dateMatch = isYesterday(date);
        } else if (dateFilter === 'last7days') {
          dateMatch = isWithinInterval(date, {
            start: startOfDay(subDays(now, 7)),
            end: endOfDay(now)
          });
        } else if (dateFilter === 'last30days') {
          dateMatch = isWithinInterval(date, {
            start: startOfDay(subDays(now, 30)),
            end: endOfDay(now)
          });
        }
      } catch (_) {
        dateMatch = false;
      }

      // Payment method filter
      const paymentMatch = paymentMethodFilter === 'all' || t.paymentMethod === paymentMethodFilter;

      // Delivery method filter
      let deliveryMatch = true;
      if (deliveryMethodFilter !== 'all') {
        const dm = (t.deliveryMethod as string) || '';
        if (deliveryMethodFilter === 'in_store') {
          deliveryMatch = dm === 'in_store' || dm === 'direct' || (!t.deliveryMethod && !t.onlineOrderId);
        } else if (deliveryMethodFilter === 'delivery') {
          deliveryMatch = dm === 'delivery' || dm === 'shipping';
        } else if (deliveryMethodFilter === 'pickup') {
          deliveryMatch = dm === 'pickup' || dm === 'retrait' || dm === 'takeaway';
        } else if (deliveryMethodFilter === 'online') {
          deliveryMatch = !!t.onlineOrderId || dm === 'delivery' || dm === 'pickup' || dm === 'online';
        } else {
          deliveryMatch = dm === deliveryMethodFilter;
        }
      }

      // Customer name search
      const customerMatch = customerNameSearch === '' || (t.customerName && t.customerName.toLowerCase().includes(customerNameSearch.toLowerCase()));

      // Amount search
      const amountMatch = amountSearch === '' || (t.total || 0).toString().includes(amountSearch);

      return dateMatch && paymentMatch && deliveryMatch && customerMatch && amountMatch;
    });

    if (sortConfig !== null) {
      raw.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'id_display') {
          aValue = String(a.id || '').slice(-8).toUpperCase();
          bValue = String(b.id || '').slice(-8).toUpperCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return raw;
  }, [transactions, allCombinedTransactions, dateFilter, paymentMethodFilter, deliveryMethodFilter, customRange, customerNameSearch, amountSearch, sortConfig]);

  const requestSort = (key: keyof Transaction | 'id_display') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const allReturns = useTransactionStore(s => s.returns) || [];
  const returnsByTxId = useMemo(() => {
    const map = new Map<string, number>();
    allReturns.forEach(r => {
      if (r?.transactionId) {
        map.set(r.transactionId, (map.get(r.transactionId) || 0) + (Number(r.totalRefund ?? r.refundAmount) || 0));
      }
    });
    return map;
  }, [allReturns]);

  // Chiffre d'affaires net harmonisé (exclut les ventes retournées et déduit les remboursements sur retours partiels)
  const totalPeriod = filteredTransactions
    .filter((t: Transaction) => t.status !== 'cancelled' && t.status !== 'returned' && !isTopUpTransaction(t))
    .reduce((acc: number, t: Transaction) => {
      const base = Number(t.total) || 0;
      if (t.status === 'partially_returned') {
        const refunded = returnsByTxId.get(t.id) || 0;
        return acc + Math.max(0, base - refunded);
      }
      return acc + base;
    }, 0);

  const handlePrint = (t: Transaction) => {
    printReceipt(t, settings);
  };

  const generateInvoicePDF = (t: Transaction) => {
    printInvoicePDF(t, settings);
  };

  const handlePrintList = () => {
    printTransactionsReportList(filteredTransactions, dateFilter, totalPeriod, settings);
  };

  return {
    dateFilter,
    setDateFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    deliveryMethodFilter,
    setDeliveryMethodFilter,
    customRange,
    setCustomRange,
    customerNameSearch,
    setCustomerNameSearch,
    amountSearch,
    setAmountSearch,
    tempDateFilter,
    setTempDateFilter,
    tempPaymentMethodFilter,
    setTempPaymentMethodFilter,
    tempDeliveryMethodFilter,
    setTempDeliveryMethodFilter,
    tempCustomRange,
    setTempCustomRange,
    tempCustomerNameSearch,
    setTempCustomerNameSearch,
    tempAmountSearch,
    setTempAmountSearch,
    sortConfig,
    setSortConfig,
    historicalTransactions,
    setHistoricalTransactions,
    isLoadingMore,
    setIsLoadingMore,
    lastVisible,
    setLastVisible,
    applyFilters,
    requestSort,
    filteredTransactions,
    resetFilters,
    totalPeriod,
    handlePrint,
    generateInvoicePDF,
    handlePrintList,
    loadOlderTransactions
  };
}
