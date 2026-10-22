import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useCoreStore } from '../src/store/useCoreStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useFinanceStore } from '../src/store/useFinanceStore';
import {
  savePurchaseDb,
  handleSupplierPaymentDb,
  handleDeletePurchaseDb,
  SavePurchaseParams
} from '../src/components/smart-purchase/purchaseDbOperations';
import { useSupplierPayments } from '../src/hooks/suppliers/useSupplierPayments';
import { Product, Supplier, Purchase, SupplierPayment } from '../src/types';
import { PurchaseCartItem } from '../src/hooks/usePurchaseCart';

// 1. Mock in-memory pour idb-keyval
vi.mock('idb-keyval', () => {
  const store = new Map<string, any>();
  return {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: any) => { store.set(key, value); }),
    del: vi.fn(async (key: string) => { store.delete(key); })
  };
});

// 2. Mock SyncService
vi.mock('../src/services/SyncService', () => ({
  enqueueStockAdjustment: vi.fn(),
  enqueueSync: vi.fn(),
  enqueueSyncBatch: vi.fn(),
  enqueueCustomerBalanceAdjustment: vi.fn(),
  sanitizePayloadForSupabase: vi.fn((_table: string, payload: any) => payload)
}));

// 3. Mock LocalDatabase (localDb)
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
          val: () => (val ? JSON.parse(JSON.stringify(val)) : null)
        };
      }),
      push: vi.fn(() => ({ key: 'id-' + Math.random().toString(36).substring(2, 7) }))
    }
  };
});

// 4. Mock Supabase
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

// 5. Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

import { localDb } from '../src/services/LocalDatabase';

