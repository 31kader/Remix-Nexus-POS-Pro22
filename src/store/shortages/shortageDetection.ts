import { ShortageItem, ShortageSummary } from '../../types/shortages';
import { Product, Supplier, Purchase } from '../../types';

export function detectLowStockProducts(
  products: Product[],
  purchases: Purchase[] = [],
  suppliers: Supplier[] = [],
  globalAlertThreshold: number = 5,
  existingProductIds: Set<string> = new Set()
): ShortageItem[] {
  const suggestions: ShortageItem[] = [];

  // Trier les achats par date décroissante pour identifier le dernier approvisionnement
  const sortedPurchases = [...purchases].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  for (const product of products) {
    if (product.status === 'inactive' || product.status === 'discontinued') continue;
    if (existingProductIds.has(product.id)) continue;

    const currentStock = Number(product.stock) || 0;
    const minStock = Number(product.minStock) || globalAlertThreshold;

    if (currentStock <= minStock || currentStock <= 0) {
      let matchedSupplierId = '';
      let matchedSupplierName = '';
      let lastCostPrice = Number(product.costPrice) || 0;

      for (const purchase of sortedPurchases) {
        if (Array.isArray(purchase.items)) {
          const foundItem = purchase.items.find(it => it.productId === product.id);
          if (foundItem) {
            matchedSupplierId = purchase.supplierId || '';
            matchedSupplierName = purchase.supplierName || '';
            if (foundItem.costPrice && foundItem.costPrice > 0) {
              lastCostPrice = Number(foundItem.costPrice);
            }
            break;
          }
        }
      }

      if (!matchedSupplierName && product.supplier) {
        const sup = suppliers.find(
          s => s.id === product.supplier || s.name.toLowerCase() === product.supplier.toLowerCase()
        );
        if (sup) {
          matchedSupplierId = sup.id;
          matchedSupplierName = sup.name;
        } else {
          matchedSupplierName = product.supplier;
        }
      }

      if (!matchedSupplierName) {
        matchedSupplierName = 'Sans fournisseur';
      }

      const recommendedQty = Math.max(1, Math.round(minStock - Math.max(0, currentStock)));

      suggestions.push({
        id: `sugg-${product.id}`,
        productId: product.id,
        name: product.name,
        barcode: product.barcode || '',
        sku: product.sku || '',
        imageUrl: product.imageUrl || (product as any).image || '',
        costPrice: lastCostPrice,
        currentStock,
        minStock,
        quantityNeeded: recommendedQty,
        supplierId: matchedSupplierId,
        supplierName: matchedSupplierName,
        isChecked: false,
        listIds: [],
        unit: product.unit || 'pcs',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  return suggestions;
}

export function filterShortageItems(
  items: ShortageItem[],
  activeListId: string | 'all',
  selectedSupplierFilter: string | 'all',
  searchQuery: string
): ShortageItem[] {
  const query = searchQuery.trim().toLowerCase();

  return items.filter(item => {
    if (!item) return false;

    if (activeListId !== 'all') {
      const listIds = Array.isArray(item.listIds) ? item.listIds : [];
      if (!listIds.includes(activeListId)) return false;
    }

    if (selectedSupplierFilter !== 'all') {
      if (
        item.supplierId !== selectedSupplierFilter &&
        item.supplierName !== selectedSupplierFilter
      ) {
        return false;
      }
    }

    if (query) {
      const matchesName = (item.name || '').toLowerCase().includes(query);
      const matchesBarcode = (item.barcode || '').toLowerCase().includes(query);
      const matchesSku = (item.sku || '').toLowerCase().includes(query);
      const matchesSupplier = (item.supplierName || '').toLowerCase().includes(query);
      if (!matchesName && !matchesBarcode && !matchesSku && !matchesSupplier) {
        return false;
      }
    }

    return true;
  });
}

export function computeShortageSummary(filteredItems: ShortageItem[]): ShortageSummary {
  let totalQuantity = 0;
  let totalEstimatedCost = 0;
  let checkedCount = 0;
  let checkedEstimatedCost = 0;

  for (const item of filteredItems) {
    const itemCost = item.quantityNeeded * (item.costPrice || 0);
    totalQuantity += item.quantityNeeded;
    totalEstimatedCost += itemCost;

    if (item.isChecked) {
      checkedCount += 1;
      checkedEstimatedCost += itemCost;
    }
  }

  return {
    totalItems: filteredItems.length,
    totalQuantity,
    totalEstimatedCost,
    checkedCount,
    checkedEstimatedCost
  };
}
