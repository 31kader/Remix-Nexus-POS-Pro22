import { isToday, isYesterday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { Transaction, Product, ProductReturn, CompanySettings, isTopUpTransaction } from '../../../types';
import { calculateItemPrice } from '../../../lib/utils';

export interface ProductProfitStatsParams {
  transactions: Transaction[];
  transactionsById: Map<string, any>;
  productsById: Map<string, Product>;
  productsBySku: Map<string, Product>;
  productsByBarcode: Map<string, Product>;
  productsByName: Map<string, Product>;
  selectedEmpName: string | null;
  returns: ProductReturn[];
  settings: CompanySettings;
  profitFilterCustomer: string;
  profitFilterEmployee?: string;
  profitFilterSource: 'all' | 'pos' | 'online';
  profitFilterTimeStart: string;
  profitFilterTimeEnd: string;
  profitFilterDate: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all';
  profitFilterMinTotal: string;
  profitFilterMaxTotal: string;
}

export function calculateProductProfitStats({
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
  profitFilterEmployee = 'all',
  profitFilterSource,
  profitFilterTimeStart,
  profitFilterTimeEnd,
  profitFilterDate,
  profitFilterMinTotal,
  profitFilterMaxTotal
}: ProductProfitStatsParams): Record<string, { qty: number; revenue: number; cost: number }> {
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

  const stats: Record<string, { qty: number; revenue: number; cost: number }> = {};

  filteredTransactions.forEach(t => {
    if (!t || t.status === 'returned' || t.status === 'cancelled' || isTopUpTransaction(t)) return;
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
      const packaging = opCosts.packaging ?? (t.onlineOrderId ? (settings?.operationalCosts?.basePackaging || 0) : 0);
      const shipping = opCosts.shipping ?? (t.onlineOrderId ? (settings?.operationalCosts?.baseShipping || 0) : 0);
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
      // Si la transaction d'origine a le statut 'returned', elle a déjà été intégralement exclue :
      // ne pas soustraire une 2ème fois ses articles des statistiques d'autres ventes du même produit !
      if (originalTx && originalTx.status === 'returned') return;

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
}
