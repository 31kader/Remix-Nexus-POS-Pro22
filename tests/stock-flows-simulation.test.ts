import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '../src/store/useCartStore';
import { useCoreStore } from '../src/store/useCoreStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useCheckoutProcess } from '../src/hooks/useCheckoutProcess';
import { useReturnModalLogic } from '../src/hooks/useReturnModalLogic';
import { destockOrder, restockOrder } from '../src/services/orderStockService';
import { CartItem, Product, OnlineOrder, Transaction, Customer, CompanySettings } from '../src/types';

// Mock SyncService et LocalDatabase pour observer et vérifier tous les deltas
vi.mock('../src/services/SyncService', () => ({
  enqueueStockAdjustment: vi.fn(),
  enqueueSync: vi.fn(),
  enqueueSyncBatch: vi.fn(),
  enqueueCustomerBalanceAdjustment: vi.fn(),
  sanitizePayloadForSupabase: vi.fn((_table, payload) => payload)
}));

vi.mock('../src/services/LocalDatabase', () => ({
  localDb: {
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    insertLocalOnly: vi.fn().mockResolvedValue(undefined),
    updateLocalOnly: vi.fn().mockResolvedValue(undefined),
    push: vi.fn(() => ({ key: 'gen-ret-' + Math.random().toString(36).substring(2, 7) })),
    get: vi.fn().mockResolvedValue({ exists: () => false, val: () => null })
  }
}));

// Mock Supabase
vi.mock('../src/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      })),
      select: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
    })),
    rpc: vi.fn().mockResolvedValue({ data: 10, error: null })
  }
}));

import { enqueueStockAdjustment, enqueueCustomerBalanceAdjustment } from '../src/services/SyncService';
import { localDb } from '../src/services/LocalDatabase';

