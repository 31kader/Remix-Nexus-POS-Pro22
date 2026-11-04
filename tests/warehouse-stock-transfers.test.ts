import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WarehouseStorage } from '../src/services/warehouse/warehouseStorage';
import { StockTransferService } from '../src/services/warehouse/stockTransferService';
import { TransferPrintTemplate } from '../src/services/warehouse/transferPrintTemplate';
import * as SyncService from '../src/services/SyncService';

describe('Vague 1 : Multi-Magasins & Bons de Transfert (BLT)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('WarehouseStorage', () => {
    it('fournit les dépôts par défaut si aucun n\'est configuré', () => {
      const warehouses = WarehouseStorage.getWarehouses();
      expect(warehouses.length).toBeGreaterThanOrEqual(3);
      expect(warehouses.some(w => w.isCentral)).toBe(true);
      expect(warehouses.some(w => w.code === 'DEP-CENTRAL')).toBe(true);
    });

    it('gère le magasin actif de manière persistante', () => {
      WarehouseStorage.setActiveWarehouseId('wh-store-oran');
      expect(WarehouseStorage.getActiveWarehouseId()).toBe('wh-store-oran');
      const active = WarehouseStorage.getActiveWarehouse();
      expect(active?.code).toBe('MAG-ORAN-02');
    });

    it('ajoute un nouveau magasin ou dépôt', () => {
      const created = WarehouseStorage.addWarehouse({
        name: 'Dépôt Annaba Port',
        code: 'DEP-ANNABA',
        address: 'Zone Portuaire, Annaba',
        isCentral: false,
        isActive: true
      });

      expect(created.id).toBeDefined();
      expect(created.code).toBe('DEP-ANNABA');
      const all = WarehouseStorage.getWarehouses();
      expect(all.some(w => w.code === 'DEP-ANNABA')).toBe(true);
    });
  });

  describe('StockTransferService', () => {
    it('génère un numéro séquentiel BLT avec l\'année en cours', () => {
      const num = StockTransferService.generateTransferNumber();
      const currentYear = new Date().getFullYear();
      expect(num).toMatch(new RegExp(`^BLT-${currentYear}-\\d{4}$`));
    });

    it('crée un transfert avec consolidation préalable par produit et déstockage source', () => {
      const enqueueSpy = vi.spyOn(SyncService, 'enqueueStockAdjustment').mockImplementation(() => {});

      const transfer = StockTransferService.createTransfer({
        sourceWarehouseId: 'wh-main-central',
        sourceWarehouseName: 'Dépôt Central',
        destinationWarehouseId: 'wh-store-alger',
        destinationWarehouseName: 'Magasin Alger',
        items: [
          { productId: 'prod-1', productName: 'Café Bonal 250g', barcode: '6130001', quantitySent: 5, unitCostPrice: 200 },
          { productId: 'prod-1', productName: 'Café Bonal 250g', barcode: '6130001', quantitySent: 3, unitCostPrice: 200 }, // Multi-lignes même produit
          { productId: 'prod-2', productName: 'Sucre En Poudre 1kg', barcode: '6130002', quantitySent: 10, unitCostPrice: 90 }
        ],
        carrierName: 'Kamel Chauffeur',
        notes: 'Réassort urgent'
      });

      expect(transfer.status).toBe('in_transit');
      expect(transfer.items).toHaveLength(2); // Consolidé à 2 produits distincts
      const cafe = transfer.items.find(i => i.productId === 'prod-1');
      expect(cafe?.quantitySent).toBe(8); // 5 + 3 = 8
      expect(transfer.totalSentQuantity).toBe(18); // 8 + 10 = 18

      // Vérifier que enqueueStockAdjustment a été appelé avec un delta négatif
      expect(enqueueSpy).toHaveBeenCalledWith('prod-1', -8, expect.any(Object));
      expect(enqueueSpy).toHaveBeenCalledWith('prod-2', -10, expect.any(Object));
    });

    it('réceptionne un transfert conforme et incrémente le stock destination', () => {
      const enqueueSpy = vi.spyOn(SyncService, 'enqueueStockAdjustment').mockImplementation(() => {});

      const transfer = StockTransferService.createTransfer({
        sourceWarehouseId: 'wh-main-central',
        sourceWarehouseName: 'Dépôt Central',
        destinationWarehouseId: 'wh-store-alger',
        destinationWarehouseName: 'Magasin Alger',
        items: [
          { productId: 'prod-1', productName: 'Lait Soummam 1L', barcode: '6130003', quantitySent: 12, unitCostPrice: 110 }
        ]
      });

      const received = StockTransferService.receiveTransfer({
        transferId: transfer.id,
        receivedBy: 'Amine Réceptionnaire',
        receivedItems: [
          { productId: 'prod-1', quantityReceived: 12 }
        ],
        notes: 'Carton intact'
      });

      expect(received.status).toBe('received');
      expect(received.hasDiscrepancy).toBe(false);
      expect(received.totalReceivedQuantity).toBe(12);

      // Incrémentation du stock destination
      expect(enqueueSpy).toHaveBeenCalledWith('prod-1', 12, expect.any(Object));
    });

    it('détecte et signale un écart de réception (avarie / manquant)', () => {
      const enqueueSpy = vi.spyOn(SyncService, 'enqueueStockAdjustment').mockImplementation(() => {});

      const transfer = StockTransferService.createTransfer({
        sourceWarehouseId: 'wh-main-central',
        sourceWarehouseName: 'Dépôt Central',
        destinationWarehouseId: 'wh-store-oran',
        destinationWarehouseName: 'Magasin Oran',
        items: [
          { productId: 'prod-jus', productName: 'Jus Rouiba 1L', barcode: '6130004', quantitySent: 20, unitCostPrice: 130 }
        ]
      });

      const received = StockTransferService.receiveTransfer({
        transferId: transfer.id,
        receivedBy: 'Fateh Contrôleur',
        receivedItems: [
          { productId: 'prod-jus', quantityReceived: 18, discrepancyReason: '2 briques percées' }
        ]
      });

      expect(received.status).toBe('partially_received');
      expect(received.hasDiscrepancy).toBe(true);
      expect(received.items[0].quantityReceived).toBe(18);
      expect(received.items[0].discrepancyReason).toBe('2 briques percées');

      // Seules les 18 reçues entrent en stock
      expect(enqueueSpy).toHaveBeenCalledWith('prod-jus', 18, expect.any(Object));
    });

    it('annule un transfert en transit et réintègre le stock source', () => {
      const enqueueSpy = vi.spyOn(SyncService, 'enqueueStockAdjustment').mockImplementation(() => {});

      const transfer = StockTransferService.createTransfer({
        sourceWarehouseId: 'wh-main-central',
        sourceWarehouseName: 'Dépôt Central',
        destinationWarehouseId: 'wh-store-oran',
        destinationWarehouseName: 'Magasin Oran',
        items: [
          { productId: 'prod-huile', productName: 'Huile Elio 5L', barcode: '6130005', quantitySent: 6, unitCostPrice: 600 }
        ]
      });

      const cancelled = StockTransferService.cancelTransfer(transfer.id, 'Erreur de camion');
      expect(cancelled.status).toBe('cancelled');

      // Réintégration du stock source (+6)
      expect(enqueueSpy).toHaveBeenCalledWith('prod-huile', 6, expect.any(Object));
    });
  });

  describe('TransferPrintTemplate', () => {
    it('génère un document HTML A4 complet avec badges et totaux', () => {
      const transfer = StockTransferService.createTransfer({
        sourceWarehouseId: 'wh-main-central',
        sourceWarehouseName: 'Dépôt Central',
        destinationWarehouseId: 'wh-store-alger',
        destinationWarehouseName: 'Magasin Alger',
        items: [
          { productId: 'p1', productName: 'Fromage Tartino 24p', barcode: '6130009', quantitySent: 4, unitCostPrice: 280 }
        ]
      });

      const html = TransferPrintTemplate.generateA4Html(transfer, 'SARL ALGERIAN RETAIL');
      expect(html).toContain('SARL ALGERIAN RETAIL');
      expect(html).toContain('BON DE TRANSFERT INTER-DÉPÔTS');
      expect(html).toContain(transfer.transferNumber);
      expect(html).toContain('Dépôt Central');
      expect(html).toContain('Magasin Alger');
      expect(html).toContain('Fromage Tartino 24p');
      expect(html).toContain('EN TRANSIT');
    });
  });
});
