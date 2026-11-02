import { Customer, Transaction, CompanySettings } from '../../../types';

export interface CustomerDebtsLedgerProps {
  customers?: Customer[];
  transactions?: Transaction[];
  settings?: CompanySettings;
  onOpenFinancialModal?: (customer: Customer) => void;
  openWhatsApp?: (phone: string, text: string) => void;
}

export type DebtAgingStatus = 'recent' | 'warning' | 'overdue';

export interface DebtAgeInfo {
  days: number;
  status: DebtAgingStatus;
  label: string;
  badgeClass: string;
}

export interface DebtorCustomerItem extends Customer {
  debtAmount: number;
  debtAgeDays: number;
  debtStatus: DebtAgingStatus;
  debtLabel: string;
  debtBadgeClass: string;
}

export interface AgingCounts {
  recent: number;
  warning: number;
  overdue: number;
}
