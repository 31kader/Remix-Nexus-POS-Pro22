export interface SupplierReminder {
  id: string;
  date: string;
  title: string;
  notes?: string;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  categories?: string[];
  feedUrl?: string;
  feedFormat?: 'json' | 'csv';
  lastSync?: string;
  syncEnabled?: boolean;
  isAppUser?: boolean;
  hasFullInventoryAccess?: boolean;
  password?: string;
  balance?: number;
  preSaleDays?: string[];
  deliveryDays?: string[];
  paymentDays?: string[];
  planningNotes?: string;
  reminders?: SupplierReminder[];
  ratingQuality?: number;
  ratingDelivery?: number;
  ratingPrice?: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  orderNumber: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'validated' | 'received';
  createdAt: string;
  updatedAt: string;
}

export interface SupplierSync {
  id: string;
  name?: string;
  supplierId: string;
  url: string;
  format: 'json' | 'csv';
  interval?: number;
  active?: boolean;
  mapping: {
    sku: string;
    name?: string;
    category?: string;
    description?: string;
    stock: string;
    price?: string;
    costPrice?: string;
  };
  lastSync?: string;
  isActive: boolean;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    receivedQuantity?: number;
    costPrice: number;
    discount?: number;
    taxRate?: number;
  }[];
  total: number;
  invoiceNumber?: string;
  date: string;
  status: 'draft' | 'ordered' | 'received' | 'partially_received' | 'completed';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paidAmount: number;
  globalDiscount?: number;
  globalTax?: number;
  notes?: string;
  updatedAt?: string;
}

export interface DamagedRecord {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
  date: string;
  userId: string;
  userName: string;
  claimStatus?: 'to_claim' | 'claimed' | 'refunded' | 'replaced' | 'rejected';
  claimNotes?: string;
  costPrice?: number;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  date: string;
  method: 'cash' | 'card' | 'transfer' | 'check';
  note?: string;
  purchaseId?: string;
}

export interface InvoicePattern {
  id: string;
  supplierName: string;
  systemSupplierId: string;
  itemMappings: {
    [invoiceItemName: string]: string;
  };
}

export interface PurchaseCartItem {
  lineId: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  discount: number;
  taxRate: number;
  imageUrl?: string;
}

export interface GRNItem {
  lineId: string;
  productId: string;
  quantity: number;
  oldCostPrice: number;
  newCostPrice: number;
  vatRate: number;
  discount: number;
  expirationDate?: string;
  batchNumber?: string;
}

export interface GoodsReceiptNote {
  id: string;
  supplierId: string;
  date: string;
  items: GRNItem[];
  globalDiscount: number;
  globalVat: number;
  status: 'draft' | 'validated';
}
