import { Transaction, CompanySettings, Customer } from '../../../types';

export type MarketingFilterDate = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all';
export type FidelitySubView = 'customers' | 'promos';

export interface FidelityStatsReportProps {
  transactions: Transaction[];
  customers?: Customer[];
  settings: CompanySettings;
  marketingFilterDate: MarketingFilterDate;
  setMarketingFilterDate: (date: MarketingFilterDate) => void;
}

export interface CustomerTier {
  label: string;
  color: string;
}

export interface EnrichedCustomer extends Customer {
  points: number;
  computedSpent: number;
  txCount: number;
  discountsReceived: number;
  lastPurchase?: string;
  tier: CustomerTier;
}

export interface PromoTransaction extends Transaction {
  computedDiscount: number;
}

export interface FidelityMarketingData {
  totalDiscounts: number;
  totalVouchers: number;
  totalPointsDiscount: number;
  totalSavings: number;
  totalActivePoints: number;
  totalCustomerRevenue: number;
  transactions: PromoTransaction[];
  enrichedCustomers: EnrichedCustomer[];
}
