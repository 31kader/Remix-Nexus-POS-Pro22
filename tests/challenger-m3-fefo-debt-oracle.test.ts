// tests/challenger-m3-fefo-debt-oracle.test.ts
/**
 * ⚔️ ORACLE CONTRADICTOIRE & HARNAIS D'ÉPREUVE ADVERSARIALE (JALON M3)
 * Nexus POS Pro (v1.2.52)
 *
 * Épreuves approfondies :
 * 1. Tri FEFO avec dates d'expiration inversées, aléatoires (Monte-Carlo), cumulatives et formats limites.
 * 2. Symétrie algébrique stricte de la dette fournisseur sous annulation de bon (handleDeletePurchaseDb)
 *    avec règlements partiels multiples, paiements comptants et bons entrelacés.
 * 3. Restauration exacte du coût historique (priceHistory stack LIFO) et invariance des bundles.
 * 4. Scan exhaustif anti-NaN et zéro altération du code applicatif sous src/.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// 1. Mocks étanches
vi.mock('idb-keyval', () => {
  const store = new Map<string, any>();
  return {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: any) => { store.set(key, value); }),
    del: vi.fn(async (key: string) => { store.delete(key); }),
    keys: vi.fn(async () => Array.from(store.keys())),
    clear: vi.fn(async () => { store.clear(); })
  };
});

const enqueuedStockAdjustments: [string, number][] = [];
const enqueuedCustomerBalanceAdjustments: any[] = [];
const enqueuedSyncItems: any[] = [];

vi.mock('../src/services/SyncService', () => ({
  enqueueStockAdjustment: vi.fn((productId: string, adjustment: number) => {
    enqueuedStockAdjustments.push([productId, adjustment]);
  }),
  enqueueCustomerBalanceAdjustment: vi.fn((customerId: string, deltaBalance: number, deltaSpent: number, deltaPoints: number, note?: string) => {
    enqueuedCustomerBalanceAdjustments.push({ customerId, deltaBalance, deltaSpent, deltaPoints, note });
  }),
  enqueueSync: vi.fn((table: string, action: string, data: any) => {
    enqueuedSyncItems.push({ table, action, data });
  }),
  enqueueSyncBatch: vi.fn(),
  sanitizePayloadForSupabase: vi.fn((_table: string, payload: any) => payload)
}));

const localMemoryStore = new Map<string, any>();
vi.mock('../src/services/LocalDatabase', () => ({
  localDb: {
    insert: vi.fn(async (tablePath: string, value: any) => {
      localMemoryStore.set(tablePath, JSON.parse(JSON.stringify(value)));
    }),
    update: vi.fn(async (tablePath: string, value: any) => {
      const existing = localMemoryStore.get(tablePath) || {};
      localMemoryStore.set(tablePath, { ...existing, ...JSON.parse(JSON.stringify(value)) });
    }),
    insertLocalOnly: vi.fn(async (tablePath: string, value: any) => {
      localMemoryStore.set(tablePath, JSON.parse(JSON.stringify(value)));
    }),
    updateLocalOnly: vi.fn(async (tablePath: string, value: any) => {
      const existing = localMemoryStore.get(tablePath) || {};
      localMemoryStore.set(tablePath, { ...existing, ...JSON.parse(JSON.stringify(value)) });
    }),
    delete: vi.fn(async (tablePath: string) => {
      localMemoryStore.delete(tablePath);
    }),
    get: vi.fn(async (tablePath: string) => {
      const val = localMemoryStore.get(tablePath);
      return {
        exists: () => val !== undefined,
        val: () => (val ? JSON.parse(JSON.stringify(val)) : null)
      };
    }),
    push: vi.fn(() => ({ key: 'gen-' + Math.random().toString(36).substring(2, 9) })),
    subscribe: vi.fn(() => () => {})
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('../src/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
    })),
    rpc: vi.fn().mockResolvedValue({ data: 0, error: null })
  }
}));

import { renderHook, act } from '@testing-library/react';
import { useCoreStore } from '../src/store/useCoreStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useFinanceStore } from '../src/store/useFinanceStore';
import { normalizeBatches } from '../src/types/products';
import { useGRNLogic } from '../src/hooks/useGRNLogic';
import {
  savePurchaseDb,
  handleSupplierPaymentDb,
  handleDeletePurchaseDb,
  SavePurchaseParams
} from '../src/components/smart-purchase/purchaseDbOperations';
import { PurchaseCartItem } from '../src/hooks/usePurchaseCart';
import {
  resetSimulationEnvironment,
  simulationSettings,
  assertNoNaN
} from './helpers/simulation-harness-helper';
import { REAL_105_PRODUCTS_CATALOG } from './helpers/simulation-catalog-data';

describe('⚔️ CHALLENGER M3.2 — ORACLE CONTRADICTOIRE FEFO, DETTE FOURNISSEUR & ROLLBACK', () => {
  beforeEach(() => {
    enqueuedStockAdjustments.length = 0;
    enqueuedCustomerBalanceAdjustments.length = 0;
    enqueuedSyncItems.length = 0;
    localMemoryStore.clear();
    resetSimulationEnvironment();
  });

  // =========================================================================
  // 1. ÉPREUVES ADVERSARIALES DU TRI FEFO (First Expired, First Out)
  // =========================================================================
  describe('1. Épreuves FEFO Contradictoires (Tri chronologique & Lots)', () => {
    it('1.1 — Tri FEFO avec dates inversées (du futur lointain au plus proche)', async () => {
      const prodId = '007hboycu'; // FARINE MOULA 10KG
      const initialStock = useCoreStore.getState().products.find(p => p.id === prodId)?.stock || 0;

      const { result: grnHook } = renderHook(() => useGRNLogic({
        products: useCoreStore.getState().products,
        suppliers: usePeopleStore.getState().suppliers,
        setIsProductModalOpen: vi.fn(),
        setEditingProduct: vi.fn(),
        settings: simulationSettings
      }));

      // Injection dans un ordre strictement inverse de la chronologie
      const reversedDates = [
        { date: '2035-12-31', batch: 'LOT-2035', qty: 5 },
        { date: '2031-06-30', batch: 'LOT-2031', qty: 10 },
        { date: '2029-01-15', batch: 'LOT-2029', qty: 15 },
        { date: '2027-08-20', batch: 'LOT-2027', qty: 20 },
        { date: '2026-03-10', batch: 'LOT-2026-TARGET', qty: 25 } // Le plus proche !
      ];

      const items = reversedDates.map((d, idx) => ({
        lineId: `line-rev-${idx}`,
        productId: prodId,
        quantity: d.qty,
        oldCostPrice: 550,
        newCostPrice: 550,
        vatRate: 19,
        discount: 0,
        batchNumber: d.batch,
        expirationDate: d.date
      }));

      await act(async () => {
        grnHook.current.setSupplierId('2147hie00');
        grnHook.current.setItems(items);
      });

      await act(async () => {
        await grnHook.current.handleCreate(false);
      });

      const updated = useCoreStore.getState().products.find(p => p.id === prodId)!;
      expect(updated).toBeDefined();
      expect(updated.stock).toBe(initialStock + 75);
      expect(updated.useMultiExpiry).toBe(true);

      // L'oracle certifie que le tri a réordonné les lots et élu la date 2026-03-10
      expect(updated.expirationDate).toBe('2026-03-10');
      expect(updated.batchNumber).toBe('LOT-2026-TARGET');

      const norm = normalizeBatches(updated.batches);
      expect(norm.length).toBe(5);
      // Vérifier que tous les lots sont conservés et que la somme des stocks de lots correspond
      const totalBatchStock = norm.reduce((s, b) => s + b.stock, 0);
      expect(totalBatchStock).toBe(75);
    });

    it('1.2 — Monte-Carlo FEFO : 10 permutations aléatoires de dates disparates', async () => {
      const datesPool = [
        '2025-11-20',
        '2026-02-14',
        '2026-02-15', // Même mois, un jour après
        '2027-07-04',
        '2028-12-25',
        '2030-01-01'
      ];

      for (let run = 0; run < 10; run++) {
        // Mélange aléatoire (Fisher-Yates)
        const shuffled = [...datesPool].sort(() => Math.random() - 0.5);
        const expectedEarliest = [...shuffled].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

        // On prend un produit distinct par run pour éviter l'accumulation
        const testProd = REAL_105_PRODUCTS_CATALOG[run + 5];
        expect(testProd).toBeDefined();

        const { result: grnHook } = renderHook(() => useGRNLogic({
          products: useCoreStore.getState().products,
          suppliers: usePeopleStore.getState().suppliers,
          setIsProductModalOpen: vi.fn(),
          setEditingProduct: vi.fn(),
          settings: simulationSettings
        }));

        const items = shuffled.map((d, idx) => ({
          lineId: `line-mc-${run}-${idx}`,
          productId: testProd.id,
          quantity: 2,
          oldCostPrice: testProd.costPrice || 100,
          newCostPrice: testProd.costPrice || 100,
          vatRate: 19,
          discount: 0,
          batchNumber: `LOT-MC-${d}`,
          expirationDate: d
        }));

        await act(async () => {
          grnHook.current.setSupplierId('2147hie00');
          grnHook.current.setItems(items);
        });

        await act(async () => {
          await grnHook.current.handleCreate(false);
        });

        const updatedProd = useCoreStore.getState().products.find(p => p.id === testProd.id)!;
        expect(updatedProd.expirationDate).toBe(expectedEarliest);
        expect(updatedProd.batchNumber).toBe(`LOT-MC-${expectedEarliest}`);
      }
    });

    it('1.3 — Tri FEFO incrémental : préservation du lot le plus proche lors d\'arrivages successifs', async () => {
      const prodId = 'nyhzsaxkg'; // COMPOTE POMME (témoin)
      
      const { result: grnHook } = renderHook(() => useGRNLogic({
        products: useCoreStore.getState().products,
        suppliers: usePeopleStore.getState().suppliers,
        setIsProductModalOpen: vi.fn(),
        setEditingProduct: vi.fn(),
        settings: simulationSettings
      }));

      // Arrivage 1 : Lot à échéance 2027-06-01 (10 u.)
      await act(async () => {
        grnHook.current.setSupplierId('2147hie00');
        grnHook.current.setItems([{
          lineId: 'arr-1',
          productId: prodId,
          quantity: 10,
          oldCostPrice: 36.72,
          newCostPrice: 36.72,
          vatRate: 19,
          discount: 0,
          batchNumber: 'LOT-ARR1-2027',
          expirationDate: '2027-06-01'
        }]);
      });
      await act(async () => { await grnHook.current.handleCreate(false); });

      let p = useCoreStore.getState().products.find(item => item.id === prodId)!;
      expect(p.expirationDate).toBe('2027-06-01');
      expect(p.batchNumber).toBe('LOT-ARR1-2027');

      // Arrivage 2 : Lot plus lointain 2028-09-01 (5 u.) -> doit conserver 2027-06-01
      await act(async () => {
        grnHook.current.setSupplierId('2147hie00');
        grnHook.current.setItems([{
          lineId: 'arr-2',
          productId: prodId,
          quantity: 5,
          oldCostPrice: 36.72,
          newCostPrice: 36.72,
          vatRate: 19,
          discount: 0,
          batchNumber: 'LOT-ARR2-2028',
          expirationDate: '2028-09-01'
        }]);
      });
      await act(async () => { await grnHook.current.handleCreate(false); });

      p = useCoreStore.getState().products.find(item => item.id === prodId)!;
      expect(p.expirationDate).toBe('2027-06-01'); // Invariance : reste l'échéance la plus proche
      expect(p.batches?.length).toBe(2);

      // Arrivage 3 : Lot urgent 2026-05-15 (8 u.) -> doit devenir la nouvelle échéance active
      await act(async () => {
        grnHook.current.setSupplierId('2147hie00');
        grnHook.current.setItems([{
          lineId: 'arr-3',
          productId: prodId,
          quantity: 8,
          oldCostPrice: 36.72,
          newCostPrice: 36.72,
          vatRate: 19,
          discount: 0,
          batchNumber: 'LOT-ARR3-2026-URGENT',
          expirationDate: '2026-05-15'
        }]);
      });
      await act(async () => { await grnHook.current.handleCreate(false); });

      p = useCoreStore.getState().products.find(item => item.id === prodId)!;
      expect(p.expirationDate).toBe('2026-05-15');
      expect(p.batchNumber).toBe('LOT-ARR3-2026-URGENT');
      expect(p.batches?.length).toBe(3);
    });

    it('1.4 — Robustesse et hermétisme de normalizeBatches (formes limites et corrompues)', () => {
      expect(normalizeBatches(null)).toEqual([]);
      expect(normalizeBatches(undefined)).toEqual([]);
      expect(normalizeBatches('')).toEqual([]);
      expect(normalizeBatches('not-json')).toEqual([]);
      expect(normalizeBatches('{ "invalid": true }')).toEqual([]); // objet seul sans tableau

      // Chaîne JSON valide
      const jsonBatches = JSON.stringify([
        { batch_number: 'SNAKE-1', expiration_date: '2027-01-01', stock: '12.5' },
        { batchNumber: 'CAMEL-2', expirationDate: '2028-01-01', stock: 15 }
      ]);
      const res = normalizeBatches(jsonBatches);
      expect(res.length).toBe(2);
      expect(res[0].batchNumber).toBe('SNAKE-1');
      expect(res[0].stock).toBe(12.5);
      expect(res[1].batchNumber).toBe('CAMEL-2');
      expect(res[1].stock).toBe(15);
    });
  });

  // =========================================================================
  // 2. ÉPREUVES ADVERSARIALES DE LA SYMÉTRIE DE LA DETTE FOURNISSEUR
  // =========================================================================
  describe('2. Épreuves de Symétrie Algébrique de la Dette Fournisseur', () => {
    it('2.1 — Achat 100% à crédit : symétrie stricte B_initiale == B_finale lors du rollback', async () => {
      const supplierId = '2147hie00'; // ETS PATIFOUR
      const supplierInitial = usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!;
      const initialBalance = Number(supplierInitial.balance); // 3972.00 DA

      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-debt-1',
          productId: '01rffjxys', // LAHDA-LOYA 2K
          productName: 'LAHDA-LOYA 2K',
          quantity: 20,
          costPrice: 2000,
          taxRate: 19,
          discount: 0,
          isDraft: false
        }
      ];

      // Total TTC = 20 * 2000 * 1.19 = 47 600.00 DA
      const totalTTC = 47600.00;
      const paidAmount = 0.00; // Impayé intégral

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplierId,
        extractedData: null,
        invoiceNumber: 'BL-STRESS-FULL-CREDIT',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: useFinanceStore.getState().purchases,
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const purchase = useFinanceStore.getState().purchases.find(p => p.invoiceNumber === 'BL-STRESS-FULL-CREDIT')!;
      expect(purchase).toBeDefined();
      expect(purchase.total).toBe(totalTTC);

      // Balance après bon = initialBalance + 47 600 DA
      const balanceAfterBon = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);
      expect(balanceAfterBon).toBe(initialBalance + totalTTC);

      // Annulation du bon d'achat
      await handleDeletePurchaseDb({
        purchaseId: purchase.id,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      // La balance doit revenir rigoureusement à initialBalance
      const balanceAfterDelete = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);
      expect(Math.abs(balanceAfterDelete - initialBalance)).toBeLessThan(0.0001);
      expect(balanceAfterDelete).toBe(initialBalance);
    });

    it('2.2 — Invariance fondamentale sous règlements partiels multiples : B_finale == B_initiale - Somme(Paiements)', async () => {
      const supplierId = '2147hie00'; // ETS PATIFOUR
      const initialBalance = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);

      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-partial-1',
          productId: '013s4ge6r', // MUNDO CAPS
          productName: 'MUNDO CAPS',
          quantity: 50,
          costPrice: 400,
          taxRate: 19,
          discount: 0,
          isDraft: false
        }
      ];

      // Total TTC = 50 * 400 * 1.19 = 23 800.00 DA
      const totalTTC = 23800.00;
      const initialPaidAmount = 8800.00; // Acompte à l'achat
      const debtCreated = totalTTC - initialPaidAmount; // 15 000.00 DA de dette ajoutée

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplierId,
        extractedData: null,
        invoiceNumber: 'BL-STRESS-PARTIAL-PAYMENTS',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: initialPaidAmount,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: useFinanceStore.getState().purchases,
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const purchase = useFinanceStore.getState().purchases.find(p => p.invoiceNumber === 'BL-STRESS-PARTIAL-PAYMENTS')!;
      expect(purchase).toBeDefined();

      const balanceAfterBon = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);
      expect(Math.abs(balanceAfterBon - (initialBalance + debtCreated))).toBeLessThan(0.001);

      // Versement intermédiaire 1 : 6 000 DA (virement)
      await handleSupplierPaymentDb({
        supplierId,
        amount: 6000.00,
        method: 'transfer',
        note: 'Versement bancaire 1',
        date: new Date().toISOString(),
        suppliers: usePeopleStore.getState().suppliers,
        setIsProcessing: vi.fn(),
        setIsPaymentModalOpen: vi.fn(),
        setPaymentData: vi.fn()
      });

      // Versement intermédiaire 2 : 4 000 DA (espèces)
      await handleSupplierPaymentDb({
        supplierId,
        amount: 4000.00,
        method: 'cash',
        note: 'Versement espèces 2',
        date: new Date().toISOString(),
        suppliers: usePeopleStore.getState().suppliers,
        setIsProcessing: vi.fn(),
        setIsPaymentModalOpen: vi.fn(),
        setPaymentData: vi.fn()
      });

      const totalPaymentsDone = 6000.00 + 4000.00; // 10 000 DA
      const balanceAfterPayments = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);
      expect(Math.abs(balanceAfterPayments - (balanceAfterBon - totalPaymentsDone))).toBeLessThan(0.001);

      // Annulation du bon d'achat
      await handleDeletePurchaseDb({
        purchaseId: purchase.id,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      // Théorème d'invariance :
      // La dette du bon (+15 000 DA) a été neutralisée (-15 000 DA).
      // Les versements effectifs (10 000 DA) restent imputés au fournisseur (argent décaissé).
      // La balance finale DOIT être rigoureusement : initialBalance - totalPaymentsDone
      const expectedFinalBalance = Math.round((initialBalance - totalPaymentsDone) * 100) / 100;
      const finalBalance = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);

      expect(Math.abs(finalBalance - expectedFinalBalance)).toBeLessThan(0.0001);
      expect(finalBalance).toBe(expectedFinalBalance);
    });

    it('2.3 — Achat 100% au comptant : aucune neutralisation indue de dette (B_finale == B_initiale)', async () => {
      const supplierId = '2147hie00';
      const initialBalance = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);

      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-cash-1',
          productId: '007hboycu',
          productName: 'FARINE MOULA 10KG',
          quantity: 10,
          costPrice: 500,
          taxRate: 19,
          discount: 0,
          isDraft: false
        }
      ];

      // Total TTC = 10 * 500 * 1.19 = 5 950.00 DA
      const totalTTC = 5950.00;
      const paidAmount = totalTTC; // Paiement comptant total

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplierId,
        extractedData: null,
        invoiceNumber: 'BL-STRESS-100-CASH',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: useFinanceStore.getState().purchases,
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const purchase = useFinanceStore.getState().purchases.find(p => p.invoiceNumber === 'BL-STRESS-100-CASH')!;
      expect(purchase).toBeDefined();

      // La dette n'a pas bougé à la création
      const balanceAfterBon = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);
      expect(balanceAfterBon).toBe(initialBalance);

      // Annulation du bon comptant
      await handleDeletePurchaseDb({
        purchaseId: purchase.id,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      // La dette ne doit pas non plus bouger à l'annulation (debtToReverse = max(0, 5950 - 5950) = 0)
      const balanceAfterDelete = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);
      expect(balanceAfterDelete).toBe(initialBalance);
    });

    it('2.4 — Multi-bons entrelacés avec annulation sélective d\'un seul bon', async () => {
      const supplierId = '2147hie00';
      const initialBalance = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);

      // Bon A : 10 000 DA impayé
      const cartA: PurchaseCartItem[] = [{
        lineId: 'line-bon-a',
        productId: '013s4ge6r',
        productName: 'MUNDO CAPS',
        quantity: 20,
        costPrice: 420.168, // HT pour donner 10 000 TTC
        taxRate: 19,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart: cartA,
        selectedSupplierId: supplierId,
        extractedData: null,
        invoiceNumber: 'BL-ENTRELACE-A',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 0,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: useFinanceStore.getState().purchases,
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const purchaseA = useFinanceStore.getState().purchases.find(p => p.invoiceNumber === 'BL-ENTRELACE-A')!;
      const totalA = purchaseA.total;

      // Bon B : 15 000 DA impayé
      const cartB: PurchaseCartItem[] = [{
        lineId: 'line-bon-b',
        productId: '01rffjxys',
        productName: 'LAHDA',
        quantity: 10,
        costPrice: 1260.504,
        taxRate: 19,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart: cartB,
        selectedSupplierId: supplierId,
        extractedData: null,
        invoiceNumber: 'BL-ENTRELACE-B',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 0,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: useFinanceStore.getState().purchases,
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const purchaseB = useFinanceStore.getState().purchases.find(p => p.invoiceNumber === 'BL-ENTRELACE-B')!;
      const totalB = purchaseB.total;

      const balanceAfterBoth = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);
      expect(Math.abs(balanceAfterBoth - (initialBalance + totalA + totalB))).toBeLessThan(0.01);

      // Suppression sélective du Bon A uniquement
      await handleDeletePurchaseDb({
        purchaseId: purchaseA.id,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      // La balance doit conserver intacte la dette du Bon B
      const balanceAfterDeleteA = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);
      const expectedBalance = Math.round((initialBalance + totalB) * 100) / 100;
      expect(Math.abs(balanceAfterDeleteA - expectedBalance)).toBeLessThan(0.01);

      // Suppression du Bon B
      await handleDeletePurchaseDb({
        purchaseId: purchaseB.id,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      // Retour rigoureux à initialBalance
      const balanceFinal = Number(usePeopleStore.getState().suppliers.find(s => s.id === supplierId)!.balance);
      expect(Math.abs(balanceFinal - initialBalance)).toBeLessThan(0.001);
    });
  });

  // =========================================================================
  // 3. ÉPREUVES DE RESTAURATION HISTORIQUE (PriceHistory & Coût d'Achat)
  // =========================================================================
  describe('3. Épreuves de Restauration Historique et Déstockage Rollback', () => {
    it('3.1 — Restauration LIFO exacte de la pile priceHistory lors d\'annulations successives', async () => {
      const prodId = 'nyhzsaxkg'; // COMPOTE POMME
      const initialCost = 36.72;

      // Configuration de départ avec un historique initial
      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p => p.id === prodId ? {
          ...p,
          costPrice: initialCost,
          priceHistory: [
            {
              date: '2026-09-01T00:00:00Z',
              price: 50.00,
              costPrice: initialCost,
              supplierName: 'INIT',
              invoiceNumber: 'BL-INIT',
              purchaseId: 'pur-init'
            } as any
          ]
        } : p)
      );

      // 1. Arrivage Bon 1 : Coût 40.00 DA
      await savePurchaseDb({
        cart: [{
          lineId: 'l1',
          productId: prodId,
          productName: 'COMPOTE POMME',
          quantity: 10,
          costPrice: 40.00,
          taxRate: 19,
          discount: 0,
          isDraft: false
        }],
        selectedSupplierId: '2147hie00',
        extractedData: null,
        invoiceNumber: 'BL-STACK-1',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 0,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: useFinanceStore.getState().purchases,
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const pur1 = useFinanceStore.getState().purchases.find(p => p.invoiceNumber === 'BL-STACK-1')!;
      let pCurrent = useCoreStore.getState().products.find(p => p.id === prodId)!;
      expect(pCurrent.costPrice).toBe(40.00);
      expect(pCurrent.priceHistory?.length).toBe(2);

      // 2. Arrivage Bon 2 : Coût 45.00 DA
      await savePurchaseDb({
        cart: [{
          lineId: 'l2',
          productId: prodId,
          productName: 'COMPOTE POMME',
          quantity: 10,
          costPrice: 45.00,
          taxRate: 19,
          discount: 0,
          isDraft: false
        }],
        selectedSupplierId: '2147hie00',
        extractedData: null,
        invoiceNumber: 'BL-STACK-2',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 0,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: useFinanceStore.getState().purchases,
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const pur2 = useFinanceStore.getState().purchases.find(p => p.invoiceNumber === 'BL-STACK-2')!;
      pCurrent = useCoreStore.getState().products.find(p => p.id === prodId)!;
      expect(pCurrent.costPrice).toBe(45.00);
      expect(pCurrent.priceHistory?.length).toBe(3);

      // 3. Rollback Bon 2 -> le costPrice DOIT revenir rigoureusement à 40.00 DA
      await handleDeletePurchaseDb({
        purchaseId: pur2.id,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      pCurrent = useCoreStore.getState().products.find(p => p.id === prodId)!;
      expect(pCurrent.costPrice).toBe(40.00);
      expect(pCurrent.priceHistory?.length).toBe(2);
      expect(pCurrent.priceHistory?.some(e => (e as any).invoiceNumber === 'BL-STACK-2')).toBe(false);

      // 4. Rollback Bon 1 -> le costPrice DOIT revenir rigoureusement à initialCost (36.72 DA)
      await handleDeletePurchaseDb({
        purchaseId: pur1.id,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      pCurrent = useCoreStore.getState().products.find(p => p.id === prodId)!;
      expect(pCurrent.costPrice).toBe(initialCost);
      expect(pCurrent.priceHistory?.length).toBe(1);
      expect(pCurrent.priceHistory?.[0].costPrice).toBe(initialCost);
    });

    it('3.2 — Déstockage et invariance stricte des composants bundles lors de l\'annulation de bon', async () => {
      // Bundle soda orange : pack de 6 sodas (00jjsxku1)
      const bundleProd = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'bundle-pack-soda-orange')!;
      const sodaComponentInitial = useCoreStore.getState().products.find(p => p.id === '00jjsxku1')?.stock || 0;

      // Achat de 5 packs de 6 = 30 sodas
      await savePurchaseDb({
        cart: [{
          lineId: 'bundle-line-1',
          productId: bundleProd.id,
          productName: bundleProd.name,
          quantity: 5,
          costPrice: Number(bundleProd.costPrice),
          taxRate: 19,
          discount: 0,
          isDraft: false
        }],
        selectedSupplierId: '2147hie00',
        extractedData: null,
        invoiceNumber: 'BL-BUNDLE-ROLLBACK',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 0,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: useFinanceStore.getState().purchases,
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const purchase = useFinanceStore.getState().purchases.find(p => p.invoiceNumber === 'BL-BUNDLE-ROLLBACK')!;
      expect(purchase).toBeDefined();

      // Vérification composant incrémenté de +30
      const sodaStockAfter = useCoreStore.getState().products.find(p => p.id === '00jjsxku1')?.stock;
      expect(sodaStockAfter).toBe(sodaComponentInitial + 30);

      // Annulation du bon d'achat
      await handleDeletePurchaseDb({
        purchaseId: purchase.id,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      // Le stock du composant doit être décrémenté exactement de 30 et revenir à son stock initial
      const sodaStockRestored = useCoreStore.getState().products.find(p => p.id === '00jjsxku1')?.stock;
      expect(sodaStockRestored).toBe(sodaComponentInitial);
    });
  });

  // =========================================================================
  // 4. SCAN GLOBAL D'INTÉGRITÉ NUMÉRIQUE & ZÉRO-NAN
  // =========================================================================
  describe('4. Scanner d\'Intégrité Numérique Anti-NaN Universel', () => {
    it('4.1 — Zéro NaN, zéro Infinity sur tous les stores après épreuves adversariales', () => {
      assertNoNaN(useCoreStore.getState().products, 'products');
      assertNoNaN(usePeopleStore.getState().suppliers, 'suppliers');
      assertNoNaN(useFinanceStore.getState().purchases, 'purchases');
      assertNoNaN(useFinanceStore.getState().supplierPayments, 'supplierPayments');
    });
  });
});
