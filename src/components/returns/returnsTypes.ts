import { Product, CompanySettings, ProductReturn } from '../../types';

export interface ReturnsProps {
  returns: ProductReturn[];
  settings: CompanySettings;
  products?: Product[];
}

export type ReturnsDateFilter = 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';
