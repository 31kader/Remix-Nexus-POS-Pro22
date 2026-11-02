import { OnlineOrder, Employee, Customer, Product, CompanySettings } from '../../types';

export interface OrdersProps {
  orders?: OnlineOrder[];
  products?: Product[];
  categories?: any[];
  transactions?: any[];
  settings?: any;
  stockAdjustments?: any[];
  customers?: any[];
  user?: any;
  employees?: Employee[];
  profile?: any;
  syncOrder?: any;
  autoSync?: any;
  setAutoSync?: any;
}

export interface StatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  processing: number;
  preparing?: number;
  shipped: number;
  delivering?: number;
  delivered: number;
  cancelled: number;
  pickup?: number;
  delivery?: number;
}

export interface ResolvedCustomerInfo {
  name: string;
  phone: string;
  loyaltyPoints?: number;
  tier?: string;
  address?: string;
  notes?: string;
  customer?: any;
}

export function toSupabaseId(id: any): number | string {
  const n = Number(id);
  return (!isNaN(n) && n > 0) ? n : id;
}
