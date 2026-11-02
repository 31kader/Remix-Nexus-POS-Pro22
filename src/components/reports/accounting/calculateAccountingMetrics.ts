import { Transaction, Product, Expense, CompanySettings, isTopUpTransaction } from '../../../types';
import { calculateItemPrice } from '../../../lib/utils';
import { useTransactionStore } from '../../../store/useTransactionStore';

export interface AccountingBaseMetrics {
  categoryData: { name: string; value: number }[];
  employeeData: { name: string; value: number }[];
  revenueBySource: Record<string, number>;
  revenueBySourceData: { name: string; value: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  productSalesData: { name: string; quantity: number; revenue: number }[];
  totalRevenue: number;
  totalCost: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
}

export function calculateAccountingMetrics(
  transactions: Transaction[],
  productsById: Map<string, any>,
  productsByName: Map<string, any>,
  expenses: Expense[],
  settings: CompanySettings
): AccountingBaseMetrics {
  const categoryMap: Record<string, number> = {};
  const employeeMap: Record<string, number> = {};
  const productMap: Record<string, { name: string, quantity: number, revenue: number }> = {};

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const getSafeItems = (t: any): any[] => {
    if (!t) return [];
    let items = t.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (_) { items = []; }
    }
    return Array.isArray(items) ? items : [];
  };

  safeTransactions.forEach(t => {
    if (!t || t.status === 'returned' || t.status === 'cancelled' || (t as any).source === 'topup') return;
    
    const items = getSafeItems(t);
    items.forEach(item => {
      if (!item) return;
      const cat = item.categoryId || 'Non classé';
      const qty = Number(item.quantity) || 1;
      categoryMap[cat] = (categoryMap[cat] || 0) + (calculateItemPrice(item, t.isWholesale) * qty);
      
      const prodId = item.id || item.name || 'unknown';
      if (!productMap[prodId]) {
        productMap[prodId] = { name: item.name || 'Article inconnu', quantity: 0, revenue: 0 };
      }
      productMap[prodId].quantity += qty;
      productMap[prodId].revenue += (calculateItemPrice(item, t.isWholesale) * qty);
    });

    const emp = t.employeeName || 'Système';
    employeeMap[emp] = (employeeMap[emp] || 0) + (Number(t.total) || 0);
  });

  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  const employeeData = Object.entries(employeeMap).map(([name, value]) => ({ name, value }));

  // Revenue by source
  const revenueBySource = safeTransactions.reduce((acc, t) => {
    if (!t || t.status === 'returned' || t.status === 'cancelled' || (t as any).source === 'topup') return acc;
    const source = t.onlineOrderId ? 'Application' : 'Magasin';
    acc[source] = (acc[source] || 0) + (Number(t.total) || 0);
    return acc;
  }, { Magasin: 0, Application: 0 } as Record<string, number>);

  const productSalesData = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue);
  const topProducts = productSalesData.slice(0, 10);

  const returns = useTransactionStore.getState().returns || [];
  const returnsByTxId = new Map<string, number>();
  const returnedCostByTxId = new Map<string, number>();
  returns.forEach((r: any) => {
    if (r?.transactionId) {
      returnsByTxId.set(r.transactionId, (returnsByTxId.get(r.transactionId) || 0) + (Number(r.totalRefund ?? r.refundAmount) || 0));
      
      let returnCost = 0;
      const rItems = Array.isArray(r.items) ? r.items : (
        (r.productId || r.product_id) ? [{
          productId: r.productId || r.product_id,
          quantity: r.quantity || 1
        }] : []
      );
      rItems.forEach((ri: any) => {
        const pId = ri.productId || ri.id;
        const p = (pId ? productsById.get(pId) : null) || (ri.name ? productsByName.get(ri.name.toLowerCase().trim()) : null);
        const cPrice = Number(ri.costPrice !== undefined ? ri.costPrice : (p?.costPrice || 0));
        returnCost += cPrice * (Number(ri.quantity) || 1);
      });
      returnedCostByTxId.set(r.transactionId, (returnedCostByTxId.get(r.transactionId) || 0) + returnCost);
    }
  });

  // 🛡️ P0-BIZ-6 : Déduction précise des retours partiels sur le CA net
  const totalRevenue = safeTransactions.reduce((sum, t) => {
    if (!t || t.status === 'returned' || t.status === 'cancelled' || isTopUpTransaction(t)) return sum;
    const base = Number(t.total) || 0;
    if (t.status === 'partially_returned') {
      const refunded = returnsByTxId.get(t.id) || 0;
      return sum + Math.max(0, base - refunded);
    }
    return sum + base;
  }, 0);

  const totalCost = safeTransactions.reduce((sum, t) => {
    if (!t || t.status === 'returned' || t.status === 'cancelled' || isTopUpTransaction(t)) return sum;
    const items = getSafeItems(t);
    const initialCost = items.reduce((itemSum, item) => {
      if (!item) return itemSum;
      const targetId = (item as any).productId || item.id;
      const cleanName = item.name ? item.name.toLowerCase().trim() : '';
      const product = (targetId ? productsById.get(targetId) : null) || (cleanName ? productsByName.get(cleanName) : null);
      const costPrice = (item as any).costPrice !== undefined && (item as any).costPrice > 0 
        ? Number((item as any).costPrice) 
        : Number(product?.costPrice || 0);
      
      // Add operational costs (packaging, shipping, other)
      const opCosts = product?.operationalCosts || {};
      const packaging = opCosts.packaging ?? (t.onlineOrderId ? (settings?.operationalCosts?.basePackaging || 0) : 0);
      const shipping = opCosts.shipping ?? (t.onlineOrderId ? (settings?.operationalCosts?.baseShipping || 0) : 0);
      const other = opCosts.other || 0;
      
      const totalUnitCost = costPrice + packaging + shipping + other;
      const qty = Number(item.quantity) || 1;
      return itemSum + (totalUnitCost * qty);
    }, 0);

    if (t.status === 'partially_returned') {
      const returnedCost = returnedCostByTxId.get(t.id) || 0;
      return sum + Math.max(0, initialCost - returnedCost);
    }
    return sum + initialCost;
  }, 0);

  // 🛡️ P0-BIZ-4 : Exclure les dépenses 'Remboursement / Retour' des charges opérationnelles pour éliminer la double déduction
  const operationalExpenses = safeExpenses.filter(e => e?.category !== 'Remboursement / Retour');
  const totalExpenses = operationalExpenses.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);
  const grossProfit = totalRevenue - totalCost;
  const netProfit = grossProfit - totalExpenses;
  const revenueBySourceData = Object.entries(revenueBySource).map(([name, value]) => ({ name, value }));

  return { 
    categoryData, 
    employeeData, 
    revenueBySource,
    revenueBySourceData,
    topProducts, 
    productSalesData, 
    totalRevenue, 
    totalCost, 
    totalExpenses, 
    grossProfit, 
    netProfit 
  };
}