describe('🔥 Adversarial Stress Tests: Procurement Critical Operations & Rollbacks (Challenger #2)', () => {
  let supplier: Supplier;
  let prodA: Product;
  let prodB: Product;
  let packBundle: Product;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    supplier = {
      id: 'sup-adv-01',
      name: 'GROUPE AGRO ALGERIE',
      contactName: 'Nabil Meziani',
      phone: '0661223344',
      email: 'agro@algerie.dz',
      address: 'Zone Industrielle Oued Smar, Alger',
      balance: 50000, // Dette initiale 50 000 DA
      updatedAt: new Date().toISOString()
    };

    prodA = {
      id: 'prod-couscous-1kg',
      name: 'Couscous Fin 1kg',
      barcode: '6135550001112',
      sku: 'COUSCOUS-1KG',
      costPrice: 120,
      price: 150,
      taxRate: 19,
      stock: 50,
      minStock: 10,
      categoryId: 'cat-epicerie',
      supplier: 'GROUPE AGRO ALGERIE',
      unit: 'paquet',
      status: 'active',
      priceHistory: [
        {
          timestamp: '2026-07-01T08:00:00.000Z',
          date: '2026-07-01T08:00:00.000Z',
          price: 150,
          costPrice: 120,
          supplierName: 'GROUPE AGRO ALGERIE',
          invoiceNumber: 'FAC-BASE-00',
          purchaseId: 'pur-base-00'
        } as any
      ],
      updatedAt: new Date().toISOString()
    };

    prodB = {
      id: 'prod-sauce-tomate',
      name: 'Sauce Tomate Boîte 400g',
      barcode: '6137778889990',
      sku: 'TOMATE-400G',
      costPrice: 80,
      price: 110,
      taxRate: 19,
      stock: 40,
      minStock: 15,
      categoryId: 'cat-epicerie',
      supplier: 'GROUPE AGRO ALGERIE',
      unit: 'boite',
      status: 'active',
      priceHistory: [],
      updatedAt: new Date().toISOString()
    };

    packBundle = {
      id: 'pack-duo-couscous-sauce',
      name: 'Pack Familial Couscous + 2 Sauces',
      barcode: '6138887771110',
      sku: 'PACK-FAMILIAL',
      costPrice: 280, // 120 + 2*80 = 280 DA
      price: 360,
      taxRate: 19,
      stock: 0,
      minStock: 5,
      categoryId: 'cat-packs',
      supplier: 'GROUPE AGRO ALGERIE',
      unit: 'pack',
      status: 'active',
      isBundle: true,
      bundleItems: [
        { productId: 'prod-couscous-1kg', quantity: 1 },
        { productId: 'prod-sauce-tomate', quantity: 2 }
      ],
      updatedAt: new Date().toISOString()
    };

    useCoreStore.setState({
      products: [prodA, prodB, packBundle]
    });
    usePeopleStore.setState({
      suppliers: [supplier]
    });
    useFinanceStore.setState({
      purchases: [],
      supplierPayments: []
    });
  });

  // =========================================================================
  // SCÉNARIO ADVERSARIAL 1 : MODIFICATION DIFFÉRENTIELLE AVEC RETRAIT COMPLET D'UN ARTICLE
  // =========================================================================
  it('ADV-1 : Modification différentielle avec retrait d\'un article du panier : rollback net de l\'article retiré', async () => {
    const purchaseId = 'pur-adv-diff-delete-item';

    // Achat initial comportant :
    // - 20 paquets de Couscous (stock passe de 50 à 70)
    // - 15 boîtes de Sauce Tomate (stock passe de 40 à 55)
    // Total : 20 * 120 + 15 * 80 = 2400 + 1200 = 3600 DA. Payé : 1000 DA. Dette = 2600 DA.
    const initialPurchase: Purchase = {
      id: purchaseId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNumber: 'FAC-INIT-MULTI',
      date: '2026-10-01T10:00:00.000Z',
      total: 3600,
      paidAmount: 1000,
      status: 'completed',
      paymentStatus: 'partial',
      items: [
        { productId: 'prod-couscous-1kg', name: 'Couscous Fin 1kg', quantity: 20, costPrice: 120 },
        { productId: 'prod-sauce-tomate', name: 'Sauce Tomate Boîte 400g', quantity: 15, costPrice: 80 }
      ]
    };

    useCoreStore.setState({
      products: [
        { ...prodA, stock: 70 },
        { ...prodB, stock: 55 },
        packBundle
      ]
    });
    usePeopleStore.setState({
      suppliers: [{ ...supplier, balance: 52600 }] // 50 000 + 2600
    });
    useFinanceStore.setState({
      purchases: [initialPurchase]
    });

    // Modification : l'utilisateur retire complètement la sauce tomate et augmente le couscous à 25
    // Nouveau panier : SEULEMENT Couscous 25 unités.
    // Nouveau total : 25 * 120 = 3000 DA. Payé = 2000 DA. Nouvelle dette = 1000 DA.
    // Delta dette attendu : 1000 - 2600 = -1600 DA.
    // Delta stock Couscous attendu : 25 - 20 = +5 (70 + 5 = 75).
    // Delta stock Sauce Tomate attendu : 0 - 15 = -15 (55 - 15 = 40).
    const modifiedCart: PurchaseCartItem[] = [
      {
        lineId: 'line-couscous-mod',
        productId: 'prod-couscous-1kg',
        productName: 'Couscous Fin 1kg',
        quantity: 25,
        costPrice: 120,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }
    ];

    const params: SavePurchaseParams = {
      cart: modifiedCart,
      selectedSupplierId: supplier.id,
      extractedData: null,
      invoiceNumber: 'FAC-INIT-MULTI',
      receptionDate: '2026-10-09',
      globalDiscount: 0,
      globalTax: 0,
      purchaseStatus: 'completed',
      paidAmount: 2000,
      editingPurchaseId: purchaseId,
      autoMargin: false,
      suppliers: usePeopleStore.getState().suppliers,
      patterns: [],
      purchases: [initialPurchase],
      products: useCoreStore.getState().products,
      setIsProcessing: vi.fn(),
      setLastPurchaseItems: vi.fn(),
      setStep: vi.fn()
    };

    await savePurchaseDb(params);

    const prods = useCoreStore.getState().products;
    const finalCouscous = prods.find(p => p.id === 'prod-couscous-1kg')!;
    const finalSauce = prods.find(p => p.id === 'prod-sauce-tomate')!;

    // 1. Vérification du Couscous : 70 + (25 - 20) = 75
    expect(finalCouscous.stock).toBe(75);

    // 2. Vérification de la Sauce Tomate : déduite de 15 -> retour strict à 40
    expect(finalSauce.stock).toBe(40);

    // 3. Vérification de la dette enregistrée dans LocalDatabase : 52600 - 1600 = 51000 DA
    const updateCalls = vi.mocked(localDb.update).mock.calls;
    const supplierUpdate = updateCalls.find(([path]) => path === `suppliers/${supplier.id}`);
    expect(supplierUpdate).toBeDefined();
    expect(supplierUpdate![1].balance).toBe(51000);
  });

  // =========================================================================
  // SCÉNARIO ADVERSARIAL 2 : TRANSITION DE STATUT COMPLETED -> DRAFT (DÉSTOCKAGE INTÉGRAL)
  // =========================================================================
  it('ADV-2 : Modification d\'un bon de "completed" vers "draft" déstocke et neutralise la dette', async () => {
    const purchaseId = 'pur-adv-completed-to-draft';

    const completedPurchase: Purchase = {
      id: purchaseId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNumber: 'BON-SWITCH-STAT',
      date: '2026-10-05T10:00:00.000Z',
      total: 6000,
      paidAmount: 1000, // dette du bon = 5000 DA
      status: 'completed',
      paymentStatus: 'partial',
      items: [
        { productId: 'prod-couscous-1kg', name: 'Couscous Fin 1kg', quantity: 50, costPrice: 120 }
      ]
    };

    useCoreStore.setState({
      products: [
        { ...prodA, stock: 100 }, // 50 initial + 50 de ce bon
        prodB,
        packBundle
      ]
    });
    usePeopleStore.setState({
      suppliers: [{ ...supplier, balance: 55000 }] // 50000 + 5000 de ce bon
    });
    useFinanceStore.setState({
      purchases: [completedPurchase]
    });

    // Passer le bon en statut draft
    const draftCart: PurchaseCartItem[] = [
      {
        lineId: 'line-draft-c',
        productId: 'prod-couscous-1kg',
        productName: 'Couscous Fin 1kg',
        quantity: 50,
        costPrice: 120,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }
    ];

    const params: SavePurchaseParams = {
      cart: draftCart,
      selectedSupplierId: supplier.id,
      extractedData: null,
      invoiceNumber: 'BON-SWITCH-STAT',
      receptionDate: '2026-10-09',
      globalDiscount: 0,
      globalTax: 0,
      purchaseStatus: 'draft', // DRAFT !
      paidAmount: 1000,
      editingPurchaseId: purchaseId,
      autoMargin: false,
      suppliers: usePeopleStore.getState().suppliers,
      patterns: [],
      purchases: [completedPurchase],
      products: useCoreStore.getState().products,
      setIsProcessing: vi.fn(),
      setLastPurchaseItems: vi.fn(),
      setStep: vi.fn()
    };

    await savePurchaseDb(params);

    // Les stocks doivent avoir été déduits des 50 unités : 100 - 50 = 50
    const stockAfter = useCoreStore.getState().products.find(p => p.id === 'prod-couscous-1kg')!.stock;
    expect(stockAfter).toBe(50);

    // La dette fournisseur dans LocalDatabase doit être diminuée de l'ancienne dette (5000 DA) : 55000 - 5000 = 50000
    const updateCalls = vi.mocked(localDb.update).mock.calls;
    const supplierUpdate = updateCalls.find(([path]) => path === `suppliers/${supplier.id}`);
    expect(supplierUpdate).toBeDefined();
    expect(supplierUpdate![1].balance).toBe(50000);
  });

  // =========================================================================
  // SCÉNARIO ADVERSARIAL 3 : ENCHAINEMENT DE MODIFICATIONS DIFFÉRENTIELLES SUCCESIVES
  // =========================================================================
  it('ADV-3 : Enchaînement de 3 modifications différentielles successives sans dérive ni corruption de stock', async () => {
    // Étape 1 : Création initiale de 10 unités à 120 DA (Payé 0 DA)
    const cart1: PurchaseCartItem[] = [
      {
        lineId: 'l1',
        productId: 'prod-couscous-1kg',
        productName: 'Couscous Fin 1kg',
        quantity: 10,
        costPrice: 120,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }
    ];

    await savePurchaseDb({
      cart: cart1,
      selectedSupplierId: supplier.id,
      extractedData: null,
      invoiceNumber: 'BON-CHAIN',
      receptionDate: '2026-10-09',
      globalDiscount: 0,
      globalTax: 0,
      purchaseStatus: 'completed',
      paidAmount: 0,
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

    let currentStock = useCoreStore.getState().products.find(p => p.id === 'prod-couscous-1kg')!.stock;
    expect(currentStock).toBe(60); // 50 + 10 = 60
    
    // Récupérer la dette persistée
    let updateCalls = vi.mocked(localDb.update).mock.calls;
    let supplierUpdate = updateCalls.find(([path]) => path === `suppliers/${supplier.id}`);
    expect(supplierUpdate![1].balance).toBe(51200); // 50000 + 1200 = 51200

    let currentPurchase = useFinanceStore.getState().purchases[0];
    let updatedSupplierObj = { ...supplier, balance: 51200 };

    // Étape 2 : Modification différentielle -> quantité passe à 18 (+8), acompte de 500 DA versé
    vi.mocked(localDb.update).mockClear();
    const cart2: PurchaseCartItem[] = [
      {
        lineId: 'l2',
        productId: 'prod-couscous-1kg',
        productName: 'Couscous Fin 1kg',
        quantity: 18,
        costPrice: 120,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }
    ];

    await savePurchaseDb({
      cart: cart2,
      selectedSupplierId: supplier.id,
      extractedData: null,
      invoiceNumber: 'BON-CHAIN',
      receptionDate: '2026-10-09',
      globalDiscount: 0,
      globalTax: 0,
      purchaseStatus: 'completed',
      paidAmount: 500,
      editingPurchaseId: currentPurchase.id,
      autoMargin: false,
      suppliers: [updatedSupplierObj],
      patterns: [],
      purchases: [currentPurchase],
      products: useCoreStore.getState().products,
      setIsProcessing: vi.fn(),
      setLastPurchaseItems: vi.fn(),
      setStep: vi.fn()
    });

    currentStock = useCoreStore.getState().products.find(p => p.id === 'prod-couscous-1kg')!.stock;
    expect(currentStock).toBe(68); // 60 + 8 = 68
    
    updateCalls = vi.mocked(localDb.update).mock.calls;
    supplierUpdate = updateCalls.find(([path]) => path === `suppliers/${supplier.id}`);
    // Nouvelle dette : 18*120 - 500 = 2160 - 500 = 1660 DA. Ancienne dette : 1200 DA. Delta = +460 DA.
    // 51200 + 460 = 51660 DA.
    expect(supplierUpdate![1].balance).toBe(51660);

    currentPurchase = useFinanceStore.getState().purchases[0];
    updatedSupplierObj = { ...supplier, balance: 51660 };

    // Étape 3 : Deuxième modification -> quantité réduite à 5 (-13), payé 600 DA (soldé entièrement)
    vi.mocked(localDb.update).mockClear();
    const cart3: PurchaseCartItem[] = [
      {
        lineId: 'l3',
        productId: 'prod-couscous-1kg',
        productName: 'Couscous Fin 1kg',
        quantity: 5,
        costPrice: 120,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }
    ];

    await savePurchaseDb({
      cart: cart3,
      selectedSupplierId: supplier.id,
      extractedData: null,
      invoiceNumber: 'BON-CHAIN',
      receptionDate: '2026-10-09',
      globalDiscount: 0,
      globalTax: 0,
      purchaseStatus: 'completed',
      paidAmount: 600, // Total = 5 * 120 = 600 DA -> Dette = 0 DA
      editingPurchaseId: currentPurchase.id,
      autoMargin: false,
      suppliers: [updatedSupplierObj],
      patterns: [],
      purchases: [currentPurchase],
      products: useCoreStore.getState().products,
      setIsProcessing: vi.fn(),
      setLastPurchaseItems: vi.fn(),
      setStep: vi.fn()
    });

    currentStock = useCoreStore.getState().products.find(p => p.id === 'prod-couscous-1kg')!.stock;
    expect(currentStock).toBe(55); // 68 - 13 = 55 (soit exactement 50 initial + 5 final)
    
    updateCalls = vi.mocked(localDb.update).mock.calls;
    supplierUpdate = updateCalls.find(([path]) => path === `suppliers/${supplier.id}`);
    // Nouvelle dette = 0 DA. Ancienne dette = 1660 DA. Delta = -1660 DA.
    // 51660 - 1660 = 50000 DA (retour exact à la dette d'origine !)
    expect(supplierUpdate![1].balance).toBe(50000);
  });

  // =========================================================================
  // SCÉNARIO ADVERSARIAL 4 : SUPPRESSION D'ACHAT AVEC HISTORIQUE DE PRIX MULTIPLE & RESTAURATION
  // =========================================================================
  it('ADV-4 : Rollback d\'achat avec historique de prix à 3 entrées : purge stricte du bon et restauration de l\'avant-dernier costPrice', async () => {
    const purchaseToDeleteId = 'pur-target-delete-price-hist';

    // Produit avec 3 entrées dans priceHistory :
    // 0: Achat actuel (à supprimer) : costPrice 160, purchaseId: pur-target-delete-price-hist
    // 1: Achat intermédiaire : costPrice 140, purchaseId: pur-prev-history-01
    // 2: Achat d'origine : costPrice 120, purchaseId: pur-base-00
    const productWithRichHistory: Product = {
      ...prodA,
      costPrice: 160,
      stock: 80, // 50 initial + 30 apportés par ce bon
      priceHistory: [
        {
          timestamp: '2026-10-08T10:00:00.000Z',
          date: '2026-10-08T10:00:00.000Z',
          price: 190,
          costPrice: 160,
          supplierName: supplier.name,
          invoiceNumber: 'FAC-TO-DELETE',
          purchaseId: purchaseToDeleteId
        } as any,
        {
          timestamp: '2026-09-01T10:00:00.000Z',
          date: '2026-09-01T10:00:00.000Z',
          price: 170,
          costPrice: 140, // Coût attendu après rollback !
          supplierName: supplier.name,
          invoiceNumber: 'FAC-PREV-01',
          purchaseId: 'pur-prev-history-01'
        } as any,
        {
          timestamp: '2026-07-01T08:00:00.000Z',
          date: '2026-07-01T08:00:00.000Z',
          price: 150,
          costPrice: 120,
          supplierName: supplier.name,
          invoiceNumber: 'FAC-BASE-00',
          purchaseId: 'pur-base-00'
        } as any
      ]
    };

    const purchaseToDelete: Purchase = {
      id: purchaseToDeleteId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNumber: 'FAC-TO-DELETE',
      date: '2026-10-08T10:00:00.000Z',
      total: 4800, // 30 * 160 = 4800 DA
      paidAmount: 1800, // Dette due = 3000 DA
      status: 'completed',
      paymentStatus: 'partial',
      items: [
        {
          productId: 'prod-couscous-1kg',
          name: 'Couscous Fin 1kg',
          quantity: 30,
          costPrice: 160
        }
      ]
    };

    useCoreStore.setState({
      products: [productWithRichHistory, prodB, packBundle]
    });
    usePeopleStore.setState({
      suppliers: [{ ...supplier, balance: 53000 }] // 50 000 base + 3 000 dette de ce bon
    });
    useFinanceStore.setState({
      purchases: [purchaseToDelete]
    });

    await handleDeletePurchaseDb({
      purchaseId: purchaseToDeleteId,
      setIsProcessing: vi.fn(),
      setPurchaseToDelete: vi.fn()
    });

    const rolledBackProd = useCoreStore.getState().products.find(p => p.id === 'prod-couscous-1kg')!;

    // 1. Stock revenu à 80 - 30 = 50 unités
    expect(rolledBackProd.stock).toBe(50);

    // 2. Coût de revient restauré fidèlement à 140 DA (avant-dernière entrée)
    expect(rolledBackProd.costPrice).toBe(140);

    // 3. priceHistory filtré : exactement 2 entrées restantes, celle supprimée n'existe plus
    expect(rolledBackProd.priceHistory!.length).toBe(2);
    expect(rolledBackProd.priceHistory!.some((e: any) => e.purchaseId === purchaseToDeleteId)).toBe(false);
    expect((rolledBackProd.priceHistory![0] as any).costPrice).toBe(140);
    expect((rolledBackProd.priceHistory![1] as any).costPrice).toBe(120);

    // 4. Dette fournisseur neutralisée : 53 000 - 3 000 = 50 000 DA
    const rolledBackSup = usePeopleStore.getState().suppliers.find(s => s.id === supplier.id)!;
    expect(rolledBackSup.balance).toBe(50000);
  });

  // =========================================================================
  // SCÉNARIO ADVERSARIAL 5 : SUPPRESSION D'UN BON SANS DETTE RESTANTE (TOTALEMENT PAYÉ)
  // =========================================================================
  it('ADV-5 : Suppression d\'un bon entièrement payé (paidAmount === total) : le stock est déduit mais la dette fournisseur reste intacte', async () => {
    const paidPurchaseId = 'pur-fully-paid-delete';

    const fullyPaidPurchase: Purchase = {
      id: paidPurchaseId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNumber: 'FAC-FULLY-PAID',
      date: '2026-10-07T10:00:00.000Z',
      total: 2400,
      paidAmount: 2400, // 100% payé comptant
      status: 'completed',
      paymentStatus: 'paid',
      items: [
        {
          productId: 'prod-couscous-1kg',
          name: 'Couscous Fin 1kg',
          quantity: 20,
          costPrice: 120
        }
      ]
    };

    useCoreStore.setState({
      products: [
        { ...prodA, stock: 70 }, // 50 base + 20
        prodB,
        packBundle
      ]
    });
    usePeopleStore.setState({
      suppliers: [{ ...supplier, balance: 50000 }] // Aucun impact de ce bon sur la dette
    });
    useFinanceStore.setState({
      purchases: [fullyPaidPurchase]
    });

    await handleDeletePurchaseDb({
      purchaseId: paidPurchaseId,
      setIsProcessing: vi.fn(),
      setPurchaseToDelete: vi.fn()
    });

    // Stock déduit : 70 - 20 = 50
    expect(useCoreStore.getState().products.find(p => p.id === 'prod-couscous-1kg')!.stock).toBe(50);

    // Dette fournisseur strictement inchangée à 50 000 DA (pas de fausse déduction)
    expect(usePeopleStore.getState().suppliers.find(s => s.id === supplier.id)!.balance).toBe(50000);
  });

  // =========================================================================
  // SCÉNARIO ADVERSARIAL 6 : GESTION DES REVERSEMENTS / ENCAISSEMENTS ET ANNULATION DE RÈGLEMENT
  // =========================================================================
  it('ADV-6 : Cycle complet versement et annulation de paiement fournisseur via useSupplierPayments avec réactivité des props', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Solde fournisseur initial = 50 000 DA
    usePeopleStore.setState({ suppliers: [supplier] });

    // Render du hook avec props dynamiques simulant le re-render du composant parent
    const { result, rerender } = renderHook(
      (props: { suppliersList: Supplier[]; viewingSupplier: Supplier }) =>
        useSupplierPayments({
          suppliers: props.suppliersList,
          viewingDetailsSupplier: props.viewingSupplier
        }),
      {
        initialProps: {
          suppliersList: [supplier],
          viewingSupplier: supplier
        }
      }
    );

    // 1. Versement normal (décaissement) de 15 000 DA
    act(() => {
      result.current.setPaymentData({
        amount: 15000,
        method: 'transfer',
        note: 'Virement partiel facture',
        date: '2026-10-09',
        opType: 'decaissement'
      });
    });

    await act(async () => {
      await result.current.handlePaymentSubmit();
    });

    // Solde fournisseur après décaissement : 50 000 - 15 000 = 35 000 DA
    let currentStoreSup = usePeopleStore.getState().suppliers.find(s => s.id === supplier.id)!;
    expect(currentStoreSup.balance).toBe(35000);
    const payments = useFinanceStore.getState().supplierPayments;
    expect(payments.length).toBe(1);
    const firstPayment = payments[0];
    expect(firstPayment.amount).toBe(15000);

    // Re-render du hook avec le fournisseur actualisé (tel que fait par React dans l'UI)
    rerender({
      suppliersList: [currentStoreSup],
      viewingSupplier: currentStoreSup
    });

    // 2. Annulation du versement via handlePaymentDelete
    await act(async () => {
      await result.current.handlePaymentDelete(firstPayment);
    });

    // Dette immédiatement restaurée : 35 000 + 15 000 = 50 000 DA
    currentStoreSup = usePeopleStore.getState().suppliers.find(s => s.id === supplier.id)!;
    expect(currentStoreSup.balance).toBe(50000);
    expect(useFinanceStore.getState().supplierPayments.length).toBe(0);
  });

  // =========================================================================
  // SCÉNARIO ADVERSARIAL 7 : AUDIT CRITIQUE DE LA COHÉRENCE STORE VS LOCALDATABASE DANS SAVEPURCHASEDB
  // =========================================================================
  it('ADV-7 : Révèle et documente la disparité de synchronisation : savePurchaseDb persiste dans LocalDatabase mais omet usePeopleStore.setState', async () => {
    // Dette initiale
    expect(supplier.balance).toBe(50000);

    const cart: PurchaseCartItem[] = [
      {
        lineId: 'l-test-sync',
        productId: 'prod-couscous-1kg',
        productName: 'Couscous Fin 1kg',
        quantity: 10,
        costPrice: 120,
        taxRate: 0,
        discount: 0,
        isDraft: false
      }
    ];

    await savePurchaseDb({
      cart,
      selectedSupplierId: supplier.id,
      extractedData: null,
      invoiceNumber: 'BON-AUDIT-SYNC',
      receptionDate: '2026-10-09',
      globalDiscount: 0,
      globalTax: 0,
      purchaseStatus: 'completed',
      paidAmount: 200, // Total = 1200 DA -> Dette = 1000 DA
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

    // A. LocalDatabase a bien reçu la mise à jour (+1000 DA = 51 000 DA)
    const updateCalls = vi.mocked(localDb.update).mock.calls;
    const supplierUpdateCall = updateCalls.find(([path]) => path === `suppliers/${supplier.id}`);
    expect(supplierUpdateCall).toBeDefined();
    expect(supplierUpdateCall![1].balance).toBe(51000);

    // B. usePeopleStore est désormais correctement mis à jour en cohérence avec LocalDatabase
    const zustandSupplier = usePeopleStore.getState().suppliers.find(s => s.id === supplier.id)!;
    expect(zustandSupplier.balance).toBe(51000); // 51 000 DA synchronisé en mémoire
  });
});
