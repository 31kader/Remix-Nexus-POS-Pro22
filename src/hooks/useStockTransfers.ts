import { useState, useEffect, useCallback } from 'react';
import { StockTransfer, Warehouse, CreateStockTransferDto, ReceiveStockTransferDto } from '../types/warehouseTypes';
import { StockTransferService } from '../services/warehouse/stockTransferService';
import { WarehouseStorage } from '../services/warehouse/warehouseStorage';
import { TransferPrintTemplate } from '../services/warehouse/transferPrintTemplate';

export function useStockTransfers() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeWarehouseId, setActiveWarehouseIdState] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const refresh = useCallback(() => {
    setTransfers(StockTransferService.getTransfers());
    setWarehouses(WarehouseStorage.getWarehouses());
    setActiveWarehouseIdState(WarehouseStorage.getActiveWarehouseId());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveWarehouse = (id: string) => {
    WarehouseStorage.setActiveWarehouseId(id);
    setActiveWarehouseIdState(id);
  };

  const createTransfer = (dto: CreateStockTransferDto) => {
    const created = StockTransferService.createTransfer(dto);
    refresh();
    return created;
  };

  const receiveTransfer = (dto: ReceiveStockTransferDto) => {
    const received = StockTransferService.receiveTransfer(dto);
    refresh();
    return received;
  };

  const cancelTransfer = (transferId: string, reason: string) => {
    const cancelled = StockTransferService.cancelTransfer(transferId, reason);
    refresh();
    return cancelled;
  };

  const printTransfer = (transfer: StockTransfer) => {
    const html = TransferPrintTemplate.generateA4Html(transfer);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    }
  };

  const filteredTransfers = transfers.filter(t => {
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.transferNumber.toLowerCase().includes(q) ||
      t.sourceWarehouseName.toLowerCase().includes(q) ||
      t.destinationWarehouseName.toLowerCase().includes(q) ||
      t.items.some(i => i.productName.toLowerCase().includes(q) || i.barcode.includes(q));
    return matchesStatus && matchesSearch;
  });

  return {
    transfers: filteredTransfers,
    allTransfersCount: transfers.length,
    warehouses,
    activeWarehouseId,
    setActiveWarehouse,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    createTransfer,
    receiveTransfer,
    cancelTransfer,
    printTransfer,
    refresh
  };
}
