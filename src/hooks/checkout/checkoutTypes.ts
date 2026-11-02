import React from 'react';
import { CartItem, Product, Customer, CompanySettings, Promotion, Transaction } from '../../types';

export interface UseCheckoutProcessParams {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  user: any;
  profile: any;
  activeStaffId: string;
  employees: any[];
  selectedCustomer: Customer | null;
  settings: CompanySettings;
  deliveryMethod: 'in_store' | 'delivery' | 'pickup';
  products: Product[];
  receivedAmount: string;
  keepExcessInBalance: boolean;
  total: number;
  discountAmount: number;
  pointsDiscount: number;
  voucherDiscount: number;
  promotionToApply: Promotion | null;
  useLoyaltyPoints: boolean;
  isWholesale: boolean;
  activeSessionId: string;
  setPosSessions: React.Dispatch<React.SetStateAction<any[]>>;
  appliedVoucher: any;
  setLastTransaction: (t: Transaction | null) => void;
  setShowSuccess: (s: boolean) => void;
  printReceipt: (t: Transaction, s: CompanySettings) => void;
  editingTransaction?: Transaction | null;
  onClearEditingTransaction?: () => void;
}

export type CheckoutPaymentMethod = 'cash' | 'card' | 'balance';
