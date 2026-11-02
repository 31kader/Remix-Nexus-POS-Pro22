import { Transaction, CompanySettings } from '../../../../types';

export interface ProductSalesEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  transactions: Transaction[];
  settings: CompanySettings;
}

export interface EditableSaleRow {
  transactionId: string;
  transaction: Transaction;
  itemIndex: number;
  item: any;
  currentDate: string;
  quantity: number;
  price: number;
  costPrice: number;
  discountAmount: number;
  ticketDiscountTotal: number;
  isEditing: boolean;
}

export interface ProductSalesSummary {
  totalQtySold: number;
  totalRevenue: number;
  totalDiscount: number;
  totalCost: number;
  totalProfit: number;
}
