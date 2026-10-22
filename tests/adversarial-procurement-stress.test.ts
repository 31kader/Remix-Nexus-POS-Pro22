import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCoreStore } from '../src/store/useCoreStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useFinanceStore } from '../src/store/useFinanceStore';
import {
  savePurchaseDb,
  handleSupplierPaymentDb,
  handleDeletePurchaseDb,
  SavePurchaseParams
} from '../src/components/smart-purchase/purchaseDbOperations';
import { Product, Supplier, Purchase } from '../src/types';
import { PurchaseCartItem } from '../src/hooks/usePurchaseCart';
import { localDb } from '../src/services/LocalDatabase';

// Mock in-memory pour idb-keyval
vi.mock('idb-keyval', () => {
  const store = new Map<string, any>();
  return {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: any) => { store.set(key, value); }),
    del: vi.fn(async (key: string) => { store.delete(key); })
  };
});

// Mock SyncService
vi.mock('../src/services/SyncService', () => ({
  enqueueStockAdjustment: vi.fn(),
  enqueueSync: vi.fn(),
  enqueueSyncBatch: vi.fn(),
  enqueueCustomerBalanceAdjustment: vi.fn(),
  sanitizePayloadForSupabase: vi.fn((_table: string, payload: any) => payload)
}));

// Mock LocalDatabase (localDb)
vi.mock('../src/services/LocalDatabase', () => {
  const localMemory = new Map<string, any>();
  return {
    localDb: {
      insert: vi.fn(async (tablePath: string, value: any) => {
        localMemory.set(tablePath, JSON.parse(JSON.stringify(value)));
      }),
      update: vi.fn(async (tablePath: string, value: any) => {
        const existing = localMemory.get(tablePath) || {};
        localMemory.set(tablePath, { ...existing, ...JSON.parse(JSON.stringify(value)) });
      }),
      delete: vi.fn(async (tablePath: string) => {
        localMemory.delete(tablePath);
      }),
      get: vi.fn(async (tablePath: string) => {
        const val = localMemory.get(tablePath);
        return {
          exists: () => val !== undefined,
          val: () => val ? JSON.parse(JSON.stringify(val)) : null
        };
      }),
      push: vi.fn(() => ({ key: 'id-' + Math.random().toString(36).substring(2, 7) }))
    }
  };
});

// Mock Supabase
vi.mock('../src/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      })),
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
    }))
  }
}));

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

