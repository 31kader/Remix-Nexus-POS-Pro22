import { useState, useMemo, useEffect } from 'react';
import { 
  subDays, 
  startOfDay, 
  endOfDay, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isWithinInterval, 
  parseISO, 
  isValid 
} from 'date-fns';
import { formatSafe, formatPrice, exportToExcel, exportToCSV } from '../../../lib/utils';
import { useInventoryStore } from '../../../store/useInventoryStore';
import { Product } from '../../../types';
import { LossesReportProps, DateFilterPreset, LossItem, LossesStats } from './lossesTypes';

const ITEMS_PER_PAGE = 50;

export function useLossesReportLogic({
  stockAdjustments = [],
  products = [],
  categories = [],
  settings,
}: LossesReportProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currency = settings?.currency || 'DA';
  const storeDamagedItems = useInventoryStore(s => s.damagedItems) || [];

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    (products || []).forEach(p => { 
      if (p?.id) map.set(p.id, p); 
    });
    return map;
  }, [products]);

  const categoriesById = useMemo(() => {
    const map = new Map<string, string>();
    (categories || []).forEach(c => { 
      if (c?.id) map.set(c.id, c.name); 
    });
    return map;
  }, [categories]);

  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const dateInterval = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday': {
        const y = subDays(now, 1);
        return { start: startOfDay(y), end: endOfDay(y) };
      }
      case '7days':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case '30days':
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month': {
        const lastM = subMonths(now, 1);
        return { start: startOfMonth(lastM), end: endOfMonth(lastM) };
      }
      case 'custom': {
        const start = customStartDate ? startOfDay(parseISO(customStartDate)) : startOfDay(subDays(now, 30));
        const end = customEndDate ? endOfDay(parseISO(customEndDate)) : endOfDay(now);
        return { 
          start: isValid(start) ? start : startOfDay(subDays(now, 30)), 
          end: isValid(end) ? end : endOfDay(now) 
        };
      }
      case 'all':
      default:
        return null;
    }
  }, [dateFilter, customStartDate, customEndDate]);

  const allLosses = useMemo(() => {
    const seenIds = new Set<string>();
    const list: LossItem[] = [];

    // 1. Scanner les stockAdjustments
    (stockAdjustments || []).forEach(adj => {
      if (!adj) return;
      const id = String(adj.id || `adj_${Math.random()}`);
      if (seenIds.has(id)) return;

      const pId = String(adj.productId || (adj as any).product_id || '');
      const product = pId ? productsById.get(pId) : null;

      const rawAdjustment = adj.adjustment !== undefined 
        ? Number(adj.adjustment) 
        : -(Number((adj as any).quantity) || 0);

      const isLossFlag = adj.isLoss === true || 
                         (adj as any).is_loss === true || 
                         (adj as any).type === 'damage' || 
                         (adj as any).type === 'loss';

      const reasonText = String(adj.reason || (adj as any).notes || '').trim();
      const isLossReason = /perte|périmé|perime|casse|dlc|jeter|expire|expiré|détruit|detruit|avarie|avarié|vol|manquant|abîmé|abime|défectueux|defectueux/i.test(reasonText);

      if ((isLossFlag || isLossReason) && (rawAdjustment < 0 || (adj as any).quantity > 0)) {
        seenIds.add(id);

        const qty = Math.abs(rawAdjustment || Number((adj as any).quantity) || 0);
        const costPrice = Number(product?.costPrice ?? (product as any)?.cost_price ?? (adj as any)?.costPrice ?? (adj as any)?.cost_price ?? 0);
        const sellingPrice = Number(product?.price ?? (product as any)?.selling_price ?? 0);
        const unitValuation = costPrice > 0 ? costPrice : sellingPrice;
        const lossValue = qty * unitValuation;

        const dateStr = String(adj.timestamp || (adj as any).created_at || (adj as any).date || '');
        const category = (product?.categoryId ? categoriesById.get(product.categoryId) : null) || 'Non classé';

        list.push({
          id,
          productId: pId,
          productName: product?.name || adj.productName || (adj as any).product_name || 'Article sans nom',
          barcode: product?.barcode || (product as any)?.barcodes?.[0] || '—',
          quantity: qty,
          unit: product?.unit || 'u',
          costPrice: unitValuation,
          lossValue,
          reason: reasonText || 'Perte non spécifiée',
          rawReason: reasonText.toLowerCase(),
          userName: adj.userName || (adj as any).user_name || (adj as any).reported_by || 'Système',
          timestamp: dateStr || new Date().toISOString(),
          category,
          source: 'stock_adjustment'
        });
      }
    });

    // 2. Scanner les damagedItems
    (storeDamagedItems || []).forEach(dam => {
      if (!dam) return;
      const id = String(dam.id || `dam_${Math.random()}`);
      if (seenIds.has(id)) return;
      seenIds.add(id);

      const pId = String(dam.productId || (dam as any).product_id || '');
      const product = pId ? productsById.get(pId) : null;
      const qty = Math.abs(Number(dam.quantity || 0));
      if (qty <= 0) return;

      const costPrice = Number(dam.costPrice || (dam as any).cost_price || product?.costPrice || (product as any)?.cost_price || product?.price || 0);
      const lossValue = qty * costPrice;
      const dateStr = String(dam.date || (dam as any).created_at || (dam as any).timestamp || '');
      const category = (product?.categoryId ? categoriesById.get(product.categoryId) : null) || 'Non classé';

      list.push({
        id,
        productId: pId,
        productName: product?.name || dam.productName || (dam as any).product_name || 'Article sans nom',
        barcode: product?.barcode || (product as any)?.barcodes?.[0] || '—',
        quantity: qty,
        unit: product?.unit || 'u',
        costPrice,
        lossValue,
        reason: dam.reason || 'Article avarié / rebut',
        rawReason: (dam.reason || '').toLowerCase(),
        userName: (dam as any).userName || (dam as any).user_name || (dam as any).reportedBy || 'Système',
        timestamp: dateStr || new Date().toISOString(),
        category,
        source: 'damaged_item'
      });
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return timeB - timeA;
    });
  }, [stockAdjustments, storeDamagedItems, productsById, categoriesById]);

  const filteredLosses = useMemo(() => {
    return allLosses.filter(item => {
      if (dateInterval) {
        const itemDate = new Date(item.timestamp);
        if (!isValid(itemDate)) return false;
        if (!isWithinInterval(itemDate, { start: dateInterval.start, end: dateInterval.end })) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = item.productName.toLowerCase().includes(term);
        const matchesBarcode = item.barcode.toLowerCase().includes(term);
        const matchesReason = item.reason.toLowerCase().includes(term);
        const matchesUser = item.userName.toLowerCase().includes(term);
        const matchesCat = item.category.toLowerCase().includes(term);
        if (!matchesName && !matchesBarcode && !matchesReason && !matchesUser && !matchesCat) {
          return false;
        }
      }

      if (reasonFilter !== 'all') {
        if (reasonFilter === 'casse' && !item.rawReason.includes('casse')) return false;
        if (reasonFilter === 'perime' && !/périmé|perime|dlc|expire/i.test(item.rawReason)) return false;
        if (reasonFilter === 'avarie' && !/avarie|avarié|abîmé|abime|défectueux/i.test(item.rawReason)) return false;
        if (reasonFilter === 'vol' && !/vol|manquant|inconnu/i.test(item.rawReason)) return false;
      }

      return true;
    });
  }, [allLosses, dateInterval, searchTerm, reasonFilter]);

  const stats: LossesStats = useMemo(() => {
    let totalValue = 0;
    let totalQuantity = 0;
    const byCategory: Record<string, number> = {};
    const byReason: Record<string, number> = {};

    filteredLosses.forEach(item => {
      totalValue += item.lossValue;
      totalQuantity += item.quantity;

      byCategory[item.category] = (byCategory[item.category] || 0) + item.lossValue;

      let cleanReason = 'Autre motif';
      if (/casse/i.test(item.reason)) cleanReason = 'Casse matérielle';
      else if (/périmé|perime|dlc|expire/i.test(item.reason)) cleanReason = 'Date limite (DLC/Périmé)';
      else if (/avarie|avarié|abîmé|défectueux/i.test(item.reason)) cleanReason = 'Avarie / Dégradation';
      else if (/vol|manquant/i.test(item.reason)) cleanReason = 'Vol / Inconnu';
      else if (item.reason) cleanReason = item.reason;

      byReason[cleanReason] = (byReason[cleanReason] || 0) + item.lossValue;
    });

    return {
      totalValue,
      totalQuantity,
      count: filteredLosses.length,
      byCategory: Object.entries(byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      byReason: Object.entries(byReason)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    };
  }, [filteredLosses]);

  const totalPages = Math.max(1, Math.ceil(filteredLosses.length / ITEMS_PER_PAGE));
  const paginatedLosses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLosses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLosses, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, customStartDate, customEndDate, searchTerm, reasonFilter]);

  const handleExportExcel = () => {
    const exportRows = filteredLosses.map(l => ({
      'Date & Heure': formatSafe(l.timestamp, 'yyyy-MM-dd HH:mm'),
      'Code-barres': l.barcode,
      'Nom du Produit': l.productName,
      'Catégorie': l.category,
      'Quantité Perdue': l.quantity,
      'Unité': l.unit,
      'Coût Unitaire (DA)': formatPrice(l.costPrice),
      'Valeur Totale Perte (DA)': formatPrice(l.lossValue),
      'Motif': l.reason,
      'Opérateur': l.userName
    }));
    exportToExcel(exportRows, `rapport_pertes_${dateFilter}_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportCSV = () => {
    const exportRows = filteredLosses.map(l => ({
      date: formatSafe(l.timestamp, 'yyyy-MM-dd HH:mm'),
      code_barre: l.barcode,
      nom_produit: l.productName,
      categorie: l.category,
      quantite: l.quantity,
      cout_unitaire: l.costPrice,
      valeur_perte: l.lossValue,
      motif: l.reason,
      operateur: l.userName
    }));
    exportToCSV(exportRows, `rapport_pertes_${dateFilter}`);
  };

  return {
    isMounted,
    currency,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    searchTerm,
    setSearchTerm,
    reasonFilter,
    setReasonFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedLosses,
    filteredLosses,
    stats,
    handleExportExcel,
    handleExportCSV,
    ITEMS_PER_PAGE
  };
}
