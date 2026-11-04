import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateAlgerianRip,
  formatAlgerianRip,
  generateBaridiMobQrString,
  getSavedBaridiMobConfig,
  saveBaridiMobConfig
} from '../src/services/fintech/baridiMobService';
import {
  computeAlgerianStampDuty,
  computeTaxBreakdown,
  numberToWordsAlgerianDZD
} from '../src/services/fiscal/algerianTaxCalculations';
import {
  computeG50SummaryForPeriod,
  generateG50Csv
} from '../src/services/fiscal/g50ExportService';
import { generateAlgerianFiscalInvoiceHtml } from '../src/services/fiscal/algerianInvoiceTemplate';
import { Transaction, CompanySettings } from '../src/types';

describe('💳 Fintech Algérienne (BaridiMob) & Conformité Fiscale (G50)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Validation & Formatage RIP Algérie Poste (Modulo 97)', () => {
    it('valide un RIP officiel Algérie Poste avec clé correcte', () => {
      // Pour account "007999990000000000", la clé modulo 97 est 37
      const validRip = '00799999000000000037';
      expect(validateAlgerianRip(validRip)).toBe(true);
    });

    it('rejette les RIP trop courts, avec caractères invalides ou clé erronée', () => {
      expect(validateAlgerianRip('12345')).toBe(false);
      expect(validateAlgerianRip('00799999000000000099')).toBe(false);
      expect(validateAlgerianRip('007ABC99000000000037')).toBe(false);
    });

    it('formate correctement le RIP avec des espaces séparateurs', () => {
      const formatted = formatAlgerianRip('00799999000000000037');
      expect(formatted).toBe('007 999 990000000000 37');
    });

    it('génère une URL de QR Code conforme au schéma BaridiMob', () => {
      const qrStr = generateBaridiMobQrString({
        rip: '00799999000000000012',
        amount: 3500.5,
        transactionId: 'TX-2026-001',
        merchantName: 'Superette El Bahia'
      });
      expect(qrStr).toContain('baridimob://pay?');
      expect(qrStr).toContain('rip=00799999000000000012');
      expect(qrStr).toContain('amt=3500.50');
      expect(qrStr).toContain('cur=DZD');
    });

    it('sauvegarde et recharge la configuration BaridiMob du commerçant', () => {
      saveBaridiMobConfig('00799999000000000012', 'Boutique Test');
      const cfg = getSavedBaridiMobConfig();
      expect(cfg.rip).toBe('00799999000000000012');
      expect(cfg.merchantName).toBe('Boutique Test');
    });
  });

  describe('2. Calculs Fiscaux Algériens & Droit de Timbre', () => {
    it('calcule le droit de timbre de 1% sur espèces avec minimum de 5 DA', () => {
      // 200 DA * 1% = 2 DA -> minimum légal 5 DA
      expect(computeAlgerianStampDuty(200, 'cash')).toBe(5);
      // 10 000 DA * 1% = 100 DA
      expect(computeAlgerianStampDuty(10000, 'cash')).toBe(100);
      // 300 000 DA * 1% = 3 000 DA -> plafonné à 2 500 DA
      expect(computeAlgerianStampDuty(300000, 'cash')).toBe(2500);
      // Pas de timbre sur carte ou virement
      expect(computeAlgerianStampDuty(10000, 'card')).toBe(0);
      expect(computeAlgerianStampDuty(10000, 'transfer')).toBe(0);
    });

    it('ventile correctement les bases imposables et la TVA 19% et 9%', () => {
      const items = [
        { price: 119, quantity: 1, taxRate: 19 }, // HT = 100, TVA = 19
        { price: 109, quantity: 2, taxRate: 9 }   // HT = 200, TVA = 18
      ];
      const res = computeTaxBreakdown(items, 'card');
      expect(res.base19).toBe(100);
      expect(res.vat19).toBe(19);
      expect(res.base9).toBe(200);
      expect(res.vat9).toBe(18);
      expect(res.totalHT).toBe(300);
      expect(res.totalVAT).toBe(37);
      expect(res.totalTTC).toBe(337);
      expect(res.stampDuty).toBe(0); // Pas d'espèces
    });

    it('convertit les montants numériques en toutes lettres en Dinars Algériens', () => {
      expect(numberToWordsAlgerianDZD(0)).toBe('Zéro Dinar Algérien');
      expect(numberToWordsAlgerianDZD(150)).toBe('Cent cinquante Dinars Algériens');
      expect(numberToWordsAlgerianDZD(1250)).toBe('Mille deux cent cinquante Dinars Algériens');
      expect(numberToWordsAlgerianDZD(25000)).toBe('Vingt-cinq mille Dinars Algériens');
    });
  });

  describe('3. Déclaration Fiscale G50 & Modèle Facture A4', () => {
    const dummySales: Transaction[] = [
      {
        id: 'tx-1',
        timestamp: '2026-11-04T10:00:00.000Z',
        userId: 'u1',
        paymentMethod: 'cash',
        total: 1190,
        items: [{ id: 'p1', name: 'Article 19', price: 1190, quantity: 1, taxRate: 19 } as any],
        status: 'completed'
      },
      {
        id: 'tx-2',
        timestamp: '2026-11-04T11:00:00.000Z',
        userId: 'u1',
        paymentMethod: 'card',
        total: 1090,
        items: [{ id: 'p2', name: 'Article 9', price: 1090, quantity: 1, taxRate: 9 } as any],
        status: 'completed'
      }
    ];

    const dummyPurchases = [
      { total: 1190, timestamp: '2026-11-04T08:00:00.000Z' } // TVA déductible = 190
    ];

    it('agrège fidèlement les données mensuelles pour le bordereau G50', () => {
      const summary = computeG50SummaryForPeriod(dummySales, dummyPurchases, 2026, 11);
      expect(summary.transactionCount).toBe(2);
      expect(summary.baseImposable19).toBe(1000);
      expect(summary.tvaCollectee19).toBe(190);
      expect(summary.baseImposable9).toBe(1000);
      expect(summary.tvaCollectee9).toBe(90);
      expect(summary.tvaDeductibleAchats).toBe(190);
      // TVA due = (190 + 90) - 190 = 90
      expect(summary.tvaNetteDue).toBe(90);
      expect(summary.droitsTimbrePerçus).toBeGreaterThanOrEqual(5);
    });

    it('génère un export CSV conforme avec les rubriques de la DGI', () => {
      const summary = computeG50SummaryForPeriod(dummySales, dummyPurchases, 2026, 11);
      const csv = generateG50Csv(summary);
      expect(csv).toContain('Chiffre d\'Affaires Brut TTC');
      expect(csv).toContain('taux normal');
      expect(csv).toContain('TVA NETTE A PAYER');
    });

    it('génère la facture fiscale A4 avec NIF, NIS, RC, AI et arrêté en lettres', () => {
      const settings: CompanySettings = {
        name: 'EL BAHIA SARL',
        taxNumber: '001216012345678',
        currency: 'DA',
        receiptTemplate: 'standard',
        labelTemplate: 'standard',
        taxRate: 19,
        loyaltyPointsPerCurrencyUnit: 1,
        loyaltyPointValue: 1
      };

      const html = generateAlgerianFiscalInvoiceHtml(dummySales[0], settings, null, {
        nif: '001216012345678',
        nis: '099816010000000',
        rc: '16/00-0123456B22',
        ai: '16011234567'
      });

      expect(html).toContain('FACTURE COMMERCIALE');
      expect(html).toContain('001216012345678');
      expect(html).toContain('16011234567');
      expect(html).toContain('Arrêté la présente facture');
      expect(html).toContain('Dinars Algériens');
    });
  });
});
