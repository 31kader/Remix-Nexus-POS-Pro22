import { Warehouse } from '../../types/warehouseTypes';

const WAREHOUSES_STORAGE_KEY = 'nexus_pos_warehouses';
const ACTIVE_WAREHOUSE_KEY = 'nexus_pos_active_warehouse_id';

const DEFAULT_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-main-central',
    name: 'Dépôt Central & Réserve',
    code: 'DEP-CENTRAL',
    address: 'Zone Industrielle Oued Smar, Alger',
    phone: '023 85 40 10',
    managerName: 'Directeur Logistique',
    isCentral: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'wh-store-alger',
    name: 'Magasin Alger Centre',
    code: 'MAG-ALGER-01',
    address: 'Rue Didouche Mourad, Alger',
    phone: '021 63 12 34',
    managerName: 'Chef de Rayon',
    isCentral: false,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'wh-store-oran',
    name: 'Magasin Oran Es-Sénia',
    code: 'MAG-ORAN-02',
    address: 'Boulevard Millénium, Oran',
    phone: '041 52 80 90',
    managerName: 'Responsable Boutique',
    isCentral: false,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export class WarehouseStorage {
  static getWarehouses(): Warehouse[] {
    try {
      const raw = localStorage.getItem(WAREHOUSES_STORAGE_KEY);
      if (!raw) {
        this.saveWarehouses(DEFAULT_WAREHOUSES);
        return DEFAULT_WAREHOUSES;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_WAREHOUSES;
    } catch {
      return DEFAULT_WAREHOUSES;
    }
  }

  static saveWarehouses(warehouses: Warehouse[]): void {
    try {
      localStorage.setItem(WAREHOUSES_STORAGE_KEY, JSON.stringify(warehouses));
    } catch (e) {
      console.error('[WarehouseStorage] Erreur sauvegarde dépôts:', e);
    }
  }

  static getActiveWarehouseId(): string {
    try {
      const active = localStorage.getItem(ACTIVE_WAREHOUSE_KEY);
      if (active) return active;
      const warehouses = this.getWarehouses();
      const defaultId = warehouses.find(w => w.isCentral)?.id || warehouses[0]?.id || 'wh-main-central';
      this.setActiveWarehouseId(defaultId);
      return defaultId;
    } catch {
      return 'wh-main-central';
    }
  }

  static setActiveWarehouseId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_WAREHOUSE_KEY, id);
    } catch (e) {
      console.error('[WarehouseStorage] Erreur sélection dépôt actif:', e);
    }
  }

  static getActiveWarehouse(): Warehouse | undefined {
    const id = this.getActiveWarehouseId();
    return this.getWarehouses().find(w => w.id === id);
  }

  static addWarehouse(warehouse: Omit<Warehouse, 'id' | 'createdAt'>): Warehouse {
    const warehouses = this.getWarehouses();
    const newWarehouse: Warehouse = {
      ...warehouse,
      id: `wh-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    warehouses.push(newWarehouse);
    this.saveWarehouses(warehouses);
    return newWarehouse;
  }
}
