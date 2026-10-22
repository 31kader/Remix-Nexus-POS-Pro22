import { Product } from './products';
import { Customer } from './customers';

export interface CartItem extends Product {
  quantity: number;
  cartItemId: string; 
  productName?: string;
  overriddenPrice?: number;
  lineDiscount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
}

export type PaymentMethod = 'cash' | 'card' | 'balance' | 'transfer' | 'check' | 'debt';

export interface OnlineOrder {
  id: string;
  externalOrderId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerId?: string | null;
  items: {
    lineId: string;
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  timestamp: string;
  paymentStatus: 'paid' | 'unpaid';
  paymentMethod?: PaymentMethod;
  source: string;
  deliveryMethod?: 'delivery' | 'pickup';
  pickupTime?: string;
  shippingAddress?: string;
  deliveryNotes?: string;
  syncedToPos?: boolean;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  assignedPickerId?: string;
  assignedPickerName?: string;
  statusHistory?: {
    status: string;
    changedBy: string;
    timestamp: string;
  }[];
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  gpsAccuracy?: number;
  notes?: string;
  created_at?: string;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  deliveryMethod?: 'in_store' | 'delivery' | 'pickup';
  timestamp: string;
  userId: string;
  customerId?: string | null;
  customerName?: string | null;
  status?: 'completed' | 'returned' | 'partially_returned' | 'pending' | 'delivered' | 'cancelled';
  employeeId?: string;
  employeeName?: string;
  promotionId?: string | null;
  pointsEarned?: number;
  discountAmount?: number;
  pointsDiscount?: number;
  balanceUsed?: number;
  voucherDiscount?: number;
  amountReceived?: number;
  amountReturned?: number;
  isWholesale?: boolean;
  onlineOrderId?: string;
  auditStatus?: 'verified' | 'suspicious' | 'pending';
  auditedBy?: string;
  auditedAt?: string;
  auditNote?: string;
  auditDuration?: number;
  notes?: string;
  updatedAt?: string;
  isEdited?: boolean;
  editedAt?: string;
  editedBy?: string;
  originalTotal?: number;
  originalItems?: CartItem[];
  terminalId?: string;
  terminalName?: string;
  source?: string;
  taxAmount?: number;
  subtotal?: number;
  customer_id?: string | null;
  customer_name?: string | null;
  created_at?: string;
  totalAmount?: number;
}

export function isTopUpTransaction(t: any): boolean {
  if (!t) return false;
  if (t.source === 'topup') return true;
  if (typeof t.notes === 'string' && t.notes.startsWith('[REGLEMENT]')) return true;
  if (typeof t.auditNote === 'string' && t.auditNote.startsWith('[REGLEMENT]')) return true;
  return false;
}

export interface ProductReturn {
  id: string;
  transactionId: string;
  items: {
    lineId: string;
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  totalRefund: number;
  reason: string;
  timestamp: string;
  date?: string;
  userId: string;
  customerId?: string | null;
  customerName?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  type: 'refund' | 'credit_note' | 'credit';
  refundMethod?: 'cash' | 'card' | 'credit' | 'voucher' | string;
  status?: string;
  notes?: string;
  refundAmount?: number;
}

export interface POSSession {
  id: string;
  name: string;
  cart: CartItem[];
  selectedCustomer: Customer | null;
  editingTransaction?: Transaction | null;
}
export interface Promotion {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  value: number;
  minPurchase?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  applicableCategories?: string[];
  code?: string;
  buyQuantity?: number;
  getQuantity?: number;
  applicableProducts?: string[];
}
