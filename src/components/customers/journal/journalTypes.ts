import { Customer, Transaction, CompanySettings } from '../../../types';

export interface CustomerGlobalJournalViewProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: CompanySettings;
  selectedCustomerId?: string | null;
  onSelectCustomer?: (id: string | null) => void;
  onRestore?: (t: Transaction) => void;
}

export interface CustomerGlobalGeneralViewProps {
  customers: Customer[];
  settings: CompanySettings;
  selectedCustomerId?: string | null;
  onSelectCustomer?: (id: string | null) => void;
  onOpenFinancialModal?: (customer: Customer) => void;
}

export interface JournalTimelineItem {
  type: 'transaction' | 'return';
  id: string;
  timestamp: string;
  total: number;
  paymentMethod: string;
  customerId: string | null;
  customerName: string;
  items: any[];
  raw: any;
}

export interface ParsedGeneralNote {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  timestamp: string;
  author: string;
  note: string;
  isFinancial: boolean;
  type: 'versement' | 'retrait' | 'memo';
  typeLabel: string;
  badgeClass: string;
  description: string;
  amount: number | null;
  method: string | null;
}