describe('⚡ Simulation E2E des Mouvements de Stock Multi-Canal (4 Flux Métier)', () => {
  const mockSettings: CompanySettings = {
    name: 'Nexus POS Store',
    currency: 'DA',
    taxRate: 19,
    loyaltyPointsPerCurrencyUnit: 0.1,
    loyaltyPointValue: 0.01,
    allowNegativeStock: true
  } as CompanySettings;

  const mockCustomer: Customer = {
    id: 'cust-sim-01',
    name: 'Yacine Amrani',
    phone: '0550112233',
    loyaltyPoints: 50,
    balance: 1000,
    totalSpent: 5000,
    purchaseCount: 5,
    joinDate: new Date().toISOString()
  };

  // 1. Produit Unitaire Standard
  const productA: Product = {
    id: 'prod-A',
    name: 'Café Pur Arabica 250g',
    price: 400,
    costPrice: 250,
    taxRate: 19,
    stock: 20, // Stock initial: 20
    minStock: 5,
    categoryId: 'cat-cafe',
    supplier: 'Torréfacteur Alger',
    unit: 'paquet',
    sku: 'CAF-250',
    status: 'active',
    updatedAt: new Date().toISOString()
  };

  // 2. Composant de Pack / Bundle
  const productCompC: Product = {
    id: 'comp-C',
    name: 'Canette Soda 33cl',
    price: 80,
    costPrice: 50,
    taxRate: 19,
    stock: 40, // Stock initial: 40
    minStock: 10,
    categoryId: 'cat-boissons',
    supplier: 'Fournisseur Sodas',
    unit: 'canette',
    sku: 'SOD-33',
    status: 'active',
    updatedAt: new Date().toISOString()
  };

  // 3. Pack / Bundle composé de 4 Canettes
  const productPackB: Product = {
    id: 'pack-B',
    name: 'Pack 4 Canettes Soda',
    price: 300,
    costPrice: 200,
    taxRate: 19,
    stock: 0,
    minStock: 2,
    categoryId: 'cat-boissons',
    supplier: 'Fournisseur Sodas',
    unit: 'pack',
    sku: 'PACK-SOD-4',
    status: 'active',
    updatedAt: new Date().toISOString(),
    isBundle: true,
    bundleItems: [{ productId: 'comp-C', quantity: 4 }]
  };

  // 4. Produit en Ligne Dédié
  const productD: Product = {
    id: 'prod-D',
    name: 'Thé Vert Menthe 100g',
    price: 350,
    costPrice: 180,
    taxRate: 19,
    stock: 15, // Stock initial: 15
    minStock: 3,
    categoryId: 'cat-the',
    supplier: 'Importateur Thé',
    unit: 'boîte',
    sku: 'THE-100',
    status: 'active',
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Réinitialisation des stores globaux
    useCoreStore.setState({
      products: [
        { ...productA },
        { ...productCompC },
        { ...productPackB },
        { ...productD }
      ],
      settings: mockSettings
    });

    useCartStore.setState({
      posSessions: [{ id: 'sess-sim-1', name: 'Ticket Caisse', cart: [], selectedCustomer: mockCustomer }],
      activeSessionId: 'sess-sim-1',
      isWholesale: false,
      deliveryMethod: 'in_store'
    });

    useTransactionStore.setState({
      transactions: [],
      onlineOrders: [],
      activeShift: null
    });

    usePeopleStore.setState({
      customers: [{ ...mockCustomer }],
      suppliers: []
    });
  });

  // =========================================================================
  // FLUX 1 : Vente en caisse (POS Checkout)
  // =========================================================================
  describe('Flux 1 : Vente en Caisse (POS Checkout)', () => {
    it('décrémente exactement le stock local et émet des deltas atomiques négatifs pour unitaire et bundle', async () => {
      // Panier : 3x Café Arabica (Prod A) + 2x Pack Soda (Pack B = 2 * 4 = 8 Canettes Comp C)
      const cartItems: CartItem[] = [
        {
          ...productA,
          quantity: 3,
          cartItemId: 'item-cart-A'
        },
        {
          ...productPackB,
          quantity: 2,
          cartItemId: 'item-cart-B'
        }
      ];

      const totalVente = 3 * 400 + 2 * 300; // 1200 + 600 = 1800 DA
      const setCart = vi.fn();
      const setPosSessions = vi.fn();
      const setLastTransaction = vi.fn();
      const setShowSuccess = vi.fn();
      const printReceipt = vi.fn();

      const { result } = renderHook(() =>
        useCheckoutProcess({
          cart: cartItems,
          setCart,
          user: { uid: 'cashier-01', displayName: 'Samir Caisse' },
          profile: { role: 'cashier', displayName: 'Samir Caisse' },
          activeStaffId: 'staff-01',
          employees: [],
          selectedCustomer: mockCustomer,
          settings: mockSettings,
          deliveryMethod: 'in_store',
          products: useCoreStore.getState().products,
          receivedAmount: '1800',
          keepExcessInBalance: false,
          total: totalVente,
          discountAmount: 0,
          pointsDiscount: 0,
          voucherDiscount: 0,
          promotionToApply: null,
          useLoyaltyPoints: false,
          isWholesale: false,
          activeSessionId: 'sess-sim-1',
          setPosSessions,
          appliedVoucher: null,
          setLastTransaction,
          setShowSuccess,
          printReceipt
        })
      );

      await act(async () => {
        await result.current.handleCheckout('cash', false);
      });

      // 1. Vérification des appels d'ajustement de stock vers SyncService
      // Produit A : -3
      expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-A', -3);
      // Composant C du Pack B : -(2 packs * 4 canettes) = -8
      expect(enqueueStockAdjustment).toHaveBeenCalledWith('comp-C', -8);

      // 2. Vérification des mises à jour IndexedDB local-only (zéro écrasement Supabase)
      expect(localDb.updateLocalOnly).toHaveBeenCalledWith(
        'products/prod-A',
        expect.objectContaining({ stock: 17 }) // 20 - 3 = 17
      );
      expect(localDb.updateLocalOnly).toHaveBeenCalledWith(
        'products/comp-C',
        expect.objectContaining({ stock: 32 }) // 40 - 8 = 32
      );

      // 3. Vérification de la création de la transaction POS
      const txs = useTransactionStore.getState().transactions;
      expect(txs.length).toBe(1);
      expect(txs[0].total).toBe(1800);
      expect(txs[0].status).toBe('delivered');
      expect(txs[0].paymentMethod).toBe('cash');
      expect(localDb.insert).toHaveBeenCalledWith(
        expect.stringMatching(/^transactions\//),
        expect.objectContaining({ total: 1800 })
      );
    });
  });

  // =========================================================================
  // FLUX 2 : Commande en ligne (Confirmation / Expédition)
  // =========================================================================
  describe('Flux 2 : Commande en Ligne (Confirmation & Déstockage)', () => {
    it('déstocke atomiquement lors de la confirmation, verrouille syncedToPos et empêche tout double déstockage', async () => {
      const onlineOrder: OnlineOrder = {
        id: 'ord-online-555',
        externalOrderId: 'CMD-555',
        customerName: 'Karim Online',
        customerPhone: '0661001122',
        items: [
          {
            lineId: 'line-1',
            productId: 'prod-D',
            name: 'Thé Vert Menthe 100g',
            quantity: 2,
            price: 350
          },
          {
            lineId: 'line-2',
            productId: 'pack-B',
            name: 'Pack 4 Canettes Soda',
            quantity: 1,
            price: 300
          }
        ],
        total: 1000,
        status: 'pending',
        timestamp: new Date().toISOString(),
        paymentStatus: 'unpaid',
        source: 'online',
        syncedToPos: false
      };

      useTransactionStore.getState().setOnlineOrders([onlineOrder]);

      // Déstockage lors du passage à "confirmed"
      const result = await destockOrder(onlineOrder, { settings: mockSettings });
      expect(result.success).toBe(true);

      // 1. Vérification des stocks après déstockage
      const prodsAfter = useCoreStore.getState().products;
      const pD = prodsAfter.find(p => p.id === 'prod-D');
      const pC = prodsAfter.find(p => p.id === 'comp-C');
      expect(pD?.stock).toBe(13); // 15 - 2 = 13
      expect(pC?.stock).toBe(36); // 40 - (1 pack * 4) = 36

      // 2. Vérification des deltas émis vers SyncService
      expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-D', -2);
      expect(enqueueStockAdjustment).toHaveBeenCalledWith('comp-C', -4);

      // 3. Vérification du verrouillage syncedToPos: true
      const ordersAfter = useTransactionStore.getState().onlineOrders;
      const oAfter = ordersAfter.find(o => o.id === 'ord-online-555');
      expect(oAfter?.syncedToPos).toBe(true);

      // 4. Test d'idempotence stricte : un 2ème appel consécutif ne doit RIEN déstocker
      const secondCall = await destockOrder(oAfter!, { settings: mockSettings });
      expect(secondCall.success).toBe(true);
      expect(secondCall.reason).toBe('already_synced');

      // Les stocks doivent rester STRICTEMENT identiques
      const prodsAfter2 = useCoreStore.getState().products;
      expect(prodsAfter2.find(p => p.id === 'prod-D')?.stock).toBe(13);
      expect(prodsAfter2.find(p => p.id === 'comp-C')?.stock).toBe(36);
    });
  });

  // =========================================================================
  // FLUX 3 : Retour en caisse (POS Return)
  // =========================================================================
  describe('Flux 3 : Retour en Caisse (POS Return)', () => {
    it('réintègre exactement le stock retourné (+qty) et met à jour le statut de la vente', async () => {
      // Configuration d'une vente initiale de 3x Café Arabica (Prod A, stock actuel 17)
      const txId = 'tx-return-test-100';
      const initialTx: Transaction = {
        id: txId,
        items: [
          {
            ...productA,
            quantity: 3,
            cartItemId: 'item-sold-A'
          }
        ],
        total: 1200,
        paymentMethod: 'cash',
        deliveryMethod: 'in_store',
        status: 'delivered',
        timestamp: new Date().toISOString(),
        userId: 'cashier-01',
        customerId: mockCustomer.id,
        pointsEarned: 120
      };

      useTransactionStore.getState().setTransactions([initialTx]);
      // Stock actuel avant retour : 17
      useCoreStore.getState().setProducts([{ ...productA, stock: 17 }]);

      // Retour partiel : 2 Café retournés sur les 3
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useReturnModalLogic({
          isOpen: true,
          onClose,
          transaction: initialTx,
          user: { uid: 'cashier-01' },
          products: useCoreStore.getState().products,
          customers: [mockCustomer],
          settings: mockSettings,
          allReturns: []
        })
      );

      // Définir la quantité retournée à 2
      act(() => {
        result.current.setReturnItems([
          {
            ...productA,
            availableToReturn: 3,
            returnQuantity: 2 // On retourne 2 articles
          }
        ]);
        result.current.setReason('Erreur de commande client');
        result.current.setReturnType('refund');
        result.current.setRestockItems(true);
      });

      await act(async () => {
        await result.current.handleReturn();
      });

      // 1. Vérification que le delta positif (+2) a été émis
      expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-A', 2);

      // 2. Vérification que le stock local a augmenté de 2 (17 -> 19)
      const prodAfterReturn = useCoreStore.getState().products.find(p => p.id === 'prod-A');
      expect(prodAfterReturn?.stock).toBe(19);

      // 3. Vérification de l'enregistrement du retour et du statut partiellement retourné
      expect(localDb.insert).toHaveBeenCalledWith(
        expect.stringMatching(/^returns\//),
        expect.objectContaining({
          transactionId: txId,
          totalRefund: 800, // 2 * 400 DA
          type: 'refund'
        })
      );

      expect(localDb.updateLocalOnly).toHaveBeenCalledWith(
        `transactions/${txId}`,
        expect.objectContaining({
          status: 'partially_returned'
        })
      );
    });
  });

  // =========================================================================
  // FLUX 4 : Annulation de Commande en Ligne (Rollback & Restock)
  // =========================================================================
  describe('Flux 4 : Annulation de Commande en Ligne (Rollback & Restock)', () => {
    it('réintègre exactement le stock et annule la transaction si préalablement déstockée', async () => {
      // Préparer une commande confirmée et déstockée
      const orderConfirmed: OnlineOrder = {
        id: 'ord-online-777',
        externalOrderId: 'CMD-777',
        customerName: 'Fatima Zohra',
        items: [
          {
            lineId: 'l-1',
            productId: 'prod-D',
            name: 'Thé Vert Menthe 100g',
            quantity: 3,
            price: 350
          }
        ],
        total: 1050,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        paymentStatus: 'unpaid',
        source: 'online',
        syncedToPos: true // Déjà déstockée !
      };

      // Transaction active liée créée lors de la confirmation
      const linkedTx: Transaction = {
        id: 'tx-online-777',
        onlineOrderId: 'ord-online-777',
        items: [
          {
            ...productD,
            quantity: 3,
            cartItemId: 'item-online-tx'
          }
        ],
        total: 1050,
        paymentMethod: 'cash',
        deliveryMethod: 'delivery',
        status: 'completed',
        timestamp: new Date().toISOString(),
        userId: 'online_system',
        pointsEarned: 105,
        customerId: mockCustomer.id,
        notes: 'Commande en Ligne #CMD-777 (Confirmée)'
      };

      useTransactionStore.getState().setOnlineOrders([orderConfirmed]);
      useTransactionStore.getState().setTransactions([linkedTx]);
      // Stock actuel après déstockage précédent : 12 (15 - 3)
      useCoreStore.getState().setProducts([{ ...productD, stock: 12 }]);

      // Annulation de la commande via restockOrder()
      const restockResult = await restockOrder(orderConfirmed, { customers: [mockCustomer] });
      expect(restockResult.success).toBe(true);

      // 1. Vérification que le stock est exactement restauré à 15 (12 + 3)
      const prodAfter = useCoreStore.getState().products.find(p => p.id === 'prod-D');
      expect(prodAfter?.stock).toBe(15);

      // 2. Vérification que le delta positif (+3) a été transmis à SyncService
      expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-D', 3);

      // 3. Vérification que la transaction liée est passée à status: 'cancelled'
      const updatedTxs = useTransactionStore.getState().transactions;
      const txAfter = updatedTxs.find(t => t.id === 'tx-online-777');
      expect(txAfter?.status).toBe('cancelled');
      expect(localDb.updateLocalOnly).toHaveBeenCalledWith('transactions/tx-online-777', { status: 'cancelled' });

      // 4. Vérification que les points fidélité ont été retirés par delta négatif
      expect(enqueueCustomerBalanceAdjustment).toHaveBeenCalledWith(
        mockCustomer.id,
        0,
        -1050,
        -105
      );

      // 5. Vérification que la commande repasse à syncedToPos: false
      const updatedOrders = useTransactionStore.getState().onlineOrders;
      const orderAfter = updatedOrders.find(o => o.id === 'ord-online-777');
      expect(orderAfter?.syncedToPos).toBe(false);
    });

    it('GARDE DE SÉCURITÉ : refuse tout restock (+0) si la commande n’a jamais été déstockée', async () => {
      // Commande en attente (jamais confirmée, jamais déstockée)
      const orderPending: OnlineOrder = {
        id: 'ord-online-999',
        externalOrderId: 'CMD-999',
        customerName: 'Client Inconnu',
        items: [
          {
            lineId: 'l-9',
            productId: 'prod-D',
            name: 'Thé Vert Menthe 100g',
            quantity: 5,
            price: 350
          }
        ],
        total: 1750,
        status: 'pending',
        timestamp: new Date().toISOString(),
        paymentStatus: 'unpaid',
        source: 'online',
        syncedToPos: false // Jamais déstockée !
      };

      useTransactionStore.getState().setOnlineOrders([orderPending]);
      useTransactionStore.getState().setTransactions([]); // 0 transaction liée
      useCoreStore.getState().setProducts([{ ...productD, stock: 15 }]);

      // Annulation directe d'une commande 'pending'
      const restockResult = await restockOrder(orderPending);
      expect(restockResult.success).toBe(true);
      expect(restockResult.reason).toBe('not_destocked');

      // Le stock ne doit ABSOLUMENT PAS augmenter ! (Garde P0-2 anti-inflation)
      const prodAfter = useCoreStore.getState().products.find(p => p.id === 'prod-D');
      expect(prodAfter?.stock).toBe(15);
      expect(enqueueStockAdjustment).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SCÉNARIO COMPLET COMBINÉ (Cycle de vie circulaire sans perte)
  // =========================================================================
  describe('Cycle Circulaire Multi-Canal Complet (Zéro Dérive)', () => {
    it('garantit la neutralité parfaite du stock sur une séquence Vente -> Commande -> Retour -> Annulation', async () => {
      const stockDepart = 100;
      const prodCirculaire: Product = {
        id: 'prod-cycle',
        name: 'Produit Circulaire',
        price: 500,
        costPrice: 300,
        taxRate: 19,
        stock: stockDepart,
        minStock: 10,
        categoryId: 'cat-cycle',
        supplier: 'Fournisseur Cycle',
        unit: 'pièce',
        sku: 'CYC-01',
        status: 'active',
        updatedAt: new Date().toISOString()
      };

      useCoreStore.getState().setProducts([prodCirculaire]);

      // Étape A : Vente caisse de 10 unités
      // -------------------------------------------------------------
      const cartItem: CartItem = { ...prodCirculaire, quantity: 10, cartItemId: 'item-c1' };
      const { result: checkoutResult } = renderHook(() =>
        useCheckoutProcess({
          cart: [cartItem],
          setCart: vi.fn(),
          user: { uid: 'u1' },
          profile: { role: 'admin' },
          activeStaffId: 's1',
          employees: [],
          selectedCustomer: null,
          settings: mockSettings,
          deliveryMethod: 'in_store',
          products: useCoreStore.getState().products,
          receivedAmount: '5000',
          keepExcessInBalance: false,
          total: 5000,
          discountAmount: 0,
          pointsDiscount: 0,
          voucherDiscount: 0,
          promotionToApply: null,
          useLoyaltyPoints: false,
          isWholesale: false,
          activeSessionId: 'sess-sim-1',
          setPosSessions: vi.fn(),
          appliedVoucher: null,
          setLastTransaction: vi.fn(),
          setShowSuccess: vi.fn(),
          printReceipt: vi.fn()
        })
      );

      await act(async () => {
        await checkoutResult.current.handleCheckout('cash', false);
      });

      // Stock après vente = 90
      expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-cycle', -10);
      useCoreStore.getState().setProducts([{ ...prodCirculaire, stock: 90 }]);

      // Étape B : Commande en ligne confirmée de 15 unités
      // -------------------------------------------------------------
      const orderB: OnlineOrder = {
        id: 'ord-b',
        externalOrderId: 'CMD-B',
        customerName: 'Client B',
        items: [{ lineId: 'lb', productId: 'prod-cycle', name: 'Produit Circulaire', quantity: 15, price: 500 }],
        total: 7500,
        status: 'pending',
        timestamp: new Date().toISOString(),
        paymentStatus: 'unpaid',
        source: 'online',
        syncedToPos: false
      };
      useTransactionStore.getState().setOnlineOrders([orderB]);

      await destockOrder(orderB, { settings: mockSettings });
      // Stock après déstockage commande en ligne = 90 - 15 = 75
      expect(useCoreStore.getState().products.find(p => p.id === 'prod-cycle')?.stock).toBe(75);
      expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-cycle', -15);

      // Étape C : Retour en caisse partiel de 5 unités
      // -------------------------------------------------------------
      const txVente = useTransactionStore.getState().transactions[0];
      const { result: returnResult } = renderHook(() =>
        useReturnModalLogic({
          isOpen: true,
          onClose: vi.fn(),
          transaction: txVente,
          user: { uid: 'u1' },
          products: useCoreStore.getState().products,
          customers: [],
          settings: mockSettings,
          allReturns: []
        })
      );

      act(() => {
        returnResult.current.setReturnItems([
          { ...prodCirculaire, availableToReturn: 10, returnQuantity: 5 }
        ]);
        returnResult.current.setRestockItems(true);
      });

      await act(async () => {
        await returnResult.current.handleReturn();
      });

      // Stock après retour = 75 + 5 = 80
      expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-cycle', 5);
      expect(useCoreStore.getState().products.find(p => p.id === 'prod-cycle')?.stock).toBe(80);

      // Étape D : Annulation de la commande en ligne (restock de 15 unités)
      // -------------------------------------------------------------
      const freshOrderB = useTransactionStore.getState().onlineOrders.find(o => o.id === 'ord-b')!;
      await restockOrder(freshOrderB);

      // Stock après annulation commande = 80 + 15 = 95
      expect(enqueueStockAdjustment).toHaveBeenCalledWith('prod-cycle', 15);
      expect(useCoreStore.getState().products.find(p => p.id === 'prod-cycle')?.stock).toBe(95);

      // Étape E : Retour des 5 unités restantes de la vente caisse
      // -------------------------------------------------------------
      const { result: finalReturnResult } = renderHook(() =>
        useReturnModalLogic({
          isOpen: true,
          onClose: vi.fn(),
          transaction: txVente,
          user: { uid: 'u1' },
          products: useCoreStore.getState().products,
          customers: [],
          settings: mockSettings,
          allReturns: []
        })
      );

      act(() => {
        finalReturnResult.current.setReturnItems([
          { ...prodCirculaire, availableToReturn: 5, returnQuantity: 5 }
        ]);
        finalReturnResult.current.setRestockItems(true);
      });

      await act(async () => {
        await finalReturnResult.current.handleReturn();
      });

      // Stock final = 95 + 5 = 100 (Restitution absolue et intégrale du stock de départ !)
      expect(useCoreStore.getState().products.find(p => p.id === 'prod-cycle')?.stock).toBe(stockDepart);
    });
  });
});
