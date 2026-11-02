import { useState, useMemo, useDeferredValue } from 'react';
import { Product, Category } from '../../../types';
import { toast } from 'sonner';
import { 
  StockValueReportProps, 
  StockFilterStatus, 
  StockSortBy, 
  CategoryStockRow, 
  EnrichedStockProduct, 
  StockSummary 
} from './stockValueTypes';

const ITEMS_PER_PAGE = 50;

export function useStockValueLogic({
  products = [],
  categories = [],
  settings,
}: StockValueReportProps) {
  const [stockFilterCategory, setStockFilterCategory] = useState<string>('all');
  const [stockFilterStatus, setStockFilterStatus] = useState<StockFilterStatus>('all');
  const [stockFilterSearch, setStockFilterSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<StockSortBy>('sale_val_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const deferredStockFilterSearch = useDeferredValue(stockFilterSearch);

  // Dictionnaire intelligent pour relier chaque produit à sa catégorie
  const categoryLookup = useMemo(() => {
    const byId = new Map<string, Category>();
    const byName = new Map<string, Category>();
    (categories || []).forEach(cat => {
      if (cat?.id) byId.set(String(cat.id).trim(), cat);
      if (cat?.name) byName.set(cat.name.toLowerCase().trim(), cat);
    });

    const resolveCategoryId = (p: Product): { id: string; name: string } => {
      const rawId = String(p.categoryId || '').trim();
      const rawCat = String((p as any).category || '').trim();

      if (rawId && byId.has(rawId)) {
        const c = byId.get(rawId)!;
        return { id: c.id, name: c.name };
      }
      if (rawCat && byId.has(rawCat)) {
        const c = byId.get(rawCat)!;
        return { id: c.id, name: c.name };
      }
      if (rawCat && byName.has(rawCat.toLowerCase())) {
        const c = byName.get(rawCat.toLowerCase())!;
        return { id: c.id, name: c.name };
      }
      if (rawId && byName.has(rawId.toLowerCase())) {
        const c = byName.get(rawId.toLowerCase())!;
        return { id: c.id, name: c.name };
      }
      if (rawCat && rawCat !== 'none' && rawCat !== 'undefined') {
        return { id: `custom:${rawCat.toLowerCase()}`, name: rawCat };
      }
      return { id: 'uncategorized', name: 'Sans Catégorie' };
    };

    return { resolveCategoryId };
  }, [categories]);

  const filteredStockProducts = useMemo(() => {
    const query = deferredStockFilterSearch ? deferredStockFilterSearch.toLowerCase().trim() : '';

    return (products || []).filter(p => {
      const resolvedCat = categoryLookup.resolveCategoryId(p);
      if (stockFilterCategory !== 'all' && resolvedCat.id !== stockFilterCategory) {
        return false;
      }

      const stock = Number(p.stock || 0);
      const minStock = Number(p.minStock || 5);
      if (stockFilterStatus === 'in_stock' && stock <= 0) return false;
      if (stockFilterStatus === 'low_stock' && (stock <= 0 || stock > minStock)) return false;
      if (stockFilterStatus === 'out_of_stock' && stock > 0) return false;

      if (query) {
        return (
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.sku && p.sku.toLowerCase().includes(query)) ||
          (p.barcode && p.barcode.toLowerCase().includes(query)) ||
          resolvedCat.name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [products, stockFilterCategory, stockFilterStatus, deferredStockFilterSearch, categoryLookup]);

  const stockSummary: StockSummary = useMemo(() => {
    let totalSaleVal = 0;
    let totalCostVal = 0;
    let totalWholesaleVal = 0;
    let totalQty = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const byCategory: Record<string, CategoryStockRow> = {};

    const enrichedProducts: EnrichedStockProduct[] = filteredStockProducts.map(p => {
      const rawStock = Number(p.stock || 0);
      const positiveStock = Math.max(0, rawStock);
      const minStock = Number(p.minStock || 5);
      const price = Number(p.price || 0);
      const cost = Number(p.costPrice || 0);
      const wholesale = Number(p.wholesalePrice || price);
      const resolvedCat = categoryLookup.resolveCategoryId(p);
      const isBundle = Boolean(p.isBundle);

      if (rawStock <= 0) outOfStockCount++;
      else if (rawStock <= minStock) {
        lowStockCount++;
        inStockCount++;
      } else {
        inStockCount++;
      }

      const lineCostVal = isBundle ? 0 : positiveStock * cost;
      const lineWholesaleVal = isBundle ? 0 : positiveStock * wholesale;
      const lineSaleVal = isBundle ? 0 : positiveStock * price;
      const lineProfitVal = isBundle ? 0 : positiveStock * (price - cost);

      if (!isBundle) {
        totalQty += positiveStock;
        totalCostVal += lineCostVal;
        totalWholesaleVal += lineWholesaleVal;
        totalSaleVal += lineSaleVal;
      }

      if (!byCategory[resolvedCat.id]) {
        byCategory[resolvedCat.id] = {
          id: resolvedCat.id,
          name: resolvedCat.name,
          productCount: 0,
          qty: 0,
          cost: 0,
          wholesale: 0,
          retail: 0,
          profit: 0
        };
      }
      byCategory[resolvedCat.id].productCount += 1;
      if (!isBundle) {
        byCategory[resolvedCat.id].qty += positiveStock;
      }
      byCategory[resolvedCat.id].cost += lineCostVal;
      byCategory[resolvedCat.id].wholesale += lineWholesaleVal;
      byCategory[resolvedCat.id].retail += lineSaleVal;
      byCategory[resolvedCat.id].profit += lineProfitVal;

      return {
        product: p,
        catId: resolvedCat.id,
        catName: resolvedCat.name,
        rawStock,
        positiveStock,
        price,
        cost,
        lineCostVal,
        lineSaleVal,
        lineProfitVal,
        isBundle
      };
    });

    enrichedProducts.sort((a, b) => {
      if (sortBy === 'sale_val_desc') return b.lineSaleVal - a.lineSaleVal || b.positiveStock - a.positiveStock;
      if (sortBy === 'cost_val_desc') return b.lineCostVal - a.lineCostVal || b.positiveStock - a.positiveStock;
      if (sortBy === 'profit_desc') return b.lineProfitVal - a.lineProfitVal;
      if (sortBy === 'qty_desc') return b.rawStock - a.rawStock;
      return (a.product.name || '').localeCompare(b.product.name || '');
    });

    const categoryRows = Object.values(byCategory).sort((a, b) => b.retail - a.retail || b.productCount - a.productCount);

    return {
      totalSaleVal,
      totalCostVal,
      totalWholesaleVal,
      totalProfitVal: totalSaleVal - totalCostVal,
      marginPercent: totalSaleVal > 0 ? ((totalSaleVal - totalCostVal) / totalSaleVal) * 100 : 0,
      totalQty,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      categoryRows,
      enrichedProducts
    };
  }, [filteredStockProducts, categoryLookup, sortBy]);

  const totalPages = Math.max(1, Math.ceil(stockSummary.enrichedProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return stockSummary.enrichedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [stockSummary.enrichedProducts, currentPage]);

  const exportStockValuationCSV = () => {
    const headers = [
      'Code-Barres / SKU',
      'Designation Produit',
      'Categorie',
      'Quantite Stock',
      'Prix Achat Unitaire (DA)',
      'Prix Vente Unitaire (DA)',
      'Valeur Totale Achat (DA)',
      'Valeur Totale Vente (DA)',
      'Marge Potentielle (DA)'
    ];
    const rows = stockSummary.enrichedProducts.map(item => [
      `"${item.product.barcode || item.product.sku || ''}"`,
      `"${(item.product.name || '').replace(/"/g, '""')}"`,
      `"${item.catName}"`,
      item.rawStock,
      item.cost.toFixed(2),
      item.price.toFixed(2),
      item.lineCostVal.toFixed(2),
      item.lineSaleVal.toFixed(2),
      item.lineProfitVal.toFixed(2)
    ]);
    const csv = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Valorisation_Stock_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Valorisation complète du stock exportée en CSV !');
  };

  return {
    stockFilterCategory,
    setStockFilterCategory,
    stockFilterStatus,
    setStockFilterStatus,
    stockFilterSearch,
    setStockFilterSearch,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedProducts,
    stockSummary,
    filteredStockProductsCount: filteredStockProducts.length,
    exportStockValuationCSV,
    ITEMS_PER_PAGE
  };
}
