import { create } from 'zustand';
import { StockAdjustment, InventoryAudit, DamagedRecord, SupplierSync, AttendanceRecord } from '../types';

interface InventoryState {
  stockAdjustments: StockAdjustment[];
  audits: InventoryAudit[];
  damagedItems: DamagedRecord[];
  supplierSyncs: SupplierSync[];
  attendance: AttendanceRecord[];

  setStockAdjustments: (adjustments: StockAdjustment[] | ((prev: StockAdjustment[]) => StockAdjustment[])) => void;
  setAudits: (audits: InventoryAudit[] | ((prev: InventoryAudit[]) => InventoryAudit[])) => void;
  setDamagedItems: (items: DamagedRecord[] | ((prev: DamagedRecord[]) => DamagedRecord[])) => void;
  setSupplierSyncs: (syncs: SupplierSync[] | ((prev: SupplierSync[]) => SupplierSync[])) => void;
  setAttendance: (attendance: AttendanceRecord[] | ((prev: AttendanceRecord[]) => AttendanceRecord[])) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  stockAdjustments: [],
  audits: [],
  damagedItems: [],
  supplierSyncs: [],
  attendance: [],

  setStockAdjustments: (update) => set((state) => ({
    stockAdjustments: typeof update === 'function' ? update(state.stockAdjustments) : update
  })),
  setAudits: (update) => set((state) => ({
    audits: typeof update === 'function' ? update(state.audits) : update
  })),
  setDamagedItems: (update) => set((state) => ({
    damagedItems: typeof update === 'function' ? update(state.damagedItems) : update
  })),
  setSupplierSyncs: (update) => set((state) => ({
    supplierSyncs: typeof update === 'function' ? update(state.supplierSyncs) : update
  })),
  setAttendance: (update) => set((state) => ({
    attendance: typeof update === 'function' ? update(state.attendance) : update
  })),
}));
