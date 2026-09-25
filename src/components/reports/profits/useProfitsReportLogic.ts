import { useState, useMemo, useDeferredValue } from 'react';
import { isToday, isYesterday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { calculateItemPrice } from '../../../lib/utils';
import { Transaction, Product, Employee, ProductReturn, CompanySettings, Category, Customer } from '../../../types';
import { toast } from 'sonner';
import { useTransactionStore } from '../../../store/useTransactionStore';
import { set as setIDB } from 'idb-keyval';
import { enqueueSyncBatch } from '../../../services/SyncService';
import { preparePayload } from '../../../lib/db-converters';

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
    let filteredTransactions = transactions;

    filteredTransactions = filteredTransactions.filter(t => {
      const tDate = new Date(t.timestamp);
      if (isNaN(tDate.getTime())) return false;
      if (profitFilterDate === 'today' && !isToday(tDate)) return false;
      if (profitFilterDate === 'yesterday' && !isYesterday(tDate)) return false;
      if (profitFilterDate === 'week' && !isThisWeek(tDate, { weekStartsOn: 1 })) return false;
      if (profitFilterDate === 'month' && !isThisMonth(tDate)) return false;
      if (profitFilterDate === 'year' && !isThisYear(tDate)) return false;
      
      if (profitFilterTimeStart) {
        const [hours, minutes] = profitFilterTimeStart.split(':').map(Number);
        if (tDate.getHours() < hours || (tDate.getHours() === hours && tDate.getMinutes() < minutes)) return false;
      }
      
      if (profitFilterTimeEnd) {
        const [hours, minutes] = profitFilterTimeEnd.split(':').map(Number);
        if (tDate.getHours() > hours || (tDate.getHours() === hours && tDate.getMinutes() > minutes)) return false;
      }
      
      if (profitFilterSource !== 'all') {
        const isOnline = !!t.onlineOrderId;
        if (profitFilterSource === 'online' && !isOnline) return false;
        if (profitFilterSource === 'pos' && isOnline) return false;
      }
      
      if (profitFilterCustomer !== 'all' && t.customerId !== profitFilterCustomer) return false;
      if (selectedEmpName && t.employeeName !== selectedEmpName) return false;

      // Filter by basket total (transaction total)
      const basketTotal = (t as any).totalAmount ?? t.total ?? 0;
      if (profitFilterMinTotal !== '') {
        const minVal = parseFloat(profitFilterMinTotal);
        if (!isNaN(minVal) && basketTotal < minVal) return false;
      }
      if (profitFilterMaxTotal !== '') {
        const maxVal = parseFloat(profitFilterMaxTotal);
        if (!isNaN(maxVal) && basketTotal > maxVal) return false;
      }
      
      return true;
    });

    const stats: Record<string, { qty: number, revenue: number, cost: number }> = {};

    filteredTransactions.forEach(t => {
      if (!t || t.status === 'returned' || t.status === 'cancelled') return;
      let items = t.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items) || items.length === 0) return;

      const subtotal = items.reduce((s, item) => s + (calculateItemPrice(item, t.isWholesale) * (Number(item?.quantity) || 1)), 0);
      const totalDiscounts = (Number(t.discountAmount) || 0) + (Number(t.pointsDiscount) || 0) + (Number(t.voucherDiscount) || 0);

      items.forEach(item => {
        if (!item) return;
        const itemSku = String((item as any).sku || '').toLowerCase().trim();
        const itemBarcode = String((item as any).barcode || '').toLowerCase().trim();
        const itemName = String(item.name || '').toLowerCase().trim();

        const matchingProduct = productsById.get((item as any).productId) || 
                                productsById.get(item.id) || 
                                (itemSku ? productsBySku.get(itemSku) : null) ||
                                (itemBarcode ? productsByBarcode.get(itemBarcode) : null) ||
                                (itemName ? productsByName.get(itemName) : null);
        const itemKey = matchingProduct ? matchingProduct.id : (item.id || item.name);
        if (!itemKey) return;

        if (!stats[itemKey]) {
          stats[itemKey] = { qty: 0, revenue: 0, cost: 0 };
        }
        const qty = Number(item.quantity) || 1;
        stats[itemKey].qty += qty;
        
        const itemSubtotal = calculateItemPrice(item, t.isWholesale) * qty;
        const itemDiscount = subtotal > 0 ? (itemSubtotal / subtotal) * totalDiscounts : 0;
        const itemRevenue = itemSubtotal - itemDiscount;
        
        stats[itemKey].revenue += itemRevenue;
        
        const p = matchingProduct || productsById.get(itemKey);

        const rawCost = (item as any).costPrice ?? (item as any).cost_price;
        const baseCost = (rawCost !== undefined && Number(rawCost) > 0)
          ? Number(rawCost) 
          : Number(p?.costPrice || (p as any)?.cost_price || 0);
        
        // Dynamic operational costs
        const opCosts = p?.operationalCosts || {};
        const packaging = opCosts.packaging ?? (t.onlineOrderId ? (settings.operationalCosts?.basePackaging || 0) : 0);
        const shipping = opCosts.shipping ?? (t.onlineOrderId ? (settings.operationalCosts?.baseShipping || 0) : 0);
        const other = opCosts.other || 0;
        
        const totalUnitCost = baseCost + packaging + shipping + other;
        stats[itemKey].cost += totalUnitCost * qty;
      });
    });

    // Subtract returns from stats
    returns.forEach(ret => {
        if (!ret) return;
        const tDate = new Date(ret.timestamp);
        if (isNaN(tDate.getTime())) return;
        if (profitFilterDate === 'today' && !isToday(tDate)) return;
        if (profitFilterDate === 'yesterday' && !isYesterday(tDate)) return;
        if (profitFilterDate === 'week' && !isThisWeek(tDate, { weekStartsOn: 1 })) return;
        if (profitFilterDate === 'month' && !isThisMonth(tDate)) return;
        if (profitFilterDate === 'year' && !isThisYear(tDate)) return;

        if (profitFilterTimeStart) {
          const [hours, minutes] = profitFilterTimeStart.split(':').map(Number);
          if (tDate.getHours() < hours || (tDate.getHours() === hours && tDate.getMinutes() < minutes)) return;
        }

        if (profitFilterTimeEnd) {
          const [hours, minutes] = profitFilterTimeEnd.split(':').map(Number);
          if (tDate.getHours() > hours || (tDate.getHours() === hours && tDate.getMinutes() > minutes)) return;
        }

        const originalTx = transactionsById.get(ret.transactionId);
        if (profitFilterSource !== 'all' || profitFilterCustomer !== 'all' || profitFilterEmployee !== 'all') {
          if (profitFilterSource !== 'all') {
            const isOnline = !!originalTx?.onlineOrderId;
            if (profitFilterSource === 'online' && !isOnline) return;
            if (profitFilterSource === 'pos' && isOnline) return;
          }
          
          if (profitFilterCustomer !== 'all' && originalTx?.customerId !== profitFilterCustomer) return;
          if (selectedEmpName && originalTx?.employeeName !== selectedEmpName) return;
        }

        // Filter by basket total (transaction total) for returns based on originalTx
        if (originalTx) {
          const basketTotal = (originalTx as any).totalAmount ?? originalTx.total ?? 0;
          if (profitFilterMinTotal !== '') {
            const minVal = parseFloat(profitFilterMinTotal);
            if (!isNaN(minVal) && basketTotal < minVal) return;
          }
          if (profitFilterMaxTotal !== '') {
            const maxVal = parseFloat(profitFilterMaxTotal);
            if (!isNaN(maxVal) && basketTotal > maxVal) return;
          }
        }

        let retItems = ret.items;
        if (typeof retItems === 'string') {
          try { retItems = JSON.parse(retItems); } catch (_) { retItems = []; }
        }
        if (!Array.isArray(retItems) || retItems.length === 0) return;

        const retSubtotal = retItems.reduce((s, it) => s + (calculateItemPrice(it, originalTx?.isWholesale) * (Number(it?.quantity) || 1)), 0);
        
        retItems.forEach(item => {
            const retProdId = item.productId || (item as any).id;
            const targetStatKey = stats[retProdId] ? retProdId : Object.keys(stats).find(k => {
              const p = productsById.get(k);
              return p && (p.id === retProdId || (p.name && item.name && p.name.toLowerCase().trim() === item.name.toLowerCase().trim()));
            });

            if (targetStatKey && stats[targetStatKey]) {
                const qty = Number(item.quantity) || 1;
                stats[targetStatKey].qty -= qty;
                
                const itemSubtotal = calculateItemPrice(item, originalTx?.isWholesale) * qty;
                const refundedRevenue = retSubtotal > 0 ? (itemSubtotal / retSubtotal) * (Number(ret.totalRefund) || itemSubtotal) : 0;
                
                stats[targetStatKey].revenue -= refundedRevenue;
                
                const p = productsById.get(targetStatKey);
                const baseCost = Number(p?.costPrice || 0);
                stats[targetStatKey].cost -= (baseCost * qty);
            }
        });
    });

    return stats;
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
        const catalogMargin = Number(p.costPrice) > 0 ? ((Number(p.price) - Number(p.costPrice)) / Number(p.costPrice)) * 100 : 0;
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
    if (!confirm("Voulez-vous resynchroniser et recalculer le prix d'achat et le bénéfice de toutes les ventes à partir des prix du catalogue actuel ?")) return;

    setIsRecalculating(true);
    try {
      const productsById = new Map<string, Product>();
      products.forEach(p => productsById.set(p.id, p));

      let updatedCount = 0;
      const currentTransactions = useTransactionStore.getState().transactions || [];

      const updatedTransactions = currentTransactions.map(t => {
        let items = t.items;
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch (_) { items = []; }
        }
        if (!Array.isArray(items)) return t;

        let txModified = false;
        const updatedItems = items.map(item => {
          const itemSku = String((item as any).sku || '').toLowerCase().trim();
          const itemBarcode = String((item as any).barcode || '').toLowerCase().trim();
          const itemName = String(item.name || '').toLowerCase().trim();
          const itemKey = (item as any).productId || item.id;
          const matchingProduct = productsById.get(itemKey) || 
                                  (itemSku ? products.find(p => p.sku && p.sku.toLowerCase().trim() === itemSku) : null) ||
                                  (itemBarcode ? products.find(p => p.barcode && p.barcode.toLowerCase().trim() === itemBarcode) : null) ||
                                  (itemName ? products.find(p => p.name && p.name.toLowerCase().trim() === itemName) : null);

          if (matchingProduct && matchingProduct.costPrice !== undefined && Number(matchingProduct.costPrice) > 0) {
            if ((item as any).costPrice !== matchingProduct.costPrice) {
              txModified = true;
              return {
                ...item,
                costPrice: matchingProduct.costPrice
              };
            }
          }
          return item;
        });

        if (txModified) {
          updatedCount++;
          return {
            ...t,
            items: updatedItems
          };
        }
        return t;
      });

      if (updatedCount > 0) {
        useTransactionStore.setState({ transactions: updatedTransactions });
        await setIDB('nexus_transactions_cache', updatedTransactions).catch(() => {});

        const modifiedTxs = updatedTransactions.filter(t => currentTransactions.some(orig => orig.id === t.id && orig !== t));
        if (modifiedTxs.length > 0) {
          enqueueSyncBatch(modifiedTxs.map(t => ({
            table: 'transactions',
            action: 'UPSERT',
            recordId: t.id,
            payload: preparePayload('transactions', t.id, t)
          })));
        }

        toast.success(`Bénéfices recalculés avec succès ! ${updatedCount} transaction(s) mise(s) à jour.`);
      } else {
        toast.info("Toutes les ventes sont déjà basées sur les prix d'achat actuels du catalogue.");
      }
    } catch (err: any) {
      toast.error(`Erreur lors du recalcul : ${err.message || 'Erreur inconnue'}`);
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
