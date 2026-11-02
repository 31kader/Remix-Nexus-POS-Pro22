import { Product } from '../../../types';

export function parseTransactionItems(itemsField: any): any[] {
  if (!itemsField) return [];
  if (Array.isArray(itemsField)) return itemsField;
  if (typeof itemsField === 'string') {
    try {
      const parsed = JSON.parse(itemsField);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export interface ProductLookupIndexes {
  productsById: Map<string, Product>;
  productsBySku: Map<string, Product>;
  productsByBarcode: Map<string, Product>;
  productsByName: Map<string, Product>;
}

export function buildProductLookupIndexes(products: Product[]): ProductLookupIndexes {
  const byId = new Map<string, Product>();
  const bySku = new Map<string, Product>();
  const byBarcode = new Map<string, Product>();
  const byName = new Map<string, Product>();

  (products || []).forEach(p => {
    if (p.id) byId.set(p.id, p);
    if (p.sku) bySku.set(p.sku.toLowerCase().trim(), p);
    if (p.barcode) byBarcode.set(p.barcode.toLowerCase().trim(), p);
    if (p.name) byName.set(p.name.toLowerCase().trim(), p);
  });

  return { productsById: byId, productsBySku: bySku, productsByBarcode: byBarcode, productsByName: byName };
}

export function resolveProductFromLookup(item: any, indexes: ProductLookupIndexes): Product | undefined {
  if (!item) return undefined;
  const idKey = (item as any).productId || item.id;
  if (idKey && indexes.productsById.has(idKey)) return indexes.productsById.get(idKey);

  const skuKey = String(item.sku || '').toLowerCase().trim();
  if (skuKey && indexes.productsBySku.has(skuKey)) return indexes.productsBySku.get(skuKey);

  const barcodeKey = String(item.barcode || '').toLowerCase().trim();
  if (barcodeKey && indexes.productsByBarcode.has(barcodeKey)) return indexes.productsByBarcode.get(barcodeKey);

  const nameKey = String(item.name || '').toLowerCase().trim();
  if (nameKey && indexes.productsByName.has(nameKey)) return indexes.productsByName.get(nameKey);

  return undefined;
}

export function resolveCostFromLookup(item: any, indexes: ProductLookupIndexes, matchedProduct?: Product): number {
  const itemCost = Number((item as any).costPrice ?? (item as any).cost_price);
  if (!isNaN(itemCost) && itemCost > 0) return itemCost;

  const p = matchedProduct || resolveProductFromLookup(item, indexes);
  const catalogCost = Number(p?.costPrice ?? (p as any)?.cost_price);
  if (!isNaN(catalogCost) && catalogCost > 0) return catalogCost;

  return 0;
}
