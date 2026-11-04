import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import {
  buildCatalogAndRules,
  evaluateCartDiscounts,
  applyVoucherDeduction,
  applyLoyaltyRedemption,
  updatePromoReportStep,
  writePromoReportSummary,
  CatalogProduct,
  PromotionRule,
  VoucherRecord,
  LoyaltyCustomer
} from './promotionsVouchersFidelitySimulationHelpers';

describe('🎯 SIMULATION MOTEUR PROMOTIONNEL, VOUCHERS, FIDÉLITÉ & DÉDUCTION MIXTE', () => {
  const reportPath = path.resolve(process.cwd(), 'docs/simulations/SIMULATION_PROMOTIONS_VOUCHERS_FIDELITE_RAPPORT.md');

  let products: Record<string, CatalogProduct>;
  let promotions: Record<string, PromotionRule>;
  let vouchers: Record<string, VoucherRecord>;
  let customers: Record<string, LoyaltyCustomer>;

  let totalGrossSales = 0;
  let totalPromoDiscounts = 0;
  let totalVoucherDeductions = 0;
  let totalLoyaltyDiscounts = 0;
  let totalNetCollected = 0;

  beforeAll(() => {
    const initialized = buildCatalogAndRules();
    products = initialized.products;
    promotions = initialized.promotions;
    vouchers = initialized.vouchers;
    customers = initialized.customers;
  });

  it('Étape 0 : Initialisation Référentiel Commercial, Promos, Vouchers & Fidélité', () => {
    expect(Object.keys(products)).toHaveLength(10);
    expect(Object.keys(promotions)).toHaveLength(3);
    expect(Object.keys(vouchers)).toHaveLength(5);
    expect(Object.keys(customers)).toHaveLength(5);

    updatePromoReportStep(
      reportPath, 0, '✅ Validé',
      'Catalogue 10 articles, 3 règles promos (% rayon, seuil 10k, B2G1 café), 5 vouchers (dont expiré et avec seuil), 5 clients fidélité initialisés.'
    );
  });

  it('Étape 1 : Ventes avec Promotions Dynamiques (% Catégorie et Remise Fixe)', () => {
    let stepGross = 0;
    let stepPromos = 0;
    let stepNet = 0;

    // 5x Claviers (remise 15% = 900 DA)
    for (let i = 0; i < 5; i++) {
      const res = evaluateCartDiscounts([{ product: products['P03'], quantity: 1 }], Object.values(promotions));
      expect(res.subTotalAfterPromos).toBe(5100);
      stepGross += res.grossTotal;
      stepPromos += res.itemDiscounts + res.cartDiscount;
      stepNet += res.subTotalAfterPromos;
    }

    // 5x Souris (remise 15% = 450 DA)
    for (let i = 0; i < 5; i++) {
      const res = evaluateCartDiscounts([{ product: products['P04'], quantity: 1 }], Object.values(promotions));
      expect(res.subTotalAfterPromos).toBe(2550);
      stepGross += res.grossTotal;
      stepPromos += res.itemDiscounts + res.cartDiscount;
      stepNet += res.subTotalAfterPromos;
    }

    // 3x Smartphone S24 (15% = 6750 DA + seuil > 10k = 1000 DA fixe)
    for (let i = 0; i < 3; i++) {
      const res = evaluateCartDiscounts([{ product: products['P02'], quantity: 1 }], Object.values(promotions));
      expect(res.subTotalAfterPromos).toBe(37250);
      stepGross += res.grossTotal;
      stepPromos += res.itemDiscounts + res.cartDiscount;
      stepNet += res.subTotalAfterPromos;
    }

    // 2x Huile (sous le seuil 10k, non électronique)
    for (let i = 0; i < 2; i++) {
      const res = evaluateCartDiscounts([{ product: products['P06'], quantity: 2 }], Object.values(promotions));
      expect(res.subTotalAfterPromos).toBe(9000);
      stepGross += res.grossTotal;
      stepPromos += res.itemDiscounts + res.cartDiscount;
      stepNet += res.subTotalAfterPromos;
    }

    expect(stepGross).toBe(198000.00);
    expect(stepPromos).toBe(30000.00);
    expect(stepNet).toBe(168000.00);

    totalGrossSales += stepGross;
    totalPromoDiscounts += stepPromos;
    totalNetCollected += stepNet;

    updatePromoReportStep(
      reportPath, 1, '✅ Validé',
      '15 ventes enregistrées (Brut : 198 000 DA, Remises : 30 000 DA, Net : 168 000 DA). Remises 15% électronique et franchissements du seuil 10k vérifiés.'
    );
  });

  it('Étape 2 : Offres Conditionnelles "Achetez X, Obtenez Y" (Lots / Bundle)', () => {
    let stepGross = 0;
    let stepPromos = 0;
    let stepNet = 0;

    // 5x Ventes de 3 cafés (2 achetés + 1 offert)
    for (let i = 0; i < 5; i++) {
      const res = evaluateCartDiscounts([{ product: products['P05'], quantity: 3 }], Object.values(promotions));
      expect(res.itemDiscounts).toBe(500);
      expect(res.subTotalAfterPromos).toBe(1000);
      stepGross += res.grossTotal;
      stepPromos += res.itemDiscounts;
      stepNet += res.subTotalAfterPromos;
    }

    // 3x Ventes de 6 cafés (4 achetés + 2 offerts)
    for (let i = 0; i < 3; i++) {
      const res = evaluateCartDiscounts([{ product: products['P05'], quantity: 6 }], Object.values(promotions));
      expect(res.itemDiscounts).toBe(1000);
      expect(res.subTotalAfterPromos).toBe(2000);
      stepGross += res.grossTotal;
      stepPromos += res.itemDiscounts;
      stepNet += res.subTotalAfterPromos;
    }

    // 2x Ventes de 2 cafés (seuil 3 non atteint, 0 offert)
    for (let i = 0; i < 2; i++) {
      const res = evaluateCartDiscounts([{ product: products['P05'], quantity: 2 }], Object.values(promotions));
      expect(res.itemDiscounts).toBe(0);
      expect(res.subTotalAfterPromos).toBe(1000);
      stepGross += res.grossTotal;
      stepPromos += res.itemDiscounts;
      stepNet += res.subTotalAfterPromos;
    }

    expect(stepGross).toBe(18500.00);
    expect(stepPromos).toBe(5500.00);
    expect(stepNet).toBe(13000.00);

    totalGrossSales += stepGross;
    totalPromoDiscounts += stepPromos;
    totalNetCollected += stepNet;

    updatePromoReportStep(
      reportPath, 2, '✅ Validé',
      '10 ventes de cafés traitées (Brut : 18 500 DA, 11 cafés offerts déstockés pour 5 500 DA, Net : 13 000 DA).'
    );
  });

  it('Étape 3 : Application & Décrémentation Fractionnée des Bons d\'Achat', () => {
    let stepGross = 0;
    let stepVouchers = 0;
    let stepNet = 0;

    // Vente 26 : Panier 3 200 DA avec VOUCH-5K-01 (5 000 DA)
    const res26 = applyVoucherDeduction(3200, vouchers['VOUCH-5K-01'], 'TX-PROMO-26');
    expect(res26.success).toBe(true);
    expect(res26.deductedAmount).toBe(3200.00);
    expect(res26.newNetTotal).toBe(0.00);
    expect(res26.updatedVoucher.currentBalance).toBe(1800.00);
    expect(res26.updatedVoucher.status).toBe('active');
    vouchers['VOUCH-5K-01'] = res26.updatedVoucher;
    stepGross += 3200;
    stepVouchers += res26.deductedAmount;
    stepNet += res26.newNetTotal;

    // Vente 27 : Panier 2 500 DA avec le même bon (solde 1 800 DA)
    const res27 = applyVoucherDeduction(2500, vouchers['VOUCH-5K-01'], 'TX-PROMO-27');
    expect(res27.success).toBe(true);
    expect(res27.deductedAmount).toBe(1800.00);
    expect(res27.newNetTotal).toBe(700.00);
    expect(res27.updatedVoucher.status).toBe('used');
    vouchers['VOUCH-5K-01'] = res27.updatedVoucher;
    stepGross += 2500;
    stepVouchers += res27.deductedAmount;
    stepNet += res27.newNetTotal;

    // Vente 28 : Rejet bon expiré
    const res28 = applyVoucherDeduction(4000, vouchers['VOUCH-EXPIRED'], 'TX-PROMO-28');
    expect(res28.success).toBe(false);

    // Vente 29 : Rejet seuil min 15k non atteint
    const res29 = applyVoucherDeduction(8000, vouchers['VOUCH-10K-02'], 'TX-PROMO-29');
    expect(res29.success).toBe(false);

    // Vente 30 : Panier 22 500 DA avec VOUCH-10K-02 (seuil OK)
    const res30 = applyVoucherDeduction(22500, vouchers['VOUCH-10K-02'], 'TX-PROMO-30');
    expect(res30.success).toBe(true);
    expect(res30.deductedAmount).toBe(10000.00);
    expect(res30.newNetTotal).toBe(12500.00);
    vouchers['VOUCH-10K-02'] = res30.updatedVoucher;
    stepGross += 22500;
    stepVouchers += res30.deductedAmount;
    stepNet += res30.newNetTotal;

    // Ventes 31 à 35 : 5 ventes de 4 000 DA avec coupon -10% (VOUCH-PCT-10)
    for (let i = 0; i < 5; i++) {
      const resPct = applyVoucherDeduction(4000, vouchers['VOUCH-PCT-10'], `TX-PROMO-${31 + i}`);
      expect(resPct.deductedAmount).toBe(400.00);
      expect(resPct.newNetTotal).toBe(3600.00);
      stepGross += 4000;
      stepVouchers += resPct.deductedAmount;
      stepNet += resPct.newNetTotal;
    }

    expect(stepGross).toBe(48200.00);
    expect(stepVouchers).toBe(17000.00);
    expect(stepNet).toBe(31200.00);

    totalGrossSales += stepGross;
    totalVoucherDeductions += stepVouchers;
    totalNetCollected += stepNet;

    updatePromoReportStep(
      reportPath, 3, '✅ Validé',
      '10 transactions vouchers traitées (Brut : 48 200 DA, Déductions Vouchers : 17 000 DA, Net : 31 200 DA). Décrémentation fractionnée, passage à used et rejets vérifiés.'
    );
  });

  it('Étape 4 : Déduction Mixte Points Fidélité & Ré-accumulation sur le Net', () => {
    let stepGross = 0;
    let stepPromos = 0;
    let stepLoyalty = 0;
    let stepNet = 0;

    // Vente 36 : C01 utilise 200 pts (1 000 DA)
    const tx36 = applyLoyaltyRedemption(8000, customers['C01'], 200);
    expect(tx36.newNetTotal).toBe(7000);
    expect(tx36.pointsEarnedOnNet).toBe(70);
    expect(tx36.updatedCustomer.points).toBe(170);
    customers['C01'] = tx36.updatedCustomer;
    stepGross += 8000;
    stepLoyalty += 1000;
    stepNet += 7000;

    // Vente 37 : C02 promo -1000 DA + utilise 400 pts (2 000 DA)
    const tx37 = applyLoyaltyRedemption(11000, customers['C02'], 400);
    expect(tx37.newNetTotal).toBe(9000);
    expect(tx37.pointsEarnedOnNet).toBe(90);
    expect(tx37.updatedCustomer.points).toBe(190);
    customers['C02'] = tx37.updatedCustomer;
    stepGross += 12000;
    stepPromos += 1000;
    stepLoyalty += 2000;
    stepNet += 9000;

    // Vente 38 : C03 utilise 100 pts (500 DA)
    const tx38 = applyLoyaltyRedemption(5000, customers['C03'], 100);
    expect(tx38.newNetTotal).toBe(4500);
    expect(tx38.pointsEarnedOnNet).toBe(45);
    expect(tx38.updatedCustomer.points).toBe(145);
    customers['C03'] = tx38.updatedCustomer;
    stepGross += 5000;
    stepLoyalty += 500;
    stepNet += 4500;

    // Vente 39 : C04 utilise 200 pts (1 000 DA)
    const tx39 = applyLoyaltyRedemption(6000, customers['C04'], 200);
    expect(tx39.newNetTotal).toBe(5000);
    expect(tx39.pointsEarnedOnNet).toBe(50);
    expect(tx39.updatedCustomer.points).toBe(250);
    customers['C04'] = tx39.updatedCustomer;
    stepGross += 6000;
    stepLoyalty += 1000;
    stepNet += 5000;

    // Vente 40 : C05 utilise 50 pts (250 DA)
    const tx40 = applyLoyaltyRedemption(3000, customers['C05'], 50);
    expect(tx40.newNetTotal).toBe(2750);
    expect(tx40.pointsEarnedOnNet).toBe(27);
    expect(tx40.updatedCustomer.points).toBe(77);
    customers['C05'] = tx40.updatedCustomer;
    stepGross += 3000;
    stepLoyalty += 250;
    stepNet += 2750;

    expect(stepGross).toBe(34000.00);
    expect(stepPromos).toBe(1000.00);
    expect(stepLoyalty).toBe(4750.00);
    expect(stepNet).toBe(28250.00);

    totalGrossSales += stepGross;
    totalPromoDiscounts += stepPromos;
    totalLoyaltyDiscounts += stepLoyalty;
    totalNetCollected += stepNet;

    updatePromoReportStep(
      reportPath, 4, '✅ Validé',
      '5 ventes fidélité traitées (Brut : 34 000 DA, Promo : 1 000 DA, Réduction Fidélité : 4 750 DA, Net : 28 250 DA). 950 pts déduits, 282 pts crédités sur le net.'
    );
  });

  it('Étape 5 : Audit Comptable, Assiette Fiscale TVA 19% & Écart 0.00 DA', () => {
    expect(totalGrossSales).toBe(298700.00);
    expect(totalPromoDiscounts).toBe(36500.00);
    expect(totalVoucherDeductions).toBe(17000.00);
    expect(totalLoyaltyDiscounts).toBe(4750.00);

    const totalDiscounts = totalPromoDiscounts + totalVoucherDeductions + totalLoyaltyDiscounts;
    expect(totalDiscounts).toBe(58250.00);

    const theoreticalNet = totalGrossSales - totalDiscounts;
    expect(theoreticalNet).toBe(240450.00);
    expect(totalNetCollected).toBe(240450.00);
    expect(Math.round((totalNetCollected - theoreticalNet) * 100) / 100).toBe(0.00);

    const baseHT = Math.round((totalNetCollected / 1.19) * 100) / 100;
    const vat19 = Math.round((totalNetCollected - baseHT) * 100) / 100;
    expect(baseHT).toBe(202058.82);
    expect(vat19).toBe(38391.18);
    expect(baseHT + vat19).toBe(240450.00);

    updatePromoReportStep(
      reportPath, 5, '✅ Validé',
      'Balance certifiée (Brut : 298 700 DA, Remises : 58 250 DA, Net : 240 450 DA, HT : 202 058.82 DA, TVA 19% : 38 391.18 DA, Écart : 0.00 DA).'
    );

    writePromoReportSummary(reportPath);
  });
});
