import { useMemo } from 'react';
import { Product } from '../../types';
import { filterProducts } from './purchaseHelpers';
import { CartonTemplate } from '../../services/cartonIntakeService';

export function useFilteredPurchaseProducts(
  products: Product[],
  deferredSearch: string,
  cartonTemplates: CartonTemplate[]
): Product[] {
  return useMemo(() => {
    const base = filterProducts(products, deferredSearch);
    if (!deferredSearch || deferredSearch.trim().length === 0) return base;

    const cleanSearch = deferredSearch.trim().toLowerCase();
    const matchedCartons = cartonTemplates.filter(t => {
      const b = (t.barcode || '').toLowerCase();
      const s = (t.sku || '').toLowerCase();
      const pb = (t.productBarcode || '').toLowerCase();
      const name = (t.productName || '').toLowerCase();
      return b.includes(cleanSearch) || s.includes(cleanSearch) || pb.includes(cleanSearch) || name.includes(cleanSearch);
    });

    if (matchedCartons.length > 0) {
      const extraProds: Product[] = [];
      matchedCartons.forEach(t => {
        const found = products.find(p => p.id === t.productId);
        if (found && !base.some(b => b.id === found.id) && !extraProds.some(e => e.id === found.id)) {
          extraProds.push(found);
        }
      });
      return [...base, ...extraProds];
    }

    return base;
  }, [deferredSearch, products, cartonTemplates]);
}
