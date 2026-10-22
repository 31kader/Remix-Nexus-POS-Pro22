import { Product, Purchase } from '../../types';
import { PurchaseCartItem } from '../../hooks/usePurchaseCart';
import { generateUniqueId } from '../../lib/utils';

export type PurchasePaymentStatusFilter = 'all' | 'paid' | 'partial' | 'unpaid' | 'debt';
export type PurchaseReceiptStatusFilter = 'all' | 'completed' | 'draft' | 'ordered';
export type PurchaseSortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'debt-desc' | 'supplier-asc';

export interface PurchaseFilterOptions {
  search?: string;
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  paymentStatus?: PurchasePaymentStatusFilter;
  receiptStatus?: PurchaseReceiptStatusFilter;
  minAmount?: number | string;
  maxAmount?: number | string;
  sortBy?: PurchaseSortOption;
}

export interface PurchasesSummary {
  count: number;
  totalAmount: number;
  totalPaid: number;
  totalDebt: number;
}

export function calculatePurchasesSummary(purchases: Purchase[]): PurchasesSummary {
  let totalAmount = 0;
  let totalPaid = 0;
  let totalDebt = 0;

  for (const p of purchases || []) {
    const raw: any = p;
    const total = Number(raw.total ?? raw.totalAmount ?? raw.total_amount ?? 0);
    const paid = Number(raw.paidAmount ?? raw.paid_amount ?? 0);
    const debt = Math.max(0, total - paid);

    totalAmount += total;
    totalPaid += paid;
    totalDebt += debt;
  }

  return {
    count: (purchases || []).length,
    totalAmount,
    totalPaid,
    totalDebt
  };
}

export function filterPurchases(
  purchases: Purchase[],
  searchOrOptions?: string | PurchaseFilterOptions,
  legacyStartDate?: string,
  legacyEndDate?: string
): Purchase[] {
  let opts: PurchaseFilterOptions = {};

  if (typeof searchOrOptions === 'object' && searchOrOptions !== null) {
    opts = searchOrOptions;
  } else {
    opts = {
      search: searchOrOptions || '',
      startDate: legacyStartDate || '',
      endDate: legacyEndDate || '',
      paymentStatus: 'all',
      receiptStatus: 'all',
      sortBy: 'date-desc'
    };
  }

  const q = (opts.search || '').trim().toLowerCase();
  const {
    startDate,
    endDate,
    supplierId,
    paymentStatus = 'all',
    receiptStatus = 'all',
    minAmount,
    maxAmount,
    sortBy = 'date-desc'
  } = opts;

  const minAmt = minAmount !== undefined && minAmount !== '' ? Number(minAmount) : null;
  const maxAmt = maxAmount !== undefined && maxAmount !== '' ? Number(maxAmount) : null;

  return (purchases || [])
    .map((raw: any) => {
      const total = Number(raw.total ?? raw.totalAmount ?? raw.total_amount ?? 0);
      const paid = Number(raw.paidAmount ?? raw.paid_amount ?? 0);
      const remaining = Math.max(0, total - paid);
      return {
        ...raw,
        supplierName: raw.supplierName || raw.supplier_name || 'Fournisseur',
        supplierId: raw.supplierId || raw.supplier_id || '',
        invoiceNumber: raw.invoiceNumber || raw.invoice_number || `BR-${String(raw.id || '').slice(-6).toUpperCase()}`,
        status: raw.status || 'completed',
        total,
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining
      };
    })
    .filter(p => {
      // 1. Recherche texte (Fournisseur, N° Facture, ID, Notes, Produits)
      if (q) {
        const itemNames = Array.isArray(p.items) ? p.items.map((i: any) => i?.name || '').join(' ') : '';
        const matchesSearch =
          (p.supplierName || '').toLowerCase().includes(q) ||
          (p.invoiceNumber || '').toLowerCase().includes(q) ||
          (p.id || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q) ||
          itemNames.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 2. Dates
      if (startDate || endDate) {
        const date = new Date(p.date || Date.now());
        if (startDate && date < new Date(`${startDate}T00:00:00`)) return false;
        if (endDate && date > new Date(`${endDate}T23:59:59.999`)) return false;
      }

      // 3. Fournisseur spécifique
      if (supplierId && supplierId !== 'all') {
        const matchesSupplier =
          p.supplierId === supplierId ||
          (p.supplierName && p.supplierName.toLowerCase() === supplierId.toLowerCase());
        if (!matchesSupplier) return false;
      }

      // 4. Statut de paiement
      if (paymentStatus && paymentStatus !== 'all') {
        if (paymentStatus === 'paid') {
          if (p.remainingAmount > 0.001) return false;
        } else if (paymentStatus === 'partial') {
          if (p.paidAmount <= 0.001 || p.remainingAmount <= 0.001) return false;
        } else if (paymentStatus === 'unpaid') {
          if (p.paidAmount > 0.001 || p.total <= 0.001) return false;
        } else if (paymentStatus === 'debt') {
          if (p.remainingAmount <= 0.001) return false;
        }
      }

      // 5. Statut de réception
      if (receiptStatus && receiptStatus !== 'all') {
        if (p.status !== receiptStatus) return false;
      }

      // 6. Tranches de montant
      if (minAmt !== null && !isNaN(minAmt) && p.total < minAmt) return false;
      if (maxAmt !== null && !isNaN(maxAmt) && p.total > maxAmt) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        case 'amount-desc':
          return (b.total || 0) - (a.total || 0);
        case 'amount-asc':
          return (a.total || 0) - (b.total || 0);
        case 'debt-desc':
          return (b.remainingAmount || 0) - (a.remainingAmount || 0);
        case 'supplier-asc':
          return (a.supplierName || '').localeCompare(b.supplierName || '');
        case 'date-desc':
        default:
          return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      }
    });
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
