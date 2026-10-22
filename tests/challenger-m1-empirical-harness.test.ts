import { describe, it, expect, beforeEach } from 'vitest';
import {
  assertNoNaN,
  assertFinancialEquilibrium,
  assertStockConsolidation,
  generateStressCart,
  generateStressOnlineOrder,
  resetSimulationEnvironment
} from './helpers/simulation-harness-helper';
import { REAL_105_PRODUCTS_CATALOG, REAL_SUPPLIERS, TEST_CUSTOMERS } from './helpers/simulation-catalog-data';
import { useCoreStore } from '../src/store/useCoreStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { useCartStore } from '../src/store/useCartStore';

describe('⚔️ CHALLENGER M1 EMPIRICAL HARNESS SUITE : Épreuves de Résilience & Robustesse Contradictoire', () => {
  beforeEach(() => {
    resetSimulationEnvironment();
  });

  // =========================================================================
  // ÉPREUVE 1 : Scanner Anti-NaN, Anti-Infinity, Null & Undefined
  // =========================================================================
  describe('Épreuve 1 — Scanner Anti-NaN & Détection des Valeurs Invalides', () => {
    it('1.1 : Lève bien une exception sur les valeurs NaN directes et imbriquées', () => {
      expect(() => assertNoNaN(NaN, 'test')).toThrow(/NaN détecté au chemin: test/);
      expect(() => assertNoNaN({ price: NaN }, 'root')).toThrow(/NaN détecté au chemin: root\.price/);
      expect(() => assertNoNaN({ deep: { items: [{ total: NaN }] } }, 'root')).toThrow(/NaN détecté au chemin: root\.deep\.items\[0\]\.total/);
      expect(() => assertNoNaN([1, 2, NaN], 'arr')).toThrow(/NaN détecté au chemin: arr\[2\]/);
    });

    it('1.2 : Lève bien une exception sur Infinity et -Infinity', () => {
      expect(() => assertNoNaN(Infinity, 'test')).toThrow(/Infinity détecté au chemin: test/);
      expect(() => assertNoNaN(-Infinity, 'test')).toThrow(/Infinity détecté au chemin: test/);
      expect(() => assertNoNaN({ cost: Infinity }, 'root')).toThrow(/Infinity détecté au chemin: root\.cost/);
      expect(() => assertNoNaN({ sub: { margin: -Infinity } }, 'root')).toThrow(/Infinity détecté au chemin: root\.sub\.margin/);
    });

    it('1.3 : Preuve empirique : null est autorisé mais undefined est silencieusement ignoré', () => {
      // 1. null est autorisé (ex: selectedCustomer: null, deletedAt: null)
      expect(() => assertNoNaN({ customer: null }, 'root')).not.toThrow();

      // 2. Preuve contradictoire : Le JSDoc promet "Scanner d'intégrité récursif anti-NaN, anti-Infinity et anti-undefined"
      // Or, la ligne 129 de simulation-harness-helper.ts contient :
      // `if (obj === null || obj === undefined) return;`
      // Par conséquent, un objet contenant `{ badField: undefined }` NE déclenche AUCUNE erreur !
      expect(() => assertNoNaN({ badField: undefined }, 'root')).not.toThrow();
    });

    it('1.4 : Preuve empirique : assertFinancialEquilibrium est vulnérable aux valeurs NaN', () => {
      // En JavaScript, Math.abs(NaN - 100) > 0.01 évalue à FALSE car NaN n'est ni supérieur, ni inférieur, ni égal.
      // Par conséquent, injecter NaN dans assertFinancialEquilibrium ne lève PAS d'exception !
      expect(() => assertFinancialEquilibrium(NaN, 100, 0, 0)).not.toThrow();
      expect(() => assertFinancialEquilibrium(100, NaN, 0, 0)).not.toThrow();
      expect(() => assertFinancialEquilibrium(100, 100, NaN, 0)).not.toThrow();

      // En revanche, un véritable déséquilibre numérique lève bien une exception
      expect(() => assertFinancialEquilibrium(100, 90, 0, 0)).toThrow(/Déséquilibre financier/);
    });

    it('1.5 : Preuve empirique : assertStockConsolidation est vulnérable aux quantités NaN', () => {
      const compote = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'nyhzsaxkg')!;
      const cart = [{ ...compote, quantity: 2, cartItemId: 'line-1' }];

      // Si qty est NaN, Math.abs(Math.abs(NaN) - 2) > 0.001 évalue à FALSE !
      expect(() => assertStockConsolidation([['nyhzsaxkg', NaN]], cart)).not.toThrow();

      // En revanche, une fausse quantité numérique ou double déstockage lève bien une exception
      expect(() => assertStockConsolidation([['nyhzsaxkg', -999]], cart)).toThrow(/Quantité déstockée discordante/);
      expect(() => assertStockConsolidation([['nyhzsaxkg', -2], ['nyhzsaxkg', -2]], cart)).toThrow(/Violation de consolidation/);
    });
  });

  // =========================================================================
  // ÉPREUVE 2 : Conformité BigInt des Commandes E-Commerce & Générateurs
  // =========================================================================
  describe('Épreuve 2 — Conformité BigInt Supabase des Commandes E-Commerce', () => {
    it('2.1 : Vérifie que 50 commandes générées consécutivement ont des IDs strictement entiers (BigInt compatible)', () => {
      for (let i = 1; i <= 50; i++) {
        const orderIdNumeric = 1000 + i;
        const order = generateStressOnlineOrder(orderIdNumeric, 5, REAL_105_PRODUCTS_CATALOG);

        // Contrainte 1 : L'ID doit être une chaîne représentant un entier valide
        expect(typeof order.id).toBe('string');
        const parsed = Number(order.id);
        expect(Number.isInteger(parsed)).toBe(true);
        expect(Number.isSafeInteger(parsed)).toBe(true);
        expect(parsed).toBeGreaterThanOrEqual(1001);
        expect(parsed).toBeLessThanOrEqual(1050);

        // Contrainte 2 : Ne doit jamais contenir de préfixe textuel (ex: "order-101") qui causerait code 22P02
        expect(order.id).not.toMatch(/^[a-zA-Z]/);
        expect(order.id).toMatch(/^\d+$/);

        // Contrainte 3 : Totaux financiers sans NaN
        assertNoNaN(order, `order[${order.id}]`);
        expect(order.total).toBeGreaterThan(0);
        expect(order.items.length).toBe(5);
        expect(order.status).toBe('pending');
      }
    });

    it('2.2 : Vérifie la robustesse du générateur face aux IDs atypiques (0, grands entiers)', () => {
      const orderZero = generateStressOnlineOrder(0, 3);
      expect(Number.isInteger(Number(orderZero.id))).toBe(true);
      expect(orderZero.id).toBe('0');

      const orderLarge = generateStressOnlineOrder(9007199254740991, 2); // MAX_SAFE_INTEGER
      expect(Number.isInteger(Number(orderLarge.id))).toBe(true);
    });

    it('2.3 : Vérifie que le générateur de panier caisse generateStressCart produit des articles valides et sans NaN', () => {
      for (let run = 0; run < 10; run++) {
        const cart = generateStressCart(15, REAL_105_PRODUCTS_CATALOG, 0.4);
        expect(cart.length).toBe(15);
        assertNoNaN(cart, `cart_run_${run}`);

        for (const item of cart) {
          expect(item.id).toBeDefined();
          expect(typeof item.id).toBe('string');
          expect(item.quantity).toBeGreaterThanOrEqual(1);
          expect(item.price).toBeGreaterThan(0);
          expect(item.cartItemId).toBeDefined();
        }
      }
    });
  });

  // =========================================================================
  // ÉPREUVE 3 : Isolation des Stores & Étanchéité de resetSimulationEnvironment
  // =========================================================================
  describe('Épreuve 3 — Isolation des Stores & Étanchéité de resetSimulationEnvironment', () => {
    it('3.1 : Réinitialise correctement les collections de transactions et commandes', () => {
      // Polluer les stores
      useTransactionStore.getState().setTransactions([
        { id: 'polluted-tx-1', total: 500, createdAt: new Date().toISOString() } as any
      ]);
      useTransactionStore.getState().setOnlineOrders([
        { id: '9999', total: 100 } as any
      ]);

      expect(useTransactionStore.getState().transactions.length).toBe(1);
      expect(useTransactionStore.getState().onlineOrders.length).toBe(1);

      // Réinitialiser
      resetSimulationEnvironment();

      // Vérifier le nettoyage hermétique
      expect(useTransactionStore.getState().transactions.length).toBe(0);
      expect(useTransactionStore.getState().onlineOrders.length).toBe(0);
    });

    it('3.2 : Réinitialise le panier caisse et la session active', () => {
      // Polluer le panier
      useCartStore.getState().setCart([
        { id: 'dummy', name: 'Item', price: 100, quantity: 5, cartItemId: 'd1' } as any
      ]);
      useCartStore.getState().setSelectedCustomer({ id: 'c-polluted', name: 'Fake' } as any);

      expect(useCartStore.getState().getCart().length).toBe(1);
      expect(useCartStore.getState().getSelectedCustomer()).not.toBeNull();

      // Réinitialiser
      resetSimulationEnvironment();

      expect(useCartStore.getState().getCart().length).toBe(0);
      expect(useCartStore.getState().getSelectedCustomer()).toBeNull();
      expect(useCartStore.getState().activeSessionId).toBe('sess-stress-1');
    });

    it('3.3 : Preuve contradictoire : la copie superficielle expose le catalogue source aux mutations en place', () => {
      const originalStock = REAL_105_PRODUCTS_CATALOG[0].stock;
      
      // Simuler une mutation en place sur un produit du store
      useCoreStore.getState().products[0].stock = 9999;

      // Appel de resetSimulationEnvironment() qui effectue setProducts([...REAL_105_PRODUCTS_CATALOG])
      resetSimulationEnvironment();

      // En raison de la copie superficielle (shallow copy), l'objet sous-jacent a été muté
      const currentStock = useCoreStore.getState().products[0].stock;
      expect(currentStock).toBe(9999);

      // Restauration propre de l'invariant d'origine pour les autres suites de tests
      REAL_105_PRODUCTS_CATALOG[0].stock = originalStock;
      useCoreStore.getState().products[0].stock = originalStock;
      expect(useCoreStore.getState().products[0].stock).toBe(originalStock);
    });
  });

  // =========================================================================
  // ÉPREUVE 4 : Invariants du Catalogue Réel & Conformité Schéma
  // =========================================================================
  describe('Épreuve 4 — Invariants Fondamentaux du Catalogue & Invariance src/', () => {
    it('4.1 : L\'article témoin nyhzsaxkg est immuable et strictement conforme', () => {
      const compote = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'nyhzsaxkg');
      expect(compote).toBeDefined();
      expect(compote?.barcode).toBe('6130760000560');
      expect(compote?.price).toBe(50.00);
      expect(compote?.costPrice).toBe(36.72);
      expect(compote?.taxRate).toBe(19.00);
      expect(compote?.status).toBe('active');
    });

    it('4.2 : Les 8 fournisseurs réels et 3 clients de test ont des soldes et structures cohérentes', () => {
      expect(REAL_SUPPLIERS.length).toBe(8);
      const patifour = REAL_SUPPLIERS.find(s => s.name === 'ETS PATIFOUR');
      expect(patifour?.balance).toBe(3972.00);

      expect(TEST_CUSTOMERS.length).toBe(3);
      for (const cust of TEST_CUSTOMERS) {
        expect(typeof cust.id).toBe('string');
        expect(typeof cust.name).toBe('string');
        expect(typeof cust.creditLimit).toBe('number');
        expect(cust.creditLimit).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
