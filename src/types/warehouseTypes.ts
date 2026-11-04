export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  phone?: string;
  managerName?: string;
  isCentral: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StockTransferItem {
  productId: string;
  productName: string;
  barcode: string;
  quantitySent: number;
  quantityReceived: number;
  unitCostPrice: number;
  discrepancyReason?: string;
}

export type StockTransferStatus = 
  | 'draft' 
  | 'in_transit' 
  | 'received' 
  | 'partially_received' 
  | 'cancelled';

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  status: StockTransferStatus;
  items: StockTransferItem[];
  totalSentQuantity: number;
  totalReceivedQuantity: number;
  hasDiscrepancy: boolean;
  dispatchedAt?: string;
  receivedAt?: string;
  dispatchedBy?: string;
  receivedBy?: string;
  carrierName?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateStockTransferDto {
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  items: Omit<StockTransferItem, 'quantityReceived'>[];
  carrierName?: string;
  notes?: string;
  dispatchedBy?: string;
}

export interface ReceiveStockTransferDto {
  transferId: string;
  receivedBy: string;
  receivedItems: {
    productId: string;
    quantityReceived: number;
    discrepancyReason?: string;
  }[];
  notes?: string;
}
