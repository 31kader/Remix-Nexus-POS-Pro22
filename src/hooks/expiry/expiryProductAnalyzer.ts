import { startOfDay, parseISO, differenceInDays } from 'date-fns';
import { Product, normalizeBatches } from '../../types';

export const parseSafeDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  try {
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? null : startOfDay(dateStr);
    }
    const cleaned = String(dateStr).trim();
    if (!cleaned) return null;

    // 1. Format ISO standard YYYY-MM-DD or ISO timestamp
    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
      const parsed = parseISO(cleaned);
      if (!isNaN(parsed.getTime())) return startOfDay(parsed);
    }

    // 2. Format Français DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return startOfDay(d);
    }

    // 3. Format YYYY/MM/DD
    const ymdMatch = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return startOfDay(d);
    }

    // 4. Native Date fallback
    const nativeDate = new Date(cleaned);
    if (!isNaN(nativeDate.getTime())) {
      return startOfDay(nativeDate);
    }
  } catch (e) {
    console.warn("Date parsing failed:", dateStr, e);
  }
  return null;
};

export interface AnalyzeExpiryProductsParams {
  products: Product[];
  search: string;
  selectedCategory: string;
  filterStatus: 'all' | 'with_date' | 'without_date' | 'expired' | 'critical' | 'warning' | 'safe';
  now: Date;
}

export function analyzeExpiryProducts({
  products,
  search,
  selectedCategory,
  filterStatus,
  now
}: AnalyzeExpiryProductsParams): any[] {
  const safeProducts = Array.isArray(products) ? products : [];
  const flatList: any[] = [];

  safeProducts.forEach(p => {
    if (!p) return;
    const safeBatches = normalizeBatches(p.batches);
    if (p.useMultiExpiry && safeBatches.length > 0) {
      safeBatches.forEach(batch => {
        flatList.push({
          ...p,
          id: `${p.id}-batch-${batch.id || Math.random()}`,
          originalId: p.id,
          batchId: batch.id,
          isBatch: true,
          batchNumber: batch.batchNumber,
          expirationDate: batch.expirationDate || p.expirationDate,
          stock: batch.stock
        });
      });
    } else {
      flatList.push({
        ...p,
        originalId: p.id,
        isBatch: false,
        expirationDate: p.expirationDate || null
      });
    }
  });

  return flatList
    .map(p => {
      const parsed = parseSafeDate(p.expirationDate);
      if (!parsed) {
        return {
          ...p,
          hasExpiryDate: false,
          daysLeft: 99999,
          expiryStatus: 'no_date' as const,
          expiryDate: null
        };
      }
      const daysLeft = differenceInDays(parsed, now);
      
      let expiryStatus: 'expired' | 'critical' | 'warning' | 'safe' = 'safe';
      if (daysLeft < 0) expiryStatus = 'expired';
      else if (daysLeft <= 7) expiryStatus = 'critical';
      else if (daysLeft <= 30) expiryStatus = 'warning';

      return { ...p, hasExpiryDate: true, daysLeft, expiryStatus, expiryDate: parsed };
    })
    .filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
                           (p.sku && String(p.sku).toLowerCase().includes(search.toLowerCase())) ||
                           (p.barcode && String(p.barcode).toLowerCase().includes(search.toLowerCase())) ||
                           (p.batchNumber || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      
      let matchesStatus = true;
      if (filterStatus === 'expired') matchesStatus = p.expiryStatus === 'expired';
      else if (filterStatus === 'critical') matchesStatus = p.expiryStatus === 'critical';
      else if (filterStatus === 'warning') matchesStatus = p.expiryStatus === 'warning';
      else if (filterStatus === 'safe') matchesStatus = p.expiryStatus === 'safe';
      else if (filterStatus === 'with_date') matchesStatus = p.hasExpiryDate;
      else if (filterStatus === 'without_date') matchesStatus = !p.hasExpiryDate;

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      // Expired and critical first, then products with dates, then products without date
      if (a.hasExpiryDate && !b.hasExpiryDate) return -1;
      if (!a.hasExpiryDate && b.hasExpiryDate) return 1;
      return a.daysLeft - b.daysLeft;
    });
}

export function calculateExpiryStats(analyzedProducts: any[]) {
  const expiredCount = analyzedProducts.filter(p => p.expiryStatus === 'expired').length;
  const criticalCount = analyzedProducts.filter(p => p.expiryStatus === 'critical').length;
  const withoutDateCount = analyzedProducts.filter(p => !p.hasExpiryDate).length;
  const valueAtRisk = analyzedProducts
    .filter(p => p.expiryStatus === 'expired' || p.expiryStatus === 'critical' || p.expiryStatus === 'warning')
    .reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.stock || 0)), 0);
  
  const costAtRisk = analyzedProducts
    .filter(p => p.expiryStatus === 'expired' || p.expiryStatus === 'critical' || p.expiryStatus === 'warning')
    .reduce((sum, p) => sum + (Number(p.costPrice || 0) * Number(p.stock || 0)), 0);
  
  return { expiredCount, criticalCount, withoutDateCount, valueAtRisk, costAtRisk };
}
