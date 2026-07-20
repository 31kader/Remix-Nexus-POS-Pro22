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
  paymentMethod?: 'cash' | 'card' | string;
  source: string;
  deliveryMethod?: 'delivery' | 'pickup';
  pickupTime?: string;
  shippingAddress?: string;
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
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card';
  deliveryMethod?: 'in_store' | 'delivery' | 'pickup';
  timestamp: string;
  userId: string;
  customerId?: string | null;
  customerName?: string | null;
  status?: 'completed' | 'returned' | 'partially_returned' | 'pending' | 'delivered';
  employeeId?: string;
  employeeName?: string;
  promotionId?: string;
  pointsEarned?: number;
  discountAmount?: number;
  pointsDiscount?: number;
  balanceUsed?: number;
  voucherDiscount?: number;
  isWholesale?: boolean;
  onlineOrderId?: string;
  auditStatus?: 'verified' | 'suspicious' | 'pending';
  auditedBy?: string;
  auditedAt?: string;
  auditNote?: string;
  auditDuration?: number;
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
  type: 'refund' | 'credit_note';
  status?: string;
  notes?: string;
  refundAmount?: number;
}

export interface POSSession {
  id: string;
  name: string;
  cart: CartItem[];
  selectedCustomer: Customer | null;
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
