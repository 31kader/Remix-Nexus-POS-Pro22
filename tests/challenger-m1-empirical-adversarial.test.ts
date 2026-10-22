// tests/challenger-m1-empirical-adversarial.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Product, CartItem } from '../src/types';
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

describe('🔬 ORACLE EMPIRIQUE & TEST CONTRADICTOIRE M1 (challenger_m1_11_1)', () => {
  beforeEach(() => {
    resetSimulationEnvironment();
  });

  // =========================================================================
  // 1. ÉPREUVE EMPIRIQUE DU CATALOGUE RÉEL (105 ARTICLES + BUNDLES + FOURNISSEURS)
  // =========================================================================
  describe('1. Intégrité et conformité fiscale du catalogue réel (105 articles)', () => {
    it('1.1 — Vérifie que le catalogue contient au moins 105 articles avec IDs uniques et non nuls', () => {
      expect(REAL_105_PRODUCTS_CATALOG.length).toBeGreaterThanOrEqual(105);

      const idSet = new Set<string>();
      const barcodeSet = new Set<string>();

      for (const prod of REAL_105_PRODUCTS_CATALOG) {
        expect(prod.id).toBeDefined();
        expect(typeof prod.id).toBe('string');
        expect(prod.id.trim().length).toBeGreaterThan(0);
        expect(idSet.has(prod.id)).toBe(false); // Aucune collision d'ID autorisée
        idSet.add(prod.id);

        expect(prod.barcode).toBeDefined();
        expect(typeof prod.barcode).toBe('string');
        const barcode = prod.barcode!;
        expect(barcode.trim().length).toBeGreaterThan(0);
        barcodeSet.add(barcode);
      }
    });

    it('1.2 — Vérifie que chaque article a un prix > 0 et un coût >= 0 valides (sans NaN/Infinity)', () => {
      for (const prod of REAL_105_PRODUCTS_CATALOG) {
        const price = Number(prod.price);
        const costPrice = Number(prod.costPrice);

        expect(isFinite(price)).toBe(true);
        expect(isNaN(price)).toBe(false);
        expect(price).toBeGreaterThan(0);

        expect(isFinite(costPrice)).toBe(true);
        expect(isNaN(costPrice)).toBe(false);
        expect(costPrice).toBeGreaterThanOrEqual(0);

        // Vérification de décimales raisonnables (maximum 2 décimales pour les centimes DA)
        const priceDecimals = (price.toString().split('.')[1] || '').length;
        expect(priceDecimals).toBeLessThanOrEqual(2);
      }
    });

    it('1.3 — Vérifie la conformité fiscale algérienne (TVA = 19% ou 0% exonéré)', () => {
      for (const prod of REAL_105_PRODUCTS_CATALOG) {
        const taxRate = Number(prod.taxRate);
        expect(isFinite(taxRate)).toBe(true);
        expect(isNaN(taxRate)).toBe(false);
        // En Algérie, les taux POS standard sont soit 19% (normal), soit 0% (exonéré/nécessités)
        expect([0, 19]).toContain(taxRate);
      }
    });

    it('1.4 — Vérifie les codes-barres EAN (formats 8, 12 ou 13 chiffres numériques)', () => {
      for (const prod of REAL_105_PRODUCTS_CATALOG) {
        // Exclure les bundles qui peuvent avoir des SKUs internes
        if (prod.isBundle) continue;
        
        expect(prod.barcode).toBeDefined();
        const barcode = prod.barcode!;
        expect(typeof barcode).toBe('string');
        expect(barcode.length).toBeGreaterThanOrEqual(8);
        expect(/^\d+$/.test(barcode)).toBe(true); // Doit être exclusivement numérique
      }
    });

    it('1.5 — Vérifie rigoureusement l\'article témoin certifié nyhzsaxkg (COMPOTE POMME)', () => {
      const witness = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'nyhzsaxkg');
      expect(witness).toBeDefined();
      expect(witness?.name).toBe('COMPOTE POMME');
      expect(witness?.barcode).toBe('6130760000560');
      expect(witness?.sku).toBe('6130760000560');
      expect(Number(witness?.price)).toBe(50.00);
      expect(Number(witness?.costPrice)).toBe(36.72);
      expect(Number(witness?.taxRate)).toBe(19.00);
      expect(witness?.supplier).toBe('SARL AGRO COMPOTE');
      expect(witness?.status).toBe('active');
    });

    it('1.6 — Vérifie l\'intégrité référentielle des packs composés (bundles)', () => {
      const bundles = REAL_105_PRODUCTS_CATALOG.filter(p => p.isBundle);
      expect(bundles.length).toBeGreaterThanOrEqual(2);

      for (const bundle of bundles) {
        expect(bundle.bundleItems).toBeDefined();
        expect(bundle.bundleItems?.length).toBeGreaterThan(0);

        for (const item of bundle.bundleItems || []) {
          expect(item.quantity).toBeGreaterThan(0);
          // Le sous-produit référencé doit exister dans le catalogue
          const targetProd = REAL_105_PRODUCTS_CATALOG.find(p => p.id === item.productId);
          expect(targetProd).toBeDefined();
          expect(targetProd?.isBundle).toBeFalsy(); // Pas de récursion infinie de bundles
        }
      }
    });

    it('1.7 — Vérifie la structure des fournisseurs réels et clients types', () => {
      expect(REAL_SUPPLIERS.length).toBe(8);
      const patifour = REAL_SUPPLIERS.find(s => s.name === 'ETS PATIFOUR');
      expect(patifour).toBeDefined();
      expect(patifour?.balance).toBe(3972.00);

      expect(TEST_CUSTOMERS.length).toBeGreaterThanOrEqual(3);
      for (const c of TEST_CUSTOMERS) {
        expect(c.id).toBeDefined();
        expect(typeof c.name).toBe('string');
        expect(isFinite(c.balance)).toBe(true);
        expect(isFinite(c.loyaltyPoints)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 2. ÉPREUVE DU GÉNÉRATEUR DE PANIER & CONSOLIDATION PRÉALABLE MULTI-LIGNES
  // =========================================================================
  describe('2. Épreuve contradictoire du générateur de panier & consolidation multi-lignes', () => {
    it('2.1 — Injecte intentionnellement des doublons et triplons et vérifie la consolidation exacte par productId', () => {
      const compote = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'nyhzsaxkg')!;
      const farine = REAL_105_PRODUCTS_CATALOG.find(p => p.id === '007hboycu')!; // FARINE MOULA 600 DA
      const soda = REAL_105_PRODUCTS_CATALOG.find(p => p.id === '00jjsxku1')!; // SODA ORANGE 110 DA

      // Panier contradictoire avec multi-lignes injectées en désordre
      const adversarialCart: CartItem[] = [
        { ...compote, quantity: 2, cartItemId: 'line-compote-1' },
        { ...farine, quantity: 1, cartItemId: 'line-farine-1' },
        { ...compote, quantity: 5, cartItemId: 'line-compote-2' },
        { ...soda, quantity: 3, cartItemId: 'line-soda-1' },
        { ...compote, quantity: 3, cartItemId: 'line-compote-3' }, // Total compote: 2 + 5 + 3 = 10
        { ...farine, quantity: 4, cartItemId: 'line-farine-2' }    // Total farine: 1 + 4 = 5
      ];

      // Exécution de la consolidation préalable par Map (Anti-Écrasement règle GEMINI.md)
      const consolidatedMap = new Map<string, number>();
      for (const item of adversarialCart) {
        consolidatedMap.set(item.id, (consolidatedMap.get(item.id) || 0) + item.quantity);
      }

      // Vérification contradictoire : exactement 3 clés distinctes
      expect(consolidatedMap.size).toBe(3);
      expect(consolidatedMap.get('nyhzsaxkg')).toBe(10);
      expect(consolidatedMap.get('007hboycu')).toBe(5);
      expect(consolidatedMap.get('00jjsxku1')).toBe(3);

      // Simulation des appels d'ajustement de stock
      const enqueuedAdjustments: [string, number][] = [];
      for (const [productId, qty] of consolidatedMap.entries()) {
        enqueuedAdjustments.push([productId, -qty]);
      }

      // Valide avec l'assertion stricte du harnais
      expect(() => assertStockConsolidation(enqueuedAdjustments, adversarialCart)).not.toThrow();
    });

    it('2.2 — Détecte immédiatement une violation de consolidation si des appels non consolidés sont émis', () => {
      const compote = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'nyhzsaxkg')!;
      const cart: CartItem[] = [
        { ...compote, quantity: 2, cartItemId: 'line-1' },
        { ...compote, quantity: 3, cartItemId: 'line-2' }
      ];

      // Cas A : Appels partiels sans consolidation préalable (détecté par discordance immédiate)
      const partialCalls: [string, number][] = [
        ['nyhzsaxkg', -2],
        ['nyhzsaxkg', -3]
      ];
      expect(() => assertStockConsolidation(partialCalls, cart)).toThrow(
        /Quantité déstockée discordante pour nyhzsaxkg : déstocké -2 vs attendu 5/
      );

      // Cas B : Appel dupliqué avec quantité complète (détecté par doublon de clé dans seenProducts)
      const duplicateFullCalls: [string, number][] = [
        ['nyhzsaxkg', -5],
        ['nyhzsaxkg', -5]
      ];
      expect(() => assertStockConsolidation(duplicateFullCalls, cart)).toThrow(
        /Violation de consolidation : productId nyhzsaxkg déstocké plusieurs fois sans consolidation préalable/
      );
    });

    it('2.3 — Valide la décomposition FEFO de bundles mélangés avec des articles unitaires', () => {
      const sodaUnitaire = REAL_105_PRODUCTS_CATALOG.find(p => p.id === '00jjsxku1')!; // SODA ORANGE
      const sodaBundle = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'bundle-pack-soda-orange')!; // Pack 6x

      // Panier contenant 2 canettes unitaires + 2 packs de 6
      const mixedCart: CartItem[] = [
        { ...sodaUnitaire, quantity: 2, cartItemId: 'item-unit' },
        { ...sodaBundle, quantity: 2, cartItemId: 'item-bundle' } // 2 * 6 = 12 canettes
      ];

      // Total attendu pour le produit composant 00jjsxku1 : 2 + 12 = 14
      const consolidatedBundleCalls: [string, number][] = [
        ['00jjsxku1', -14]
      ];

      expect(() => assertStockConsolidation(consolidatedBundleCalls, mixedCart)).not.toThrow();
    });

    it('2.4 — Stress-test massif sur 100 paniers aléatoires générés avec multiLineRatio = 0.5', () => {
      for (let run = 0; run < 100; run++) {
        const cart = generateStressCart(15, REAL_105_PRODUCTS_CATALOG, 0.5);
        expect(cart.length).toBe(15);

        // Consolidation
        const map = new Map<string, number>();
        for (const item of cart) {
          if (item.isBundle && item.bundleItems) {
            for (const bi of item.bundleItems) {
              map.set(bi.productId, (map.get(bi.productId) || 0) + item.quantity * bi.quantity);
            }
          } else {
            map.set(item.id, (map.get(item.id) || 0) + item.quantity);
          }
        }

        const adjustments: [string, number][] = [];
        for (const [prodId, qty] of map.entries()) {
          adjustments.push([prodId, -qty]);
        }

        // Assertion de consolidation sans exception
        expect(() => assertStockConsolidation(adjustments, cart)).not.toThrow();
        expect(() => assertNoNaN(cart, `cart-run-${run}`)).not.toThrow();
      }
    });
  });

  // =========================================================================
  // 3. ÉPREUVE FINANCIÈRE DE PRÉCISION (TTC, HT, TVA DA AU CENTIME)
  // =========================================================================
  describe('3. Conservation financière stricte des montants TTC et TVA au centime DA', () => {
    it('3.1 — Garantit que la consolidation multi-lignes conserve exactement le TTC total sans perte de centime', () => {
      const compote = REAL_105_PRODUCTS_CATALOG.find(p => p.id === 'nyhzsaxkg')!;
      const cart: CartItem[] = [
        { ...compote, quantity: 2, cartItemId: 'l1' },
        { ...compote, quantity: 4, cartItemId: 'l2' },
        { ...compote, quantity: 7, cartItemId: 'l3' }
      ];

      // Somme des sous-totaux par ligne
      const sumLineSubtotals = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

      // Total calculé sur la quantité consolidée
      const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
      const consolidatedTotal = totalQuantity * compote.price;

      expect(totalQuantity).toBe(13);
      expect(sumLineSubtotals).toBe(650.00);
      expect(consolidatedTotal).toBe(650.00);
      expect(Math.abs(sumLineSubtotals - consolidatedTotal)).toBeLessThan(0.0001);
    });

    it('3.2 — Calcule fidèlement le montant HT et TVA 19% au centime DA', () => {
      // Pour l'article témoin COMPOTE POMME (50.00 DA TTC à 19% TVA) :
      // HT = 50 / 1.19 = 42.0168... -> 42.02 DA
      // TVA = 50 - 42.02 = 7.98 DA
      const priceTTC = 50.00;
      const taxRate = 19.00;
      const priceHT = Math.round((priceTTC / (1 + taxRate / 100)) * 100) / 100;
      const taxAmount = Math.round((priceTTC - priceHT) * 100) / 100;

      expect(priceHT).toBe(42.02);
      expect(taxAmount).toBe(7.98);
      expect(priceHT + taxAmount).toBe(50.00);

      // Pour 13 unités :
      const totalTTC = 650.00;
      const totalHT = Math.round((totalTTC / (1 + taxRate / 100)) * 100) / 100;
      const totalTax = Math.round((totalTTC - totalHT) * 100) / 100;
      expect(totalHT + totalTax).toBe(totalTTC);
    });

    it('3.3 — Éprouve assertFinancialEquilibrium sur règlements complets, monnaie et dettes', () => {
      // Cas 1 : Paiement exact en espèces
      expect(() => assertFinancialEquilibrium(1500.00, 1500.00, 0, 0)).not.toThrow();

      // Cas 2 : Paiement avec rendu de monnaie
      expect(() => assertFinancialEquilibrium(1250.00, 2000.00, 750.00, 0)).not.toThrow();

      // Cas 3 : Vente à crédit (dette client)
      expect(() => assertFinancialEquilibrium(4500.00, 1000.00, 0, 3500.00)).not.toThrow();

      // Cas 4 : Vente mixte (espèces + crédit + rendu impossible)
      expect(() => assertFinancialEquilibrium(5250.75, 3000.75, 0, 2250.00)).not.toThrow();

      // Cas 5 (Adversarial) : Déséquilibre comptable -> doit lever une exception
      expect(() => assertFinancialEquilibrium(1000.00, 1000.00, 50.00, 0)).toThrow(
        /Déséquilibre financier/
      );
    });

    it('3.4 — Éprouve le scanner anti-NaN récursif avec injection malveillante', () => {
      // Objet sain
      const cleanObj = { a: 1, b: { c: 'hello', d: [10, 20, 30] } };
      expect(() => assertNoNaN(cleanObj)).not.toThrow();

      // Objet avec NaN injecté
      const corruptObj = { a: 1, b: { c: 'hello', d: [10, NaN, 30] } };
      expect(() => assertNoNaN(corruptObj)).toThrow(/NaN détecté au chemin: root\.b\.d\[1\]/);

      // Objet avec Infinity injecté
      const infinityObj = { a: Infinity, b: 2 };
      expect(() => assertNoNaN(infinityObj)).toThrow(/Infinity détecté au chemin: root\.a/);
    });
  });

  // =========================================================================
  // 4. ÉPREUVE DES COMMANDES E-COMMERCE (IDs BIGINT & CONFORMITÉ POSTGRESQL)
  // =========================================================================
  describe('4. Intégrité des commandes en ligne e-commerce (IDs bigint Supabase)', () => {
    it('4.1 — Génère des commandes avec des IDs strictement convertibles en bigint PostgreSQL', () => {
      for (let i = 1001; i <= 1050; i++) {
        const order = generateStressOnlineOrder(i, 4, REAL_105_PRODUCTS_CATALOG);
        
        // Validation que l'ID est convertible en BigInt sans lever d'erreur
        expect(() => BigInt(order.id)).not.toThrow();
        expect(BigInt(order.id)).toBe(BigInt(i));

        expect(order.status).toBe('pending');
        expect(order.items.length).toBe(4);
        expect(order.total).toBeGreaterThan(0);

        // Validation que la somme des lignes d'articles égale exactement le total
        const itemsTotal = order.items.reduce((acc, it) => acc + it.price * it.quantity, 0);
        expect(Math.abs(itemsTotal - order.total)).toBeLessThan(0.01);
      }
    });

    it('4.2 — Rejette formellement les IDs non numériques incompatibles avec bigint', () => {
      const invalidIds = ['order-idem-1', 'order-bundle-1', 'UUID-1234-5678', 'abc'];
      for (const badId of invalidIds) {
        expect(() => BigInt(badId)).toThrow();
      }
    });
  });
});
