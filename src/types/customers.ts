export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyPoints: number;
  balance: number;
  loyaltyCardNumber?: string;
  totalSpent: number;
  lastVisit?: string;
  notes?: string;
  isAppUser?: boolean;
  password?: string;
  passwordHash?: string;
  password_hash?: string;
  updatedAt?: string;
  joinDate?: string;
  address?: string;
  city?: string;
  creditLimit?: number;
  isWholesale?: boolean;
  birthday?: string;
  purchaseCount?: number;
  favoriteItems?: string[];
  alerts?: string[];
  cashierNotes?: { note: string; timestamp: string; author: string }[];
}
