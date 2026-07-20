export type InventoryTab = 'products' | 'history' | 'labels' | 'catalog' | 'sync' | 'losses';
export interface PriceHistoryEntry {
  price: number;
  costPrice: number;
  timestamp: string;
  reason?: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  level?: number;
  imageUrl?: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  createdAt?: string;
}

export interface ProductBatch {
  id: string;
  batchNumber: string;
  expirationDate: string; // ISO date string
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  image?: string;
  price: number;
  onlinePrice?: number;
  costPrice: number;
  taxRate: number;
  stock: number;
  minStock: number;
  categoryId: string;
  brandId?: string;
  supplier: string;
  unit: string;
  sku: string;
  status: 'active' | 'inactive' | 'discontinued';
  imageUrl?: string;
  imageUrls?: string[];
  description?: string;
  isBundle?: boolean;
  bundleItems?: { productId: string; quantity: number }[];
  quantityDiscounts?: { minQuantity: number; discountPrice: number }[];
  wholesalePrice?: number;
  tags?: string[];
  expirationDate?: string;
  batchNumber?: string;
  batches?: ProductBatch[];
  useMultiExpiry?: boolean;
  location?: string;
  reference?: string;
  parentId?: string;
  unitsPerParent?: number;
  autoUnpack?: boolean;
  showInPos?: boolean;
  isQuickSelect?: boolean;
  createdAt?: string;
  updatedAt: string;
  operationalCosts?: { packaging?: number; shipping?: number; other?: number };
  priceHistory?: PriceHistoryEntry[];
  damagedStock?: number;
  originalPrice?: number;
}
