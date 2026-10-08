import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isTransactionMatchingOrder, destockOrder, restockOrder } from '../src/services/orderStockService';
import { useCoreStore } from '../src/store/useCoreStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { OnlineOrder, Product, Transaction, Customer } from '../src/types';

describe('Order Stock Lifecycle & Integrity Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCoreStore.getState().setProducts([]);
    useTransactionStore.getState().setOnlineOrders([]);
    useTransactionStore.getState().setTransactions([]);
    usePeopleStore.getState().setCustomers([]);
  });

  describe('isTransactionMatchingOrder', () => {
    it('should accurately match when onlineOrderId equals order.id', () => {
      const order = { id: '201', items: [], total: 100 } as unknown as OnlineOrder;
      const tx = { id: 'tx-1', onlineOrderId: '201', notes: 'Commande en Ligne #201' } as Transaction;
      expect(isTransactionMatchingOrder(tx, order)).toBe(true);
    });

    it('should NOT match order #2 with notes of order #201 or #20 (anti-substring collision P1-3)', () => {
      const order2 = { id: '2', items: [], total: 50 } as unknown as OnlineOrder;
      const tx201 = { id: 'tx-201', onlineOrderId: '201', notes: 'Commande en Ligne #201 (Confirmée)' } as Transaction;
      const tx20 = { id: 'tx-20', onlineOrderId: '20', notes: 'Commande #20' } as Transaction;

      expect(isTransactionMatchingOrder(tx201, order2)).toBe(false);
      expect(isTransactionMatchingOrder(tx20, order2)).toBe(false);
    });

    it('should match correctly when notes contain bounded #2 token', () => {
      const order2 = { id: '2', items: [], total: 50 } as unknown as OnlineOrder;
      const tx2 = { id: 'tx-2', onlineOrderId: '', notes: 'Commande #2 (Confirmée)' } as Transaction;

      expect(isTransactionMatchingOrder(tx2, order2)).toBe(true);
    });
  });

  describe('Destock and Restock Lifecycle (Option 1)', () => {
    it('confirmer puis annuler une commande avec stock initial 0 ramène le stock exactement à 0', async () => {
      const testProduct: Product = {
        id: 'prod-test-0',
        name: 'Produit Test 0',
        stock: 0,
        price: 1000,
        costPrice: 500,
        minStock: 2,
        categoryId: 'cat-1',
        unit: 'pièce',
        status: 'active'
      };

      useCoreStore.getState().setProducts([testProduct]);

      const order: OnlineOrder = {
        id: 'order-101',
        externalOrderId: '101',
        customerName: 'Client Test',
        items: [{
          lineId: 'l1',
          productId: 'prod-test-0',
          name: 'Produit Test 0',
          quantity: 1,
          price: 1000
        }],
        total: 1000,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        paymentStatus: 'unpaid',
        source: 'online',
        syncedToPos: false
      };

      useTransactionStore.getState().setOnlineOrders([order]);

      // 1. Déstockage (Confirmation)
      const destockResult = await destockOrder(order);
      expect(destockResult.success).toBe(true);

      const prodsAfterDestock = useCoreStore.getState().products;
      const prodAfter = prodsAfterDestock.find(p => p.id === 'prod-test-0');
      expect(prodAfter?.stock).toBe(-1); // Option 1 : stock négatif permis

      // Vérifier que la commande est maintenant marquée syncedToPos: true
      const ordersAfterDestock = useTransactionStore.getState().onlineOrders;
      const orderAfter = ordersAfterDestock.find(o => o.id === 'order-101');
      expect(orderAfter?.syncedToPos).toBe(true);

      // 2. Annulation
      const restockResult = await restockOrder(orderAfter!);
      expect(restockResult.success).toBe(true);

      const prodsAfterRestock = useCoreStore.getState().products;
      const prodRestocked = prodsAfterRestock.find(p => p.id === 'prod-test-0');
      // Le stock DOIT être revenu exactement à 0, et NON +1 !
      expect(prodRestocked?.stock).toBe(0);

      const ordersAfterRestock = useTransactionStore.getState().onlineOrders;
      const orderCancelled = ordersAfterRestock.find(o => o.id === 'order-101');
      expect(orderCancelled?.syncedToPos).toBe(false);
    });

    it('annuler une commande en attente (pending / non déstockée) ne doit PAS ajouter de stock fantôme (P0-2)', async () => {
      const initialStock = 5;
      const testProduct: Product = {
        id: 'prod-test-5',
        name: 'Produit 5',
        stock: initialStock,
        price: 500,
        costPrice: 200,
        minStock: 2,
        categoryId: 'cat-1',
        unit: 'pièce',
        status: 'active'
      };

      useCoreStore.getState().setProducts([testProduct]);

      const pendingOrder: OnlineOrder = {
        id: 'order-pending-1',
        externalOrderId: '999',
        customerName: 'Client En Attente',
        items: [{
          lineId: 'l1',
          productId: 'prod-test-5',
          name: 'Produit 5',
          quantity: 2,
          price: 500
        }],
        total: 1000,
        status: 'pending',
        timestamp: new Date().toISOString(),
        paymentStatus: 'unpaid',
        source: 'online',
        syncedToPos: false // N'A JAMAIS ÉTÉ DÉSTOCKÉE
      };

      useTransactionStore.getState().setOnlineOrders([pendingOrder]);

      // Tentative d'annulation
      const restockRes = await restockOrder(pendingOrder);
      expect(restockRes.reason).toBe('not_destocked');

      // Le stock ne doit pas avoir bougé !
      const currentProd = useCoreStore.getState().products.find(p => p.id === 'prod-test-5');
      expect(currentProd?.stock).toBe(initialStock);
    });

    it('la double annulation doit être idempotente et ne pas réintégrer deux fois (P0-3)', async () => {
      const testProduct: Product = {
        id: 'prod-idem',
        name: 'Produit Idempotent',
        stock: 10,
        price: 200,
        costPrice: 100,
        minStock: 1,
        categoryId: 'cat-1',
        unit: 'pièce',
        status: 'active'
      };

      useCoreStore.getState().setProducts([testProduct]);

      const order: OnlineOrder = {
        id: 'order-idem-1',
        externalOrderId: '555',
        customerName: 'Client Idem',
        items: [{
          lineId: 'l1',
          productId: 'prod-idem',
          name: 'Produit Idempotent',
          quantity: 3,
          price: 200
        }],
        total: 600,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        paymentStatus: 'unpaid',
        source: 'online',
        syncedToPos: false
      };

      useTransactionStore.getState().setOnlineOrders([order]);

      // 1. Déstockage (10 - 3 = 7)
      await destockOrder(order);
      expect(useCoreStore.getState().products.find(p => p.id === 'prod-idem')?.stock).toBe(7);

      const orderAfterDestock = useTransactionStore.getState().onlineOrders.find(o => o.id === 'order-idem-1')!;

      // 2. Première annulation (7 + 3 = 10)
      await restockOrder(orderAfterDestock);
      expect(useCoreStore.getState().products.find(p => p.id === 'prod-idem')?.stock).toBe(10);

      const orderAfterFirstCancel = useTransactionStore.getState().onlineOrders.find(o => o.id === 'order-idem-1')!;

      // 3. Deuxième annulation immédiate (doit être ignorée car déjà restockée et non syncedToPos)
      await restockOrder(orderAfterFirstCancel);
      expect(useCoreStore.getState().products.find(p => p.id === 'prod-idem')?.stock).toBe(10);
    });

    it('gère correctement les bundles (déstockage et réintégration des composants)', async () => {
      const compA: Product = { id: 'comp-a', name: 'Composant A', stock: 10, price: 100, costPrice: 50, minStock: 1, categoryId: 'cat', unit: 'u', status: 'active' };
      const compB: Product = { id: 'comp-b', name: 'Composant B', stock: 10, price: 150, costPrice: 70, minStock: 1, categoryId: 'cat', unit: 'u', status: 'active' };
      const bundlePack: Product = {
        id: 'bundle-pack',
        name: 'Pack Duo',
        stock: 0,
        price: 200,
        costPrice: 120,
        minStock: 1,
        categoryId: 'cat',
        unit: 'pack',
        status: 'active',
        isBundle: true,
        bundleItems: [
          { productId: 'comp-a', quantity: 2 },
          { productId: 'comp-b', quantity: 1 }
        ]
      };

      useCoreStore.getState().setProducts([compA, compB, bundlePack]);

      const bundleOrder: OnlineOrder = {
        id: 'order-bundle-1',
        externalOrderId: '777',
        customerName: 'Client Pack',
        items: [{
          lineId: 'l1',
          productId: 'bundle-pack',
          name: 'Pack Duo',
          quantity: 2, // 2 packs = 4 compA et 2 compB
          price: 200
        }],
        total: 400,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        paymentStatus: 'unpaid',
        source: 'online',
        syncedToPos: false
      };

      useTransactionStore.getState().setOnlineOrders([bundleOrder]);

      // Déstockage : compA passe de 10 à 6 (-4), compB passe de 10 à 8 (-2)
      await destockOrder(bundleOrder);
      expect(useCoreStore.getState().products.find(p => p.id === 'comp-a')?.stock).toBe(6);
      expect(useCoreStore.getState().products.find(p => p.id === 'comp-b')?.stock).toBe(8);

      const orderToCancel = useTransactionStore.getState().onlineOrders.find(o => o.id === 'order-bundle-1')!;

      // Annulation : compA revient à 10, compB revient à 10
      await restockOrder(orderToCancel);
      expect(useCoreStore.getState().products.find(p => p.id === 'comp-a')?.stock).toBe(10);
      expect(useCoreStore.getState().products.find(p => p.id === 'comp-b')?.stock).toBe(10);
    });
  });
});
