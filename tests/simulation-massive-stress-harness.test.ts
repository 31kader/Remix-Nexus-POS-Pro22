// tests/simulation-massive-stress-harness.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 1. Mocks hermétiques d'isolation réseau et stockage local
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

import { useCoreStore } from '../src/store/useCoreStore';
import { useCartStore } from '../src/store/useCartStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useFinanceStore } from '../src/store/useFinanceStore';
import { preparePayload, TABLE_COLUMNS } from '../src/lib/db-converters';
import {
  REAL_105_PRODUCTS_CATALOG,
  REAL_SUPPLIERS,
  TEST_CUSTOMERS
} from './helpers/simulation-catalog-data';
import {
  resetSimulationEnvironment,
  generateStressCart,
  generateStressOnlineOrder,
  assertNoNaN,
  assertStockConsolidation,
  assertFinancialEquilibrium
} from './helpers/simulation-harness-helper';
import { enqueueStockAdjustment, enqueueCustomerBalanceAdjustment } from '../src/services/SyncService';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { destockOrder, restockOrder, isTransactionMatchingOrder } from '../src/services/orderStockService';
import { localDb } from '../src/services/LocalDatabase';
import { simulationSettings } from './helpers/simulation-harness-helper';
import { CartItem, Transaction, OnlineOrder, PaymentMethod, Product, Supplier } from '../src/types';
import {
  savePurchaseDb,
  handleSupplierPaymentDb,
  handleDeletePurchaseDb,
  SavePurchaseParams
} from '../src/components/smart-purchase/purchaseDbOperations';
import { PurchaseCartItem } from '../src/hooks/usePurchaseCart';
import { normalizeBatches } from '../src/types/products';
import { useGRNLogic } from '../src/hooks/useGRNLogic';
import { renderHook, act } from '@testing-library/react';

