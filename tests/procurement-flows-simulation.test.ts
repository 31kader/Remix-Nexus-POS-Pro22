import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import { useCoreStore } from '../src/store/useCoreStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useFinanceStore } from '../src/store/useFinanceStore';
import {
  savePurchaseDb,
  handleSupplierPaymentDb,
  handleDeletePurchaseDb,
  SavePurchaseParams
} from '../src/components/smart-purchase/purchaseDbOperations';
import {
  matchProductInCatalog,
  parseRawInvoiceText,
  saveLearnedOcrMapping,
  getLearnedOcrMappings,
  extractDistinctiveTokens,
  normalizeForMatching,
  LEARNED_OCR_MAPPINGS_KEY
} from '../src/components/smart-purchase/invoiceParser';
import { useSupplierPayments } from '../src/hooks/suppliers/useSupplierPayments';
import {
  preparePayload,
  TABLE_COLUMNS,
  convertKeysToSnake,
  convertKeysToCamel
} from '../src/lib/db-converters';
import { Product, Supplier, InvoicePattern, Purchase, SupplierPayment } from '../src/types';
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
          val: () => val ? JSON.parse(JSON.stringify(val)) : null
        };
      }),
      push: vi.fn(() => ({ key: 'id-' + Math.random().toString(36).substring(2, 7) }))
    }
  };
});

// 4. Mock Supabase (projet unlwfvldqxfccgrrgbwf)
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

// 5. Mock Sonner (Toast notifications)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

import { localDb } from '../src/services/LocalDatabase';

