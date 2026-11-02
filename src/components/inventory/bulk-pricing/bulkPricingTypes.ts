import { Product, Category, CompanySettings } from '../../../types';

export type PricingScope = 'all' | 'filtered' | 'selected' | 'category';
export type WholesaleBase = 'retail_discount' | 'cost_margin';
export type OnlineBase = 'same_as_retail' | 'retail_adjust' | 'cost_margin';
export type RoundingMode = 'none' | '1' | '5' | '10';

export interface BulkPricingPreviewItem {
  id: string;
  name: string;
  cost: number;
  retail: number;
  oldWholesale: number;
  newWholesale: number;
  oldOnline: number;
  newOnline: number;
}

export interface BulkPricingStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  filteredProducts: Product[];
  selectedProductIds: string[];
  categories: Category[];
  settings: CompanySettings;
}
