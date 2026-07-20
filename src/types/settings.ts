export interface RolePermissions {
  canAccessInventory: boolean;
  canAccessSales: boolean;
  canAccessCustomers: boolean;
  canAccessEmployees: boolean;
  canAccessSuppliers: boolean;
  canAccessSettings: boolean;
  canAccessOnlineOrders: boolean;
  canAccessExpenses: boolean;
  canAccessReturns: boolean;
  canAccessPurchases: boolean;
  canAccessPromotions: boolean;
  canAccessVouchers: boolean;
  canAccessAnalytics: boolean;
  canAccessShifts: boolean;
  canAccessAuditLogs: boolean;
  canModifyPrices: boolean;
  canApplyDiscount: boolean;
  canVoidTransaction: boolean;
  canManageUsers: boolean;
}

export interface UserProfile {
  id?: string;
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  password?: string;
  role: 'admin' | 'manager' | 'cashier' | 'delivery' | 'picker' | 'camera_agent';
  employeeId?: string | null;
  lastLogin?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  severity: 'info' | 'warning' | 'high' | 'critical';
}

export interface CashShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  initialCash: number;
  finalCash?: number;
  expectedCash?: number;
  totalSales?: number;
  totalCashSales?: number;
  totalCardSales?: number;
  totalExpenses?: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  userId: string;
  paymentMethod: 'cash' | 'card' | 'transfer';
}

export interface InventoryAudit {
  id: string;
  startDate: string;
  endDate?: string;
  status: 'in_progress' | 'completed';
  auditorId: string;
  items: {
    lineId: string;
    productId: string;
    productName: string;
    expectedStock: number;
    actualStock: number;
    discrepancy: number;
    notes?: string;
  }[];
  totalDiscrepancyValue?: number;
}

export interface VoucherLog {
  transactionId: string;
  amountUsed: number;
  remainingBalance: number;
  date: string;
  userName: string;
}

export interface Voucher {
  id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  currentBalance: number;
  minPurchase?: number;
  expiryDate: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  customerId?: string;
  customerName?: string;
  notes?: string;
  createdAt: string;
  usageLogs?: VoucherLog[];
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  oldQuantity: number;
  newQuantity: number;
  adjustment: number;
  reason: string;
  timestamp: string;
  userId: string;
  userName?: string;
  isLoss?: boolean;
}

export interface CompanySettings {
  id?: string;
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  footerText?: string;
  taxNumber?: string;
  receiptTemplate: 'classic' | 'modern' | 'minimal' | 'standard';
  labelTemplate: 'standard' | 'price-only' | 'barcode-only' | 'shelf-standard' | 'shelf-large' | 'shelf-promo';
  labelOrientation?: 'landscape' | 'portrait';
  labelRotation?: '0' | '90' | '180' | '270';
  labelWidthCustom?: number;
  labelHeightCustom?: number;
  currency: string;
  taxRate: number;
  allowNegativeStock?: boolean;
  closeGridOnSelect?: boolean;
  enableVoiceGuidance?: boolean;
  rolePermissions?: Record<'admin' | 'manager' | 'cashier' | 'delivery' | 'picker' | 'camera_agent', RolePermissions>;
  loyaltyPointsPerCurrencyUnit: number;
  loyaltyPointValue: number;
  accountingFormat?: 'csv' | 'json' | 'pdf';
  siteLocations?: { id: string; name: string; address: string; type: 'warehouse' | 'store' }[];
  roleKPIs?: Record<string, { dailyOrderGoal: number; bonusPerOrder: number; bonusType: 'fixed' | 'percent' }>;
  favoriteCategoryIds?: string[];
  quickSelectGroups?: { id: string; name: string; productIds: string[] }[];
  notifications?: {
    whatsapp: { enabled: boolean; onConfirmation: boolean; onShipped: boolean; onDelivered: boolean };
    email: { enabled: boolean; onConfirmation: boolean; onShipped: boolean; onDelivered: boolean };
  };
  operationalCosts?: { basePackaging: number; baseShipping: number };
  lockingPeriodDays?: number;
  deliveryZones?: { name: string; cost: number }[];
  paperFormat?: '80mm' | '60mm' | 'A4';
  silentPrinting?: boolean;
  globalStockAlertThreshold?: number;
  availableTaxes?: { name: string; rate: number }[];
  displayPriceHT?: boolean;
  loyaltyTiers?: { name: string; multiplier: number }[];
  enableTimeClock?: boolean;
  sessionTimeoutMinutes?: number;
  auditLogRetentionDays?: number;
  brandColor?: string;
  fastModeEnabled?: boolean;
  defaultLeadTimeDays?: number;
  loyaltyPointsPerUnit?: number;
  enableCameraPortal?: boolean;
  apiKeys?: {
    twilioSid?: string;
    twilioToken?: string;
    twilioNumber?: string;
    googleMapsKey?: string;
  };
}
