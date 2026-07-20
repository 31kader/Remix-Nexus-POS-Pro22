import { Product, Purchase } from '../../types';
import { PurchaseCartItem } from '../usePurchaseCart';
import { generateUniqueId } from '../../lib/utils';

export function filterPurchases(
  purchases: Purchase[],
  historySearch: string,
  historyStartDate: string,
  historyEndDate: string
): Purchase[] {
  return purchases
    .filter(p => {
      const matchesSearch = (p.supplierName || '').toLowerCase().includes(historySearch.toLowerCase()) || 
                           (p.invoiceNumber || '').toLowerCase().includes(historySearch.toLowerCase());
      const date = new Date(p.date);
      const matchesStart = !historyStartDate || date >= new Date(historyStartDate);
      const matchesEnd = !historyEndDate || date <= new Date(historyEndDate);
      return matchesSearch && matchesStart && matchesEnd;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function filterProducts(
  products: Product[],
  search: string
): Product[] {
  if (!search || search.trim() === '') return [];
  const searchLower = search.toLowerCase().trim();
  return products.filter((p: Product) => {
    return (p.name || '').toLowerCase().includes(searchLower) || 
           (p.sku || '').toLowerCase() === searchLower ||
           (p.sku || '').toLowerCase().includes(searchLower) ||
           p.id.toLowerCase() === searchLower;
  });
}

export function buildCartFromPurchaseItems(
  items: any[],
  products: Product[]
): PurchaseCartItem[] {
  return items.map((item: any) => ({
    lineId: item.lineId || generateUniqueId(),
    productId: item.productId,
    productName: item.name,
    quantity: item.quantity,
    costPrice: item.costPrice || 0,
    discount: item.discount || 0,
    taxRate: item.taxRate || 0,
    imageUrl: products.find(p => p.id === item.productId)?.imageUrl
  }));
}
