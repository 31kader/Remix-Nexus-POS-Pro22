import { useMemo } from 'react';
import { Product, Category } from '../types';
import { getCategoryDescendants } from '../lib/utils';

export function useInventoryMetrics(
  products: Product[],
  paginatedProducts: Product[],
  sortedProducts: Product[],
  categories: Category[],
  selectedCategories: string[]
) {
  const duplicateSKUGroups = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.forEach(p => {
      if (p.sku && p.sku.trim() !== '') {
        const sku = p.sku.trim();
        if (!groups[sku]) groups[sku] = [];
        groups[sku].push(p);
      }
    });
    return Object.entries(groups)
      .filter(([_, group]) => group.length > 1)
      .map(([sku, group]) => ({ sku, products: group }));
  }, [products]);

  const productsBySupplier = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    sortedProducts.forEach((p: Product) => {
      const s = p.supplier || 'Sans fournisseur';
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(p);
    });
    return grouped;
  }, [sortedProducts]);

  const marginExtremes = useMemo(() => {
    if (paginatedProducts.length < 2) return { maxId: null, minId: null };
    let maxMargin = -Infinity;
    let minMargin = Infinity;
    let maxId: string | null = null;
    let minId: string | null = null;

    paginatedProducts.forEach((p: Product) => {
      const m = p.price - (p.costPrice || 0);
      if (m > maxMargin) {
        maxMargin = m;
        maxId = p.id;
      }
      if (m < minMargin) {
        minMargin = m;
        minId = p.id;
      }
    });

    if (maxMargin === minMargin) {
      return { maxId: null, minId: null };
    }

    return { maxId, minId };
  }, [paginatedProducts]);

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach(c => {
      counts[c.id] = 0;
    });
    counts['uncategorized'] = 0;

    products.forEach(p => {
      const cid = p.categoryId || 'uncategorized';
      if (counts[cid] !== undefined) {
        counts[cid]++;
      } else {
        counts['uncategorized']++;
      }
    });

    const aggregated: Record<string, number> = {};
    categories.forEach(c => {
      const descendants = getCategoryDescendants(categories, c.id);
      let total = counts[c.id] || 0;
      descendants.forEach(dId => {
        total += counts[dId] || 0;
      });
      aggregated[c.id] = total;
    });
    aggregated['uncategorized'] = counts['uncategorized'] || 0;
    return aggregated;
  }, [categories, products]);

  const expandedSelectedCategories = useMemo(() => {
    if (selectedCategories.length === 0) return [];
    const all = new Set<string>();
    selectedCategories.forEach(cid => {
      if (cid === 'uncategorized') {
        all.add('uncategorized');
        return;
      }
      all.add(cid);
      getCategoryDescendants(categories, cid).forEach(d => all.add(d));
    });
    return Array.from(all);
  }, [selectedCategories, categories]);

  const productSuppliers = useMemo(() => {
    return Array.from(new Set(products.map((p: Product) => p.supplier))).filter(Boolean) as string[];
  }, [products]);

  return {
    duplicateSKUGroups,
    productsBySupplier,
    marginExtremes,
    categoryProductCounts,
    expandedSelectedCategories,
    productSuppliers
  };
}
