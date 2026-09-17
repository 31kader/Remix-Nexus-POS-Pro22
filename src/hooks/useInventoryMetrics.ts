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
  // Fast map of pre-computed category descendants
  const categoryDescendantsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    categories.forEach(c => {
      map.set(c.id, getCategoryDescendants(categories, c.id));
    });
    return map;
  }, [categories]);

  const duplicateSKUGroups = useMemo(() => {
    if (!products || products.length === 0) return [];
    const skuMap = new Map<string, Product[]>();
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p && p.sku) {
        const sku = p.sku.trim();
        if (sku) {
          const list = skuMap.get(sku);
          if (list) {
            list.push(p);
          } else {
            skuMap.set(sku, [p]);
          }
        }
      }
    }
    const result: { sku: string; products: Product[] }[] = [];
    for (const [sku, group] of skuMap.entries()) {
      if (group.length > 1) {
        result.push({ sku, products: group });
      }
    }
    return result;
  }, [products]);

  const productsBySupplier = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    for (let i = 0; i < sortedProducts.length; i++) {
      const p = sortedProducts[i];
      const s = p.supplier || 'Sans fournisseur';
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(p);
    }
    return grouped;
  }, [sortedProducts]);

  const marginExtremes = useMemo(() => {
    if (!paginatedProducts || paginatedProducts.length < 2) return { maxId: null, minId: null };
    let maxMargin = -Infinity;
    let minMargin = Infinity;
    let maxId: string | null = null;
    let minId: string | null = null;

    for (let i = 0; i < paginatedProducts.length; i++) {
      const p = paginatedProducts[i];
      const m = p.price - (p.costPrice || 0);
      if (m > maxMargin) {
        maxMargin = m;
        maxId = p.id;
      }
      if (m < minMargin) {
        minMargin = m;
        minId = p.id;
      }
    }

    if (maxMargin === minMargin) {
      return { maxId: null, minId: null };
    }

    return { maxId, minId };
  }, [paginatedProducts]);

  const categoryProductCounts = useMemo(() => {
    const counts = new Map<string, number>();
    categories.forEach(c => counts.set(c.id, 0));
    counts.set('uncategorized', 0);

    if (products) {
      for (let i = 0; i < products.length; i++) {
        const cid = products[i].categoryId || 'uncategorized';
        counts.set(cid, (counts.get(cid) || 0) + 1);
      }
    }

    const aggregated: Record<string, number> = {};
    categories.forEach(c => {
      const descendants = categoryDescendantsMap.get(c.id) || [];
      let total = counts.get(c.id) || 0;
      for (let j = 0; j < descendants.length; j++) {
        total += counts.get(descendants[j]) || 0;
      }
      aggregated[c.id] = total;
    });
    aggregated['uncategorized'] = counts.get('uncategorized') || 0;
    return aggregated;
  }, [categories, products, categoryDescendantsMap]);

  const expandedSelectedCategories = useMemo(() => {
    if (!selectedCategories || selectedCategories.length === 0) return [];
    const all = new Set<string>();
    for (let i = 0; i < selectedCategories.length; i++) {
      const cid = selectedCategories[i];
      if (cid === 'uncategorized') {
        all.add('uncategorized');
        continue;
      }
      all.add(cid);
      const descendants = categoryDescendantsMap.get(cid) || [];
      for (let j = 0; j < descendants.length; j++) {
        all.add(descendants[j]);
      }
    }
    return Array.from(all);
  }, [selectedCategories, categoryDescendantsMap]);

  const productSuppliers = useMemo(() => {
    if (!products) return [];
    const suppliers = new Set<string>();
    for (let i = 0; i < products.length; i++) {
      if (products[i].supplier) {
        suppliers.add(products[i].supplier!);
      }
    }
    return Array.from(suppliers);
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
