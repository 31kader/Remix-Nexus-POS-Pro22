import { Product, Purchase } from '../../types';
import { PurchaseCartItem } from '../usePurchaseCart';
import { generateUniqueId } from '../../lib/utils';

export function filterPurchases(
  purchases: Purchase[],
  historySearch: string,
  historyStartDate: string,
  historyEndDate: string
): Purchase[] {
  const q = (historySearch || '').trim().toLowerCase();
  return (purchases || [])
    .map((raw: any) => ({
      ...raw,
      supplierName: raw.supplierName || raw.supplier_name || 'Fournisseur',
      invoiceNumber: raw.invoiceNumber || raw.invoice_number || `BR-${String(raw.id || '').slice(-6).toUpperCase()}`,
      total: Number(raw.total ?? raw.totalAmount ?? raw.total_amount ?? 0),
      totalAmount: Number(raw.totalAmount ?? raw.total ?? raw.total_amount ?? 0),
      paidAmount: Number(raw.paidAmount ?? raw.paid_amount ?? 0)
    }))
    .filter(p => {
      const itemNames = Array.isArray(p.items) ? p.items.map((i: any) => i?.name || '').join(' ') : '';
      const matchesSearch = !q ||
        (p.supplierName || '').toLowerCase().includes(q) || 
        (p.invoiceNumber || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        itemNames.toLowerCase().includes(q);
      const date = new Date(p.date || Date.now());
      const matchesStart = !historyStartDate || date >= new Date(`${historyStartDate}T00:00:00`);
      const matchesEnd = !historyEndDate || date <= new Date(`${historyEndDate}T23:59:59.999`);
      return matchesSearch && matchesStart && matchesEnd;
    })
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
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
           (p.id || '').toLowerCase() === searchLower;
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
