import { useState, useMemo, useDeferredValue } from 'react';
import { Transaction, Product, Employee, ProductReturn, CompanySettings, Category, Customer } from '../../../types';
import { calculateProductProfitStats } from './calculateProductProfitStats';
import { executeRecalculateProfits } from './recalculateProfitsService';

interface UseProfitsReportLogicProps {
  transactions: Transaction[];
  products: Product[];
  employees: Employee[];
  returns: ProductReturn[];
  settings: CompanySettings;
  categories: Category[];
  customers: Customer[];
}

export function useProfitsReportLogic({
  transactions,
  products,
  employees,
  returns,
  settings,
  categories,
  customers
}: UseProfitsReportLogicProps) {
  const [profitFilterDate, setProfitFilterDate] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all'>('today');
  const [profitFilterCategory, setProfitFilterCategory] = useState<string>('all');
  const [profitSortFormat, setProfitSortFormat] = useState<'revenue_desc' | 'revenue_asc' | 'profit_desc' | 'profit_asc' | 'margin_desc' | 'margin_asc' | 'qty_desc' | 'qty_asc'>('profit_desc');
  const [profitFilterCustomer, setProfitFilterCustomer] = useState<string>('all');
  const [profitFilterEmployee, setProfitFilterEmployee] = useState<string>('all');
  const [profitSearchProduct, setProfitSearchProduct] = useState<string>('');
  const deferredProfitSearch = useDeferredValue(profitSearchProduct);
  const [profitFilterSource, setProfitFilterSource] = useState<'all' | 'pos' | 'online'>('all');
  const [profitFilterTimeStart, setProfitFilterTimeStart] = useState<string>('');
  const [profitFilterTimeEnd, setProfitFilterTimeEnd] = useState<string>('');
  const [profitFilterMinTotal, setProfitFilterMinTotal] = useState<string>('');
  const [profitFilterMaxTotal, setProfitFilterMaxTotal] = useState<string>('');

  // Indexation O(1) isolée des produits : recalculée UNIQUEMENT quand le catalogue products change
  const { productsById, productsBySku, productsByBarcode, productsByName } = useMemo(() => {
    const byId = new Map<string, Product>();
    const bySku = new Map<string, Product>();
    const byBarcode = new Map<string, Product>();
    const byName = new Map<string, Product>();

    (products || []).forEach(p => {
      if (p.id) byId.set(p.id, p);
      if (p.sku) bySku.set(p.sku.toLowerCase().trim(), p);
      if (p.barcode) byBarcode.set(p.barcode.toLowerCase().trim(), p);
      if (p.name) byName.set(p.name.toLowerCase().trim(), p);
    });

    return { productsById: byId, productsBySku: bySku, productsByBarcode: byBarcode, productsByName: byName };
  }, [products]);

  // Indexation O(1) isolée des transactions : recalculée UNIQUEMENT quand transactions change
  const transactionsById = useMemo(() => {
    const map = new Map<string, any>();
    (transactions || []).forEach(t => {
      if (t?.id) map.set(t.id, t);
    });
    return map;
  }, [transactions]);

  // Nom d'employé sélectionné précalculé pour éliminer les .find() répétés dans les boucles de filtrage
  const selectedEmpName = useMemo(() => {
    if (profitFilterEmployee === 'all') return null;
    return employees?.find(e => e.id === profitFilterEmployee)?.name || null;
  }, [employees, profitFilterEmployee]);

  // 1. Accumulate stats from transactions (Depends ONLY on transaction-level filters)
  const productStats = useMemo(() => {
    return calculateProductProfitStats({
      transactions,
      transactionsById,
      productsById,
      productsBySku,
      productsByBarcode,
      productsByName,
      selectedEmpName,
      returns,
      settings,
      profitFilterCustomer,
      profitFilterEmployee,
      profitFilterSource,
      profitFilterTimeStart,
      profitFilterTimeEnd,
      profitFilterDate,
      profitFilterMinTotal,
      profitFilterMaxTotal
    });
  }, [transactions, transactionsById, productsById, productsBySku, productsByBarcode, productsByName, selectedEmpName, returns, settings, profitFilterCustomer, profitFilterSource, profitFilterTimeStart, profitFilterTimeEnd, profitFilterDate, profitFilterMinTotal, profitFilterMaxTotal]);

  // 2. Map, filter, and sort products (Depends on productStats, search, category, sort)
  const productProfitData = useMemo(() => {
    let filteredProductsList = products;
    
    if (profitFilterCategory !== 'all') {
      filteredProductsList = filteredProductsList.filter(p => p.categoryId === profitFilterCategory);
    }
    
    if (deferredProfitSearch) {
      const query = deferredProfitSearch.toLowerCase().trim();
      filteredProductsList = filteredProductsList.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query))
      );
    }

    let result = filteredProductsList
      .map(p => {
        const stats = productStats[p.id] || (p.name ? productStats[p.name] : null);
        const resolvedStats = stats || { qty: 0, revenue: 0, cost: 0 };
        const profit = resolvedStats.revenue - resolvedStats.cost;
        const catalogMargin = Number(p.price) > 0 ? ((Number(p.price) - Number(p.costPrice || 0)) / Number(p.price)) * 100 : 0;
        const margin = resolvedStats.revenue > 0 ? (profit / resolvedStats.revenue) * 100 : catalogMargin;
        return {
          ...p,
          stats: resolvedStats,
          profit,
          margin
        };
      });

    // If there are sold products, prioritize them when filtering by period; otherwise display catalog items with their margins
    const hasSoldProducts = result.some(p => p.stats && p.stats.qty > 0);
    if (hasSoldProducts && !deferredProfitSearch && profitFilterDate !== 'all') {
      result = result.filter(p => p.stats.qty > 0);
    }

    // Sorting
    return result.sort((a, b) => {
      if (profitSortFormat === 'revenue_desc') return b.stats.revenue - a.stats.revenue;
      if (profitSortFormat === 'revenue_asc') return a.stats.revenue - b.stats.revenue;
      if (profitSortFormat === 'profit_desc') return b.profit - a.profit;
      if (profitSortFormat === 'profit_asc') return a.profit - b.profit;
      if (profitSortFormat === 'margin_desc') return b.margin - a.margin;
      if (profitSortFormat === 'margin_asc') return a.margin - b.margin;
      if (profitSortFormat === 'qty_desc') return b.stats.qty - a.stats.qty;
      if (profitSortFormat === 'qty_asc') return a.stats.qty - b.stats.qty;
      return 0;
    });
  }, [products, productStats, profitFilterCategory, deferredProfitSearch, profitSortFormat, profitFilterDate]);

  const handleProfitSort = (key: 'revenue' | 'profit' | 'margin' | 'qty') => {
    setProfitSortFormat(prev => {
      if (key === 'revenue') return prev === 'revenue_desc' ? 'revenue_asc' : 'revenue_desc';
      if (key === 'profit') return prev === 'profit_desc' ? 'profit_asc' : 'profit_desc';
      if (key === 'margin') return prev === 'margin_desc' ? 'margin_asc' : 'margin_desc';
      return prev === 'qty_desc' ? 'qty_asc' : 'qty_desc';
    });
  };

  const totals = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    Object.values(productStats).forEach(s => {
      revenue += (Number(s.revenue) || 0);
      cost += (Number(s.cost) || 0);
    });
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return {
      revenue: isNaN(revenue) ? 0 : revenue,
      cost: isNaN(cost) ? 0 : cost,
      profit: isNaN(profit) ? 0 : profit,
      margin: isNaN(margin) ? 0 : margin
    };
  }, [productStats]);

  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  const handleRecalculateProfits = async () => {
    setIsRecalculating(true);
    try {
      await executeRecalculateProfits(products);
    } finally {
      setIsRecalculating(false);
    }
  };

  return {
    profitFilterDate,
    setProfitFilterDate,
    profitFilterCategory,
    setProfitFilterCategory,
    profitSortFormat,
    setProfitSortFormat,
    profitFilterCustomer,
    setProfitFilterCustomer,
    profitFilterEmployee,
    setProfitFilterEmployee,
    profitSearchProduct,
    setProfitSearchProduct,
    profitFilterSource,
    setProfitFilterSource,
    profitFilterTimeStart,
    setProfitFilterTimeStart,
    profitFilterTimeEnd,
    setProfitFilterTimeEnd,
    profitFilterMinTotal,
    setProfitFilterMinTotal,
    profitFilterMaxTotal,
    setProfitFilterMaxTotal,
    productProfitData,
    handleProfitSort,
    totals,
    isRecalculating,
    handleRecalculateProfits
  };
}