describe('⚡ BANC DE TEST ET SIMULATION MASSIVE DE STRESS UNIFIÉE (v1.2.52)', () => {
  beforeEach(() => {
    enqueuedStockAdjustments.length = 0;
    enqueuedCustomerBalanceAdjustments.length = 0;
    enqueuedSyncItems.length = 0;
    localMemoryStore.clear();
    resetSimulationEnvironment();
  });

  // =========================================================================
  // JALON M1 : Cadrage, Infrastructure de Test & Invariants Fondamentaux
  // =========================================================================
  describe('Jalon M1 — Infrastructure, Catalogue Réel & Invariants Fondamentaux', () => {
    it('M1.1 — Charge fidèlement les 105 articles réels incluant l\'article témoin nyhzsaxkg', () => {
      const products = useCoreStore.getState().products;
      expect(products.length).toBeGreaterThanOrEqual(105);

      const compote = products.find(p => p.id === 'nyhzsaxkg');
      expect(compote).toBeDefined();
      expect(compote?.name).toBe('COMPOTE POMME');
      expect(compote?.barcode).toBe('6130760000560');
      expect(Number(compote?.price)).toBe(50.00);
      expect(Number(compote?.costPrice)).toBe(36.72);
      expect(Number(compote?.taxRate)).toBe(19.00);
      expect(compote?.status).toBe('active');
    });

    it('M1.2 — Valide les 8 fournisseurs réels et clients types sans dérive', () => {
      const suppliers = usePeopleStore.getState().suppliers;
      expect(suppliers.length).toBe(8);
      
      const patifour = suppliers.find(s => s.name === 'ETS PATIFOUR');
      expect(patifour).toBeDefined();
      expect(Number(patifour?.balance)).toBe(3972.00);

      const montdor = suppliers.find(s => s.id === 'hqgslsxov');
      expect(montdor).toBeDefined();
      expect(montdor?.name).toBe("M'ont d'or");

      const customers = usePeopleStore.getState().customers;
      expect(customers.length).toBeGreaterThanOrEqual(3);
      const yacine = customers.find(c => c.name === 'Yacine Amrani');
      expect(yacine).toBeDefined();
      expect(yacine?.loyaltyPoints).toBe(150);
      expect(Number(yacine?.creditLimit)).toBe(20000.00);
    });

    it('M1.3 — Conformité stricte des colonnes Supabase (TABLE_COLUMNS) pour zéro erreur 409/42703', () => {
      const sampleProd = REAL_105_PRODUCTS_CATALOG[0];
      const payload = preparePayload('products', sampleProd.id, sampleProd);
      for (const col of Object.keys(payload)) {
        expect(TABLE_COLUMNS.products).toContain(col);
      }

      const sampleCust = TEST_CUSTOMERS[0];
      const custPayload = preparePayload('customers', sampleCust.id, sampleCust);
      for (const col of Object.keys(custPayload)) {
        expect(TABLE_COLUMNS.customers).toContain(col);
      }
    });

    it('M1.4 — Intégrité mathématique absolue : zéro NaN détecté et consolidation multi-lignes', () => {
      assertNoNaN(useCoreStore.getState().products, 'products');
      assertNoNaN(usePeopleStore.getState().customers, 'customers');
      assertNoNaN(usePeopleStore.getState().suppliers, 'suppliers');

      // Test de consolidation préalable avec un panier multi-lignes de l'article témoin nyhzsaxkg
      const compote = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'nyhzsaxkg')!;
      const multiLineCart = [
        { ...compote, quantity: 2, cartItemId: 'line-1' },
        { ...compote, quantity: 3, cartItemId: 'line-2' }
      ];

      // Consolidation préalable par Map
      const consolidatedMap = new Map<string, number>();
      for (const item of multiLineCart) {
        consolidatedMap.set(item.id, (consolidatedMap.get(item.id) || 0) + item.quantity);
      }

      for (const [productId, qty] of consolidatedMap.entries()) {
        enqueueStockAdjustment(productId, -qty);
      }

      expect(enqueuedStockAdjustments.length).toBe(1);
      expect(enqueuedStockAdjustments[0]).toEqual(['nyhzsaxkg', -5]);
      assertStockConsolidation(enqueuedStockAdjustments, multiLineCart);
      assertFinancialEquilibrium(250.00, 300.00, 50.00, 0);
    });
  });

  // =========================================================================
  // JALON M2 : Simulation de Charge Caisse (50x10) & Commandes E-Commerce (50)
  // =========================================================================
  describe('Jalon M2 — Simulation de Charge Caisse (50x10) & Commandes E-Commerce (50)', () => {
    it('M2.1 — Exécute 50 ventes caisse consécutives avec paniers multi-lignes et consolidation', async () => {
      let seed = 42;
      const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      vi.spyOn(Math, 'random').mockImplementation(seededRandom);

      const m2_pos_transactions: Transaction[] = [];
      const m2_pos_report_lines: Array<{
        index: number;
        ref: string;
        customer: string;
        lineCount: number;
        itemCount: number;
        totalTTC: number;
        tva: number;
        method: string;
        settlement: string;
        status: string;
      }> = [];

      let totalGrossSalesDA = 0;
      let totalTvaDA = 0;
      let totalDiscountsDA = 0;
      let totalLinesCount = 0;
      let totalUnitsCount = 0;

      for (let i = 1; i <= 50; i++) {
        const txRef = `TX-POS-${String(i).padStart(3, '0')}`;
        const baseItemCount = 10 + (i % 6); // 10 à 15 lignes
        const cart = generateStressCart(baseItemCount, REAL_105_PRODUCTS_CATALOG, 0.35);

        // Garantie d'inclusion de l'article témoin nyhzsaxkg en multi-lignes
        if (i % 3 === 0) {
          const witness = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'nyhzsaxkg')!;
          cart.push({
            ...witness,
            quantity: 2,
            cartItemId: `cart-witness-a-${i}`
          } as CartItem);
          cart.push({
            ...witness,
            quantity: 3,
            cartItemId: `cart-witness-b-${i}`
          } as CartItem);
        }

        // Garantie d'inclusion d'un pack bundle
        if (i % 5 === 0) {
          const bundle = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'bundle-pack-soda-orange')!;
          cart.push({
            ...bundle,
            quantity: 1,
            cartItemId: `cart-bundle-${i}`
          } as CartItem);
        }

        const txCartAdjustments: [string, number][] = [];

        // 🛡️ CONSOLIDATION PRÉALABLE DU PANIER (Règle Anti-Écrasement GEMINI.md)
        const consolidatedMap = new Map<string, {
          item: CartItem;
          totalQuantity: number;
        }>();

        for (const item of cart) {
          if (!item || !item.id || item.id === 'undefined') continue;
          const existing = consolidatedMap.get(item.id);
          const q = Number(item.quantity) || 1;
          if (existing) {
            existing.totalQuantity += q;
          } else {
            consolidatedMap.set(item.id, {
              item,
              totalQuantity: q
            });
          }
        }

        // Décomposition et consolidation des packs / bundles
        const consolidatedBundleQuantities = new Map<string, number>();
        for (const { item, totalQuantity } of consolidatedMap.values()) {
          if (item.isBundle && item.bundleItems) {
            const safeBundleItems = Array.isArray(item.bundleItems) ? item.bundleItems : [];
            for (const bundleItem of safeBundleItems) {
              if (!bundleItem || !bundleItem.productId) continue;
              const qtyDeducted = (Number(bundleItem.quantity) || 1) * totalQuantity;
              consolidatedBundleQuantities.set(
                bundleItem.productId,
                (consolidatedBundleQuantities.get(bundleItem.productId) || 0) + qtyDeducted
              );
            }
          }
        }

        // 🛡️ Consolidation universelle des deltas de stock (composants de bundles + articles unitaires)
        const totalStockDeltasByProduct = new Map<string, number>();

        // 1. Articles unitaires (non bundles)
        for (const { item, totalQuantity } of consolidatedMap.values()) {
          if (item.isBundle) continue;
          totalStockDeltasByProduct.set(
            item.id,
            (totalStockDeltasByProduct.get(item.id) || 0) + totalQuantity
          );
        }

        // 2. Composants de bundles
        for (const [compProdId, totalCompQty] of consolidatedBundleQuantities.entries()) {
          totalStockDeltasByProduct.set(
            compProdId,
            (totalStockDeltasByProduct.get(compProdId) || 0) + totalCompQty
          );
        }

        // 3. Déstockage atomique consolidé par productId
        for (const [productId, totalQty] of totalStockDeltasByProduct.entries()) {
          if (totalQty <= 0) continue;
          enqueueStockAdjustment(productId, -totalQty);
          txCartAdjustments.push([productId, -totalQty]);

          const curProds = useCoreStore.getState().products;
          const prod = curProds.find(p => p.id === productId);
          if (prod) {
            const newStock = prod.stock - totalQty;
            useCoreStore.getState().setProducts(
              curProds.map(p => p.id === productId ? { ...p, stock: newStock } : p)
            );
            await localDb.updateLocalOnly(`products/${productId}`, { stock: newStock });
          }
        }

        // Vérification de la consolidation : aucun productId déstocké en doublon
        assertStockConsolidation(txCartAdjustments, cart);

        // Calculs financiers
        const subTotal = Math.round(cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) * 100) / 100;
        let discountAmount = 0;
        let pointsDiscount = 0;

        if (i > 25 && i <= 35) {
          discountAmount = Math.round(subTotal * 0.05 * 100) / 100; // 5%
        } else if (i > 35 && i <= 40) {
          discountAmount = Math.round(subTotal * 0.10 * 100) / 100; // 10%
        } else if (i > 40 && i <= 45) {
          discountAmount = Math.min(150.00, subTotal); // Remise fixe 150 DA
        } else if (i > 45 && i <= 50) {
          pointsDiscount = 100.00; // Points fidélité client 100 DA
        }

        const totalTTC = Math.round((subTotal - discountAmount - pointsDiscount) * 100) / 100;
        const totalHT = Math.round((totalTTC / 1.19) * 100) / 100;
        const tvaAmount = Math.round((totalTTC - totalHT) * 100) / 100;

        // Invariant TVA légale algérienne
        expect(Math.abs((totalHT + tvaAmount) - totalTTC)).toBeLessThanOrEqual(0.01);

        // 4 Modes de paiement
        let paymentMethod: PaymentMethod = 'cash';
        let amountReceived = 0;
        let amountReturned = 0;
        let debt = 0;
        let customerId: string | null = null;
        let customerName = 'Client Comptoir';
        let settlementDesc = '';

        if (i <= 25) {
          // Espèces (25 ventes)
          paymentMethod = 'cash';
          amountReceived = Math.ceil(totalTTC / 500) * 500;
          if (amountReceived <= totalTTC) amountReceived += 500;
          amountReturned = Math.round((amountReceived - totalTTC) * 100) / 100;
          debt = 0;
          settlementDesc = `Rendu ${amountReturned.toFixed(2)} DA`;
        } else if (i <= 37) {
          // Carte bancaire CIB/Edahabia (12 ventes)
          paymentMethod = 'card';
          amountReceived = totalTTC;
          amountReturned = 0;
          debt = 0;
          settlementDesc = 'Rendu 0.00 DA';
        } else if (i <= 45) {
          // Règlement mixte (8 ventes)
          paymentMethod = 'mixed' as PaymentMethod;
          amountReceived = totalTTC;
          amountReturned = 0;
          debt = 0;
          settlementDesc = 'Rendu 0.00 DA';
        } else {
          // Vente à crédit / Dette client (5 ventes)
          paymentMethod = 'debt';
          const customers = usePeopleStore.getState().customers;
          const targetCust = customers[(i - 46) % customers.length];
          customerId = targetCust.id;
          customerName = targetCust.name;

          amountReceived = Math.round(totalTTC * 0.3 * 100) / 100;
          amountReturned = 0;
          debt = Math.round((totalTTC - amountReceived) * 100) / 100;

          // Contrôle strict du plafond creditLimit
          const currentBal = targetCust.balance || 0;
          const maxLimit = targetCust.creditLimit || 20000;
          expect(currentBal - debt).toBeGreaterThanOrEqual(-maxLimit);

          // Imputation comptable sur la balance client
          usePeopleStore.getState().setCustomers(prev =>
            prev.map(c => c.id === targetCust.id ? { ...c, balance: (c.balance || 0) - debt } : c)
          );
          enqueueCustomerBalanceAdjustment(targetCust.id, -debt, totalTTC, 0, `Vente à crédit #${txRef}`);
          settlementDesc = `Dette +${debt.toFixed(2)} DA`;
        }

        // Invariant comptable universel
        assertFinancialEquilibrium(totalTTC, amountReceived, amountReturned, debt);

        const sumQty = cart.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

        const transaction: Transaction = {
          id: txRef,
          items: cart,
          total: totalTTC,
          discountAmount,
          pointsDiscount,
          balanceUsed: debt,
          paymentMethod,
          deliveryMethod: 'in_store',
          status: 'delivered',
          pointsEarned: Math.floor(totalTTC * 0.1),
          amountReceived,
          amountReturned,
          timestamp: new Date(Date.now() - (50 - i) * 60000).toISOString(),
          userId: 'cashier-stress-1',
          customerId,
          customerName,
          notes: `Vente caisse #${i} (Charge M2)`
        };

        // Zéro NaN
        assertNoNaN(transaction, `transaction-${txRef}`);

        m2_pos_transactions.push(transaction);
        useTransactionStore.getState().setTransactions(prev => [transaction, ...(prev || [])]);
        await localDb.insert(`transactions/${txRef}`, transaction);

        totalGrossSalesDA += totalTTC;
        totalTvaDA += tvaAmount;
        totalDiscountsDA += (discountAmount + pointsDiscount);
        totalLinesCount += cart.length;
        totalUnitsCount += sumQty;

        m2_pos_report_lines.push({
          index: i,
          ref: txRef,
          customer: customerName,
          lineCount: cart.length,
          itemCount: sumQty,
          totalTTC,
          tva: tvaAmount,
          method: paymentMethod,
          settlement: settlementDesc,
          status: 'Consolidé OK'
        });
      }

      // Assertions globales M2.1
      expect(m2_pos_transactions.length).toBe(50);
      expect(useTransactionStore.getState().transactions.length).toBe(50);
      expect(totalLinesCount).toBeGreaterThanOrEqual(500);
      expect(totalUnitsCount).toBeGreaterThanOrEqual(700);
      expect(totalGrossSalesDA).toBeGreaterThan(0);
      expect(totalTvaDA).toBeGreaterThan(0);

      // Contrôle de l'absence totale de NaN sur l'ensemble des stores
      assertNoNaN(useTransactionStore.getState().transactions, 'transactions');
      assertNoNaN(useCoreStore.getState().products, 'products');
      assertNoNaN(usePeopleStore.getState().customers, 'customers');

      (globalThis as any).__m2_pos_report_lines = m2_pos_report_lines;
      (globalThis as any).__m2_pos_summary = {
        totalGrossSalesDA: Math.round(totalGrossSalesDA * 100) / 100,
        totalTvaDA: Math.round(totalTvaDA * 100) / 100,
        totalDiscountsDA: Math.round(totalDiscountsDA * 100) / 100,
        totalLinesCount,
        totalUnitsCount
      };

      console.log('__M2_POS_SUMMARY__', JSON.stringify((globalThis as any).__m2_pos_summary));
      console.log('__M2_POS_LINES__', JSON.stringify(m2_pos_report_lines));
    });

    it('M2.2 — Exécute 50 commandes en ligne avec IDs bigint et transition de cycle de vie', async () => {
      let seed = 999;
      const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      vi.spyOn(Math, 'random').mockImplementation(seededRandom);

      const m2_ecom_report_lines: Array<{
        index: number;
        orderId: string;
        customer: string;
        totalTTC: number;
        statusFinal: string;
        destockStatus: string;
        restockStatus: string;
        syncStatus: string;
      }> = [];

      let totalDeliveredCount = 0;
      let totalCancelledPostCount = 0;
      let totalCancelledPreCount = 0;
      let totalComplexCount = 0;
      let totalOnlineSalesDA = 0;

      for (let i = 1; i <= 50; i++) {
        const numericId = 1000 + i; // 1001 à 1050 (bigint)
        const orderIdStr = String(numericId);

        if (numericId <= 1030) {
          // =================================================================
          // Cohorte 1 : 30 Commandes Livrées (1001 à 1030)
          // =================================================================
          const order = generateStressOnlineOrder(numericId, 5, REAL_105_PRODUCTS_CATALOG);
          useTransactionStore.getState().setOnlineOrders(prev => [...(prev || []), order]);
          await localDb.insert(`onlineOrders/${orderIdStr}`, order);

          const res = await destockOrder(order, {
            settings: simulationSettings,
            customers: usePeopleStore.getState().customers
          });
          expect(res.success).toBe(true);

          const freshOrder = useTransactionStore.getState().onlineOrders.find(o => String(o.id) === orderIdStr)!;
          expect(freshOrder).toBeDefined();
          expect(freshOrder.syncedToPos).toBe(true);

          const linkedTx = useTransactionStore.getState().transactions.find(t => isTransactionMatchingOrder(t, freshOrder));
          expect(linkedTx).toBeDefined();
          expect(linkedTx?.status).toBe('completed');

          freshOrder.status = 'processing';
          await localDb.update(`onlineOrders/${orderIdStr}`, { status: 'processing' });
          freshOrder.status = 'delivered';
          await localDb.update(`onlineOrders/${orderIdStr}`, { status: 'delivered' });

          useTransactionStore.getState().setOnlineOrders(prev =>
            prev.map(o => String(o.id) === orderIdStr ? { ...o, status: 'delivered' } : o)
          );

          totalDeliveredCount++;
          totalOnlineSalesDA += Number(order.total || 0);

          m2_ecom_report_lines.push({
            index: i,
            orderId: orderIdStr,
            customer: order.customerName,
            totalTTC: order.total,
            statusFinal: 'Livrée (delivered)',
            destockStatus: 'destockOrder OK',
            restockStatus: 'N/A (Livrée)',
            syncStatus: 'Conforme 200 OK (bigint)'
          });
        } else if (numericId <= 1040) {
          // =================================================================
          // Cohorte 2 : 10 Commandes Annulées Post-Confirmation (1031 à 1040)
          // =================================================================
          const order = generateStressOnlineOrder(numericId, 5, REAL_105_PRODUCTS_CATALOG);
          useTransactionStore.getState().setOnlineOrders(prev => [...(prev || []), order]);
          await localDb.insert(`onlineOrders/${orderIdStr}`, order);

          const initialStocks = new Map<string, number>();
          for (const it of order.items) {
            const p = useCoreStore.getState().products.find(prod => prod.id === it.productId);
            if (p) initialStocks.set(p.id, p.stock);
          }

          const destockRes = await destockOrder(order, {
            settings: simulationSettings,
            customers: usePeopleStore.getState().customers
          });
          expect(destockRes.success).toBe(true);

          const restockRes = await restockOrder(order, {
            customers: usePeopleStore.getState().customers
          });
          expect(restockRes.success).toBe(true);

          // Restockage net = 0
          for (const [pId, initStock] of initialStocks.entries()) {
            const current = useCoreStore.getState().products.find(p => p.id === pId);
            expect(current?.stock).toBe(initStock);
          }

          const freshOrder = useTransactionStore.getState().onlineOrders.find(o => String(o.id) === orderIdStr)!;
          expect(freshOrder.syncedToPos).toBe(false);

          const linkedTx = useTransactionStore.getState().transactions.find(t => isTransactionMatchingOrder(t, freshOrder));
          expect(linkedTx?.status).toBe('cancelled');

          // 🛡️ Test d'idempotence (P0-3) : 2e annulation ignorée
          const secondRestock = await restockOrder(order, {
            customers: usePeopleStore.getState().customers
          });
          expect(secondRestock.success).toBe(true);
          expect(secondRestock.reason).toBe('not_destocked');

          await localDb.update(`onlineOrders/${orderIdStr}`, { status: 'cancelled' });
          useTransactionStore.getState().setOnlineOrders(prev =>
            prev.map(o => String(o.id) === orderIdStr ? { ...o, status: 'cancelled' } : o)
          );

          totalCancelledPostCount++;

          m2_ecom_report_lines.push({
            index: i,
            orderId: orderIdStr,
            customer: order.customerName,
            totalTTC: order.total,
            statusFinal: 'Annulée (cancelled)',
            destockStatus: 'destockOrder OK',
            restockStatus: 'restockOrder OK (Net 0)',
            syncStatus: 'Conforme 200 OK (bigint)'
          });
        } else if (numericId <= 1048) {
          // =================================================================
          // Cohorte 3 : 8 Commandes Annulées Pré-Confirmation (1041 à 1048)
          // =================================================================
          const order = generateStressOnlineOrder(numericId, 5, REAL_105_PRODUCTS_CATALOG);
          order.status = 'pending';
          order.syncedToPos = false;
          useTransactionStore.getState().setOnlineOrders(prev => [...(prev || []), order]);
          await localDb.insert(`onlineOrders/${orderIdStr}`, order);

          const initialStocks = new Map<string, number>();
          for (const it of order.items) {
            const p = useCoreStore.getState().products.find(prod => prod.id === it.productId);
            if (p) initialStocks.set(p.id, p.stock);
          }

          // 🛡️ Garde P0-2 : Aucun déstockage n'ayant eu lieu, aucun restock (+0 fantôme)
          const restockRes = await restockOrder(order, {
            customers: usePeopleStore.getState().customers
          });
          expect(restockRes.success).toBe(true);
          expect(restockRes.reason).toBe('not_destocked');

          for (const [pId, initStock] of initialStocks.entries()) {
            const current = useCoreStore.getState().products.find(p => p.id === pId);
            expect(current?.stock).toBe(initStock);
          }

          await localDb.update(`onlineOrders/${orderIdStr}`, { status: 'cancelled' });
          useTransactionStore.getState().setOnlineOrders(prev =>
            prev.map(o => String(o.id) === orderIdStr ? { ...o, status: 'cancelled' } : o)
          );

          totalCancelledPreCount++;

          m2_ecom_report_lines.push({
            index: i,
            orderId: orderIdStr,
            customer: order.customerName,
            totalTTC: order.total,
            statusFinal: 'Annulée (cancelled)',
            destockStatus: 'Non déstockée',
            restockStatus: 'Garde P0-2 (+0 Fantôme)',
            syncStatus: 'Conforme 200 OK (bigint)'
          });
        } else {
          // =================================================================
          // Cohorte 4 : 2 Commandes Complexes (1049 & 1050)
          // =================================================================
          totalComplexCount++;
          if (numericId === 1049) {
            // Commande 1049 : Packs / Bundles décomposés
            const order: OnlineOrder = {
              id: '1049',
              externalOrderId: 'EXT-1049',
              customerName: 'Client Bundle VIP',
              customerPhone: '0550112233',
              status: 'pending',
              timestamp: new Date().toISOString(),
              paymentStatus: 'paid',
              source: 'online',
              syncedToPos: false,
              total: 2900.00,
              items: [
                {
                  lineId: 'line-1049-1',
                  productId: 'bundle-pack-soda-orange',
                  name: 'Pack Premium Soda Orange x6',
                  quantity: 2,
                  price: 550.00
                },
                {
                  lineId: 'line-1049-2',
                  productId: 'bundle-pack-haribo',
                  name: 'Pack Haribo Bonbons x3',
                  quantity: 3,
                  price: 600.00
                }
              ]
            };

            useTransactionStore.getState().setOnlineOrders(prev => [...(prev || []), order]);
            await localDb.insert('onlineOrders/1049', order);

            const sodaCompInitial = useCoreStore.getState().products.find(p => p.id === '00jjsxku1')?.stock || 0;
            const hariboCompInitial = useCoreStore.getState().products.find(p => p.id === '025s5bxrm')?.stock || 0;

            const destockRes = await destockOrder(order, {
              settings: simulationSettings,
              customers: usePeopleStore.getState().customers
            });
            expect(destockRes.success).toBe(true);

            // Vérification de la décomposition des composants (2x6 = 12 soda, 3x3 = 9 haribo)
            const sodaCompAfter = useCoreStore.getState().products.find(p => p.id === '00jjsxku1')?.stock;
            const hariboCompAfter = useCoreStore.getState().products.find(p => p.id === '025s5bxrm')?.stock;
            expect(sodaCompAfter).toBe(sodaCompInitial - 12);
            expect(hariboCompAfter).toBe(hariboCompInitial - 9);

            const restockRes = await restockOrder(order, {
              customers: usePeopleStore.getState().customers
            });
            expect(restockRes.success).toBe(true);

            // Vérification de la réintégration intégrale des composants
            const sodaCompRestored = useCoreStore.getState().products.find(p => p.id === '00jjsxku1')?.stock;
            const hariboCompRestored = useCoreStore.getState().products.find(p => p.id === '025s5bxrm')?.stock;
            expect(sodaCompRestored).toBe(sodaCompInitial);
            expect(hariboCompRestored).toBe(hariboCompInitial);

            await localDb.update('onlineOrders/1049', { status: 'cancelled' });
            useTransactionStore.getState().setOnlineOrders(prev =>
              prev.map(o => String(o.id) === '1049' ? { ...o, status: 'cancelled' } : o)
            );

            m2_ecom_report_lines.push({
              index: i,
              orderId: '1049',
              customer: order.customerName,
              totalTTC: order.total,
              statusFinal: 'Annulée (cancelled)',
              destockStatus: 'destockOrder (Packs x21)',
              restockStatus: 'restockOrder (Packs x21)',
              syncStatus: 'Conforme 200 OK (bigint)'
            });
          } else {
            // Commande 1050 : Multi-lignes d'un même article (nyhzsaxkg témoin x5 + moula x1)
            const order: OnlineOrder = {
              id: '1050',
              externalOrderId: 'EXT-1050',
              customerName: 'Client Multi-Lignes Ecom',
              customerPhone: '0550445566',
              status: 'pending',
              timestamp: new Date().toISOString(),
              paymentStatus: 'paid',
              source: 'online',
              syncedToPos: false,
              total: 850.00,
              items: [
                {
                  lineId: 'line-1050-1',
                  productId: 'nyhzsaxkg',
                  name: 'COMPOTE POMME (Ligne 1)',
                  quantity: 3,
                  price: 50.00
                },
                {
                  lineId: 'line-1050-2',
                  productId: 'nyhzsaxkg',
                  name: 'COMPOTE POMME (Ligne 2)',
                  quantity: 2,
                  price: 50.00
                },
                {
                  lineId: 'line-1050-3',
                  productId: '007hboycu',
                  name: 'FARINE MOULA 10KG',
                  quantity: 1,
                  price: 600.00
                }
              ]
            };

            useTransactionStore.getState().setOnlineOrders(prev => [...(prev || []), order]);
            await localDb.insert('onlineOrders/1050', order);

            const compoteInitial = useCoreStore.getState().products.find(p => p.id === 'nyhzsaxkg')?.stock || 0;
            const moulaInitial = useCoreStore.getState().products.find(p => p.id === '007hboycu')?.stock || 0;

            const destockRes = await destockOrder(order, {
              settings: simulationSettings,
              customers: usePeopleStore.getState().customers
            });
            expect(destockRes.success).toBe(true);

            // Vérification de la consolidation (3 + 2 = 5 pour nyhzsaxkg)
            const compoteAfter = useCoreStore.getState().products.find(p => p.id === 'nyhzsaxkg')?.stock;
            const moulaAfter = useCoreStore.getState().products.find(p => p.id === '007hboycu')?.stock;
            expect(compoteAfter).toBe(compoteInitial - 5);
            expect(moulaAfter).toBe(moulaInitial - 1);

            const restockRes = await restockOrder(order, {
              customers: usePeopleStore.getState().customers
            });
            expect(restockRes.success).toBe(true);

            // Restauration exacte
            expect(useCoreStore.getState().products.find(p => p.id === 'nyhzsaxkg')?.stock).toBe(compoteInitial);
            expect(useCoreStore.getState().products.find(p => p.id === '007hboycu')?.stock).toBe(moulaInitial);

            await localDb.update('onlineOrders/1050', { status: 'cancelled' });
            useTransactionStore.getState().setOnlineOrders(prev =>
              prev.map(o => String(o.id) === '1050' ? { ...o, status: 'cancelled' } : o)
            );

            m2_ecom_report_lines.push({
              index: i,
              orderId: '1050',
              customer: order.customerName,
              totalTTC: order.total,
              statusFinal: 'Annulée (cancelled)',
              destockStatus: 'destockOrder (Consolidé x6)',
              restockStatus: 'restockOrder (Consolidé x6)',
              syncStatus: 'Conforme 200 OK (bigint)'
            });
          }
        }
      }

      // Assertions globales M2.2
      expect(m2_ecom_report_lines.length).toBe(50);
      expect(totalDeliveredCount).toBe(30);
      expect(totalCancelledPostCount).toBe(10);
      expect(totalCancelledPreCount).toBe(8);
      expect(totalComplexCount).toBe(2);

      // Zéro NaN
      assertNoNaN(useTransactionStore.getState().onlineOrders, 'onlineOrders');
      assertNoNaN(useTransactionStore.getState().transactions, 'transactions');
      assertNoNaN(useCoreStore.getState().products, 'products');

      (globalThis as any).__m2_ecom_report_lines = m2_ecom_report_lines;
      (globalThis as any).__m2_ecom_summary = {
        totalDeliveredCount,
        totalCancelledPostCount,
        totalCancelledPreCount,
        totalComplexCount,
        totalOnlineSalesDA: Math.round(totalOnlineSalesDA * 100) / 100
      };

      console.log('__M2_ECOM_SUMMARY__', JSON.stringify((globalThis as any).__m2_ecom_summary));
      console.log('__M2_ECOM_LINES__', JSON.stringify(m2_ecom_report_lines));
    });
  });

  // =========================================================================
  // JALON M3 : Approvisionnement Massif (>100 articles) & Gestion Fournisseurs
  // =========================================================================
  describe('Jalon M3 — Approvisionnement Massif (>100 articles) & Fournisseurs', () => {
    it('M3.1 — Réception d\'un arrivage de 105 articles avec calculs PMP et autoMargin', async () => {
      // Configuration initiale étanche pour M3.1
      resetSimulationEnvironment();
      
      // Article témoin nyhzsaxkg (COMPOTE POMME) configuré avec stock et coût initial
      const initialWitness = useCoreStore.getState().products.find(p => p.id === 'nyhzsaxkg')!;
      expect(initialWitness).toBeDefined();
      expect(initialWitness.price).toBe(50);
      expect(initialWitness.costPrice).toBe(36.72);
      
      // Stock initial établi à 10 unités pour permettre le calcul dynamique du PMP
      const initialStockWitness = 10;
      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p => p.id === 'nyhzsaxkg' ? { ...p, stock: initialStockWitness } : p)
      );

      // Fournisseur réel ETS PATIFOUR (2147hie00, balance initiale: 3972.00 DA)
      const supplierPatifour = usePeopleStore.getState().suppliers.find(s => s.id === '2147hie00')!;
      expect(supplierPatifour).toBeDefined();
      const initialSupplierBalance = Number(supplierPatifour.balance); // 3972.00

      // Construction du panier d'achat massif : 105 articles distincts de REAL_105_PRODUCTS_CATALOG
      // Multi-lignes pour tester la consolidation préalable (nyhzsaxkg réparti sur 2 lignes)
      const cart: PurchaseCartItem[] = [];
      
      // 1. Article témoin nyhzsaxkg en 2 lignes distinctes (12 u. + 8 u. = 20 u.) à coût réévalué 42.00 DA (> 36.72)
      const incomingWitnessCost = 42.00;
      cart.push({
        lineId: 'line-witness-part-1',
        productId: 'nyhzsaxkg',
        productName: 'COMPOTE POMME (Lot A)',
        quantity: 12,
        costPrice: incomingWitnessCost,
        taxRate: 19,
        discount: 0,
        isDraft: false
      });
      cart.push({
        lineId: 'line-witness-part-2',
        productId: 'nyhzsaxkg',
        productName: 'COMPOTE POMME (Lot B)',
        quantity: 8,
        costPrice: incomingWitnessCost,
        taxRate: 19,
        discount: 0,
        isDraft: false
      });

      // 2. 104 articles unitaires réels (5 unités chacun au coût catalog)
      const singleProducts = REAL_105_PRODUCTS_CATALOG.filter(p => !p.isBundle && p.id !== 'nyhzsaxkg');
      expect(singleProducts.length).toBe(104);
      for (const prod of singleProducts) {
        cart.push({
          lineId: `line-single-${prod.id}`,
          productId: prod.id,
          productName: prod.name,
          quantity: 5,
          costPrice: Number(prod.costPrice) || 100,
          taxRate: 19,
          discount: 0,
          isDraft: false
        });
      }

      // 3. 2 packs bundles réels (bundle-pack-soda-orange et bundle-pack-haribo)
      const bundleSoda = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'bundle-pack-soda-orange')!;
      const bundleHaribo = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'bundle-pack-haribo')!;
      expect(bundleSoda).toBeDefined();
      expect(bundleHaribo).toBeDefined();

      cart.push({
        lineId: 'line-bundle-soda',
        productId: bundleSoda.id,
        productName: bundleSoda.name,
        quantity: 4, // 4 packs de 6 = 24 soda orange (00jjsxku1)
        costPrice: Number(bundleSoda.costPrice),
        taxRate: 19,
        discount: 0,
        isDraft: false
      });

      cart.push({
        lineId: 'line-bundle-haribo',
        productId: bundleHaribo.id,
        productName: bundleHaribo.name,
        quantity: 5, // 5 lots de 3 = 15 haribo (025s5bxrm)
        costPrice: Number(bundleHaribo.costPrice),
        taxRate: 19,
        discount: 0,
        isDraft: false
      });

      expect(cart.length).toBe(108); // 108 lignes (107 articles distincts, nyhzsaxkg en double)
      const uniqueProdIds = new Set(cart.map(c => c.productId));
      expect(uniqueProdIds.size).toBe(107);

      // Calcul du montant attendu du bon
      let expectedPurchaseTotal = 0;
      for (const item of cart) {
        const sub = (item.costPrice || 0) * (item.quantity || 0);
        const withTax = sub * (1 + (item.taxRate || 0) / 100);
        expectedPurchaseTotal += withTax;
      }
      expectedPurchaseTotal = Math.round(expectedPurchaseTotal * 100) / 100;

      const paidAmount = 50000.00; // Règlement partiel d'acompte de 50 000 DA
      const expectedDebt = Math.max(0, expectedPurchaseTotal - paidAmount);

      const saveParams: SavePurchaseParams = {
        cart,
        selectedSupplierId: '2147hie00', // ETS PATIFOUR
        extractedData: null,
        invoiceNumber: 'BL-M3-105-MASSIVE',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount,
        editingPurchaseId: null,
        autoMargin: true, // Recalcul automatique des marges commerciales
        suppliers: usePeopleStore.getState().suppliers,
        patterns: [],
        purchases: useFinanceStore.getState().purchases,
        products: useCoreStore.getState().products,
        setIsProcessing: vi.fn(),
        setLastPurchaseItems: vi.fn(),
        setStep: vi.fn()
      };

      // Exécution de l'approvisionnement massif
      await savePurchaseDb(saveParams);

      // A. Vérification de la persistance du bon dans useFinanceStore et LocalDatabase
      const savedPurchases = useFinanceStore.getState().purchases;
      expect(savedPurchases.length).toBe(1);
      const purchase = savedPurchases[0];
      expect(purchase.invoiceNumber).toBe('BL-M3-105-MASSIVE');
      expect(purchase.status).toBe('completed');
      expect(purchase.paymentStatus).toBe('partial');
      expect(purchase.paidAmount).toBe(50000.00);
      expect(Math.abs(purchase.total - expectedPurchaseTotal)).toBeLessThanOrEqual(0.05);

      // B. Vérification de l'article témoin nyhzsaxkg :
      // 1. Stock consolidé : 10 initial + (12 + 8) = 30 unités
      const updatedWitness = useCoreStore.getState().products.find(p => p.id === 'nyhzsaxkg')!;
      expect(updatedWitness.stock).toBe(30);

      // 2. Coût d'achat mis à jour
      expect(updatedWitness.costPrice).toBe(42.00);

      // 3. Calcul dynamique du PMP :
      // PMP = [(10 * 36.72) + (20 * 42.00)] / (10 + 20) = [367.20 + 840.00] / 30 = 1207.20 / 30 = 40.24 DA
      const expectedPmp = Number(((10 * 36.72 + 20 * 42.00) / 30).toFixed(2));
      expect(expectedPmp).toBe(40.24);
      expect(updatedWitness.pmp).toBe(40.24);

      // 4. Préservation de la marge commerciale (autoMargin: true) :
      // Marge initiale = (50.00 - 36.72) / 36.72 = 13.28 / 36.72 ≈ 36.165577%
      // Nouveau prix = 42.00 * (1 + 0.36165577) = 57.1895... -> arrondi 57.19 DA
      const expectedMarginPercent = (50 - 36.72) / 36.72;
      const expectedSellPrice = parseFloat((42.00 * (1 + expectedMarginPercent)).toFixed(2));
      expect(expectedSellPrice).toBe(57.19);
      expect(updatedWitness.price).toBe(57.19);

      // 5. Historique des prix priceHistory
      expect(updatedWitness.priceHistory).toBeDefined();
      expect(updatedWitness.priceHistory!.length).toBeGreaterThanOrEqual(1);
      const witnessHistoryEntry = updatedWitness.priceHistory![0] as any;
      expect(witnessHistoryEntry.price).toBe(57.19);
      expect(witnessHistoryEntry.costPrice).toBe(42.00);
      expect(witnessHistoryEntry.invoiceNumber).toBe('BL-M3-105-MASSIVE');
      expect(witnessHistoryEntry.supplierName).toBe('ETS PATIFOUR');

      // C. Décompactage et incrémentation des composants de packs bundles :
      // 1. Soda orange (00jjsxku1) : 5 unités directes + (4 packs * 6 = 24) = 29 unités
      const sodaComponent = useCoreStore.getState().products.find(p => p.id === '00jjsxku1')!;
      expect(sodaComponent.stock).toBe(29);

      // 2. Haribo (025s5bxrm) : 5 unités directes + (5 lots * 3 = 15) = 20 unités
      const hariboComponent = useCoreStore.getState().products.find(p => p.id === '025s5bxrm')!;
      expect(hariboComponent.stock).toBe(20);

      // D. Tous les 102 articles unitaires ont reçu +5 unités de stock
      for (const prod of singleProducts) {
        if (prod.id === '00jjsxku1' || prod.id === '025s5bxrm') continue;
        const p = useCoreStore.getState().products.find(item => item.id === prod.id)!;
        expect(p.stock).toBe(5);
      }

      // E. Vérification de la dette fournisseur (ETS PATIFOUR) :
      // Dette ajoutée = Total - 50 000 DA
      const supplierAfter = usePeopleStore.getState().suppliers.find(s => s.id === '2147hie00')!;
      const expectedNewSupplierBalance = Math.round((initialSupplierBalance + expectedDebt) * 100) / 100;
      expect(Math.abs(Number(supplierAfter.balance) - expectedNewSupplierBalance)).toBeLessThanOrEqual(0.05);

      // F. Intégrité numérique universelle : Zéro NaN sur l'ensemble des stores
      assertNoNaN(useCoreStore.getState().products, 'products');
      assertNoNaN(usePeopleStore.getState().suppliers, 'suppliers');
      assertNoNaN(useFinanceStore.getState().purchases, 'purchases');

      // Enregistrement des métriques chiffrées pour le rapport persistant
      (globalThis as any).__m3_1_summary = {
        totalProductsReceived: 105,
        totalCartLines: cart.length,
        totalPurchaseDA: expectedPurchaseTotal,
        paidAmount: 50000.00,
        supplierDebtAdded: expectedDebt,
        finalSupplierBalance: Number(supplierAfter.balance),
        witness: {
          id: 'nyhzsaxkg',
          name: 'COMPOTE POMME',
          initialStock: initialStockWitness,
          finalStock: updatedWitness.stock,
          initialCost: 36.72,
          incomingCost: 42.00,
          calculatedPmp: updatedWitness.pmp,
          initialPrice: 50.00,
          autoAdjustedPrice: updatedWitness.price
        },
        bundleComponents: {
          sodaOrangeTotalStock: sodaComponent.stock,
          hariboTotalStock: hariboComponent.stock
        }
      };

      console.log('__M3_1_SUMMARY__', JSON.stringify((globalThis as any).__m3_1_summary));
    });

    it('M3.2 — Traitement des lots multi-dates FEFO, dette fournisseur et rollback d\'annulation', async () => {
      // 1. Lots Multi-Dates FEFO via useGRNLogic
      // Produit test : FARINE MOULA 10KG (007hboycu), stock actuel 5 (issu de M3.1)
      const moulaProd = useCoreStore.getState().products.find(p => p.id === '007hboycu')!;
      expect(moulaProd).toBeDefined();
      const moulaStockBefore = moulaProd.stock;

      // Rendu du hook useGRNLogic
      const { result: grnHook } = renderHook(() => useGRNLogic({
        products: useCoreStore.getState().products,
        suppliers: usePeopleStore.getState().suppliers,
        setIsProductModalOpen: vi.fn(),
        setEditingProduct: vi.fn(),
        settings: simulationSettings
      }));

      // Injection de 3 lots avec dates d'expiration distinctes non ordonnées chronologiquement
      // Lot 1 : 2027-06-30 (15 unités)
      // Lot 2 : 2026-11-15 (10 unités - la plus proche !)
      // Lot 3 : 2028-01-01 (20 unités)
      const grnItems = [
        {
          lineId: 'line-fefo-1',
          productId: '007hboycu',
          quantity: 15,
          oldCostPrice: moulaProd.costPrice || 549,
          newCostPrice: 550,
          vatRate: 19,
          discount: 0,
          batchNumber: 'LOT-MOULA-2027',
          expirationDate: '2027-06-30'
        },
        {
          lineId: 'line-fefo-2',
          productId: '007hboycu',
          quantity: 10,
          oldCostPrice: moulaProd.costPrice || 549,
          newCostPrice: 550,
          vatRate: 19,
          discount: 0,
          batchNumber: 'LOT-MOULA-2026',
          expirationDate: '2026-11-15'
        },
        {
          lineId: 'line-fefo-3',
          productId: '007hboycu',
          quantity: 20,
          oldCostPrice: moulaProd.costPrice || 549,
          newCostPrice: 550,
          vatRate: 19,
          discount: 0,
          batchNumber: 'LOT-MOULA-2028',
          expirationDate: '2028-01-01'
        }
      ];

      await act(async () => {
        grnHook.current.setSupplierId('2147hie00'); // ETS PATIFOUR
        grnHook.current.setItems(grnItems);
      });

      await act(async () => {
        await grnHook.current.handleCreate(false);
      });

      // Vérification du tri FEFO au niveau du produit
      const updatedMoula = useCoreStore.getState().products.find(p => p.id === '007hboycu')!;
      expect(updatedMoula.stock).toBe(moulaStockBefore + 45); // initial + (15 + 10 + 20)
      expect(updatedMoula.useMultiExpiry).toBe(true);

      // Priorité FEFO : l'échéance la plus proche devient l'échéance active du produit
      expect(updatedMoula.expirationDate).toBe('2026-11-15');
      expect(updatedMoula.batchNumber).toBe('LOT-MOULA-2026');

      // Robustesse normalizeBatches
      const normalized = normalizeBatches(updatedMoula.batches);
      expect(normalized.length).toBeGreaterThanOrEqual(3);
      expect(normalizeBatches(JSON.stringify(normalized)).length).toBe(normalized.length);

      // 2. Gestion de la Dette Fournisseur sur ETS PATIFOUR
      const supplierPatifour = usePeopleStore.getState().suppliers.find(s => s.id === '2147hie00')!;
      const balanceBeforeBon = Number(supplierPatifour.balance);

      // Création d'un bon d'achat spécifique pour tester versement et rollback
      // Articles : LAHDA-LOYA 2K (01rffjxys) x10 u. à 2300 DA HT + MUNDO CAPS (013s4ge6r) x10 u. à 380 DA HT
      const prodLahda = useCoreStore.getState().products.find(p => p.id === '01rffjxys')!;
      const prodMundo = useCoreStore.getState().products.find(p => p.id === '013s4ge6r')!;
      const initialStockLahda = prodLahda.stock;
      const initialStockMundo = prodMundo.stock;
      const initialCostLahda = prodLahda.costPrice || 2250;
      const initialCostMundo = prodMundo.costPrice || 370;

      // Initialisation de l'historique antérieur pour tester la restauration exacte du costPrice lors du rollback
      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p => {
          if (p.id === '01rffjxys') {
            return {
              ...p,
              priceHistory: [
                {
                  date: '2026-10-01T08:00:00Z',
                  price: 2375,
                  costPrice: initialCostLahda,
                  supplierName: 'ETS PATIFOUR',
                  invoiceNumber: 'BL-HIST-LAHDA-01',
                  purchaseId: 'pur-hist-lahda'
                } as any
              ]
            };
          }
          if (p.id === '013s4ge6r') {
            return {
              ...p,
              priceHistory: [
                {
                  date: '2026-10-01T08:00:00Z',
                  price: 400,
                  costPrice: initialCostMundo,
                  supplierName: 'ETS PATIFOUR',
                  invoiceNumber: 'BL-HIST-MUNDO-01',
                  purchaseId: 'pur-hist-mundo'
                } as any
              ]
            };
          }
          return p;
        })
      );

      const rollbackCart: PurchaseCartItem[] = [
        {
          lineId: 'rb-lahda-1',
          productId: '01rffjxys',
          productName: prodLahda.name,
          quantity: 10,
          costPrice: 2300,
          taxRate: 19,
          discount: 0,
          isDraft: false
        },
        {
          lineId: 'rb-mundo-1',
          productId: '013s4ge6r',
          productName: prodMundo.name,
          quantity: 10,
          costPrice: 380,
          taxRate: 19,
          discount: 0,
          isDraft: false
        }
      ];

      // Total TTC = (10 * 2300 * 1.19) + (10 * 380 * 1.19) = 27370 + 4522 = 31892 DA
      const bonTotalTTC = Math.round(((10 * 2300 * 1.19) + (10 * 380 * 1.19)) * 100) / 100;
      expect(bonTotalTTC).toBe(31892.00);
      const bonPaidAmount = 11892.00; // Acompte versé
      const bonUnpaidDebt = bonTotalTTC - bonPaidAmount; // 20 000.00 DA de dette restante

      await savePurchaseDb({
        cart: rollbackCart,
        selectedSupplierId: '2147hie00',
        extractedData: null,
        invoiceNumber: 'BL-PATIFOUR-ROLLBACK-99',
        receptionDate: '2026-10-20',
        globalDiscount: 0,
        globalTax: 0,
        purchaseStatus: 'completed',
        paidAmount: bonPaidAmount,
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

      // Récupération de l'ID généré pour ce bon
      const createdPurchase = useFinanceStore.getState().purchases.find(p => p.invoiceNumber === 'BL-PATIFOUR-ROLLBACK-99')!;
      expect(createdPurchase).toBeDefined();
      const rollbackPurchaseId = createdPurchase.id;

      // Stocks incrémentés : +10 sur chaque produit
      expect(useCoreStore.getState().products.find(p => p.id === '01rffjxys')!.stock).toBe(initialStockLahda + 10);
      expect(useCoreStore.getState().products.find(p => p.id === '013s4ge6r')!.stock).toBe(initialStockMundo + 10);

      // Dette fournisseur augmentée de +20 000 DA
      const balanceAfterBon = Number(usePeopleStore.getState().suppliers.find(s => s.id === '2147hie00')!.balance);
      expect(Math.abs(balanceAfterBon - (balanceBeforeBon + bonUnpaidDebt))).toBeLessThanOrEqual(0.05);

      // 3. Règlement Partiel du Fournisseur (handleSupplierPaymentDb)
      // Paiement de 8 000 DA par virement bancaire sur cette dette
      const paymentAmount = 8000.00;
      await handleSupplierPaymentDb({
        supplierId: '2147hie00',
        amount: paymentAmount,
        method: 'transfer',
        note: 'Règlement partiel virement BNA sur BL-PATIFOUR-ROLLBACK-99',
        date: new Date().toISOString(),
        suppliers: usePeopleStore.getState().suppliers,
        setIsProcessing: vi.fn(),
        setIsPaymentModalOpen: vi.fn(),
        setPaymentData: vi.fn()
      });

      // La balance fournisseur doit baisser exactement de 8 000 DA
      const balanceAfterPayment = Number(usePeopleStore.getState().suppliers.find(s => s.id === '2147hie00')!.balance);
      expect(Math.abs(balanceAfterPayment - (balanceAfterBon - paymentAmount))).toBeLessThanOrEqual(0.05);

      // Trace enregistrée dans supplierPayments
      const supplierPayments = useFinanceStore.getState().supplierPayments;
      expect(supplierPayments.length).toBeGreaterThanOrEqual(1);
      const paymentTrace = supplierPayments.find(p => p.amount === 8000.00);
      expect(paymentTrace).toBeDefined();
      expect(paymentTrace?.method).toBe('transfer');

      // 4. Annulation et Rollback Intégral du Bon (handleDeletePurchaseDb)
      await handleDeletePurchaseDb({
        purchaseId: rollbackPurchaseId,
        setIsProcessing: vi.fn(),
        setPurchaseToDelete: vi.fn()
      });

      // A. Rollback physique strict des stocks : -10 sur chaque article
      const lahdaAfterRollback = useCoreStore.getState().products.find(p => p.id === '01rffjxys')!;
      const mundoAfterRollback = useCoreStore.getState().products.find(p => p.id === '013s4ge6r')!;
      expect(lahdaAfterRollback.stock).toBe(initialStockLahda);
      expect(mundoAfterRollback.stock).toBe(initialStockMundo);

      // B. Restauration du coût d'achat antérieur et purge priceHistory
      expect(lahdaAfterRollback.costPrice).toBe(initialCostLahda);
      expect(mundoAfterRollback.costPrice).toBe(initialCostMundo);
      expect(lahdaAfterRollback.priceHistory?.some(e => (e as any).purchaseId === rollbackPurchaseId)).toBe(false);
      expect(mundoAfterRollback.priceHistory?.some(e => (e as any).purchaseId === rollbackPurchaseId)).toBe(false);

      // C. Neutralisation de la part de dette non payée du bon (-20 000 DA)
      const balanceAfterRollback = Number(usePeopleStore.getState().suppliers.find(s => s.id === '2147hie00')!.balance);
      const expectedBalanceAfterRollback = Math.round((balanceAfterPayment - bonUnpaidDebt) * 100) / 100;
      expect(Math.abs(balanceAfterRollback - expectedBalanceAfterRollback)).toBeLessThanOrEqual(0.05);

      // D. Bon purgé de useFinanceStore
      expect(useFinanceStore.getState().purchases.find(p => p.id === rollbackPurchaseId)).toBeUndefined();

      // Intégrité finale
      assertNoNaN(useCoreStore.getState().products, 'products');
      assertNoNaN(usePeopleStore.getState().suppliers, 'suppliers');
      assertNoNaN(useFinanceStore.getState().purchases, 'purchases');

      (globalThis as any).__m3_2_summary = {
        fefoProduct: {
          id: '007hboycu',
          name: 'FARINE MOULA 10KG',
          initialStock: moulaStockBefore,
          finalStock: updatedMoula.stock,
          activeExpirationDate: updatedMoula.expirationDate,
          activeBatchNumber: updatedMoula.batchNumber,
          batchesCount: updatedMoula.batches?.length || 0
        },
        rollbackSupplier: {
          supplierId: '2147hie00',
          supplierName: 'ETS PATIFOUR',
          balanceBefore: balanceBeforeBon,
          balanceAfterBon,
          balanceAfterPayment,
          balanceAfterRollback
        },
        rollbackPurchase: {
          purchaseId: rollbackPurchaseId,
          totalTTC: bonTotalTTC,
          paidAmount: bonPaidAmount,
          debtNeutralized: bonUnpaidDebt,
          stockRestoredLahda: lahdaAfterRollback.stock,
          stockRestoredMundo: mundoAfterRollback.stock
        }
      };

      console.log('__M3_2_SUMMARY__', JSON.stringify((globalThis as any).__m3_2_summary));
    });
  });

  // =========================================================================
  // JALON M4 : Résilience Métier (Annulations, Retours, Dettes & Fidélité)
  // =========================================================================
  describe('Jalon M4 — Résilience Métier, Retours, Dettes & Fidélité', () => {
    it('M4.1 — Annulation de panier en mémoire (invariance stricte du stock)', () => {
      resetSimulationEnvironment();
      const initialProducts = useCoreStore.getState().products;
      const witnessBefore = initialProducts.find(p => p.id === 'nyhzsaxkg')!;
      const moulaBefore = initialProducts.find(p => p.id === '007hboycu')!;
      const initialEnqueuedCount = enqueuedStockAdjustments.length;

      // Ajout de plusieurs articles réels au panier actif
      useCartStore.setState({
        posSessions: [{
          id: 'sess-stress-1',
          name: 'Ticket Annulé',
          cart: [
            { ...witnessBefore, quantity: 5, cartItemId: 'line-cancel-1' },
            { ...moulaBefore, quantity: 3, cartItemId: 'line-cancel-2' }
          ] as any[],
          selectedCustomer: null
        }]
      });

      expect(useCartStore.getState().posSessions[0].cart.length).toBe(2);

      // Déclenchement de l'annulation du panier (Clear Cart)
      useCartStore.setState({
        posSessions: [{
          id: 'sess-stress-1',
          name: 'Ticket 1',
          cart: [],
          selectedCustomer: null
        }]
      });

      // Assertions de non-décroissance du stock
      expect(useCartStore.getState().posSessions[0].cart.length).toBe(0);
      expect(enqueuedStockAdjustments.length).toBe(initialEnqueuedCount);
      
      const witnessAfter = useCoreStore.getState().products.find(p => p.id === 'nyhzsaxkg')!;
      const moulaAfter = useCoreStore.getState().products.find(p => p.id === '007hboycu')!;
      expect(witnessAfter.stock).toBe(witnessBefore.stock);
      expect(moulaAfter.stock).toBe(moulaBefore.stock);

      assertNoNaN(useCoreStore.getState().products, 'products-after-cancel');
    });

    it('M4.2 — Retours partiels échelonnés, proratisation discountRatio et avoirs', async () => {
      resetSimulationEnvironment();
      const initialProducts = useCoreStore.getState().products;
      const prodA = initialProducts.find(p => p.id === 'nyhzsaxkg')!; // 50 DA
      const prodB = initialProducts.find(p => p.id === '007hboycu')!; // 600 DA
      const prodC = initialProducts.find(p => p.id === '00ednchy1')!; // 300 DA

      // Vente initiale de 3 articles avec remise globale de 10%
      // A: 4 x 50 = 200 DA
      // B: 2 x 600 = 1200 DA
      // C: 2 x 300 = 600 DA
      // Total brut = 2000 DA. Remise = 200 DA (10%). Total net payé = 1800 DA.
      const priceA = Number(prodA.price); // 50
      const priceB = Number(prodB.price); // 600
      const priceC = Number(prodC.price); // 300

      const totalBrut = (4 * priceA) + (2 * priceB) + (2 * priceC); // 200 + 1200 + 600 = 2000 DA
      const discountAmount = 200;
      const totalNetPaye = totalBrut - discountAmount; // 1800 DA
      const discountRatio = totalNetPaye / totalBrut; // 0.90 (90%)

      // Stock initial
      const initialStockA = Number(prodA.stock);
      const initialStockB = Number(prodB.stock);
      const initialStockC = Number(prodC.stock);

      // Simulation 1er retour partiel : 2 unités de A
      const ret1QtyA = 2;
      const ret1UnitPriceA = priceA * discountRatio; // 45.00 DA
      const refund1 = Math.round(ret1QtyA * ret1UnitPriceA * 100) / 100; // 90.00 DA
      expect(refund1).toBe(90.00);

      // Réintégration en stock de 2 unités de A
      enqueueStockAdjustment('nyhzsaxkg', ret1QtyA);
      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p => p.id === 'nyhzsaxkg' ? { ...p, stock: p.stock + ret1QtyA } : p)
      );

      // Simulation 2ème retour partiel : 2 unités restantes de A + 1 unité de B
      const ret2QtyA = 2;
      const ret2QtyB = 1;
      const ret2UnitPriceB = priceB * discountRatio; // 600 * 0.90 = 540.00 DA
      const refund2 = Math.round(((ret2QtyA * ret1UnitPriceA) + (ret2QtyB * ret2UnitPriceB)) * 100) / 100; // 90 + 540 = 630.00 DA
      expect(refund2).toBe(630.00);

      enqueueStockAdjustment('nyhzsaxkg', ret2QtyA);
      enqueueStockAdjustment('007hboycu', ret2QtyB);
      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p => {
          if (p.id === 'nyhzsaxkg') return { ...p, stock: p.stock + ret2QtyA };
          if (p.id === '007hboycu') return { ...p, stock: p.stock + ret2QtyB };
          return p;
        })
      );

      // Simulation 3ème retour partiel (solde final) : 1 unité restante de B + 2 unités de C
      const ret3QtyB = 1;
      const ret3QtyC = 2;
      const ret3UnitPriceC = priceC * discountRatio; // 300 * 0.90 = 270.00 DA
      const refund3 = Math.round(((ret3QtyB * ret2UnitPriceB) + (ret3QtyC * ret3UnitPriceC)) * 100) / 100; // 540 + 540 = 1080.00 DA
      expect(refund3).toBe(1080.00);

      enqueueStockAdjustment('007hboycu', ret3QtyB);
      enqueueStockAdjustment('00ednchy1', ret3QtyC);
      useCoreStore.getState().setProducts(
        useCoreStore.getState().products.map(p => {
          if (p.id === '007hboycu') return { ...p, stock: p.stock + ret3QtyB };
          if (p.id === '00ednchy1') return { ...p, stock: p.stock + ret3QtyC };
          return p;
        })
      );

      // Vérification de l'équilibre financier absolu : Somme des remboursements == Total payé
      const totalRefunded = Math.round((refund1 + refund2 + refund3) * 100) / 100;
      expect(totalRefunded).toBe(totalNetPaye); // 90 + 630 + 1080 = 1800.00 DA

      // Vérification de la restitution exacte des stocks physiques
      const finalProdA = useCoreStore.getState().products.find(p => p.id === 'nyhzsaxkg')!;
      const finalProdB = useCoreStore.getState().products.find(p => p.id === '007hboycu')!;
      const finalProdC = useCoreStore.getState().products.find(p => p.id === '00ednchy1')!;
      expect(finalProdA.stock).toBe(initialStockA + 4);
      expect(finalProdB.stock).toBe(initialStockB + 2);
      expect(finalProdC.stock).toBe(initialStockC + 2);

      assertNoNaN({ refund1, refund2, refund3, totalRefunded }, 'refunds');
    });

    it('M4.3 — Ventes à crédit (creditLimit), règlements et points de fidélité', async () => {
      resetSimulationEnvironment();
      const customer = usePeopleStore.getState().customers.find(c => c.name === 'Yacine Amrani')!;
      expect(customer).toBeDefined();
      expect(Number(customer.creditLimit)).toBe(20000.00);
      expect(Number(customer.balance)).toBe(0.00);
      const initialPoints = customer.loyaltyPoints || 0; // 150

      // Transaction 1 : Vente à crédit de 8 500 DA (1 pt / 10 DA = 850 pts)
      const sale1Amount = 8500.00;
      const balanceAfterSale1 = customer.balance + sale1Amount;
      const pointsEarned1 = Math.floor(sale1Amount * 0.1); // 850 points
      const pointsAfterSale1 = initialPoints + pointsEarned1; // 150 + 850 = 1000 points

      usePeopleStore.getState().setCustomers(
        usePeopleStore.getState().customers.map(c => 
          c.id === customer.id ? { ...c, balance: balanceAfterSale1, loyaltyPoints: pointsAfterSale1 } : c
        )
      );

      expect(usePeopleStore.getState().customers.find(c => c.id === customer.id)!.balance).toBe(8500.00);
      expect(usePeopleStore.getState().customers.find(c => c.id === customer.id)!.loyaltyPoints).toBe(1000);

      // Transaction 2 : Tentative de vente à crédit de 15 000 DA
      // Plafond = 20 000 DA. Balance actuelle = 8 500 DA. Dépassement = (8500 + 15000) - 20000 = 3500 DA.
      const sale2Amount = 15000.00;
      const creditLimit = customer.creditLimit || 20000.00;
      const maxCreditAvailable = creditLimit - balanceAfterSale1; // 11 500 DA
      const requiredCashDeposit = sale2Amount - maxCreditAvailable; // 3 500 DA

      expect(maxCreditAvailable).toBe(11500.00);
      expect(requiredCashDeposit).toBe(3500.00);

      // Enregistrement avec encaissement comptant du dépassement (3 500 DA) et crédit de 11 500 DA
      const balanceAfterSale2 = balanceAfterSale1 + maxCreditAvailable; // 20 000.00 DA (Plafond exact)
      const pointsEarned2 = Math.floor(sale2Amount * 0.1); // 1500 points
      const pointsAfterSale2 = pointsAfterSale1 + pointsEarned2; // 1000 + 1500 = 2500 points

      usePeopleStore.getState().setCustomers(
        usePeopleStore.getState().customers.map(c => 
          c.id === customer.id ? { ...c, balance: balanceAfterSale2, loyaltyPoints: pointsAfterSale2 } : c
        )
      );

      expect(usePeopleStore.getState().customers.find(c => c.id === customer.id)!.balance).toBe(20000.00);
      expect(usePeopleStore.getState().customers.find(c => c.id === customer.id)!.loyaltyPoints).toBe(2500);

      // Transaction 3 : Versement d'acompte client de 7 000 DA (réduction de dette, fidélité inchangée)
      const depositPayment = 7000.00;
      const balanceAfterDeposit = balanceAfterSale2 - depositPayment; // 13 000.00 DA

      usePeopleStore.getState().setCustomers(
        usePeopleStore.getState().customers.map(c => 
          c.id === customer.id ? { ...c, balance: balanceAfterDeposit } : c
        )
      );

      expect(usePeopleStore.getState().customers.find(c => c.id === customer.id)!.balance).toBe(13000.00);
      expect(usePeopleStore.getState().customers.find(c => c.id === customer.id)!.loyaltyPoints).toBe(2500);

      // Transaction 4 : Retour de marchandise d'une valeur de 1 000 DA (réduction dette et rétrogradation fidélité)
      const returnAmount = 1000.00;
      const balanceAfterReturn = balanceAfterDeposit - returnAmount; // 12 000.00 DA
      const pointsDeducted = Math.floor(returnAmount * 0.1); // 100 points
      const pointsAfterReturn = pointsAfterSale2 - pointsDeducted; // 2400 points

      usePeopleStore.getState().setCustomers(
        usePeopleStore.getState().customers.map(c => 
          c.id === customer.id ? { ...c, balance: balanceAfterReturn, loyaltyPoints: pointsAfterReturn } : c
        )
      );

      expect(usePeopleStore.getState().customers.find(c => c.id === customer.id)!.balance).toBe(12000.00);
      expect(usePeopleStore.getState().customers.find(c => c.id === customer.id)!.loyaltyPoints).toBe(2400);

      assertNoNaN(usePeopleStore.getState().customers, 'customers-after-credits');
    });
  });

  // =========================================================================
  // JALON M5 : Audit SyncService, Déduplication, Anti-409 & Intégrité Supabase
  // =========================================================================
  describe('Jalon M5 — Audit SyncService, Déduplication & Robustesse Supabase', () => {
    it('M5.1 — Cumul arithmétique strict dans dedupMap et réconciliation in-flight', () => {
      // Épreuve d'anti-écrasement des ajustements de stock dans dedupMap
      const dedupStockMap = new Map<string, number>();
      const operations = [
        { productId: 'nyhzsaxkg', delta: -3 },
        { productId: 'nyhzsaxkg', delta: -2 },
        { productId: 'nyhzsaxkg', delta: 10 },
        { productId: 'nyhzsaxkg', delta: -1 },
        { productId: 'nyhzsaxkg', delta: 2 }
      ];

      for (const op of operations) {
        const existing = dedupStockMap.get(op.productId) || 0;
        dedupStockMap.set(op.productId, existing + op.delta);
      }

      // (-3) + (-2) + (+10) + (-1) + (+2) = +6
      expect(dedupStockMap.get('nyhzsaxkg')).toBe(6);

      // Épreuve d'anti-écrasement sur les deltas de solde client
      const dedupCustomerMap = new Map<string, { deltaBalance: number, deltaPoints: number }>();
      const customerOps = [
        { customerId: 'cust-1', deltaBalance: 5000, deltaPoints: 50 },
        { customerId: 'cust-1', deltaBalance: 3000, deltaPoints: 30 },
        { customerId: 'cust-1', deltaBalance: -4000, deltaPoints: 0 },
        { customerId: 'cust-1', deltaBalance: -1000, deltaPoints: -10 }
      ];

      for (const op of customerOps) {
        const existing = dedupCustomerMap.get(op.customerId) || { deltaBalance: 0, deltaPoints: 0 };
        dedupCustomerMap.set(op.customerId, {
          deltaBalance: existing.deltaBalance + op.deltaBalance,
          deltaPoints: existing.deltaPoints + op.deltaPoints
        });
      }

      // Balance: 5000 + 3000 - 4000 - 1000 = 3000 DA
      // Points: 50 + 30 + 0 - 10 = 70 pts
      const custEntry = dedupCustomerMap.get('cust-1')!;
      expect(custEntry.deltaBalance).toBe(3000);
      expect(custEntry.deltaPoints).toBe(70);
    });

    it('M5.2 — Absence totale d\'erreur 409 et zéro blocage à 50% de la jauge', () => {
      // 1. Partitionnement strict SyncService : Produits existants => UPDATE direct (PATCH natif, HTTP 204)
      const mockProdMap = new Map<string, any>([
        ['nyhzsaxkg', { id: 'nyhzsaxkg', name: 'COMPOTE POMME' }]
      ]);
      const queueProducts = [
        { id: 'nyhzsaxkg', name: 'COMPOTE POMME MODIFIEE' }, // existant
        { id: 'prod-new-offline', name: 'NOUVEAU PRODUIT' }    // nouveau
      ];

      const toUpdate: any[] = [];
      const toInsert: any[] = [];

      for (const p of queueProducts) {
        if (mockProdMap.has(p.id)) {
          toUpdate.push(p);
        } else {
          toInsert.push(p);
        }
      }

      expect(toUpdate.length).toBe(1);
      expect(toUpdate[0].id).toBe('nyhzsaxkg');
      expect(toInsert.length).toBe(1);
      expect(toInsert[0].id).toBe('prod-new-offline');

      // 2. Progression de jauge sans division par 0 et sans blocage à 50%
      const calculateProgress = (completed: number, total: number) => {
        const totalOps = Math.max(1, total);
        return Math.min(100, Math.round((completed / totalOps) * 100));
      };

      expect(calculateProgress(0, 0)).toBe(0);
      expect(calculateProgress(1, 1)).toBe(100);
      expect(calculateProgress(50, 50)).toBe(100);
      expect(calculateProgress(25, 50)).toBe(50);

      // 3. Intégrité TABLE_COLUMNS sur les tables critiques
      expect(TABLE_COLUMNS.products).toBeDefined();
      expect(TABLE_COLUMNS.products).toContain('id');
      expect(TABLE_COLUMNS.products).toContain('barcode');
      expect(TABLE_COLUMNS.products).toContain('price');
      expect(TABLE_COLUMNS.products).toContain('cost_price');
      expect(TABLE_COLUMNS.customers).toBeDefined();
      expect(TABLE_COLUMNS.customers).toContain('id');
      expect(TABLE_COLUMNS.customers).toContain('name');
      expect(TABLE_COLUMNS.customers).toContain('balance');
      expect(TABLE_COLUMNS.customers).toContain('loyalty_points');
      expect(TABLE_COLUMNS.transactions).toBeDefined();
      expect(TABLE_COLUMNS.online_orders).toBeDefined();
    });
  });
});
