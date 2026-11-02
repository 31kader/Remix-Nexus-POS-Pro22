import { useState, useMemo } from 'react';
import { 
  startOfDay, endOfDay, subDays, startOfMonth, parseISO, isWithinInterval, isYesterday, isToday 
} from 'date-fns';
import { Transaction, Product, Category, CompanySettings, Employee, isTopUpTransaction } from '../../types';
import { calculateItemPrice } from '../../lib/utils';
import {
  parseTransactionItems,
  buildProductLookupIndexes,
  resolveProductFromLookup,
  resolveCostFromLookup
} from './grouped-sales/groupedSalesProductIndex';
import {
  exportGroupedSalesData,
  exportGroupedSalesCSV
} from './grouped-sales/groupedSalesExports';

// Ré-export pour compatibilité
export { parseTransactionItems };

export interface UseGroupedSalesAndBasketsLogicProps {
  transactions: Transaction[];
  products: Product[];
  categories: Category[];
  settings: CompanySettings;
  employees?: Employee[];
}

export function useGroupedSalesAndBasketsLogic({
  transactions = [],
  products = [],
  categories = [],
  settings
}: UseGroupedSalesAndBasketsLogicProps) {
  const [activeSubTab, setActiveSubTab] = useState<'grouped_products' | 'basket_profits'>('grouped_products');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'this_month' | 'all' | 'custom'>('this_month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'qty' | 'revenue' | 'profit'>('qty');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedBasketId, setExpandedBasketId] = useState<string | null>(null);

  // Indexation multi-critères O(1)
  const productIndexes = useMemo(() => buildProductLookupIndexes(products), [products]);

  const resolveCostPerUnit = (item: any, matchedProduct?: Product): number => {
    return resolveCostFromLookup(item, productIndexes, matchedProduct);
  };

  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => {
      if (c.id) map.set(c.id, c.name);
    });
    return map;
  }, [categories]);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return (transactions || []).filter(t => {
      if (t.status === 'returned' || t.status === 'cancelled' || isTopUpTransaction(t)) return false;
      const dateVal = t.timestamp || (t as any).date || (t as any).created_at;
      if (!dateVal) return true;
      const tDate = new Date(dateVal);

      if (dateFilter === 'today') {
        return isToday(tDate);
      } else if (dateFilter === 'yesterday') {
        return isYesterday(tDate);
      } else if (dateFilter === 'last7days') {
        return isWithinInterval(tDate, { start: startOfDay(subDays(now, 7)), end: endOfDay(now) });
      } else if (dateFilter === 'last30days') {
        return isWithinInterval(tDate, { start: startOfDay(subDays(now, 30)), end: endOfDay(now) });
      } else if (dateFilter === 'this_month') {
        return isWithinInterval(tDate, { start: startOfMonth(now), end: endOfDay(now) });
      } else if (dateFilter === 'custom') {
        if (!customRange.start || !customRange.end) return true;
        const start = startOfDay(parseISO(customRange.start));
        const end = endOfDay(parseISO(customRange.end));
        return isWithinInterval(tDate, { start, end });
      }
      return true;
    });
  }, [transactions, dateFilter, customRange]);

  // 1. Calcul des PRODUITS GROUPÉS
  const groupedProductsData = useMemo(() => {
    const map = new Map<string, {
      productId: string;
      productName: string;
      barcode?: string;
      sku: string;
      categoryName: string;
      totalQuantity: number;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      averagePrice: number;
      marginPercent: number;
      transactionCount: number;
    }>();

    filteredTransactions.forEach(t => {
      const items = parseTransactionItems(t.items);
      const txSubtotal = items.reduce((s, it) => s + (Number(it.quantity) || 1) * calculateItemPrice(it, t.isWholesale), 0);
      const discountRatio = txSubtotal > 0 ? Math.max(0, Math.min(1, (Number(t.total) || 0) / txSubtotal)) : 1;

      items.forEach(item => {
        const matchedProduct = resolveProductFromLookup(item, productIndexes);
        const prodId = matchedProduct?.id || (item as any).productId || item.id || item.name;
        const qty = Number(item.quantity) || 1;
        const itemPrice = calculateItemPrice(item, t.isWholesale);
        const revenue = qty * itemPrice * discountRatio;
        
        const costPerUnit = resolveCostFromLookup(item, productIndexes, matchedProduct);
        const cost = qty * costPerUnit;
        const profit = revenue - cost;

        const catName = matchedProduct?.categoryId ? (categoriesMap.get(matchedProduct.categoryId) || 'Non classé') : 'Non classé';

        if (!map.has(prodId)) {
          map.set(prodId, {
            productId: prodId,
            productName: item.name || matchedProduct?.name || 'Article',
            barcode: item.barcode || matchedProduct?.barcode || (matchedProduct as any)?.barcodes?.[0] || '—',
            sku: item.sku || matchedProduct?.sku || '—',
            categoryName: catName,
            totalQuantity: qty,
            totalRevenue: revenue,
            totalCost: cost,
            totalProfit: profit,
            averagePrice: itemPrice,
            marginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
            transactionCount: 1
          });
        } else {
          const existing = map.get(prodId)!;
          existing.totalQuantity += qty;
          existing.totalRevenue += revenue;
          existing.totalCost += cost;
          existing.totalProfit += profit;
          existing.averagePrice = existing.totalQuantity > 0 ? existing.totalRevenue / existing.totalQuantity : itemPrice;
          existing.marginPercent = existing.totalRevenue > 0 ? (existing.totalProfit / existing.totalRevenue) * 100 : 0;
          existing.transactionCount += 1;
        }
      });
    });

    let list = Array.from(map.values());

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(item => 
        item.productName.toLowerCase().includes(term) || 
        item.sku.toLowerCase().includes(term) ||
        item.categoryName.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== 'all') {
      list = list.filter(item => item.categoryName === categoryFilter);
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'qty') diff = b.totalQuantity - a.totalQuantity;
      else if (sortBy === 'revenue') diff = b.totalRevenue - a.totalRevenue;
      else if (sortBy === 'profit') diff = b.totalProfit - a.totalProfit;
      return sortDirection === 'desc' ? diff : -diff;
    });

    return list;
  }, [filteredTransactions, productIndexes, categoriesMap, searchTerm, categoryFilter, sortBy, sortDirection]);

  // 2. Calcul du BÉNÉFICE PAR PANIER
  const basketProfitsData = useMemo(() => {
    let list = filteredTransactions.map(t => {
      const items = parseTransactionItems(t.items);
      let basketCost = 0;
      let totalItemsCount = 0;
      let itemsTotalRevenue = 0;

      items.forEach(item => {
        const qty = Number(item.quantity) || 1;
        totalItemsCount += qty;
        const itemPrice = calculateItemPrice(item, t.isWholesale);
        itemsTotalRevenue += (itemPrice * qty);

        const matchedProduct = resolveProductFromLookup(item, productIndexes);
        const costPerUnit = resolveCostFromLookup(item, productIndexes, matchedProduct);
        basketCost += (costPerUnit * qty);
      });

      const basketTotal = Number(t.total) || itemsTotalRevenue || 0;
      const basketProfit = basketTotal - basketCost;
      const marginPercent = basketTotal > 0 ? (basketProfit / basketTotal) * 100 : 0;

      return {
        id: t.id,
        timestamp: t.timestamp || (t as any).date || (t as any).created_at,
        customerName: t.customerName || (t.customerId ? 'Client #' + t.customerId.slice(-4) : 'Client Comptoir'),
        employeeName: t.employeeName || 'Caisse',
        itemsCount: totalItemsCount,
        basketTotal,
        basketCost,
        basketProfit,
        marginPercent,
        items
      };
    });

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(b => 
        b.id.toLowerCase().includes(term) || 
        b.customerName.toLowerCase().includes(term) ||
        b.employeeName.toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'profit') diff = b.basketProfit - a.basketProfit;
      else if (sortBy === 'revenue') diff = b.basketTotal - a.basketTotal;
      else if (sortBy === 'qty') diff = b.itemsCount - a.itemsCount;
      return sortDirection === 'desc' ? diff : -diff;
    });

    return list;
  }, [filteredTransactions, productIndexes, searchTerm, sortBy, sortDirection]);

  // Global KPIs for Grouped Products
  const groupedTotals = useMemo(() => {
    const totalQty = groupedProductsData.reduce((sum, p) => sum + p.totalQuantity, 0);
    const totalRev = groupedProductsData.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalProf = groupedProductsData.reduce((sum, p) => sum + p.totalProfit, 0);
    const avgMargin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;
    return { totalQty, totalRev, totalProf, avgMargin, uniqueProducts: groupedProductsData.length };
  }, [groupedProductsData]);

  // Global KPIs for Baskets
  const basketTotals = useMemo(() => {
    const totalBaskets = basketProfitsData.length;
    const totalRev = basketProfitsData.reduce((sum, b) => sum + b.basketTotal, 0);
    const totalProf = basketProfitsData.reduce((sum, b) => sum + b.basketProfit, 0);
    const avgBasketRevenue = totalBaskets > 0 ? totalRev / totalBaskets : 0;
    const avgBasketProfit = totalBaskets > 0 ? totalProf / totalBaskets : 0;
    const avgMargin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;
    const maxProfitBasket = basketProfitsData.length > 0 ? Math.max(...basketProfitsData.map(b => b.basketProfit)) : 0;
    return { totalBaskets, totalRev, totalProf, avgBasketRevenue, avgBasketProfit, avgMargin, maxProfitBasket };
  }, [basketProfitsData]);

  // Pagination
  const currentList = activeSubTab === 'grouped_products' ? groupedProductsData : basketProfitsData;
  const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const pagedList = useMemo(() => {
    const from = (validPage - 1) * pageSize;
    return currentList.slice(from, from + pageSize);
  }, [currentList, validPage, pageSize]);

  // Exports
  const handleExportExcel = () => {
    exportGroupedSalesData(activeSubTab, groupedProductsData, basketProfitsData);
  };

  const handleExportCSV = () => {
    exportGroupedSalesCSV(activeSubTab, groupedProductsData, basketProfitsData);
  };

  return {
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
  };
}
