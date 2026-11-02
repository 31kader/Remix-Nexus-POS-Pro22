import { StockAdjustment, Product, Category, CompanySettings } from '../../../types';

export interface LossesReportProps {
  stockAdjustments: StockAdjustment[];
  products: Product[];
  categories: Category[];
  settings: CompanySettings;
  totalRevenue?: number;
}

export type DateFilterPreset = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom';

export interface LossItem {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unit: string;
  costPrice: number;
  lossValue: number;
  reason: string;
  rawReason: string;
  userName: string;
  timestamp: string;
  category: string;
  source: 'stock_adjustment' | 'damaged_item';
}

export interface LossesStats {
  totalValue: number;
  totalQuantity: number;
  count: number;
  byCategory: Array<{ name: string; value: number }>;
  byReason: Array<{ name: string; value: number }>;
}

export const LOSS_COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#6366f1'];
