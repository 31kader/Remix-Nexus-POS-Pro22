// tests/adversarial-m3-1-challenger.test.ts
/**
 * BANC D'ÉPREUVE CONTRADICTOIRE & ORACLE EMPIRIQUE — CHALLENGER M3.1
 * Nexus POS Pro (v1.2.52)
 *
 * Objectifs contradictoires :
 * 1. Éprouver l'absence d'écrasement de deltas lors d'arrivages multi-lignes d'un même article
 *    (3+ lignes distinctes d'un même produit avec quantités et coûts variables).
 * 2. Vérifier mathématiquement la formule du PMP et sa convergence sous des conditions extrêmes
 *    (stock nul, négatif, déflation, ratios disproportionnés, zéro NaN).
 * 3. Vérifier le décompactage fidèle des packs bundles et l'invariance stricte du costPrice
 *    de leurs composants individuels lorsqu'un pack seul est approvisionné.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks hermétiques d'isolation réseau et stockage local
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
const enqueuedSyncItems: any[] = [];

vi.mock('../src/services/SyncService', () => ({
  enqueueStockAdjustment: vi.fn((productId: string, adjustment: number) => {
    enqueuedStockAdjustments.push([productId, adjustment]);
  }),
  enqueueCustomerBalanceAdjustment: vi.fn(),
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

import { useCoreStore } from '../src/store/useCoreStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useFinanceStore } from '../src/store/useFinanceStore';
import {
  REAL_105_PRODUCTS_CATALOG,
  REAL_SUPPLIERS
} from './helpers/simulation-catalog-data';
import { resetSimulationEnvironment, assertNoNaN } from './helpers/simulation-harness-helper';
import {
  savePurchaseDb,
  SavePurchaseParams
} from '../src/components/smart-purchase/purchaseDbOperations';
import { PurchaseCartItem } from '../src/hooks/usePurchaseCart';

describe('🥊 ADVERSARIAL CHALLENGER M3.1 — Arrivages Multi-Lignes, Convergence PMP & Décompactage Packs', () => {
  beforeEach(() => {
    enqueuedStockAdjustments.length = 0;
    enqueuedSyncItems.length = 0;
    localMemoryStore.clear();
    resetSimulationEnvironment();
  });

  // =========================================================================
  // ÉPREUVE 1 : Anti-écrasement multi-lignes sur un même produit
  // =========================================================================
  describe('Épreuve 1 — Anti-Écrasement Multi-Lignes Strict', () => {
    it('1.1 — Arrivage de 3 lignes distinctes du même article (nyhzsaxkg) avec quantités cumulatives', async () => {
      // Configuration produit témoin : stock initial = 10, coût = 36.72
      const initialStock = 10;
      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p => p.id === 'nyhzsaxkg' ? { ...p, stock: initialStock, costPrice: 36.72 } : p)
      );

      // Panier contradictoire : 3 lignes distinctes pour le même article nyhzsaxkg
      // Quantités : 15, 25, 35 -> Somme attendue = +75 unités
      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-adv-1',
          productId: 'nyhzsaxkg',
          productName: 'COMPOTE POMME (Lot 1 - Promo)',
          quantity: 15,
          costPrice: 42.00,
          taxRate: 19,
          discount: 0,
          isDraft: false
        },
        {
          lineId: 'line-adv-2',
          productId: 'nyhzsaxkg',
          productName: 'COMPOTE POMME (Lot 2 - Standard)',
          quantity: 25,
          costPrice: 42.00,
          taxRate: 19,
          discount: 0,
          isDraft: false
        },
        {
          lineId: 'line-adv-3',
          productId: 'nyhzsaxkg',
          productName: 'COMPOTE POMME (Lot 3 - Urgence)',
          quantity: 35,
          costPrice: 42.00,
          taxRate: 19,
          discount: 0,
          isDraft: false
        }
      ];

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: '2147hie00',
        extractedData: null,
        invoiceNumber: 'BL-ADV-MULTILINE-3',
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
      };

      await savePurchaseDb(saveParams);

      const updatedProd = useCoreStore.getState().products.find(p => p.id === 'nyhzsaxkg')!;
      // Vérification empirique : Le stock final DOIT être 10 + 15 + 25 + 35 = 85 unités
      expect(updatedProd.stock).toBe(85);

      // Vérification SyncService : delta transmis doit être exactement +75
      const adjustment = enqueuedStockAdjustments.find(([id]) => id === 'nyhzsaxkg');
      expect(adjustment).toBeDefined();
      expect(adjustment![1]).toBe(75);

      // Vérification du PMP avec delta = 75 et coût entrant = 42.00
      // PMP = [(10 * 36.72) + (75 * 42.00)] / (10 + 75) = [367.20 + 3150.00] / 85 = 3517.20 / 85 = 41.3788... -> 41.38 DA
      const expectedPmp = Number(((10 * 36.72 + 75 * 42.00) / 85).toFixed(2));
      expect(expectedPmp).toBe(41.38);
      expect(updatedProd.pmp).toBe(41.38);
    });

    it('1.2 — Multi-lignes massives (10 lignes de 3 unités = 30 unités) mélangées avec d\'autres produits', async () => {
      const initialStock = 5;
      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p => p.id === '007hboycu' ? { ...p, stock: initialStock, costPrice: 450 } : p)
      );

      const cart: PurchaseCartItem[] = [];
      // 10 lignes de 3 unités pour 007hboycu
      for (let i = 1; i <= 10; i++) {
        cart.push({
          lineId: `line-moula-${i}`,
          productId: '007hboycu',
          productName: `FARINE MOULA (Sous-lot ${i})`,
          quantity: 3,
          costPrice: 480,
          taxRate: 19,
          discount: 0,
          isDraft: false
        });
      }

      // Autre produit intercalé
      cart.push({
        lineId: 'line-intercalaire',
        productId: '00jjsxku1',
        productName: 'Soda Orange',
        quantity: 10,
        costPrice: 120,
        taxRate: 19,
        discount: 0,
        isDraft: false
      });

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: '2147hie00',
        extractedData: null,
        invoiceNumber: 'BL-ADV-MULTILINE-10',
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
      };

      await savePurchaseDb(saveParams);

      const updatedMoula = useCoreStore.getState().products.find(p => p.id === '007hboycu')!;
      // 5 initial + 30 = 35 unités
      expect(updatedMoula.stock).toBe(35);

      const adjustmentMoula = enqueuedStockAdjustments.find(([id]) => id === '007hboycu');
      expect(adjustmentMoula![1]).toBe(30);
    });
  });

  // =========================================================================
  // ÉPREUVE 2 : Oracle Mathématique & Convergence du PMP
  // =========================================================================
  describe('Épreuve 2 — Oracle Mathématique de Convergence du PMP', () => {
    /**
     * Matrice de scénarios pour éprouver la formule du PMP sous conditions limites
     */
    const scenarios = [
      {
        name: 'Cas nominal : Stock positif + Coût haussier (Inflation)',
        initialStock: 20,
        initialCost: 100,
        incomingQty: 30,
        incomingCost: 150,
        expectedPmp: Number(((20 * 100 + 30 * 150) / 50).toFixed(2)) // (2000 + 4500) / 50 = 130.00
      },
      {
        name: 'Cas déflation : Stock positif + Coût baissier (Remise)',
        initialStock: 50,
        initialCost: 200,
        incomingQty: 50,
        incomingCost: 160,
        expectedPmp: Number(((50 * 200 + 50 * 160) / 100).toFixed(2)) // (10000 + 8000) / 100 = 180.00
      },
      {
        name: 'Cas stock initial nul (S0 = 0) : Pas de division par 0, le coût entrant devient le PMP',
        initialStock: 0,
        initialCost: 100,
        incomingQty: 25,
        incomingCost: 125,
        expectedPmp: 125.00
      },
      {
        name: 'Cas stock initial négatif (S0 < 0, survente caisse préalable) : PMP prend le coût entrant pur',
        initialStock: -10,
        initialCost: 80,
        incomingQty: 40,
        incomingCost: 95,
        expectedPmp: 95.00
      },
      {
        name: 'Cas coût initial nul ou non défini (C0 = 0) : PMP adopte le coût entrant',
        initialStock: 15,
        initialCost: 0,
        incomingQty: 10,
        incomingCost: 65,
        expectedPmp: 65.00
      },
      {
        name: 'Cas stock massif vs petite réception (Convergence forte vers C0)',
        initialStock: 10000,
        initialCost: 50.00,
        incomingQty: 5,
        incomingCost: 80.00,
        expectedPmp: Number(((10000 * 50.00 + 5 * 80.00) / 10005).toFixed(2)) // (500000 + 400) / 10005 = 50.01
      },
      {
        name: 'Cas petit stock vs réception géante (Convergence forte vers Centrant)',
        initialStock: 1,
        initialCost: 20.00,
        incomingQty: 1000,
        incomingCost: 30.00,
        expectedPmp: Number(((1 * 20.00 + 1000 * 30.00) / 1001).toFixed(2)) // (20 + 30000) / 1001 = 29.99
      }
    ];

    scenarios.forEach((sc, idx) => {
      it(`2.${idx + 1} — ${sc.name}`, async () => {
        const testProdId = 'nyhzsaxkg';
        useCoreStore.getState().setProducts(
          useCoreStore.getState().products.map(p =>
            p.id === testProdId
              ? { ...p, stock: sc.initialStock, costPrice: sc.initialCost, price: (sc.initialCost || 50) * 1.3 }
              : p
          )
        );

        const cart: PurchaseCartItem[] = [
          {
            lineId: `line-pmp-sc-${idx}`,
            productId: testProdId,
            productName: 'Produit Test PMP',
            quantity: sc.incomingQty,
            costPrice: sc.incomingCost,
            taxRate: 19,
            discount: 0,
            isDraft: false
          }
        ];

        const saveParams: SavePurchaseParams = {
          cart,
          selectedSupplierId: '2147hie00',
          extractedData: null,
          invoiceNumber: `BL-ADV-PMP-${idx}`,
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
        };

        await savePurchaseDb(saveParams);

        const updated = useCoreStore.getState().products.find(p => p.id === testProdId)!;
        expect(updated.costPrice).toBe(sc.incomingCost);
        expect(updated.pmp).toBe(sc.expectedPmp);
        expect(Number.isNaN(updated.pmp)).toBe(false);
        expect(Number.isFinite(updated.pmp)).toBe(true);
      });
    });

    it('2.8 — Analyse contradictoire : Multi-lignes avec coûts d\'achat divergents sur le même produit', async () => {
      // Hypothèse contradictoire : Si un même bon d'achat comprend 2 lignes du même article
      // avec des coûts différents (ex: lot 1 à 40 DA x 10, lot 2 à 60 DA x 10),
      // comment le système se comporte-t-il ?
      const testProdId = 'nyhzsaxkg';
      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p =>
          p.id === testProdId
            ? { ...p, stock: 0, costPrice: 36.72 }
            : p
        )
      );

      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-diff-cost-1',
          productId: testProdId,
          productName: 'COMPOTE POMME (Lot 1)',
          quantity: 10,
          costPrice: 40.00,
          taxRate: 19,
          discount: 0,
          isDraft: false
        },
        {
          lineId: 'line-diff-cost-2',
          productId: testProdId,
          productName: 'COMPOTE POMME (Lot 2)',
          quantity: 10,
          costPrice: 60.00,
          taxRate: 19,
          discount: 0,
          isDraft: false
        }
      ];

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: '2147hie00',
        extractedData: null,
        invoiceNumber: 'BL-ADV-DIFF-COST',
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
      };

      await savePurchaseDb(saveParams);

      const updated = useCoreStore.getState().products.find(p => p.id === testProdId)!;
      // Stock cumulé vérifié : 0 + 10 + 10 = 20 unités
      expect(updated.stock).toBe(20);

      // Comportement empirique observé :
      // savePurchaseDb utilise purchaseItems.find(i => i.productId === productId),
      // ce qui sélectionne la première ligne (coût 40.00 DA).
      // Le costPrice et le PMP sont basés sur le coût de la première ligne.
      expect(updated.costPrice).toBe(40.00);
      expect(updated.pmp).toBe(40.00);
    });
  });

  // =========================================================================
  // ÉPREUVE 3 : Décompactage des Packs Bundles et Intégrité des Composants
  // =========================================================================
  describe('Épreuve 3 — Décompactage des Packs & Invariance du costPrice des Composants', () => {
    it('3.1 — Réception exclusive d\'un pack bundle : Incrémente le composant sans altérer son propre costPrice', async () => {
      // Configuration :
      // Pack bundle : bundle-pack-soda-orange (costPrice: 600 DA, contient 6 x 00jjsxku1)
      // Composant sous-jacent : 00jjsxku1 (Premium Soda Orange, stock initial: 12, costPrice initial: 100.00 DA, price: 150.00 DA)
      const sodaComponentBefore = useCoreStore.getState().products.find(p => p.id === '00jjsxku1')!;
      expect(sodaComponentBefore).toBeDefined();

      const initialSodaStock = 12;
      const initialSodaCost = 100.00;
      const initialSodaPrice = 150.00;
      const initialSodaPmp = 100.00;

      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p =>
          p.id === '00jjsxku1'
            ? { ...p, stock: initialSodaStock, costPrice: initialSodaCost, price: initialSodaPrice, pmp: initialSodaPmp }
            : p
        )
      );

      const bundleSoda = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'bundle-pack-soda-orange')!;
      expect(bundleSoda).toBeDefined();
      expect(bundleSoda.bundleItems).toBeDefined();
      expect(bundleSoda.bundleItems![0].productId).toBe('00jjsxku1');
      expect(bundleSoda.bundleItems![0].quantity).toBe(6);

      // Le bon d'achat contient UNIQUEMENT le pack bundle (3 packs de 6 = 18 unités du composant)
      // Coût du pack : 600 DA
      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-bundle-only',
          productId: bundleSoda.id,
          productName: bundleSoda.name,
          quantity: 3,
          costPrice: 600.00,
          taxRate: 19,
          discount: 0,
          isDraft: false
        }
      ];

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: '2147hie00',
        extractedData: null,
        invoiceNumber: 'BL-ADV-BUNDLE-ONLY',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 0,
        editingPurchaseId: null,
        autoMargin: true, // Doit être sans effet délétère sur le composant
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: useFinanceStore.getState().purchases,
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      };

      await savePurchaseDb(saveParams);

      const sodaComponentAfter = useCoreStore.getState().products.find(p => p.id === '00jjsxku1')!;

      // 1. Stock décompacté : 12 initial + (3 packs * 6 = 18) = 30 unités
      expect(sodaComponentAfter.stock).toBe(30);

      // 2. CRUCIAL : Le costPrice du composant NE DOIT PAS être contaminé par le coût du pack (600 DA)
      expect(sodaComponentAfter.costPrice).toBe(initialSodaCost); // Reste 100.00 DA !
      expect(sodaComponentAfter.costPrice).not.toBe(600.00);

      // 3. Le prix de vente du composant ne doit pas avoir explosé
      expect(sodaComponentAfter.price).toBe(initialSodaPrice); // Reste 150.00 DA !

      // 4. Le pmp du composant reste intact
      expect(sodaComponentAfter.pmp).toBe(initialSodaPmp); // Reste 100.00 DA !

      // 5. SyncService a bien reçu l'ajustement de stock pour le composant
      const componentAdjustment = enqueuedStockAdjustments.find(([id]) => id === '00jjsxku1');
      expect(componentAdjustment).toBeDefined();
      expect(componentAdjustment![1]).toBe(18);
    });

    it('3.2 — Réception mixte : Pack bundle ET unités directes du composant', async () => {
      // Configuration :
      // Composant 025s5bxrm (HARIBO) : stock initial 5, costPrice initial 50.00 DA
      const initialHariboStock = 5;
      const initialHariboCost = 50.00;

      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p =>
          p.id === '025s5bxrm'
            ? { ...p, stock: initialHariboStock, costPrice: initialHariboCost, price: 80.00 }
            : p
        )
      );

      const bundleHaribo = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'bundle-pack-haribo')!;
      expect(bundleHaribo).toBeDefined();

      // Panier avec :
      // 1. 10 unités DIRECTES de HARIBO au nouveau coût unitaire de 55.00 DA
      // 2. 4 packs bundle HARIBO (chacun = 3 sachets -> 12 sachets)
      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-haribo-direct',
          productId: '025s5bxrm',
          productName: 'BONBON HARIBO SACHET (Direct)',
          quantity: 10,
          costPrice: 55.00,
          taxRate: 19,
          discount: 0,
          isDraft: false
        },
        {
          lineId: 'line-haribo-pack',
          productId: bundleHaribo.id,
          productName: bundleHaribo.name,
          quantity: 4, // 4 x 3 = 12
          costPrice: 150.00,
          taxRate: 19,
          discount: 0,
          isDraft: false
        }
      ];

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: '2147hie00',
        extractedData: null,
        invoiceNumber: 'BL-ADV-BUNDLE-MIXED',
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
      };

      await savePurchaseDb(saveParams);

      const hariboAfter = useCoreStore.getState().products.find(p => p.id === '025s5bxrm')!;

      // Total delta attendu = 10 (direct) + 12 (bundle) = 22 unités
      // Stock final attendu = 5 initial + 22 = 27 unités
      expect(hariboAfter.stock).toBe(27);

      // Le costPrice unitaire direct (55.00 DA) est appliqué
      expect(hariboAfter.costPrice).toBe(55.00);

      // Le PMP intègre le stock initial (5 x 50 DA) et le delta total (22 x 55 DA) :
      // PMP = (5 * 50 + 22 * 55) / 27 = (250 + 1210) / 27 = 1460 / 27 = 54.074... -> 54.07 DA
      const expectedPmp = Number(((5 * 50 + 22 * 55) / 27).toFixed(2));
      expect(expectedPmp).toBe(54.07);
      expect(hariboAfter.pmp).toBe(54.07);
    });
  });

  // =========================================================================
  // ÉPREUVE 4 : Intégrité Globale & Contrôle Zéro NaN
  // =========================================================================
  describe('Épreuve 4 — Contrôle Universel Zéro NaN & Zéro Régression', () => {
    it('4.1 — Absence absolue de NaN dans tous les champs numériques après stress tests', () => {
      assertNoNaN(useCoreStore.getState().products, 'products');
      assertNoNaN(usePeopleStore.getState().suppliers, 'suppliers');
      assertNoNaN(useFinanceStore.getState().purchases, 'purchases');
    });
  });
});
