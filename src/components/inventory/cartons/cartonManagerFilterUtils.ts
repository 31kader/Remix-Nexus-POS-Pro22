import { Product } from '../../../types';
import { CartonTemplate } from '../../../services/cartonIntakeService';

export interface EnrichedCarton extends CartonTemplate {
  product?: Product;
  unitsStock: number;
  cartonsStock: number;
  remainingUnits: number;
  retailMarginPct: number;
  wholesaleMarginPct: number;
  totalCostValue: number;
  totalRetailValue: number;
}

export function computeEnrichedCartons(templates: CartonTemplate[], products: Product[]): EnrichedCarton[] {
  return templates.map(t => {
    const linkedProd = products.find(p => p.id === t.productId);
    const units = Number(linkedProd?.stock) || 0;
    const colisage = Number(t.unitsPerCarton) || Number(linkedProd?.unitsPerParent) || 12;
    const cartonsInStock = Math.floor(units / colisage);
    const remainingUnits = units % colisage;

    const cost = Number(t.cartonCostPrice) || 0;
    const retail = Number(t.retailPrice) || 0;
    const wholesale = Number(t.wholesalePrice) || 0;

    const retailMarginPct = cost > 0 && retail > cost ? Math.round(((retail - cost) / retail) * 100) : 0;
    const wholesaleMarginPct = cost > 0 && wholesale > cost ? Math.round(((wholesale - cost) / wholesale) * 100) : 0;

    return {
      ...t,
      product: linkedProd,
      unitsStock: units,
      cartonsStock: cartonsInStock,
      remainingUnits,
      retailMarginPct,
      wholesaleMarginPct,
      totalCostValue: cartonsInStock * cost,
      totalRetailValue: cartonsInStock * retail
    };
  });
}

export function filterAndSortCartons(
  enrichedCartons: EnrichedCarton[],
  searchQuery: string,
  stockFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock',
  sortBy: 'name' | 'carton_stock' | 'updated'
): EnrichedCarton[] {
  let list = [...enrichedCartons];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(c => 
      c.productName.toLowerCase().includes(q) ||
      (c.barcode && c.barcode.toLowerCase().includes(q)) ||
      (c.productBarcode && c.productBarcode.toLowerCase().includes(q)) ||
      (c.sku && c.sku.toLowerCase().includes(q))
    );
  }

  if (stockFilter === 'in_stock') {
    list = list.filter(c => c.cartonsStock > 0);
  } else if (stockFilter === 'low_stock') {
    list = list.filter(c => c.cartonsStock > 0 && c.cartonsStock <= 3);
  } else if (stockFilter === 'out_of_stock') {
    list = list.filter(c => c.cartonsStock === 0);
  }

  list.sort((a, b) => {
    if (sortBy === 'name') return a.productName.localeCompare(b.productName);
    if (sortBy === 'carton_stock') return b.cartonsStock - a.cartonsStock;
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });

  return list;
}

export function computeCartonTotals(enrichedCartons: EnrichedCarton[]): {
  totalCartons: number;
  totalCost: number;
  totalRetail: number;
} {
  const totalCartons = enrichedCartons.reduce((acc, c) => acc + c.cartonsStock, 0);
  const totalCost = enrichedCartons.reduce((acc, c) => acc + c.totalCostValue, 0);
  const totalRetail = enrichedCartons.reduce((acc, c) => acc + c.totalRetailValue, 0);
  return { totalCartons, totalCost, totalRetail };
}