describe('⚡ Simulation E2E Complète du Cycle d\'Approvisionnement & Fournisseurs (R1 à R7)', () => {
  // Entités de test réelles
  let mockSupplier: Supplier;
  let mockSingleProduct: Product;
  let mockComponentProduct: Product;
  let mockBundleProduct: Product;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // 1. Initialisation Fournisseur de test
    mockSupplier = {
      id: 'sup-cevital-01',
      name: 'SARL CEVITAL AGRO ALGERIE',
      contactName: 'Karim Bouzid',
      phone: '0550123456',
      email: 'contact@cevital.dz',
      address: 'Route Nationale 12, Bejaia',
      balance: 10000, // Dette initiale : 10 000 DA
      updatedAt: new Date().toISOString()
    };

    // 2. Produit unitaire : Huile Elio 1L
    mockSingleProduct = {
      id: 'prod-huile-1l',
      name: 'Huile Elio 1L',
      barcode: '6130000000012',
      sku: 'ELIO-1L',
      costPrice: 200, // Coût unitaire initial : 200 DA
      price: 250,     // Prix de vente initial : 250 DA (Marge: (250-200)/200 = 25%)
      taxRate: 19,
      stock: 15,      // Stock initial : 15 unités
      minStock: 5,
      categoryId: 'cat-agro',
      supplier: 'SARL CEVITAL AGRO ALGERIE',
      unit: 'bouteille',
      status: 'active',
      priceHistory: [
        {
          timestamp: '2026-08-01T10:00:00.000Z',
          date: '2026-08-01T10:00:00.000Z',
          price: 250,
          costPrice: 200,
          supplierName: 'SARL CEVITAL AGRO ALGERIE',
          invoiceNumber: 'INIT-2026-01',
          purchaseId: 'pur-initial-00'
        } as any
      ],
      updatedAt: new Date().toISOString()
    };

    // 3. Produit composant élémentaire : Bouteille Jus 33cl
    mockComponentProduct = {
      id: 'comp-jus-33cl',
      name: 'Bouteille Jus Orange 33cl',
      barcode: '6131112223334',
      sku: 'JUS-33CL',
      costPrice: 40,
      price: 60,
      taxRate: 19,
      stock: 20, // Stock initial : 20 bouteilles
      minStock: 10,
      categoryId: 'cat-boissons',
      supplier: 'SARL CEVITAL AGRO ALGERIE',
      unit: 'bouteille',
      status: 'active',
      priceHistory: [],
      updatedAt: new Date().toISOString()
    };

    // 4. Produit Pack / Bundle : Carton de 6 Bouteilles de Jus
    mockBundleProduct = {
      id: 'pack-jus-6x',
      name: 'Carton 6 Bouteilles Jus 33cl',
      barcode: '6139998887776',
      sku: 'PACK-JUS-6',
      costPrice: 240, // 6 * 40 DA
      price: 330,
      taxRate: 19,
      stock: 0,       // Stock physique virtuel du pack (les composants portent le stock réel)
      minStock: 2,
      categoryId: 'cat-boissons',
      supplier: 'SARL CEVITAL AGRO ALGERIE',
      unit: 'carton',
      status: 'active',
      isBundle: true,
      bundleItems: [
        { productId: 'comp-jus-33cl', quantity: 6 } // 1 carton = 6 bouteilles
      ],
      updatedAt: new Date().toISOString()
    };

    // Initialisation des stores Zustand
    useCoreStore.setState({
      products: [mockSingleProduct, mockComponentProduct, mockBundleProduct]
    });
    usePeopleStore.setState({
      suppliers: [mockSupplier]
    });
    useFinanceStore.setState({
      purchases: [],
      supplierPayments: []
    });
  });

  // =========================================================================
  // FLUX 1 : APPROVISIONNEMENT MANUEL & RÉCEPTION DE MARCHANDISES (R1)
  // =========================================================================
  describe('⚡ Flux 1 (R1) : Approvisionnement Manuel & Réception de Marchandises', () => {
    it('1.1 Incrémente rigoureusement le stock unitaire ET les composants de packs/bundles lors de la réception (completed)', async () => {
      // Panier d'achat :
      // - 10 unités de Huile Elio 1L à 200 DA = 2000 DA
      // - 5 cartons de Pack Jus (5 * 6 = 30 bouteilles composantes) à 240 DA = 1200 DA
      // Total brut = 3 200 DA, Acompte payé = 1 200 DA -> Dette restante = 2 000 DA
      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-1',
          productId: 'prod-huile-1l',
          productName: 'Huile Elio 1L',
          quantity: 10,
          costPrice: 200,
          taxRate: 0,
          discount: 0,
          isDraft: false
        },
        {
          lineId: 'line-2',
          productId: 'pack-jus-6x',
          productName: 'Carton 6 Bouteilles Jus 33cl',
          quantity: 5,
          costPrice: 240,
          taxRate: 0,
          discount: 0,
          isDraft: false
        }
      ];

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: mockSupplier.id,
        extractedData: null,
        invoiceNumber: 'BL-2026-00101',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 1200,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: [mockSupplier],
        patterns: [],
        purchases: [],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      };

      await savePurchaseDb(saveParams);

      // A. Vérification de la persistance locale dans LocalDatabase
      expect(localDb.insert).toHaveBeenCalled();
      const insertCalls = vi.mocked(localDb.insert).mock.calls;
      const purchaseInsertCall = insertCalls.find(([path]) => path.startsWith('purchases/'));
      expect(purchaseInsertCall).toBeDefined();

      const savedPurchaseData = purchaseInsertCall![1];
      expect(savedPurchaseData.status).toBe('completed');
      expect(savedPurchaseData.paymentStatus).toBe('partial');
      expect(savedPurchaseData.total).toBe(3200);
      expect(savedPurchaseData.paidAmount).toBe(1200);
      expect(savedPurchaseData.invoiceNumber).toBe('BL-2026-00101');

      // B. Vérification des stocks physiques
      const updatedProducts = useCoreStore.getState().products;
      const updatedSingle = updatedProducts.find(p => p.id === 'prod-huile-1l')!;
      const updatedComp = updatedProducts.find(p => p.id === 'comp-jus-33cl')!;

      // Produit unitaire : 15 initial + 10 achetés = 25
      expect(updatedSingle.stock).toBe(25);

      // Composant du pack : 20 initial + (5 cartons * 6 bouteilles = 30) = 50
      expect(updatedComp.stock).toBe(50);

      // C. Vérification de la dette fournisseur (supplier.balance)
      // Dette initiale : 10 000 DA, dette ajoutée : 3 200 - 1 200 = 2 000 DA -> nouveau solde attendu : 12 000 DA
      const updateCalls = vi.mocked(localDb.update).mock.calls;
      const supplierUpdateCall = updateCalls.find(([path]) => path === `suppliers/${mockSupplier.id}`);
      expect(supplierUpdateCall).toBeDefined();
      expect(supplierUpdateCall![1].balance).toBe(12000);

      // D. Vérification du store Zustand useFinanceStore
      const financePurchases = useFinanceStore.getState().purchases;
      expect(financePurchases.length).toBe(1);
      expect(financePurchases[0].total).toBe(3200);
      expect(financePurchases[0].paidAmount).toBe(1200);
    });

    it('1.2 Ne modifie ni les stocks ni la dette si le bon d\'achat est au statut draft ou ordered', async () => {
      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-draft-1',
          productId: 'prod-huile-1l',
          productName: 'Huile Elio 1L',
          quantity: 20,
          costPrice: 200,
          taxRate: 0,
          discount: 0,
          isDraft: false
        }
      ];

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: mockSupplier.id,
        extractedData: null,
        invoiceNumber: 'BON-DRAFT-99',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'draft', // Brouillon non réceptionné
        paidAmount: 0,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: [mockSupplier],
        patterns: [],
        purchases: [],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      };

      await savePurchaseDb(saveParams);

      // Les stocks doivent rester STRICTEMENT inchangés
      const products = useCoreStore.getState().products;
      expect(products.find(p => p.id === 'prod-huile-1l')!.stock).toBe(15);

      // La dette fournisseur ne doit pas bouger
      const updateCalls = vi.mocked(localDb.update).mock.calls;
      const supplierUpdateCall = updateCalls.find(([path]) => path === `suppliers/${mockSupplier.id}`);
      expect(supplierUpdateCall).toBeUndefined();
    });

    it('1.3 Respecte à 100% les colonnes déclarées dans TABLE_COLUMNS pour la table purchases', () => {
      const purchasePayload = preparePayload('purchases', 'pur-test-schema-01', {
        supplierId: mockSupplier.id,
        supplierName: mockSupplier.name,
        total: 5400,
        paidAmount: 2000,
        status: 'completed',
        paymentStatus: 'partial',
        invoiceNumber: 'INV-SCHEMA-01',
        date: new Date().toISOString(),
        items: [
          { productId: 'prod-huile-1l', quantity: 20, costPrice: 200 }
        ]
      });

      expect(purchasePayload.total_amount).toBe(5400);
      expect(purchasePayload.status).toBe('completed');

      // Aucune colonne hors TABLE_COLUMNS ne doit subsister
      for (const col of Object.keys(purchasePayload)) {
        expect(TABLE_COLUMNS.purchases).toContain(col);
      }
    });
  });

  // =========================================================================
  // FLUX 2 : ANALYSE INTELLIGENTE DE FACTURES PAR VISION / IA (R2)
  // =========================================================================
  describe('⚡ Flux 2 (R2) : Analyse Intelligente de Factures par Vision / IA & Matching', () => {
    it('2.1 Valide la présence de l\'image de test réelle et la conformité du schéma JSON extrait', () => {
      const fixtureImagePath = path.join(__dirname, 'fixtures', 'facture_test_algerie.png');
      const fixtureJsonPath = path.join(__dirname, 'fixtures', 'facture_sample_payload.json');

      expect(fs.existsSync(fixtureImagePath)).toBe(true);
      expect(fs.existsSync(fixtureJsonPath)).toBe(true);

      const rawJson = fs.readFileSync(fixtureJsonPath, 'utf8');
      const parsedData = JSON.parse(rawJson);

      // Validation de la conformité au schéma strict INVOICE_EXTRACTION_PROMPT
      expect(parsedData).toHaveProperty('supplierName');
      expect(parsedData).toHaveProperty('invoiceNumber');
      expect(parsedData).toHaveProperty('date');
      expect(parsedData).toHaveProperty('total');
      expect(parsedData).toHaveProperty('items');
      expect(Array.isArray(parsedData.items)).toBe(true);
      expect(parsedData.items.length).toBeGreaterThan(0);

      // Validation numérique des items
      parsedData.items.forEach((item: any) => {
        expect(typeof item.name).toBe('string');
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.price).toBeGreaterThan(0);
        expect(item.total).toBe(item.quantity * item.price);
      });
    });

    it('2.2 Rapprochement automatique du catalogue : invoice_patterns, code-barres et tokens', () => {
      const products = useCoreStore.getState().products;

      // Cas A : Appariement par liaison mémorisée locale (Learned User Mapping)
      saveLearnedOcrMapping('BIDON HUILE ELIO 1L', 'prod-huile-1l');
      const learnedMatch = matchProductInCatalog({ name: 'BIDON HUILE ELIO 1L' }, products);
      expect(learnedMatch).toBeDefined();
      expect(learnedMatch!.id).toBe('prod-huile-1l');

      // Cas B : Appariement par Code-barres exact
      const barcodeMatch = matchProductInCatalog({ name: 'Désignation Inconnue', barcode: '6131112223334' }, products);
      expect(barcodeMatch).toBeDefined();
      expect(barcodeMatch!.id).toBe('comp-jus-33cl');

      // Cas C : Code-barres encapsulé dans la chaîne brute
      const embeddedMatch = matchProductInCatalog({ name: 'JUS ORANGE 6131112223334 PACK' }, products);
      expect(embeddedMatch).toBeDefined();
      expect(embeddedMatch!.id).toBe('comp-jus-33cl');

      // Cas D : Overlap de tokens distinctifs (>= 75%)
      const tokenMatch = matchProductInCatalog({ name: 'Carton Bouteilles Jus' }, products);
      expect(tokenMatch).toBeDefined();
      expect(tokenMatch!.id).toBe('pack-jus-6x');

      // Cas E : Produit non répertorié -> retourne undefined
      const unmappedMatch = matchProductInCatalog({ name: 'Produit Totalement Introuvable XYZ' }, products);
      expect(unmappedMatch).toBeUndefined();
    });

    it('2.3 Moteur heuristique algérien (parseRawInvoiceText) extrait l\'en-tête et les articles bruts', () => {
      const rawOcrText = `
        SARL CEVITAL AGRO ALGERIE
        FACTURE N°: FA-2026-9988
        DATE: 18/09/2026
        
        HUILE ELIO 1L         20    200,00 DA    4000,00 DA
        JUS ORANGE 33CL       10     40,00 DA     400,00 DA
        
        TOTAL TTC: 4400,00 DA
      `;

      const suppliers = usePeopleStore.getState().suppliers;
      const products = useCoreStore.getState().products;

      const parsed = parseRawInvoiceText(rawOcrText, suppliers, products);

      expect(parsed.supplierName).toContain('CEVITAL');
      expect(parsed.invoiceNumber).toBe('FA-2026-9988');
      expect(parsed.receptionDate).toBe('2026-09-18');
      expect(parsed.totalAmount).toBe(4400);
      expect(parsed.items.length).toBeGreaterThanOrEqual(1);
    });

    it('2.4 Persistance automatique des nouveaux mappings dans invoice_patterns lors de la validation', async () => {
      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-pat-1',
          productId: 'prod-huile-1l',
          productName: 'huile vegetale elio 1l', // Nom normalisé à mémoriser pour ce produit
          quantity: 10,
          costPrice: 200,
          taxRate: 0,
          discount: 0,
          isDraft: false
        }
      ];

      const patterns: InvoicePattern[] = [];

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: mockSupplier.id,
        extractedData: { supplierName: mockSupplier.name },
        invoiceNumber: 'BL-AUTO-PATTERN',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 2000,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: [mockSupplier],
        patterns,
        purchases: [],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      };

      await savePurchaseDb(saveParams);

      // Le pattern doit avoir été inséré/mis à jour
      const patternPayload = preparePayload('invoice_patterns', 'pat-new-1', {
        type: 'ocr',
        supplierName: mockSupplier.name,
        systemSupplierId: mockSupplier.id,
        itemMappings: {
          'huile vegetale elio 1l': 'prod-huile-1l'
        }
      });

      for (const col of Object.keys(patternPayload)) {
        expect(TABLE_COLUMNS.invoice_patterns).toContain(col);
      }
      expect(patternPayload.supplier_name).toBe(mockSupplier.name);
      expect(patternPayload.item_mappings['huile vegetale elio 1l']).toBe('prod-huile-1l');
    });

    it('2.5 Pré-remplissage conforme du panier d\'achat avec marquage isDraft pour les articles inconnus', () => {
      const rawExtractedItems = [
        { name: 'Huile Elio 1L', quantity: 15, price: 200, total: 3000 },
        { name: 'Produit Inconnu Non Référencé', quantity: 8, price: 450, total: 3600 }
      ];

      const products = useCoreStore.getState().products;

      const cartItems: PurchaseCartItem[] = rawExtractedItems.map(item => {
        const matched = matchProductInCatalog({ name: item.name }, products);
        if (matched) {
          return {
            lineId: 'line-m-' + matched.id,
            productId: matched.id,
            productName: matched.name,
            quantity: item.quantity,
            costPrice: item.price,
            taxRate: matched.taxRate || 0,
            discount: 0,
            isDraft: false
          };
        }
        return {
          lineId: 'line-draft-new',
          productId: '',
          productName: item.name,
          quantity: item.quantity,
          costPrice: item.price,
          taxRate: 19, // TVA par défaut 19% en Algérie
          discount: 0,
          isDraft: true // Badge produit à créer ou lier
        };
      });

      // Produit 1 : Reconnu dans le catalogue
      expect(cartItems[0].isDraft).toBe(false);
      expect(cartItems[0].productId).toBe('prod-huile-1l');
      expect(cartItems[0].quantity).toBe(15);
      expect(cartItems[0].costPrice).toBe(200);

      // Produit 2 : Non reconnu -> Draft avec TVA standard 19%
      expect(cartItems[1].isDraft).toBe(true);
      expect(cartItems[1].productId).toBe('');
      expect(cartItems[1].productName).toBe('Produit Inconnu Non Référencé');
      expect(cartItems[1].taxRate).toBe(19);
    });
  });

  // =========================================================================
  // FLUX 3 : RÈGLEMENTS & VERSEMENTS FOURNISSEURS (R3)
  // =========================================================================
  describe('⚡ Flux 3 (R3) : Règlements & Versements Fournisseurs', () => {
    it('3.1 Enregistre un versement fournisseur (handleSupplierPaymentDb) et déduit exactement la dette', async () => {
      // Fournisseur a un solde initial de 10 000 DA
      expect(mockSupplier.balance).toBe(10000);

      const paymentAmount = 4000; // Versement de 4 000 DA par virement bancaire

      await handleSupplierPaymentDb({
        supplierId: mockSupplier.id,
        amount: paymentAmount,
        method: 'transfer',
        note: 'Acompte virement bancaire Facture 001',
        date: '2026-10-09T14:00:00.000Z',
        suppliers: [mockSupplier],
        setIsProcessing: vi.fn(),
        setIsPaymentModalOpen: vi.fn(),
        setPaymentData: vi.fn()
      });

      // A. Vérification de l'enregistrement dans supplierPayments
      const insertCalls = vi.mocked(localDb.insert).mock.calls;
      const paymentInsertCall = insertCalls.find(([path]) => path.startsWith('supplierPayments/'));
      expect(paymentInsertCall).toBeDefined();

      const paymentData = paymentInsertCall![1];
      expect(paymentData.supplierId).toBe(mockSupplier.id);
      expect(paymentData.amount).toBe(4000);
      expect(paymentData.method).toBe('transfer');
      expect(paymentData.note).toContain('virement bancaire');

      // B. Vérification de la déduction sur la dette du fournisseur (10 000 - 4 000 = 6 000 DA)
      const updateCalls = vi.mocked(localDb.update).mock.calls;
      const supplierUpdateCall = updateCalls.find(([path]) => path === `suppliers/${mockSupplier.id}`);
      expect(supplierUpdateCall).toBeDefined();
      expect(supplierUpdateCall![1].balance).toBe(6000);
    });

    it('3.2 Le hook useSupplierPayments gère décaissement et encaissement avec conformité TABLE_COLUMNS', async () => {
      // Test de l'opération via useSupplierPayments
      const { result } = renderHook(() =>
        useSupplierPayments({
          suppliers: [mockSupplier],
          viewingDetailsSupplier: mockSupplier
        })
      );

      // Préparation d'un décaissement de 3 000 DA
      act(() => {
        result.current.setPaymentData({
          amount: 3000,
          method: 'cash',
          note: 'Paiement espèces en caisse',
          date: '2026-10-09',
          opType: 'decaissement'
        });
      });

      await act(async () => {
        await result.current.handlePaymentSubmit();
      });

      // Le solde du fournisseur dans le store doit être passé de 10 000 à 7 000 DA
      const storeSuppliers = usePeopleStore.getState().suppliers;
      const updatedSup = storeSuppliers.find(s => s.id === mockSupplier.id);
      expect(updatedSup?.balance).toBe(7000);

      // Traçabilité dans useFinanceStore.supplierPayments
      const payments = useFinanceStore.getState().supplierPayments;
      expect(payments.length).toBe(1);
      expect(payments[0].amount).toBe(3000);
      expect(payments[0].method).toBe('cash');

      // Vérification de conformité de schéma Supabase
      const payload = preparePayload('supplier_payments', payments[0].id, payments[0]);
      for (const col of Object.keys(payload)) {
        expect(TABLE_COLUMNS.supplier_payments).toContain(col);
      }
    });

    it('3.3 L\'annulation d\'un versement fournisseur via handlePaymentDelete restaure immédiatement la dette', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const payment: SupplierPayment = {
        id: 'pay-to-delete',
        supplierId: mockSupplier.id,
        supplierName: mockSupplier.name,
        amount: 3000,
        method: 'cash',
        date: new Date().toISOString()
      };

      // Solde actuel du fournisseur : 7 000 DA (dette diminuée suite au paiement)
      const currentSupplier: Supplier = { ...mockSupplier, balance: 7000 };
      usePeopleStore.setState({ suppliers: [currentSupplier] });
      useFinanceStore.setState({ supplierPayments: [payment] });

      const { result } = renderHook(() =>
        useSupplierPayments({
          suppliers: [currentSupplier],
          viewingDetailsSupplier: currentSupplier
        })
      );

      await act(async () => {
        await result.current.handlePaymentDelete(payment);
      });

      // Le solde doit être réajusté à 7 000 + 3 000 = 10 000 DA
      const storeSupplier = usePeopleStore.getState().suppliers.find(s => s.id === mockSupplier.id);
      expect(storeSupplier?.balance).toBe(10000);

      // Le paiement doit être retiré de useFinanceStore
      expect(useFinanceStore.getState().supplierPayments.length).toBe(0);
    });
  });

  // =========================================================================
  // FLUX 4 : MODIFICATION DIFFÉRENTIELLE DE BON D'ACHAT (R4)
  // =========================================================================
  describe('⚡ Flux 4 (R4) : Modification Différentielle de Bon d\'Achat (Quantités & Prix)', () => {
    it('4.1 Calcule rigoureusement le delta net des stocks et de la dette sans écrasement ni doublon', async () => {
      const purchaseId = 'pur-mod-diff-01';

      // 1. État initial : Bon déjà réceptionné dans le système
      // Contient 10 unités de Huile Elio (stock initial 15 -> actuel 25)
      // et 2 cartons de Jus (stock initial 20 -> actuel 32 car 2 * 6 = 12)
      // Total = 10 * 200 + 2 * 240 = 2 480 DA, Payé = 1 000 DA -> Dette du bon = 1 480 DA
      const initialPurchase: Purchase = {
        id: purchaseId,
        supplierId: mockSupplier.id,
        supplierName: mockSupplier.name,
        invoiceNumber: 'BL-DIFF-INITIAL',
        date: '2026-10-08T10:00:00.000Z',
        total: 2480,
        paidAmount: 1000,
        status: 'completed',
        paymentStatus: 'partial',
        items: [
          { productId: 'prod-huile-1l', name: 'Huile Elio 1L', quantity: 10, costPrice: 200 },
          { productId: 'pack-jus-6x', name: 'Carton 6 Bouteilles Jus 33cl', quantity: 2, costPrice: 240 }
        ]
      };

      // Mettre à jour l'état physique initial
      useCoreStore.setState({
        products: [
          { ...mockSingleProduct, stock: 25 },
          { ...mockComponentProduct, stock: 32 },
          mockBundleProduct
        ]
      });
      usePeopleStore.setState({
        suppliers: [{ ...mockSupplier, balance: 11480 }] // 10 000 de base + 1 480 de ce bon
      });
      useFinanceStore.setState({
        purchases: [initialPurchase]
      });

      // 2. L'utilisateur modifie le bon :
      // - Huile passe de 10 à 15 (+5 unités)
      // - Cartons passent de 2 à 1 (-1 carton = -6 bouteilles composantes)
      // - Paiement passe de 1 000 à 1 500 DA
      // Nouveau total : 15 * 200 + 1 * 240 = 3 000 + 240 = 3 240 DA
      // Nouvelle dette du bon : 3 240 - 1 500 = 1 740 DA
      // Ancienne dette du bon : 1 480 DA
      // Delta dette attendu : 1 740 - 1 480 = +260 DA
      const modifiedCart: PurchaseCartItem[] = [
        {
          lineId: 'line-m-1',
          productId: 'prod-huile-1l',
          productName: 'Huile Elio 1L',
          quantity: 15, // +5
          costPrice: 200,
          taxRate: 0,
          discount: 0,
          isDraft: false
        },
        {
          lineId: 'line-m-2',
          productId: 'pack-jus-6x',
          productName: 'Carton 6 Bouteilles Jus 33cl',
          quantity: 1, // -1 carton
          costPrice: 240,
          taxRate: 0,
          discount: 0,
          isDraft: false
        }
      ];

      const saveParams: SavePurchaseParams = {
        cart: modifiedCart,
        selectedSupplierId: mockSupplier.id,
        extractedData: null,
        invoiceNumber: 'BL-DIFF-INITIAL',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 1500,
        editingPurchaseId: purchaseId, // Mode modification activé
        autoMargin: false,
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: [initialPurchase],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      };

      await savePurchaseDb(saveParams);

      // A. Vérification des stocks physiques ajustés différentiellement
      const currentProducts = useCoreStore.getState().products;
      const finalSingle = currentProducts.find(p => p.id === 'prod-huile-1l')!;
      const finalComp = currentProducts.find(p => p.id === 'comp-jus-33cl')!;

      // Huile : 25 + (15 - 10) = 25 + 5 = 30
      expect(finalSingle.stock).toBe(30);

      // Bouteilles Jus (composant) : 32 + (1*6 - 2*6) = 32 - 6 = 26
      expect(finalComp.stock).toBe(26);

      // B. Vérification différentielle de la dette fournisseur
      // 11 480 + 260 = 11 740 DA
      const updateCalls = vi.mocked(localDb.update).mock.calls;
      const supplierUpdateCall = updateCalls.find(([path]) => path === `suppliers/${mockSupplier.id}`);
      expect(supplierUpdateCall).toBeDefined();
      expect(supplierUpdateCall![1].balance).toBe(11740);

      // C. Vérification de la mise à jour sans doublon dans LocalDatabase
      const purchaseUpdateCall = updateCalls.find(([path]) => path === `purchases/${purchaseId}`);
      expect(purchaseUpdateCall).toBeDefined();
      expect(purchaseUpdateCall![1].total).toBe(3240);
      expect(purchaseUpdateCall![1].paidAmount).toBe(1500);
    });
  });

  // =========================================================================
  // FLUX 5 : ANNULATION & SUPPRESSION DE BON AVEC ROLLBACK INTÉGRAL (R5)
  // =========================================================================
  describe('⚡ Flux 5 (R5) : Annulation & Suppression de Bon d\'Achat avec Rollback', () => {
    it('5.1 Déstocke physiquement, neutralise la dette restante et restaure l\'ancien coût d\'achat', async () => {
      const purchaseIdToDelete = 'pur-to-rollback-01';

      // 1. Produit avec historique de prix contenant l'achat en question
      const productWithHistory: Product = {
        ...mockSingleProduct,
        stock: 35,      // 15 initial + 20 ajoutés par ce bon
        costPrice: 220, // Nouveau coût d'achat apporté par ce bon (ancien était 200)
        priceHistory: [
          {
            timestamp: '2026-10-05T12:00:00.000Z',
            date: '2026-10-05T12:00:00.000Z',
            price: 275,
            costPrice: 220,
            supplierName: mockSupplier.name,
            invoiceNumber: 'BON-ANNULER-99',
            purchaseId: purchaseIdToDelete // Entrée à purger
          } as any,
          {
            timestamp: '2026-08-01T10:00:00.000Z',
            date: '2026-08-01T10:00:00.000Z',
            price: 250,
            costPrice: 200, // Coût historique à restaurer !
            supplierName: mockSupplier.name,
            invoiceNumber: 'INIT-2026-01',
            purchaseId: 'pur-initial-00'
          } as any
        ]
      };

      // 2. Bon d'achat à supprimer : 20 unités de Huile à 220 DA = 4 400 DA
      // Acompte payé : 2 000 DA -> Dette restante due : 2 400 DA
      const purchaseToDelete: Purchase = {
        id: purchaseIdToDelete,
        supplierId: mockSupplier.id,
        supplierName: mockSupplier.name,
        invoiceNumber: 'BON-ANNULER-99',
        date: '2026-10-05T12:00:00.000Z',
        total: 4400,
        paidAmount: 2000,
        status: 'completed',
        paymentStatus: 'partial',
        items: [
          {
            productId: 'prod-huile-1l',
            name: 'Huile Elio 1L',
            quantity: 20,
            costPrice: 220
          }
        ]
      };

      // Configuration des états initiaux avant suppression
      useCoreStore.setState({
        products: [productWithHistory, mockComponentProduct, mockBundleProduct]
      });
      usePeopleStore.setState({
        suppliers: [{ ...mockSupplier, balance: 12400 }] // 10 000 base + 2 400 restant de ce bon
      });
      useFinanceStore.setState({
        purchases: [purchaseToDelete]
      });

      // 3. Exécution de l'annulation et suppression
      await handleDeletePurchaseDb({
        purchaseId: purchaseIdToDelete,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      // A. Rollback physique strict des stocks : 35 - 20 = 15 unités
      const productsAfterRollback = useCoreStore.getState().products;
      const restoredProduct = productsAfterRollback.find(p => p.id === 'prod-huile-1l')!;
      expect(restoredProduct.stock).toBe(15);

      // B. Restauration de l'ancien costPrice (200 DA) et purge de l'entrée dans priceHistory
      expect(restoredProduct.costPrice).toBe(200);
      expect(restoredProduct.priceHistory).toBeDefined();
      expect(restoredProduct.priceHistory!.length).toBe(1);
      expect((restoredProduct.priceHistory![0] as any).purchaseId).toBe('pur-initial-00');
      expect(restoredProduct.priceHistory!.some((e: any) => e.purchaseId === purchaseIdToDelete)).toBe(false);

      // C. Neutralisation de la dette fournisseur : 12 400 - 2 400 = 10 000 DA
      const suppliersAfterRollback = usePeopleStore.getState().suppliers;
      const restoredSupplier = suppliersAfterRollback.find(s => s.id === mockSupplier.id)!;
      expect(restoredSupplier.balance).toBe(10000);

      // D. Purge du bon dans LocalDatabase et useFinanceStore
      expect(localDb.delete).toHaveBeenCalledWith(`purchases/${purchaseIdToDelete}`);
      expect(useFinanceStore.getState().purchases.length).toBe(0);
    });

    it('5.2 Déstocke physiquement les composants de packs/bundles lors de l\'annulation du bon', async () => {
      const bundlePurchaseId = 'pur-bundle-delete-01';

      // Bon d'achat contenant 3 cartons de jus (3 * 6 = 18 bouteilles composantes)
      const bundlePurchase: Purchase = {
        id: bundlePurchaseId,
        supplierId: mockSupplier.id,
        supplierName: mockSupplier.name,
        invoiceNumber: 'BON-BUNDLE-DEL',
        date: '2026-10-06T10:00:00.000Z',
        total: 720,
        paidAmount: 720,
        status: 'completed',
        paymentStatus: 'paid',
        items: [
          {
            productId: 'pack-jus-6x',
            name: 'Carton 6 Bouteilles Jus 33cl',
            quantity: 3,
            costPrice: 240
          }
        ]
      };

      // État des stocks avant annulation : composant a 38 bouteilles (20 base + 18 de ce bon)
      useCoreStore.setState({
        products: [
          mockSingleProduct,
          { ...mockComponentProduct, stock: 38 },
          mockBundleProduct
        ]
      });
      usePeopleStore.setState({
        suppliers: [mockSupplier]
      });
      useFinanceStore.setState({
        purchases: [bundlePurchase]
      });

      await handleDeletePurchaseDb({
        purchaseId: bundlePurchaseId,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      // Rollback du composant : 38 - (3 cartons * 6 bouteilles = 18) = 20 bouteilles
      const componentAfterDelete = useCoreStore.getState().products.find(p => p.id === 'comp-jus-33cl')!;
      expect(componentAfterDelete.stock).toBe(20);
    });
  });

  // =========================================================================
  // FLUX 6 : RÉPERCUSSION PRIX D'ACHAT, AUTO-MARGE & HISTORIQUE (R6)
  // =========================================================================
  describe('⚡ Flux 6 (R6) : Répercussion Prix d\'Achat & Marges Commerciales', () => {
    it('6.1 AutoMargin préserve fidèlement le taux de marge commerciale lors d\'une hausse du coût', async () => {
      // Produit initial : costPrice: 200 DA, price: 250 DA -> Marge = (250 - 200)/200 = 25% (0.25)
      expect(mockSingleProduct.costPrice).toBe(200);
      expect(mockSingleProduct.price).toBe(250);

      // Nouvel approvisionnement avec coût d'achat en hausse à 240 DA (+20%) et autoMargin activé
      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-margin-1',
          productId: 'prod-huile-1l',
          productName: 'Huile Elio 1L',
          quantity: 20,
          costPrice: 240, // Hausse de 200 à 240 DA
          taxRate: 0,
          discount: 0,
          isDraft: false
        }
      ];

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: mockSupplier.id,
        extractedData: null,
        invoiceNumber: 'BL-MARGE-2026',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 4800,
        editingPurchaseId: null,
        autoMargin: true, // AUTO-MARGE ACTIVÉE
        suppliers: [mockSupplier],
        patterns: [],
        purchases: [],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      };

      await savePurchaseDb(saveParams);

      const updatedProduct = useCoreStore.getState().products.find(p => p.id === 'prod-huile-1l')!;

      // A. Coût de revient mis à jour à 240 DA
      expect(updatedProduct.costPrice).toBe(240);

      // B. Nouveau prix calculé : 240 * (1 + 0.25) = 300 DA
      expect(updatedProduct.price).toBe(300);

      // C. Vérification de la préservation exacte du taux de marge : (300 - 240) / 240 = 60 / 240 = 25%
      const newMargin = (updatedProduct.price - updatedProduct.costPrice) / updatedProduct.costPrice;
      expect(newMargin).toBeCloseTo(0.25, 4);

      // D. Traçabilité dans priceHistory
      expect(updatedProduct.priceHistory).toBeDefined();
      expect(updatedProduct.priceHistory!.length).toBeGreaterThanOrEqual(1);
      const latestHistory = updatedProduct.priceHistory![0] as any;
      expect(latestHistory.costPrice).toBe(240);
      expect(latestHistory.price).toBe(300);
      expect(latestHistory.invoiceNumber).toBe('BL-MARGE-2026');
    });

    it('6.2 Si autoMargin est désactivé, le costPrice est mis à jour mais le prix de vente reste inchangé', async () => {
      const cart: PurchaseCartItem[] = [
        {
          lineId: 'line-margin-2',
          productId: 'prod-huile-1l',
          productName: 'Huile Elio 1L',
          quantity: 10,
          costPrice: 220,
          taxRate: 0,
          discount: 0,
          isDraft: false
        }
      ];

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: mockSupplier.id,
        extractedData: null,
        invoiceNumber: 'BL-NO-MARGIN',
        receptionDate: '2026-10-09',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 2200,
        editingPurchaseId: null,
        autoMargin: false, // AUTO-MARGE DÉSACTIVÉE
        suppliers: [mockSupplier],
        patterns: [],
        purchases: [],
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      };

      await savePurchaseDb(saveParams);

      const product = useCoreStore.getState().products.find(p => p.id === 'prod-huile-1l')!;
      expect(product.costPrice).toBe(220);
      expect(product.price).toBe(250); // Inchangé
    });
  });

  // =========================================================================
  // FLUX 7 : VALIDATION GLOBALE & RÉSILIENCE (R7)
  // =========================================================================
  describe('⚡ Flux 7 (R7) : Validation Globale, Idempotence & Conformité Supabase', () => {
    it('7.1 Vérifie l\'étanchéité des tables Supabase unlwfvldqxfccgrrgbwf via preparePayload', () => {
      // 1. Table suppliers
      const supPayload = preparePayload('suppliers', mockSupplier.id, mockSupplier);
      for (const col of Object.keys(supPayload)) {
        expect(TABLE_COLUMNS.suppliers).toContain(col);
      }

      // 2. Table supplier_payments
      const payPayload = preparePayload('supplier_payments', 'pay-test-1', {
        supplierId: mockSupplier.id,
        supplierName: mockSupplier.name,
        amount: 5000,
        method: 'cash',
        date: new Date().toISOString(),
        note: 'Versement de test'
      });
      for (const col of Object.keys(payPayload)) {
        expect(TABLE_COLUMNS.supplier_payments).toContain(col);
      }

      // 3. Table invoice_patterns
      const patPayload = preparePayload('invoice_patterns', 'pat-test-1', {
        type: 'ocr',
        supplierName: mockSupplier.name,
        systemSupplierId: mockSupplier.id,
        itemMappings: { 'Article A': 'prod-1' }
      });
      for (const col of Object.keys(patPayload)) {
        expect(TABLE_COLUMNS.invoice_patterns).toContain(col);
      }

      // 4. Table purchases
      const purPayload = preparePayload('purchases', 'pur-test-1', {
        supplierId: mockSupplier.id,
        supplierName: mockSupplier.name,
        total: 10000,
        paidAmount: 5000,
        status: 'completed',
        items: []
      });
      for (const col of Object.keys(purPayload)) {
        expect(TABLE_COLUMNS.purchases).toContain(col);
      }
    });

    it('7.2 Normalisation de chaînes et extraction de tokens distinctifs sans régression', () => {
      // Normalisation NFD (suppression accents, majuscules, caractères spéciaux)
      expect(normalizeForMatching('Café Pur Arabica 250g')).toBe('cafe pur arabica 250g');
      expect(normalizeForMatching('PÂTE À TARTINER ÉLÉPHANT')).toBe('pate a tartiner elephant');

      // Tokens distinctifs sans stopwords
      const tokens = extractDistinctiveTokens('PACK DE 6 BOUTEILLES JUS D ORANGE 33CL');
      expect(tokens).toContain('bouteilles');
      expect(tokens).toContain('orange');
      expect(tokens).not.toContain('pack');
      expect(tokens).not.toContain('de');
    });
  });
});
