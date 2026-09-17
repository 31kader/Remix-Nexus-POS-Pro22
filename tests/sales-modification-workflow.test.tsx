import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCartStore } from '../src/store/useCartStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { Transaction, CartItem, Customer, Product, CompanySettings } from '../src/types';
import { useCheckoutProcess } from '../src/hooks/useCheckoutProcess';
import { renderHook, act } from '@testing-library/react';

// Mock SyncService and LocalDatabase to inspect calls
vi.mock('../src/services/SyncService', () => ({
  enqueueStockAdjustment: vi.fn(),
  enqueueSync: vi.fn(),
  enqueueSyncBatch: vi.fn()
}));

vi.mock('../src/services/LocalDatabase', () => ({
  localDb: {
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ exists: () => false, val: () => null })
  }
}));

import { enqueueStockAdjustment } from '../src/services/SyncService';
import { localDb } from '../src/services/LocalDatabase';

describe('Workflow Modification de Vente en Caisse (Anti-Doublon & Différentiel)', () => {
  const originalTxId = 'tx-edit-test-999';

  const mockOriginalItems: CartItem[] = [
    {
      id: 'prod-1',
      name: 'Café Arabica',
      price: 200,
      costPrice: 100,
      taxRate: 19,
      stock: 50,
      minStock: 5,
      categoryId: 'cat1',
      supplier: 'Fournisseur A',
      unit: 'pcs',
      sku: 'SKU01',
      status: 'active',
      updatedAt: new Date().toISOString(),
      quantity: 2, // Total 400 DA
      cartItemId: 'item-orig-1'
    },
    {
      id: 'prod-2',
      name: 'Sucre 1kg',
      price: 100,
      costPrice: 60,
      taxRate: 19,
      stock: 20,
      minStock: 2,
      categoryId: 'cat1',
      supplier: 'Fournisseur B',
      unit: 'pcs',
      sku: 'SKU02',
      status: 'active',
      updatedAt: new Date().toISOString(),
      quantity: 3, // Total 300 DA
      cartItemId: 'item-orig-2'
    }
  ];

  const mockCustomer: Customer = {
    id: 'cust-100',
    name: 'Karim Client',
    phone: '0555000000',
    loyaltyPoints: 100,
    balance: 500,
    totalSpent: 700,
    joinDate: new Date().toISOString()
  };

  const mockOriginalTransaction: Transaction = {
    id: originalTxId,
    timestamp: '2026-09-01T10:00:00.000Z',
    items: mockOriginalItems,
    total: 700,
    paymentMethod: 'cash',
    status: 'delivered',
    userId: 'cashier-1',
    customerId: 'cust-100',
    customerName: 'Karim Client',
    pointsEarned: 70
  };

  const mockProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'Café Arabica',
      price: 200,
      costPrice: 100,
      taxRate: 19,
      stock: 48, // was 50, -2 sold previously
      minStock: 5,
      categoryId: 'cat1',
      supplier: 'Fournisseur A',
      unit: 'pcs',
      sku: 'SKU01',
      status: 'active',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-2',
      name: 'Sucre 1kg',
      price: 100,
      costPrice: 60,
      taxRate: 19,
      stock: 17, // was 20, -3 sold previously
      minStock: 2,
      categoryId: 'cat1',
      supplier: 'Fournisseur B',
      unit: 'pcs',
      sku: 'SKU02',
      status: 'active',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-3',
      name: 'Lait UHT 1L',
      price: 120,
      costPrice: 80,
      taxRate: 19,
      stock: 30,
      minStock: 5,
      categoryId: 'cat1',
      supplier: 'Fournisseur C',
      unit: 'pcs',
      sku: 'SKU03',
      status: 'active',
      updatedAt: new Date().toISOString()
    }
  ];

  const mockSettings: CompanySettings = {
    name: 'Nexus Store',
    currency: 'DA',
    taxRate: 19,
    loyaltyPointsPerCurrencyUnit: 0.1,
    loyaltyPointValue: 0.01,
    address: 'Alger, Algérie',
    phone: '0550000000',
    email: 'contact@nexus.dz',
    taxNumber: '123456789'
  } as CompanySettings;

  beforeEach(() => {
    vi.clearAllMocks();

    useCartStore.setState({
      posSessions: [{ id: 'session-1', name: 'Ticket 1', cart: [], selectedCustomer: null, editingTransaction: null }],
      activeSessionId: 'session-1',
      isWholesale: false,
      deliveryMethod: 'in_store'
    });

    useTransactionStore.setState({
      transactions: [mockOriginalTransaction],
      activeShift: null
    });

    usePeopleStore.setState({
      customers: [mockCustomer],
      suppliers: []
    });
  });

  it('1. loadTransactionToCart configure la session en mode modification avec signalétique visuelle', () => {
    const setActiveTab = vi.fn();
    useCartStore.getState().loadTransactionToCart(mockOriginalTransaction, setActiveTab);

    const session = useCartStore.getState().posSessions[0];
    expect(setActiveTab).toHaveBeenCalledWith('checkout');
    expect(session.name).toContain('(Modif)');
    expect(session.name).toContain(originalTxId.slice(-6).toUpperCase());
    expect(session.editingTransaction).toEqual(mockOriginalTransaction);
    expect(session.cart.length).toBe(2);
    expect(session.selectedCustomer?.id).toBe('cust-100');
    expect(useCartStore.getState().getEditingTransaction()?.id).toBe(originalTxId);
  });

  it('2. cancelEditTransaction réinitialise le panier et retire editingTransaction', () => {
    const setActiveTab = vi.fn();
    useCartStore.getState().loadTransactionToCart(mockOriginalTransaction, setActiveTab);

    expect(useCartStore.getState().getEditingTransaction()).not.toBeNull();

    useCartStore.getState().cancelEditTransaction();

    const session = useCartStore.getState().posSessions[0];
    expect(session.editingTransaction).toBeNull();
    expect(session.cart.length).toBe(0);
    expect(session.selectedCustomer).toBeNull();
    expect(session.name).toBe('Ticket 1');
  });

  it('3. useCheckoutProcess met à jour la vente existante SANS créer de doublon', async () => {
    // Modifier le panier :
    // - prod-1 (Café) : de 2 à 3 (+1 vendu)
    // - prod-2 (Sucre) : retiré du panier (3 réintégrés en stock)
    // - prod-3 (Lait) : nouveau produit ajouté (2 vendus)
    const modifiedCart: CartItem[] = [
      {
        ...mockOriginalItems[0],
        quantity: 3 // +1 par rapport à 2
      },
      {
        id: 'prod-3',
        name: 'Lait UHT 1L',
        price: 120,
        costPrice: 80,
        taxRate: 19,
        stock: 30,
        minStock: 5,
        categoryId: 'cat1',
        supplier: 'Fournisseur C',
        unit: 'pcs',
        sku: 'SKU03',
        status: 'active',
        updatedAt: new Date().toISOString(),
        quantity: 2, // Nouveau
        cartItemId: 'item-new-3'
      }
    ];

    // Nouveau total: 3 * 200 (Café) + 2 * 120 (Lait) = 600 + 240 = 840 DA (Ancien total: 700 DA)
    const newTotal = 840;
    const setCart = vi.fn();
    const setPosSessions = vi.fn();
    const setLastTransaction = vi.fn();
    const setShowSuccess = vi.fn();
    const printReceipt = vi.fn();

    const { result } = renderHook(() =>
      useCheckoutProcess({
        cart: modifiedCart,
        setCart,
        user: { uid: 'cashier-1', displayName: 'Caissier Pro' },
        profile: { role: 'cashier', displayName: 'Caissier Pro' },
        activeStaffId: 'staff-1',
        employees: [],
        selectedCustomer: mockCustomer,
        settings: mockSettings,
        deliveryMethod: 'in_store',
        products: mockProducts,
        receivedAmount: '840',
        keepExcessInBalance: false,
        total: newTotal,
        discountAmount: 0,
        pointsDiscount: 0,
        voucherDiscount: 0,
        promotionToApply: null,
        useLoyaltyPoints: false,
        isWholesale: false,
        activeSessionId: 'session-1',
        setPosSessions,
        appliedVoucher: null,
        setLastTransaction,
        setShowSuccess,
        printReceipt,
        editingTransaction: mockOriginalTransaction
      })
    );

    await act(async () => {
      await result.current.handleCheckout('cash', false);
    });

    // A. VÉRIFICATION ANTI-DOUBLON : localDb.insert JAMAIS appelé pour une transaction !
    const transactionInsertCalls = (localDb.insert as any).mock.calls.filter((call: any[]) =>
      typeof call[0] === 'string' && call[0].startsWith('transactions')
    );
    expect(transactionInsertCalls.length).toBe(0);
    expect(localDb.update).toHaveBeenCalledWith(
      `transactions/${originalTxId}`,
      expect.objectContaining({
        id: originalTxId,
        isEdited: true,
        originalTotal: 700,
        total: 840,
        editedBy: 'Caissier Pro'
      })
    );

    // B. VÉRIFICATION DU STORE DE TRANSACTIONS : toujours 1 seule transaction, pas de doublon
    const transactions = useTransactionStore.getState().transactions;
    expect(transactions.length).toBe(1);
    expect(transactions[0].id).toBe(originalTxId);
    expect(transactions[0].isEdited).toBe(true);
    expect(transactions[0].total).toBe(840);

    // C. VÉRIFICATION DIFFÉRENTIEL DES STOCKS :
    // - prod-1 (Café) : delta = 3 - 2 = +1 -> enqueueStockAdjustment('prod-1', -1)
    // - prod-2 (Sucre) : delta = 0 - 3 = -3 -> enqueueStockAdjustment('prod-2', 3) (réintégration)
    // - prod-3 (Lait) : delta = 2 - 0 = +2 -> enqueueStockAdjustment('prod-3', -2)
    expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-1', -1);
    expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-2', 3);
    expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-3', -2);

    // D. VÉRIFICATION DIFFÉRENTIEL CLIENT :
    // Ancien total = 700 DA, nouveau total = 840 DA -> deltaSpent = +140 DA
    // TotalSpent initial = 700 DA -> Final = 840 DA (pas 700 + 840 = 1540 DA !)
    const updatedCust = usePeopleStore.getState().customers.find(c => c.id === 'cust-100');
    expect(updatedCust?.totalSpent).toBe(700 + (840 - 700)); // 840 DA
    expect(localDb.update).toHaveBeenCalledWith(
      'customers/cust-100',
      expect.objectContaining({
        deltaSpent: 140,
        totalSpent: 840
      })
    );
  });
});
