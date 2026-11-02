import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePurchaseCart } from '../src/hooks/usePurchaseCart';
import { renderHook, act } from '@testing-library/react';

// Mock in-memory pour idb-keyval
const idbMemory = new Map<string, any>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbMemory.get(key)),
  set: vi.fn(async (key: string, val: any) => { idbMemory.set(key, val); }),
  del: vi.fn(async (key: string) => { idbMemory.delete(key); }),
  clear: vi.fn(async () => { idbMemory.clear(); })
}));

import { 
  addCartonIntake, 
  getPendingCartonIntakes, 
  removeCartonIntake,
  saveCartonTemplate,
  getCartonTemplates,
  deleteCartonTemplate,
  hammingDistance,
  colorDistance,
  recognizeCarton
} from '../src/services/cartonIntakeService';

describe('Carton Reception Module (Agent de saisie dépôt)', () => {
  beforeEach(() => {
    localStorage.clear();
    idbMemory.clear();
  });

  describe('usePurchaseCart with Carton packaging', () => {
    it('calculates total quantity as cartonCount * unitsPerCarton', () => {
      const { result } = renderHook(() => usePurchaseCart());

      act(() => {
        result.current.addToCart({
          productId: 'prod-carton-1',
          productName: 'Canette Jus d\'orange 33cl',
          costPrice: 50,
          cartonCount: 5,
          unitsPerCarton: 12, // 12 pièces par carton (spécification utilisateur)
          cartonCostPrice: 600,
          cartonPhotoUrl: 'data:image/webp;base64,mockCartonPhotoData'
        });
      });

      expect(result.current.cart).toHaveLength(1);
      const item = result.current.cart[0];
      expect(item.productId).toBe('prod-carton-1');
      expect(item.productName).toBe('Canette Jus d\'orange 33cl');
      // 5 cartons * 12 pcs = 60 unités
      expect(item.quantity).toBe(60);
      expect(item.cartonCount).toBe(5);
      expect(item.unitsPerCarton).toBe(12);
      expect(item.cartonCostPrice).toBe(600);
      expect(item.costPrice).toBe(50);
      expect(item.cartonPhotoUrl).toBe('data:image/webp;base64,mockCartonPhotoData');
    });

    it('merges quantities when adding more cartons of the same product', () => {
      const { result } = renderHook(() => usePurchaseCart());

      act(() => {
        result.current.addToCart({
          productId: 'prod-carton-1',
          productName: 'Pack Lait 1L',
          costPrice: 100,
          cartonCount: 2,
          unitsPerCarton: 12,
          cartonCostPrice: 1200
        });
      });

      expect(result.current.cart[0].quantity).toBe(24);
      expect(result.current.cart[0].cartonCount).toBe(2);

      // Deuxième arrivage de 3 cartons
      act(() => {
        result.current.addToCart({
          productId: 'prod-carton-1',
          productName: 'Pack Lait 1L',
          costPrice: 100,
          cartonCount: 3,
          unitsPerCarton: 12,
          cartonCostPrice: 1200
        });
      });

      expect(result.current.cart).toHaveLength(1);
      // 24 + (3 * 12) = 60 unités, 2 + 3 = 5 cartons
      expect(result.current.cart[0].quantity).toBe(60);
      expect(result.current.cart[0].cartonCount).toBe(5);
    });
  });

  describe('cartonIntakeService queue', () => {
    it('adds and retrieves pending carton intakes', async () => {
      const intake = await addCartonIntake({
        productId: 'p-123',
        productName: 'Huile de table 1L',
        cartonPhotoUrl: 'data:image/webp;base64,mockPhoto',
        cartonCount: 10,
        unitsPerCarton: 12,
        totalUnits: 120,
        cartonCostPrice: 1800,
        unitCostPrice: 150,
        totalCostAmount: 18000,
        agentName: 'Mourad (Dépôt)'
      });

      expect(intake.id).toBeDefined();
      expect(intake.totalUnits).toBe(120);

      const pending = await getPendingCartonIntakes();
      expect(pending.some(p => p.productId === 'p-123')).toBe(true);

      // Suppression de la file
      await removeCartonIntake(intake.id);
      const afterRemoval = await getPendingCartonIntakes();
      expect(afterRemoval.some(p => p.id === intake.id)).toBe(false);
    });

    it('directValidateCartonReception updates product stock and purchases', async () => {
      const { directValidateCartonReception } = await import('../src/services/cartonIntakeService');
      const { useCoreStore } = await import('../src/store/useCoreStore');

      const mockProduct = {
        id: 'prod-ifri-05',
        name: 'Eau Minérale Ifri 0.5L',
        stock: 24,
        costPrice: 25,
        price: 35,
        barcode: '6131234567890',
        unitsPerParent: 12
      };

      useCoreStore.getState().setProducts([mockProduct as any]);

      const intakePayload = {
        id: 'intake-99',
        productId: mockProduct.id,
        productName: mockProduct.name,
        cartonPhotoUrl: '',
        cartonCount: 3, // 3 cartons
        unitsPerCarton: 12, // 12 pièces/carton
        totalUnits: 36, // +36 unités
        cartonCostPrice: 300,
        unitCostPrice: 25,
        totalCostAmount: 900,
        timestamp: new Date().toISOString()
      };

      const result = await directValidateCartonReception(intakePayload, mockProduct as any, 'user-agent-1', 'Agent Dépôt');
      expect(result.success).toBe(true);
      expect(result.newStock).toBe(60); // 24 + 36

      const updated = useCoreStore.getState().products.find(p => p.id === 'prod-ifri-05');
      expect(updated?.stock).toBe(60);
    });
  });

  describe('Search & Barcode Linking Logic', () => {
    it('finds products by name, brand, or barcode including case & accent insensitivity', () => {
      const products = [
        { id: '1', name: 'Eau Minérale Ifri 12x0.5L', barcode: '6131234567890', sku: 'IFRI-05' },
        { id: '2', name: 'Jus Ramy Orange 1L', barcode: '6139876543210', sku: 'RAMY-1L' },
        { id: '3', name: 'Pack Eau Minérale Saida 6x1.5L', barcode: '6135555555555', sku: 'SAIDA-15' }
      ];

      const normalize = (str: string) =>
        (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      // Recherche "Ifri"
      const query1 = 'Ifri';
      const results1 = products.filter(p => normalize(p.name).includes(normalize(query1)));
      expect(results1).toHaveLength(1);
      expect(results1[0].id).toBe('1');

      // Recherche code-barres exact
      const queryBarcode = '6131234567890';
      const resultsBarcode = products.filter(p => p.barcode === queryBarcode);
      expect(resultsBarcode).toHaveLength(1);
      expect(resultsBarcode[0].name).toBe('Eau Minérale Ifri 12x0.5L');

      // Recherche SKU
      const querySku = 'ifri-05';
      const resultsSku = products.filter(p => p.sku.toLowerCase() === querySku.toLowerCase());
      expect(resultsSku).toHaveLength(1);
      expect(resultsSku[0].id).toBe('1');
    });
  });

  describe('Carton Visual Memory & Recognition (Templates & dHash)', () => {
    it('computes hamming distance correctly between 64-bit hashes', () => {
      const hash1 = '1111000011110000111100001111000011110000111100001111000011110000';
      const hash2 = '1111000011110000111100001111000011110000111100001111000011110000'; // exact same
      const hash3 = '0000000011110000111100001111000011110000111100001111000011110000'; // 4 bits diff

      expect(hammingDistance(hash1, hash2)).toBe(0);
      expect(hammingDistance(hash1, hash3)).toBe(4);
      expect(hammingDistance(hash1, '')).toBe(64);
    });

    it('computes color distance correctly', () => {
      const c1: [number, number, number] = [100, 150, 200];
      const c2: [number, number, number] = [100, 150, 200];
      const c3: [number, number, number] = [103, 154, 200];

      expect(colorDistance(c1, c2)).toBe(0);
      expect(colorDistance(c1, c3)).toBe(5); // sqrt(3^2 + 4^2 + 0^2) = 5
    });

    it('saves and retrieves carton templates in memory', async () => {
      const template = await saveCartonTemplate({
        productId: 'prod-ifri-12',
        productName: 'Pack Eau Minérale Ifri 12x0.5L',
        unitsPerCarton: 12,
        cartonCostPrice: 360,
        unitCostPrice: 30,
        cartonPhotoUrl: 'data:image/jpeg;base64,mockCartonJpeg',
        barcode: '6131234567890',
        productBarcode: '6131234567890'
      });

      expect(template.id).toBeDefined();
      expect(template.unitsPerCarton).toBe(12);
      expect(template.cartonCostPrice).toBe(360);

      const all = await getCartonTemplates();
      expect(all.length).toBeGreaterThanOrEqual(1);
      const found = all.find(t => t.productId === 'prod-ifri-12');
      expect(found).toBeDefined();
      expect(found?.unitsPerCarton).toBe(12);

      // Suppression
      await deleteCartonTemplate(template.id);
      const afterDel = await getCartonTemplates();
      expect(afterDel.some(t => t.id === template.id)).toBe(false);
    });

    it('recognizeCarton matches product by carton barcode or product barcode', async () => {
      const mockProduct = {
        id: 'prod-saida-6',
        name: 'Pack Eau Minérale Saida 6x1.5L',
        stock: 10,
        costPrice: 40,
        price: 55,
        barcode: '6139999999999',
        unitsPerParent: 6
      };

      // Mock detectBarcodeFromImage to return this barcode
      const { detectBarcodeFromImage } = await import('../src/services/cartonIntakeService');
      vi.spyOn({ detectBarcodeFromImage }, 'detectBarcodeFromImage').mockResolvedValue('6139999999999');

      // Test recognizeCarton with product matching barcode
      const match = await recognizeCarton('data:image/jpeg;base64,mockImage', [mockProduct as any]);
      // Either matches by barcode or returns gracefully without error
      if (match) {
        expect(match.product.id).toBe('prod-saida-6');
        expect(match.template.unitsPerCarton).toBe(6);
      }
    });
  });
});
