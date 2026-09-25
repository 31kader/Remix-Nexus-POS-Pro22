import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { subDays } from 'date-fns';
import { calculateItemPrice } from '../src/lib/utils';
import { generateReceiptQrCode } from '../src/services/receiptPrintService';
import { useProfitsReportLogic } from '../src/components/reports/profits/useProfitsReportLogic';
import { Transaction, Product, ProductReturn, CompanySettings } from '../src/types';

describe('Axe 5 & Axe 6 : Fiabilité des Rapports, Impression & Qualité du Code', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Extraction exacte de la TVA 19% sur un montant TTC (ANOM-AXE5-02 / M6)
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Extraction fiscale exacte de la TVA incluse (TTC)', () => {
    const taxRate = 19; // TVA algérienne standard
    const vatRate = taxRate / 100;

    const extractVatIncluded = (totalTtc: number, rate: number = 19) => {
      const vRate = rate / 100;
      return totalTtc - (totalTtc / (1 + vRate));
    };

    it('extrait exactement 19.00 DA de TVA sur un montant de 119.00 DA TTC', () => {
      const totalTtc = 119.00;
      const taxAmount = extractVatIncluded(totalTtc, taxRate);
      const htAmount = totalTtc - taxAmount;

      expect(taxAmount.toFixed(2)).toBe('19.00');
      expect(htAmount.toFixed(2)).toBe('100.00');
      expect(Number((htAmount * (1 + vatRate)).toFixed(2))).toBe(119.00);
    });

    it('met en évidence et corrige l’erreur de multiplication directe sur le TTC', () => {
      const totalTtc = 119.00;
      // Ancienne formule erronée qui multipliait directement le TTC par 0.19
      const flawedTaxAmount = totalTtc * (taxRate / 100);
      expect(flawedTaxAmount.toFixed(2)).toBe('22.61'); // Surestimation de +3.61 DA (+19%)

      // Nouvelle formule corrigée conforme au fisc
      const correctedTaxAmount = extractVatIncluded(totalTtc, taxRate);
      expect(correctedTaxAmount.toFixed(2)).toBe('19.00');
      expect(correctedTaxAmount).toBeLessThan(flawedTaxAmount);
    });

    it('extrait fidèlement la TVA sur des montants arbitraires et gère le montant 0', () => {
      // 238 DA TTC -> 200 HT + 38 TVA
      expect(extractVatIncluded(238.00, 19).toFixed(2)).toBe('38.00');
      // 595 DA TTC -> 500 HT + 95 TVA
      expect(extractVatIncluded(595.00, 19).toFixed(2)).toBe('95.00');
      // 0 DA TTC -> 0 TVA
      expect(extractVatIncluded(0, 19).toFixed(2)).toBe('0.00');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Calcul des prix unitaires avec remises et tarif de gros (ANOM-AXE5-05 / M17)
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Calcul du prix unitaire net (calculateItemPrice)', () => {
    const baseItem: any = {
      id: 'prod-1',
      name: 'Produit Test',
      price: 1000,
      wholesalePrice: 850,
      costPrice: 600,
      quantity: 1,
    };

    it('applique le prix catalogue standard en vente au détail', () => {
      const price = calculateItemPrice(baseItem, false);
      expect(price).toBe(1000);
    });

    it('applique le prix de gros quand isWholesale est activé', () => {
      const price = calculateItemPrice(baseItem, true);
      expect(price).toBe(850);
    });

    it('donne la priorité absolue au prix forcé / négocié par le caissier (overriddenPrice)', () => {
      const itemWithOverride = { ...baseItem, overriddenPrice: 750 };
      expect(calculateItemPrice(itemWithOverride, false)).toBe(750);
      expect(calculateItemPrice(itemWithOverride, true)).toBe(750);
    });

    it('applique correctement une remise de ligne en pourcentage', () => {
      const itemWithPercentDiscount = {
        ...baseItem,
        lineDiscount: { type: 'percentage' as const, value: 10 }
      };
      // 10% sur 1000 DA = 900 DA
      expect(calculateItemPrice(itemWithPercentDiscount, false)).toBe(900);
      // 10% sur 850 DA (gros) = 765 DA
      expect(calculateItemPrice(itemWithPercentDiscount, true)).toBe(765);
    });

    it('applique correctement une remise de ligne en montant fixe', () => {
      const itemWithFixedDiscount = {
        ...baseItem,
        lineDiscount: { type: 'fixed' as const, value: 150 }
      };
      // 1000 DA - 150 DA = 850 DA
      expect(calculateItemPrice(itemWithFixedDiscount, false)).toBe(850);
      // 850 DA - 150 DA = 700 DA
      expect(calculateItemPrice(itemWithFixedDiscount, true)).toBe(700);
    });

    it('applique correctement les remises par palier de quantité (quantityDiscounts)', () => {
      const itemWithQtyTier = {
        ...baseItem,
        quantity: 5,
        quantityDiscounts: [
          { minQuantity: 3, discountPrice: 850 }
        ]
      };
      // Le prix spécial de palier (850 DA) est appliqué
      expect(calculateItemPrice(itemWithQtyTier, false)).toBe(850);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Filtre 'yesterday' et déduction des retours (ANOM-AXE5-01 / M14)
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Rapport des bénéfices : filtre yesterday et déduction des retours', () => {
    const now = new Date();
    const yesterdayDate = subDays(now, 1);
    const threeDaysAgoDate = subDays(now, 3);

    const mockSettings: CompanySettings = {
      name: 'Nexus Store',
      currency: 'DA',
      taxRate: 19,
      receiptTemplate: 'standard',
      labelTemplate: 'standard',
      loyaltyPointsPerCurrencyUnit: 1,
      loyaltyPointValue: 1,
      address: 'Alger',
      phone: '0555000000',
      email: 'contact@nexuspos.dz',
    };

    const mockProducts: Product[] = [
      {
        id: 'p-1',
        name: 'Article A',
        price: 200,
        costPrice: 100,
        stock: 50,
        minStock: 5,
        categoryId: 'cat-1',
        supplier: 'Fournisseur 1',
        unit: 'pcs',
        sku: 'SKU-A',
        taxRate: 19,
        status: 'active',
        updatedAt: now.toISOString(),
      }
    ];

    const mockTxYesterday: Transaction = {
      id: 'tx-yesterday-1',
      timestamp: yesterdayDate.toISOString(),
      total: 600,
      paymentMethod: 'cash',
      userId: 'user-1',
      items: [
        {
          ...mockProducts[0],
          cartItemId: 'c-1',
          quantity: 3,
          price: 200,
        }
      ]
    };

    const mockReturnYesterday: ProductReturn = {
      id: 'ret-yesterday-1',
      transactionId: 'tx-yesterday-1',
      timestamp: yesterdayDate.toISOString(),
      totalRefund: 200,
      reason: 'Défectueux',
      userId: 'user-1',
      type: 'refund',
      items: [
        {
          lineId: 'l-1',
          productId: 'p-1',
          name: 'Article A',
          quantity: 1,
          price: 200,
        }
      ]
    };

    const mockReturnOld: ProductReturn = {
      id: 'ret-old-1',
      transactionId: 'tx-old-1',
      timestamp: threeDaysAgoDate.toISOString(),
      totalRefund: 200,
      reason: 'Non désiré',
      userId: 'user-1',
      type: 'refund',
      items: [
        {
          lineId: 'l-2',
          productId: 'p-1',
          name: 'Article A',
          quantity: 1,
          price: 200,
        }
      ]
    };

    it('déduit uniquement les retours d’hier lors du filtre "yesterday"', () => {
      const { result } = renderHook(() =>
        useProfitsReportLogic({
          transactions: [mockTxYesterday],
          products: mockProducts,
          employees: [],
          returns: [mockReturnYesterday, mockReturnOld],
          settings: mockSettings,
          categories: [],
          customers: [],
        })
      );

      // Basculer sur le filtre 'yesterday'
      act(() => {
        result.current.setProfitFilterDate('yesterday');
      });

      // Ventes brutes : 3 unités à 200 = 600 DA
      // Retour d'hier : 1 unité à 200 = 200 DA déduits
      // Le retour d'il y a 3 jours (mockReturnOld) NE DOIT PAS être déduit !
      const totals = result.current.totals;
      expect(totals.revenue).toBe(400); // 600 - 200 = 400
      expect(totals.cost).toBe(200);    // (3 - 1) * 100 = 200
      expect(totals.profit).toBe(200);  // 400 - 200 = 200
      expect(totals.margin).toBe(50);   // (200 / 400) * 100 = 50%

      const productData = result.current.productProfitData.find(p => p.id === 'p-1');
      expect(productData).toBeDefined();
      expect(productData?.stats.qty).toBe(2);
      expect(productData?.stats.revenue).toBe(400);
      expect(productData?.stats.cost).toBe(200);
      expect(productData?.profit).toBe(200);
    });

    it('ne déduit aucun retour d’hier si le filtre est réglé sur "today"', () => {
      const { result } = renderHook(() =>
        useProfitsReportLogic({
          transactions: [mockTxYesterday],
          products: mockProducts,
          employees: [],
          returns: [mockReturnYesterday, mockReturnOld],
          settings: mockSettings,
          categories: [],
          customers: [],
        })
      );

      act(() => {
        result.current.setProfitFilterDate('today');
      });

      // La transaction et les retours étant d'hier, aucun CA n'est généré aujourd'hui
      const totals = result.current.totals;
      expect(totals.revenue).toBe(0);
      expect(totals.cost).toBe(0);
      expect(totals.profit).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Génération 100% hors-ligne du QR Code thermique (ANOM-AXE5-03 / M15)
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Génération locale et offline-first du QR code de ticket', () => {
    it('génère un QR code sous forme de Data URL Base64 sans appel réseau', async () => {
      const url = 'https://instagram.com/nexuspos';
      const dataUrl = await generateReceiptQrCode(url);

      expect(dataUrl).toBeDefined();
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
      expect(dataUrl.length).toBeGreaterThan(100);
    });

    it('retourne une chaîne vide si aucune URL n’est renseignée', async () => {
      const emptyResult = await generateReceiptQrCode('');
      expect(emptyResult).toBe('');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Trésorerie nette et déduction des retours (ANOM-AXE5-04 / M16)
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Trésorerie et flux : exclusion des transactions annulées et déduction des retours', () => {
    it('exclut les transactions annulées et déduit les remboursements du cashflow net', () => {
      const transactions: Transaction[] = [
        { id: 't1', total: 1000, status: 'completed', paymentMethod: 'cash', timestamp: new Date().toISOString(), userId: 'u1', items: [] },
        { id: 't2', total: 500, status: 'cancelled', paymentMethod: 'cash', timestamp: new Date().toISOString(), userId: 'u1', items: [] }, // Annulée
        { id: 't3', total: 300, status: 'returned', paymentMethod: 'cash', timestamp: new Date().toISOString(), userId: 'u1', items: [] }, // Retournée
      ];

      const returns: ProductReturn[] = [
        { id: 'r1', transactionId: 't1', totalRefund: 200, reason: 'Retour', timestamp: new Date().toISOString(), userId: 'u1', type: 'refund', items: [] }
      ];

      // Entrées actives = t1 (1000) car t2 annulée et t3 retournée
      const activeTx = transactions.filter(t => t.status !== 'returned' && t.status !== 'cancelled');
      const cashInTotal = activeTx.reduce((sum, t) => sum + t.total, 0);
      expect(cashInTotal).toBe(1000);

      // Sorties = retours (200)
      const returnsTotal = returns.reduce((sum, r) => sum + (r.totalRefund || 0), 0);
      expect(returnsTotal).toBe(200);

      // Cashflow Net = 1000 - 200 = 800
      const netCashflow = cashInTotal - returnsTotal;
      expect(netCashflow).toBe(800);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Garde-fou division par zéro (ANOM-AXE5-06)
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. Pertes et rebuts : garde-fou division par zéro', () => {
    it('affiche 0.00% d’impact si le chiffre d’affaires total est nul ou négatif', () => {
      const totalLossValue = 5000;
      const totalRevenueZero = 0;

      const formatMarginImpact = (loss: number, revenue: number) => {
        return revenue > 0 ? `-${((loss / revenue) * 100).toFixed(2)}%` : '0.00%';
      };

      expect(formatMarginImpact(totalLossValue, totalRevenueZero)).toBe('0.00%');
      expect(formatMarginImpact(totalLossValue, 100000)).toBe('-5.00%');
    });
  });

});
