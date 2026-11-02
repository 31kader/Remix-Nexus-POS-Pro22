import { Product, Category, CompanySettings } from '../../../types';

export interface StockValueReportProps {
  products: Product[];
  categories: Category[];
  settings: CompanySettings;
  onEditProduct?: (product: Product) => void;
}

export type StockFilterStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type StockSortBy = 'sale_val_desc' | 'cost_val_desc' | 'profit_desc' | 'qty_desc' | 'name_asc';

export interface EnrichedStockProduct {
  product: Product;
  catId: string;
  catName: string;
  rawStock: number;
  positiveStock: number;
  price: number;
  cost: number;
  lineCostVal: number;
  lineSaleVal: number;
  lineProfitVal: number;
  isBundle: boolean;
}

export interface CategoryStockRow {
  id: string;
  name: string;
  productCount: number;
  qty: number;
  cost: number;
  wholesale: number;
  retail: number;
  profit: number;
}

export interface StockSummary {
  totalSaleVal: number;
  totalCostVal: number;
  totalWholesaleVal: number;
  totalProfitVal: number;
  marginPercent: number;
  totalQty: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoryRows: CategoryStockRow[];
  enrichedProducts: EnrichedStockProduct[];
}
