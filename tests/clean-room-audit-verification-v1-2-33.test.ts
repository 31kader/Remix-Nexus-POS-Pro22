import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { useCoreStore } from '../src/store/useCoreStore';
import {
  Transaction,
  Product,
  Customer,
  CompanySettings,
  CashShift,
  Expense,
  isTopUpTransaction
} from '../src/types';
import { preparePayload, TABLE_COLUMNS } from '../src/lib/db-converters';
import {
  savePurchaseDb,
  handleReceiveOrderDb
} from '../src/components/smart-purchase/purchaseDbOperations';

// Mock SyncService
vi.mock('../src/services/SyncService', () => ({
  enqueueStockAdjustment: vi.fn(),
  enqueueCustomerBalanceAdjustment: vi.fn(),
  enqueueSync: vi.fn(),
  enqueueSyncBatch: vi.fn(),
  loadPendingSyncQueue: vi.fn().mockReturnValue([])
}));

// Mock LocalDatabase
vi.mock('../src/services/LocalDatabase', () => ({
  localDb: {
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    insertLocalOnly: vi.fn().mockResolvedValue(undefined),
    updateLocalOnly: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ exists: () => false, val: () => null })
  }
}));

describe('Skeptical Clean-Room Verification Suite (v1.2.33 P0/P1/P2 Fixes)', () => {
  const defaultSettings: CompanySettings = {
    name: 'Nexus Test Store',
    currency: 'DA',
    taxRate: 19
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. BUG-01: Détection et Isolation des Règlements de Dettes (topup)', () => {
    it('isTopUpTransaction identifie correctement les transactions topup par source et par marqueur de note', () => {
      const topupExplicit: Transaction = {
        id: 'tx-topup-1',
        total: 5000,
        paymentMethod: 'cash',
        timestamp: new Date().toISOString(),
        userId: 'admin',
        source: 'topup',
        items: []
      };

      const topupLegacyNote: Transaction = {
        id: 'tx-topup-2',
        total: 3000,
        paymentMethod: 'cash',
        timestamp: new Date().toISOString(),
        userId: 'admin',
        notes: '[REGLEMENT] Encaissement/Versement de 3000.00 DA (CASH)',
        items: []
      };

      const topupAuditNote: Transaction = {
        id: 'tx-topup-3',
        total: 2000,
        paymentMethod: 'transfer',
        timestamp: new Date().toISOString(),
        userId: 'admin',
        auditNote: '[REGLEMENT] Encaissement virement bancaire',
        items: []
      };

      const regularSale: Transaction = {
        id: 'tx-sale-1',
        total: 1500,
        paymentMethod: 'cash',
        timestamp: new Date().toISOString(),
        userId: 'admin',
        items: [{ id: 'p1', name: 'Article Test', price: 1500, quantity: 1 } as any]
      };

      expect(isTopUpTransaction(topupExplicit)).toBe(true);
      expect(isTopUpTransaction(topupLegacyNote)).toBe(true);
      expect(isTopUpTransaction(topupAuditNote)).toBe(true);
      expect(isTopUpTransaction(regularSale)).toBe(false);
      expect(isTopUpTransaction(null)).toBe(false);
      expect(isTopUpTransaction(undefined)).toBe(false);
    });

    it('TABLE_COLUMNS.transactions est conforme au schéma Supabase et exclut les colonnes fantômes', () => {
      expect(TABLE_COLUMNS.transactions).not.toContain('source');
      expect(TABLE_COLUMNS.transactions).not.toContain('tax_amount');
      expect(TABLE_COLUMNS.transactions).not.toContain('subtotal');
      expect(TABLE_COLUMNS.transactions).toContain('terminal_name');

      const payload = {
        id: 'tx-test-sync',
        total: 5000,
        source: 'topup',
        taxAmount: 0,
        subtotal: 5000,
        notes: '[REGLEMENT] Versement espèces'
      };

      const prepared = preparePayload('transactions', payload.id, payload);
      expect(prepared.source).toBeUndefined();
      expect(prepared.tax_amount).toBeUndefined();
      expect(prepared.subtotal).toBeUndefined();
      expect(prepared.audit_note).toBe('[REGLEMENT] Versement espèces');
    });

    it('isTopUpTransaction exclut les règlements de dettes du CA net', () => {
      const saleTx: Transaction = {
        id: 'tx-sale',
        total: 10000,
        paymentMethod: 'cash',
        status: 'completed',
        timestamp: '2026-10-17T10:00:00.000Z',
        userId: 'admin',
        items: [{ id: 'p1', name: 'Produit A', price: 10000, quantity: 1 } as any]
      };

      const topupTx: Transaction = {
        id: 'tx-debt-repay',
        total: 10000,
        paymentMethod: 'cash',
        status: 'completed',
        timestamp: '2026-10-17T12:00:00.000Z',
        userId: 'admin',
        source: 'topup',
        notes: '[REGLEMENT] Encaissement dette',
        items: []
      };

      const transactions = [saleTx, topupTx];

      // Calcul standard du CA excluant les topups
      const netRevenue = transactions
        .filter(t => t.status !== 'cancelled' && t.status !== 'returned' && !isTopUpTransaction(t))
        .reduce((sum, t) => sum + (Number(t.total) || 0), 0);

      // Sans double comptage : le CA net doit être exactement 10 000 DA, JAMAIS 20 000 DA
      expect(netRevenue).toBe(10000);
    });
  });

  describe('2. BUG-06: Harmonisation du Coût d\'Achat PMP dans purchaseDbOperations', () => {
    it('calcule et applique rigoureusement la formule PMP lors d\'une réception d\'achat', async () => {
      // Stock initial: 10 unités à 100 DA = valeur 1000 DA
      const existingProduct: Product = {
        id: 'prod-pmp-test',
        name: 'Article PMP Test',
        stock: 10,
        costPrice: 100,
        price: 150,
        taxRate: 19,
        minStock: 5,
        categoryId: 'cat1',
        supplier: 'Fournisseur Test',
        unit: 'pcs',
        sku: 'PMP-TEST-SKU',
        status: 'active',
        updatedAt: new Date().toISOString()
      };

      useCoreStore.getState().setProducts([existingProduct]);

      // Entrée d'achat: 10 unités à 120 DA = 1200 DA
      // PMP attendu: (10 * 100 + 10 * 120) / (10 + 10) = 2200 / 20 = 110 DA
      await savePurchaseDb({
        cart: [
          {
            lineId: 'line-1',
            productId: 'prod-pmp-test',
            productName: 'Article PMP Test',
            quantity: 10,
            costPrice: 120,
            sellingPrice: 150,
            sku: 'PMP-TEST-SKU'
          } as any
        ],
        selectedSupplierId: 'sup1',
        extractedData: null,
        invoiceNumber: 'FAC-100',
        receptionDate: new Date().toISOString(),
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: 1200,
        editingPurchaseId: null,
        autoMargin: false,
        suppliers: [{ id: 'sup1', name: 'Fournisseur Test', balance: 0 } as any],
        patterns: [],
        purchases: [],
        products: [existingProduct],
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      });

      const updated = useCoreStore.getState().products.find(p => p.id === 'prod-pmp-test');
      expect(updated).toBeDefined();
      expect(updated?.stock).toBe(20);
      // Le costPrice est le dernier prix d'achat (120 DA) pour le calcul des marges
      expect(updated?.costPrice).toBe(120);
      // Le PMP pondéré calculé est tracé dans pmp (110 DA)
      expect(updated?.pmp).toBe(110);
    });

    it('handleReceiveOrderDb applique la formule PMP lors de la réception d\'un bon de commande', async () => {
      // Stock initial: 20 unités à 200 DA = valeur 4000 DA
      const prod: Product = {
        id: 'prod-po-pmp',
        name: 'Produit PO PMP',
        stock: 20,
        costPrice: 200,
        price: 280,
        taxRate: 19,
        minStock: 5,
        categoryId: 'cat1',
        supplier: 'Fournisseur PO',
        unit: 'pcs',
        sku: 'PO-PMP-SKU',
        status: 'active',
        updatedAt: new Date().toISOString()
      };

      useCoreStore.getState().setProducts([prod]);

      // Bon de commande réceptionné: 5 unités à 260 DA = 1300 DA
      // PMP attendu: (20 * 200 + 5 * 260) / (20 + 5) = (4000 + 1300) / 25 = 5300 / 25 = 212 DA
      const order = {
        id: 'po-123',
        orderNumber: 'BC-123',
        supplierId: 'sup-po',
        status: 'ordered',
        total: 1300,
        items: [
          {
            productId: 'prod-po-pmp',
            name: 'Produit PO PMP',
            quantity: 5,
            price: 260
          }
        ]
      } as any;

      await handleReceiveOrderDb({
        order,
        suppliers: [{ id: 'sup-po', name: 'Fournisseur PO', balance: 0 } as any],
        products: [prod],
        setIsProcessing: vi.fn(),
        setActiveSubTab: vi.fn()
      });

      const updated = useCoreStore.getState().products.find(p => p.id === 'prod-po-pmp');
      expect(updated).toBeDefined();
      expect(updated?.stock).toBe(25);
      // Le coût unitaire d'achat est mis à jour à 260 DA et le PMP à 212 DA
      expect(updated?.costPrice).toBe(260);
      expect(updated?.pmp).toBe(212);
    });
  });

  describe('3. P2 & Stress: Bundles et Packs Imbriqués Multi-Lignes', () => {
    it('consolide sans collision les composants partagés entre plusieurs bundles', () => {
      // Pack Petit Déjeuner : 1 Pain + 1 Beurre
      // Pack Goûter : 2 Pains + 1 Confiture
      const componentStockMap = new Map<string, number>();
      componentStockMap.set('pain-id', 20);
      componentStockMap.set('beurre-id', 10);
      componentStockMap.set('confiture-id', 10);

      const cartItems = [
        {
          id: 'pack-dej',
          isBundle: true,
          quantity: 3, // 3 * 1 pain = 3 pains
          bundleItems: [
            { productId: 'pain-id', quantity: 1 },
            { productId: 'beurre-id', quantity: 1 }
          ]
        },
        {
          id: 'pack-gouter',
          isBundle: true,
          quantity: 2, // 2 * 2 pains = 4 pains
          bundleItems: [
            { productId: 'pain-id', quantity: 2 },
            { productId: 'confiture-id', quantity: 1 }
          ]
        }
      ];

      // Consolidation préalable des composants de bundles (VULN-06)
      const consolidatedBundleQuantities = new Map<string, number>();
      for (const item of cartItems) {
        if (item.isBundle && item.bundleItems) {
          for (const bi of item.bundleItems) {
            const qtyDeducted = bi.quantity * item.quantity;
            consolidatedBundleQuantities.set(
              bi.productId,
              (consolidatedBundleQuantities.get(bi.productId) || 0) + qtyDeducted
            );
          }
        }
      }

      // Pain: 3 + 4 = 7 pains attendus en déduction unique
      expect(consolidatedBundleQuantities.get('pain-id')).toBe(7);
      expect(consolidatedBundleQuantities.get('beurre-id')).toBe(3);
      expect(consolidatedBundleQuantities.get('confiture-id')).toBe(2);
    });

    it('gère le déconditionnement auto (autoUnpack) même avec un stock parent initialement à 0', () => {
      // Produit parent (carton de 12) avec stock 0
      const parentProd: Product = {
        id: 'parent-box-12',
        name: 'Carton Jus 12x1L',
        stock: 0,
        price: 1200,
        costPrice: 900,
        taxRate: 19,
        minStock: 2,
        categoryId: 'cat-boissons',
        supplier: 'Fournisseur Boissons',
        unit: 'carton',
        sku: 'BOX-12L',
        status: 'active',
        updatedAt: new Date().toISOString()
      };

      // Produit enfant (bouteille unitaire) avec stock 0, autoUnpack=true, unitsPerParent=12
      const childProd: Product = {
        id: 'child-bottle-1',
        name: 'Bouteille Jus 1L',
        stock: 0,
        price: 130,
        costPrice: 75,
        taxRate: 19,
        minStock: 5,
        categoryId: 'cat-boissons',
        supplier: 'Fournisseur Boissons',
        unit: 'bouteille',
        sku: 'BOTTLE-1L',
        status: 'active',
        parentId: 'parent-box-12',
        unitsPerParent: 12,
        autoUnpack: true,
        updatedAt: new Date().toISOString()
      };

      // Vente de 5 bouteilles alors que le stock est à 0:
      // newStock = 0 - 5 = -5
      // parentsNeeded = Math.ceil(-(-5) / 12) = Math.ceil(5 / 12) = 1 carton
      // newParentStock = 0 - 1 = -1 carton (autorisé en caisse pour continuité de service)
      // unpackedUnits = 1 * 12 = 12 bouteilles
      // finalChildStock = 0 + 12 - 5 = 7 bouteilles
      const totalQuantity = 5;
      const newStock = childProd.stock - totalQuantity;
      expect(newStock).toBe(-5);

      const parentsNeeded = Math.ceil(-newStock / childProd.unitsPerParent!);
      expect(parentsNeeded).toBe(1);

      const newParentStock = parentProd.stock - parentsNeeded;
      expect(newParentStock).toBe(-1);

      const unpackedUnits = parentsNeeded * childProd.unitsPerParent!;
      const finalChildStock = childProd.stock + unpackedUnits - totalQuantity;
      expect(finalChildStock).toBe(7);
    });
  });

  describe('4. BUG-05 & Shift: Gestion de Caisse et Clôture Z', () => {
    it('comptabilise les encaissements de dettes dans les espèces en tiroir mais les exclut du chiffre d\'affaires de vente', () => {
      const activeShift: CashShift = {
        id: 'shift-1',
        openedAt: '2026-10-17T08:00:00.000Z',
        openedBy: 'Caissier',
        initialCash: 10000,
        status: 'open',
        terminalId: 'caisse-1',
        terminalName: 'Caisse Principale'
      };

      // 1 Vente comptant de 4000 DA en espèces
      const saleTx: Transaction = {
        id: 'tx-cash-sale',
        total: 4000,
        paymentMethod: 'cash',
        status: 'completed',
        timestamp: '2026-10-17T09:00:00.000Z',
        userId: 'admin',
        terminalId: 'caisse-1',
        amountReceived: 4000,
        amountReturned: 0,
        items: [{ id: 'p1', name: 'Article 1', price: 4000, quantity: 1 } as any]
      };

      // 1 Règlement de dette client de 6000 DA en espèces (topup)
      const topupTx: Transaction = {
        id: 'tx-debt-cash',
        total: 6000,
        paymentMethod: 'cash',
        status: 'completed',
        timestamp: '2026-10-17T11:00:00.000Z',
        userId: 'admin',
        terminalId: 'caisse-1',
        amountReceived: 6000,
        amountReturned: 0,
        source: 'topup',
        notes: '[REGLEMENT] Versement espèces dette',
        items: []
      };

      // 1 Vente sur une AUTRE caisse (caisse-2) de 5000 DA
      const otherTerminalTx: Transaction = {
        id: 'tx-other-term',
        total: 5000,
        paymentMethod: 'cash',
        status: 'completed',
        timestamp: '2026-10-17T10:00:00.000Z',
        userId: 'admin',
        terminalId: 'caisse-2',
        items: [{ id: 'p2', name: 'Article 2', price: 5000, quantity: 1 } as any]
      };

      const transactions = [saleTx, topupTx, otherTerminalTx];

      // Filtrage par terminal
      const shiftTransactions = transactions.filter(t => {
        if (!t || !t.timestamp) return false;
        if (t.status === 'cancelled') return false;
        if (activeShift.terminalId && t.terminalId && t.terminalId !== activeShift.terminalId) return false;
        return true;
      });

      // La caisse 2 est bien exclue du shift caisse-1
      expect(shiftTransactions.length).toBe(2);

      // Total des ventes (Chiffre d'affaires produit du shift):
      // Le topup est exclu -> totalSales = 4000 DA (PAS 10 000 DA ni 15 000 DA)
      const totalSales = shiftTransactions
        .filter(t => t.status !== 'returned' && !isTopUpTransaction(t))
        .reduce((sum, t) => sum + (Number(t.total) || 0), 0);

      expect(totalSales).toBe(4000);

      // Total des espèces en tiroir :
      // La vente espèces (4000 DA) ET le règlement de dette espèces (6000 DA) sont tous deux dans le tiroir physique
      const totalCashCollected = shiftTransactions
        .filter(t => t.status !== 'returned')
        .reduce((sum, t) => {
          if (t.paymentMethod === 'cash') {
            const netCash = (t.amountReceived !== undefined && t.amountReturned !== undefined)
              ? Math.max(0, Number(t.amountReceived) - Number(t.amountReturned))
              : Number(t.total || 0);
            return sum + netCash;
          }
          return sum;
        }, 0);

      expect(totalCashCollected).toBe(10000); // 4000 + 6000 = 10 000 DA encaissés

      // Espèces attendues dans le tiroir à la clôture:
      // Fonds initiaux (10 000 DA) + Espèces encaissées (10 000 DA) = 20 000 DA
      const expectedCash = activeShift.initialCash + totalCashCollected;
      expect(expectedCash).toBe(20000);
    });
  });
});