describe('🛡️ Stress Test Adversarial & Validation des Invariants d\'Approvisionnement', () => {
  let supplier: Supplier;
  let singleProduct: Product;
  let componentA: Product;
  let componentB: Product;
  let multiBundleProduct: Product;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    supplier = {
      id: 'sup-adv-01',
      name: 'GROSSISTE CENTRAL SARL',
      contactName: 'Ahmed',
      phone: '0555000000',
      email: 'ahmed@grossiste.dz',
      address: 'Alger',
      balance: 10000,
      updatedAt: new Date().toISOString()
    };

    singleProduct = {
      id: 'prod-stress-1',
      name: 'Produit Test Simple',
      barcode: '613999999901',
      sku: 'TEST-01',
      costPrice: 200,
      price: 250, // Marge commerciale initiale = (250 - 200) / 200 = 25%
      taxRate: 19,
      stock: 10,
      minStock: 2,
      categoryId: 'cat-test',
      supplier: 'GROSSISTE CENTRAL SARL',
      unit: 'piece',
      status: 'active',
      priceHistory: [],
      updatedAt: new Date().toISOString()
    };

    componentA = {
      id: 'comp-pack-a',
      name: 'Composant Pack Alpha',
      barcode: '613999999902',
      sku: 'COMP-A',
      costPrice: 50,
      price: 80,
      taxRate: 19,
      stock: 100,
      minStock: 10,
      categoryId: 'cat-test',
      supplier: 'GROSSISTE CENTRAL SARL',
      unit: 'piece',
      status: 'active',
      priceHistory: [],
      updatedAt: new Date().toISOString()
    };

    componentB = {
      id: 'comp-pack-b',
      name: 'Composant Pack Beta',
      barcode: '613999999903',
      sku: 'COMP-B',
      costPrice: 30,
      price: 50,
      taxRate: 19,
      stock: 50,
      minStock: 10,
      categoryId: 'cat-test',
      supplier: 'GROSSISTE CENTRAL SARL',
      unit: 'piece',
      status: 'active',
      priceHistory: [],
      updatedAt: new Date().toISOString()
    };

    multiBundleProduct = {
      id: 'bundle-pack-ab',
      name: 'Pack Duo Alpha + Beta',
      barcode: '613999999904',
      sku: 'PACK-AB',
      costPrice: 160, // 2*50 + 2*30
      price: 240,
      taxRate: 19,
      stock: 0,
      minStock: 5,
      categoryId: 'cat-test',
      supplier: 'GROSSISTE CENTRAL SARL',
      unit: 'pack',
      status: 'active',
      isBundle: true,
      bundleItems: [
        { productId: 'comp-pack-a', quantity: 2 },
        { productId: 'comp-pack-b', quantity: 2 }
      ],
      priceHistory: [],
      updatedAt: new Date().toISOString()
    };

    useCoreStore.setState({
      products: [singleProduct, componentA, componentB, multiBundleProduct]
    });
    usePeopleStore.setState({
      suppliers: [supplier]
    });
    useFinanceStore.setState({
      purchases: [],
      supplierPayments: []
    });
  });

  // ---------------------------------------------------------------------------
  // 1. INVARIANT AUTO-MARGE, DIVISION PAR ZÉRO & HISTORIQUE DE PRIX
  // ---------------------------------------------------------------------------
  describe('Invariant 1 : Marges Commerciales & Historique', () => {
    it('1.1 Préserve rigoureusement la marge (price - cost)/cost lors d\'une hausse de coût', async () => {
      const cart: PurchaseCartItem[] = [{
        lineId: 'l1',
        productId: singleProduct.id,
        productName: singleProduct.name,
        quantity: 5,
        costPrice: 300, // Hausse de 200 à 300 DA (+50%)
        taxRate: 0,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplier.id,
        extractedData: null,
        invoiceNumber: 'INV-M1',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 1500,
        editingPurchaseId: null,
        autoMargin: true,
        suppliers: [supplier],
        patterns: [],
        purchases: [],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const updated = useCoreStore.getState().products.find(p => p.id === singleProduct.id)!;
      expect(updated.costPrice).toBe(300);
      // Prix attendu : 300 * (1 + 0.25) = 375 DA
      expect(updated.price).toBe(375);
      const computedMargin = (updated.price - updated.costPrice) / updated.costPrice;
      expect(computedMargin).toBeCloseTo(0.25, 4);
    });

    it('1.2 Ne réduit pas le prix de vente en cas de baisse du coût d\'achat (préserve le chiffre d\'affaires)', async () => {
      const cart: PurchaseCartItem[] = [{
        lineId: 'l2',
        productId: singleProduct.id,
        productName: singleProduct.name,
        quantity: 10,
        costPrice: 150, // Baisse de 200 à 150 DA
        taxRate: 0,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplier.id,
        extractedData: null,
        invoiceNumber: 'INV-M2',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 1500,
        editingPurchaseId: null,
        autoMargin: true,
        suppliers: [supplier],
        patterns: [],
        purchases: [],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const updated = useCoreStore.getState().products.find(p => p.id === singleProduct.id)!;
      expect(updated.costPrice).toBe(150);
      // Le prix de vente ne doit pas être déprécié automatiquement
      expect(updated.price).toBe(250);
    });

    it('1.3 Gère de manière sûre un coût d\'achat initial égal à 0 sans division par zéro', async () => {
      const freebieProduct: Product = {
        ...singleProduct,
        id: 'prod-zero-cost',
        costPrice: 0,
        price: 50
      };
      useCoreStore.setState({ products: [freebieProduct] });

      const cart: PurchaseCartItem[] = [{
        lineId: 'l3',
        productId: freebieProduct.id,
        productName: freebieProduct.name,
        quantity: 5,
        costPrice: 30,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplier.id,
        extractedData: null,
        invoiceNumber: 'INV-ZERO',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 150,
        editingPurchaseId: null,
        autoMargin: true,
        suppliers: [supplier],
        patterns: [],
        purchases: [],
        products: [freebieProduct],
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const updated = useCoreStore.getState().products.find(p => p.id === freebieProduct.id)!;
      expect(updated.costPrice).toBe(30);
      expect(Number.isFinite(updated.price)).toBe(true);
      expect(isNaN(updated.price)).toBe(false);
    });

    it('1.4 Maintient strictement le plafond de 30 entrées dans priceHistory', async () => {
      // Préparer un historique saturé à 40 entrées
      const oldEntries = Array.from({ length: 40 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        price: 250,
        costPrice: 200,
        supplierName: 'Grossiste',
        invoiceNumber: `INV-OLD-${i}`,
        purchaseId: `pur-old-${i}`
      }));

      const saturatedProduct: Product = {
        ...singleProduct,
        priceHistory: oldEntries as any
      };
      useCoreStore.setState({ products: [saturatedProduct] });

      const cart: PurchaseCartItem[] = [{
        lineId: 'l4',
        productId: saturatedProduct.id,
        productName: saturatedProduct.name,
        quantity: 2,
        costPrice: 210,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplier.id,
        extractedData: null,
        invoiceNumber: 'INV-CAP-30',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 420,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: [supplier],
        patterns: [],
        purchases: [],
        products: [saturatedProduct],
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const updated = useCoreStore.getState().products.find(p => p.id === saturatedProduct.id)!;
      expect(updated.priceHistory).toBeDefined();
      expect(updated.priceHistory!.length).toBe(30);
      expect((updated.priceHistory![0] as any).invoiceNumber).toBe('INV-CAP-30');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. INVARIANT D'ÉCLATEMENT DES BUNDLES MULTI-COMPOSANTS
  // ---------------------------------------------------------------------------
  describe('Invariant 2 : Éclatement des Packs/Bundles Multi-Composants', () => {
    it('2.1 Éclate fidèlement un pack composé de multiples articles différents', async () => {
      // 10 packs duo -> 20 de compA et 20 de compB
      const cart: PurchaseCartItem[] = [{
        lineId: 'bundle-line',
        productId: multiBundleProduct.id,
        productName: multiBundleProduct.name,
        quantity: 10,
        costPrice: 160,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplier.id,
        extractedData: null,
        invoiceNumber: 'INV-BUNDLE-MULTI',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 1600,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: [supplier],
        patterns: [],
        purchases: [],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const products = useCoreStore.getState().products;
      const compA = products.find(p => p.id === componentA.id)!;
      const compB = products.find(p => p.id === componentB.id)!;

      // CompA : 100 initial + 10 * 2 = 120
      expect(compA.stock).toBe(120);
      // CompB : 50 initial + 10 * 2 = 70
      expect(compB.stock).toBe(70);

      // Le coût de revient individuel des composants NE DOIT PAS être écrasé par le coût du pack (160 DA)
      expect(compA.costPrice).toBe(50);
      expect(compB.costPrice).toBe(30);
    });

    it('2.2 Rollback intégral et précis lors de l\'annulation d\'un bon multi-composants', async () => {
      const purchaseId = 'pur-bundle-multi-del';
      const bundlePurchase: Purchase = {
        id: purchaseId,
        supplierId: supplier.id,
        supplierName: supplier.name,
        invoiceNumber: 'INV-BUNDLE-DEL',
        date: '2026-10-09T10:00:00.000Z',
        total: 1600,
        paidAmount: 1600,
        status: 'completed',
        paymentStatus: 'paid',
        items: [{
          productId: multiBundleProduct.id,
          name: multiBundleProduct.name,
          quantity: 10,
          costPrice: 160
        }]
      };

      // Supposons que les composants aient déjà les stocks après réception (120 et 70)
      useCoreStore.setState({
        products: [
          singleProduct,
          { ...componentA, stock: 120 },
          { ...componentB, stock: 70 },
          multiBundleProduct
        ]
      });
      useFinanceStore.setState({ purchases: [bundlePurchase] });

      await handleDeletePurchaseDb({
        purchaseId,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      const products = useCoreStore.getState().products;
      expect(products.find(p => p.id === componentA.id)!.stock).toBe(100);
      expect(products.find(p => p.id === componentB.id)!.stock).toBe(50);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. INVARIANT DE LA BALANCE FOURNISSEUR SUR CYCLE DE VIE COMPLET
  // ---------------------------------------------------------------------------
  describe('Invariant 3 : Balance Fournisseur sur Cycle Complet', () => {
    it('3.1 Enchaînement séquentiel : Création -> Versement -> Modification -> Annulation', async () => {
      // Étape A : Balance initiale = 10 000 DA
      expect(supplier.balance).toBe(10000);

      // Étape B : Bon d'achat 1 : Total = 5 000 DA, Payé = 1 000 DA -> Dette = 4 000 DA
      const purchaseId = 'pur-lifecycle-01';
      const cart: PurchaseCartItem[] = [{
        lineId: 'l-seq',
        productId: singleProduct.id,
        productName: singleProduct.name,
        quantity: 25,
        costPrice: 200, // Total = 5 000 DA
        taxRate: 0,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplier.id,
        extractedData: null,
        invoiceNumber: 'INV-SEQ-01',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 1000,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: [supplier],
        patterns: [],
        purchases: [],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      // Dette attendue : 10 000 + 4 000 = 14 000 DA
      const supAfterPur = usePeopleStore.getState().suppliers.find(s => s.id === supplier.id)!;
      // Note: savePurchaseDb met à jour localDb pour supplier
      const localUpdates = vi.mocked(localDb.update).mock.calls;
      const supUpdate1 = localUpdates.find(([path]) => path === `suppliers/${supplier.id}`);
      expect(supUpdate1![1].balance).toBe(14000);

      // Mettons à jour le state Zustand pour refléter ce solde
      usePeopleStore.setState({ suppliers: [{ ...supplier, balance: 14000 }] });

      // Étape C : Versement de 2 000 DA
      await handleSupplierPaymentDb({
        supplierId: supplier.id,
        amount: 2000,
        method: 'cash',
        note: 'Versement caisse',
        date: '2026-10-09',
        suppliers: usePeopleStore.getState().suppliers,
        setIsProcessing: vi.fn(),
        setIsPaymentModalOpen: vi.fn(),
        setPaymentData: vi.fn()
      });

      // Dette attendue : 14 000 - 2 000 = 12 000 DA
      const supUpdate2 = vi.mocked(localDb.update).mock.calls
        .filter(([path]) => path === `suppliers/${supplier.id}`).pop();
      expect(supUpdate2![1].balance).toBe(12000);
      usePeopleStore.setState({ suppliers: [{ ...supplier, balance: 12000 }] });

      // Étape D : Modification du bon (Quantité passe à 30 -> Total = 6 000 DA, Payé reste 1 000 DA)
      // Nouvelle dette du bon = 5 000 DA, Ancienne dette = 4 000 DA -> Delta = +1 000 DA
      const recordedPurchase = useFinanceStore.getState().purchases[0];
      const modCart: PurchaseCartItem[] = [{
        lineId: 'l-seq',
        productId: singleProduct.id,
        productName: singleProduct.name,
        quantity: 30, // +5
        costPrice: 200, // Total = 6 000 DA
        taxRate: 0,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart: modCart,
        selectedSupplierId: supplier.id,
        extractedData: null,
        invoiceNumber: 'INV-SEQ-01',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 1000,
        editingPurchaseId: recordedPurchase.id,
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: [recordedPurchase],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      // Dette attendue : 12 000 + 1 000 = 13 000 DA
      const supUpdate3 = vi.mocked(localDb.update).mock.calls
        .filter(([path]) => path === `suppliers/${supplier.id}`).pop();
      expect(supUpdate3![1].balance).toBe(13000);
      usePeopleStore.setState({ suppliers: [{ ...supplier, balance: 13000 }] });

      // Étape E : Annulation complète du bon
      // Dette résiduelle du bon : 6 000 - 1 000 = 5 000 DA
      // Solde final attendu : 13 000 - 5 000 = 8 000 DA (exactement 10 000 initiaux - 2 000 réglés !)
      const currentPur = useFinanceStore.getState().purchases[0];
      await handleDeletePurchaseDb({
        purchaseId: currentPur.id,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      const supUpdate4 = vi.mocked(localDb.update).mock.calls
        .filter(([path]) => path === `suppliers/${supplier.id}`).pop();
      expect(supUpdate4![1].balance).toBe(8000);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. INVARIANTS DES TRANSITIONS DE STATUTS (DRAFT / ORDERED / COMPLETED)
  // ---------------------------------------------------------------------------
  describe('Invariant 4 : Transitions de Statuts', () => {
    it('4.1 Édition d\'un bon de draft à completed applique les stocks et dettes sans décalage', async () => {
      const draftPurchase: Purchase = {
        id: 'pur-draft-transition',
        supplierId: supplier.id,
        supplierName: supplier.name,
        invoiceNumber: 'INV-DRAFT',
        date: '2026-10-09',
        total: 2000,
        paidAmount: 500,
        status: 'draft', // Non réceptionné
        paymentStatus: 'partial',
        items: [{
          productId: singleProduct.id,
          name: singleProduct.name,
          quantity: 10,
          costPrice: 200
        }]
      };

      useFinanceStore.setState({ purchases: [draftPurchase] });
      useCoreStore.setState({ products: [singleProduct] }); // stock initial = 10
      usePeopleStore.setState({ suppliers: [supplier] });     // balance = 10000

      const cart: PurchaseCartItem[] = [{
        lineId: 'l-tr',
        productId: singleProduct.id,
        productName: singleProduct.name,
        quantity: 10,
        costPrice: 200,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplier.id,
        extractedData: null,
        invoiceNumber: 'INV-DRAFT',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed', // TRANSITION VERS COMPLETED
        paidAmount: 500,
        editingPurchaseId: draftPurchase.id,
        autoMargin: false,
        suppliers: [supplier],
        patterns: [],
        purchases: [draftPurchase],
        products: [singleProduct],
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      // Stock doit passer de 10 à 20
      const prod = useCoreStore.getState().products.find(p => p.id === singleProduct.id)!;
      expect(prod.stock).toBe(20);

      // Dette doit augmenter de (2000 - 500) = 1500 -> 10000 + 1500 = 11500
      const updateCalls = vi.mocked(localDb.update).mock.calls;
      const supUpdate = updateCalls.find(([path]) => path === `suppliers/${supplier.id}`);
      expect(supUpdate![1].balance).toBe(11500);
    });

    it('4.2 Édition d\'un bon de completed à draft déstocke et annule la dette correspondante', async () => {
      const completedPurchase: Purchase = {
        id: 'pur-completed-to-draft',
        supplierId: supplier.id,
        supplierName: supplier.name,
        invoiceNumber: 'INV-REV',
        date: '2026-10-09',
        total: 2000,
        paidAmount: 500,
        status: 'completed',
        paymentStatus: 'partial',
        items: [{
          productId: singleProduct.id,
          name: singleProduct.name,
          quantity: 10,
          costPrice: 200
        }]
      };

      // État avec stock déjà réceptionné (20) et solde (11 500)
      useFinanceStore.setState({ purchases: [completedPurchase] });
      useCoreStore.setState({ products: [{ ...singleProduct, stock: 20 }] });
      usePeopleStore.setState({ suppliers: [{ ...supplier, balance: 11500 }] });

      const cart: PurchaseCartItem[] = [{
        lineId: 'l-tr-rev',
        productId: singleProduct.id,
        productName: singleProduct.name,
        quantity: 10,
        costPrice: 200,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }];

      await savePurchaseDb({
        cart,
        selectedSupplierId: supplier.id,
        extractedData: null,
        invoiceNumber: 'INV-REV',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'draft', // RÉTROGRADATION VERS DRAFT
        paidAmount: 500,
        editingPurchaseId: completedPurchase.id,
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: [completedPurchase],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      // Stock doit revenir de 20 à 10
      const prod = useCoreStore.getState().products.find(p => p.id === singleProduct.id)!;
      expect(prod.stock).toBe(10);

      // Dette doit diminuer de (2000 - 500) = 1500 -> 11500 - 1500 = 10000
      const updateCalls = vi.mocked(localDb.update).mock.calls;
      const supUpdate = updateCalls.find(([path]) => path === `suppliers/${supplier.id}`);
      expect(supUpdate![1].balance).toBe(10000);
    });
  });
});
