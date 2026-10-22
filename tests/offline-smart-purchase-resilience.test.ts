import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCoreStore } from '../src/store/useCoreStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useFinanceStore } from '../src/store/useFinanceStore';
import {
  savePurchaseDb,
  handleDeletePurchaseDb,
  SavePurchaseParams
} from '../src/components/smart-purchase/purchaseDbOperations';
import { Product, Supplier, Purchase } from '../src/types';
import { PurchaseCartItem } from '../src/hooks/usePurchaseCart';
import { enqueueStockAdjustment } from '../src/services/SyncService';
import { toast } from 'sonner';

// 1. Mock idb-keyval
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
      })
    }
  };
});

// 4. Mock Supabase en panne réseau totale (OFFLINE / Failed to fetch)
vi.mock('../src/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      update: vi.fn(() => ({
        eq: vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      })),
      upsert: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      delete: vi.fn(() => ({
        eq: vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      })),
      select: vi.fn(() => ({
        eq: vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
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

describe('🛡️ Offline-First Smartphone Procurement Resilience (Sans Connexion / Failed to fetch)', () => {
  let mockSupplier: Supplier;
  let mockProduct: Product;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupplier = {
      id: 'sup-algerie-agro',
      name: 'GROUPE CEVITAL AGRO',
      phone: '0550123456',
      balance: 15000, // Dette initiale 15 000 DA
      updatedAt: new Date().toISOString()
    };

    mockProduct = {
      id: 'prod-couscous-1kg',
      name: 'Couscous Fin Sim 1kg',
      barcode: '6130001112223',
      sku: 'SIM-COUS-1K',
      costPrice: 120,
      price: 160,
      taxRate: 19,
      stock: 10, // Stock initial 10 unités
      minStock: 5,
      unit: 'pcs',
      categoryId: 'cat-epicerie',
      supplier: 'GROUPE CEVITAL AGRO',
      status: 'active',
      priceHistory: [],
      updatedAt: new Date().toISOString()
    };

    usePeopleStore.setState({ suppliers: [mockSupplier] });
    useCoreStore.setState({ products: [mockProduct] });
    useFinanceStore.setState({ purchases: [] });
  });

  it('1. Enregistre avec succès un approvisionnement hors-ligne même si Supabase lève Failed to fetch', async () => {
    const cart: PurchaseCartItem[] = [
      {
        lineId: 'line-offline-1',
        productId: mockProduct.id,
        productName: mockProduct.name,
        quantity: 25, // +25 unités
        costPrice: 130, // Nouveau coût d'achat
        taxRate: 0,
        discount: 0,
        isDraft: false
      }
    ];

    const params: SavePurchaseParams = {
      cart,
      selectedSupplierId: mockSupplier.id,
      extractedData: null,
      invoiceNumber: 'BL-OFFLINE-001',
      receptionDate: '2026-10-10',
      globalDiscount: 0,
      globalTax: 0,
      purchaseStatus: 'completed',
      paidAmount: 1000, // Total = 25 * 130 = 3 250 DA, payé 1 000 DA, reste 2 250 DA
      editingPurchaseId: null,
      autoMargin: false,
      suppliers: [mockSupplier],
      patterns: [],
      purchases: [],
      products: [mockProduct],
      setIsProcessing: vi.fn(),
      setLastPurchaseItems: vi.fn(),
      setStep: vi.fn()
    };

    // Exécuter l'approvisionnement en environnement réseau déconnecté
    await savePurchaseDb(params);

    // 1. Zéro toast.error d'échec réseau
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("enregistré avec succès")
    );

    // 2. Le bon d'achat est bien sauvegardé dans IndexedDB local (LocalDatabase)
    expect(localDb.insert).toHaveBeenCalled();
    const insertCalls = vi.mocked(localDb.insert).mock.calls;
    const purchaseCall = insertCalls.find(([path]) => path.startsWith('purchases/'));
    expect(purchaseCall).toBeDefined();
    expect(purchaseCall![1].invoiceNumber).toBe('BL-OFFLINE-001');
    expect(purchaseCall![1].total).toBe(3250);
    expect(purchaseCall![1].paidAmount).toBe(1000);

    // 3. Le stock physique local est bien incrémenté : 10 + 25 = 35 unités
    const productAfter = useCoreStore.getState().products.find(p => p.id === mockProduct.id);
    expect(productAfter).toBeDefined();
    expect(productAfter!.stock).toBe(35);
    expect(productAfter!.costPrice).toBe(130);

    // 4. La dette du fournisseur est mise à jour localement : 15 000 + 2 250 = 17 250 DA
    const supplierUpdateCalls = vi.mocked(localDb.update).mock.calls;
    const supCall = supplierUpdateCalls.find(([path]) => path === `suppliers/${mockSupplier.id}`);
    expect(supCall).toBeDefined();
    expect(supCall![1].balance).toBe(17250);

    // 5. La synchronisation asynchrone par delta relatif est bien mise en file d'attente
    expect(enqueueStockAdjustment).toHaveBeenCalledWith(mockProduct.id, 25);

    // 6. useFinanceStore est bien synchronisé
    const statePurchases = useFinanceStore.getState().purchases;
    expect(statePurchases.length).toBe(1);
    expect(statePurchases[0].invoiceNumber).toBe('BL-OFFLINE-001');
  });

  it('2. Annule et déstocke un bon d\'achat hors-ligne sans crash réseau', async () => {
    const existingPurchase: Purchase = {
      id: 'pur-to-delete-1',
      supplierId: mockSupplier.id,
      supplierName: mockSupplier.name,
      invoiceNumber: 'BL-TO-DEL-01',
      items: [
        {
          productId: mockProduct.id,
          name: mockProduct.name,
          quantity: 15,
          costPrice: 120
        }
      ],
      total: 1800,
      paidAmount: 800, // Reste 1 000 DA de dette
      paymentStatus: 'partial',
      status: 'completed',
      date: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z'
    };

    // Produit avec stock = 25 (dont 15 proviennent de ce bon)
    const productInStock = { ...mockProduct, stock: 25 };
    useCoreStore.setState({ products: [productInStock] });
    useFinanceStore.setState({ purchases: [existingPurchase] });
    usePeopleStore.setState({ suppliers: [{ ...mockSupplier, balance: 16000 }] });

    const setPurchaseToDelete = vi.fn();

    // Suppression en mode déconnecté
    await handleDeletePurchaseDb({
      purchaseId: 'pur-to-delete-1',
      setIsProcessing: vi.fn(),
      setPurchaseToDelete
    });

    // 1. Zéro erreur toast
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Bon d'achat supprimé")
    );

    // 2. Le bon est supprimé de localDb
    expect(localDb.delete).toHaveBeenCalledWith('purchases/pur-to-delete-1');

    // 3. Le stock physique a été déduit : 25 - 15 = 10
    const prodAfter = useCoreStore.getState().products.find(p => p.id === mockProduct.id);
    expect(prodAfter!.stock).toBe(10);

    // 4. Déstockage atomique en file d'attente
    expect(enqueueStockAdjustment).toHaveBeenCalledWith(mockProduct.id, -15);

    // 5. La dette fournisseur a été réduite de 1 000 DA : 16 000 - 1 000 = 15 000 DA
    const supAfter = vi.mocked(localDb.update).mock.calls.find(([path]) => path === `suppliers/${mockSupplier.id}`);
    expect(supAfter).toBeDefined();
    expect(supAfter![1].balance).toBe(15000);
  });
});
