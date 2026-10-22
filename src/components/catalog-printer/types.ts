import { Product, CompanySettings } from '../../types';

export interface CatalogPrinterProps {
  products: Product[];
  settings: CompanySettings;
  initialSelectedProductIds?: string[];
}

export interface CustomOverrideItem {
  customPrice?: number;
  oldPrice?: number;
  badge?: string;
}

export type CustomOverrides = Record<string, CustomOverrideItem>;

export interface ThemePreset {
  id: string;
  label: string;
  class: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: '#4f46e5', label: 'Indigo Pro', class: 'bg-indigo-600' },
  { id: '#059669', label: 'Émeraude', class: 'bg-emerald-600' },
  { id: '#dc2626', label: 'Rouge Promo', class: 'bg-red-600' },
  { id: '#d97706', label: 'Or Prestige', class: 'bg-amber-600' },
  { id: '#0f172a', label: 'Noir Élégant', class: 'bg-slate-900' }
];

export const BADGE_PRESETS = ['', 'PROMO', 'NOUVEAU', 'TOP VENTE', 'ARRIVAGE', 'PRIX CHOC'];

export type LayoutMode = 'grid' | 'table' | 'inventory_sheet';
export type PriceDisplayMode = 'retail' | 'wholesale' | 'both' | 'promo' | 'none';
export type CellBorder = 'none' | 'thin' | 'shadow';
export type Orientation = 'portrait' | 'landscape';
export type ConfigSection = 'template' | 'pricing' | 'header' | 'elements';
