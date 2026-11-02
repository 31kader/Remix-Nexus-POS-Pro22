import { Customer, Transaction, CompanySettings, Product, Expense, StockAdjustment, Category } from '../../types';

export interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: CompanySettings;
  onRestore?: (t: Transaction) => void;
  products?: Product[];
  expenses?: Expense[];
  stockAdjustments?: StockAdjustment[];
  categories?: Category[];
}

export type CustomerFilterStatus = 'all' | 'debtors' | 'credits' | 'app_users' | 'vip' | 'inactive';
export type CustomerSortOption = 'name_asc' | 'name_desc' | 'debt_desc' | 'spent_desc' | 'points_desc' | 'recent_visit';

export interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  loyaltyCardNumber: string;
  notes: string;
  isAppUser: boolean;
  password: string;
  address: string;
  city: string;
  latitude: string | number;
  longitude: string | number;
  mapsUrl: string;
  creditLimit: number;
  isWholesale: boolean;
}
