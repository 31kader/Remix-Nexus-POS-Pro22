import { describe, it, expect } from 'vitest';
import { 
  computeMarginStats, 
  suggestSellingPrice 
} from '../src/components/smart-purchase/operations/marginAlertDetector';

describe('💰 Détecteur d\'Alertes de Marges Commerciales (Achats & Réceptions)', () => {
  it('1. Détecte une marge saine (>= 8%) comme SAFE', () => {
    const stats = computeMarginStats(100, 150);
    expect(stats.level).toBe('SAFE');
    expect(stats.marginAmount).toBe(50);
    expect(stats.marginRate).toBeCloseTo(33.33, 1);
    expect(stats.badgeLabel).toContain('Marge +33.3%');
  });

  it('2. Détecte une marge faible (< 8%) comme WARNING_LOW', () => {
    const stats = computeMarginStats(95, 100);
    expect(stats.level).toBe('WARNING_LOW');
    expect(stats.marginAmount).toBe(5);
    expect(stats.marginRate).toBe(5);
    expect(stats.badgeLabel).toContain('Marge faible');
  });

  it('3. Détecte une marge négative (Prix Achat > Prix Vente) comme CRITICAL_NEGATIVE (Vente à perte)', () => {
    const stats = computeMarginStats(120, 100);
    expect(stats.level).toBe('CRITICAL_NEGATIVE');
    expect(stats.marginAmount).toBe(-20);
    expect(stats.marginRate).toBe(-20);
    expect(stats.badgeLabel).toContain('Vente à perte');
  });

  it('4. Détecte une marge nulle (Prix Achat == Prix Vente) comme CRITICAL_NEGATIVE', () => {
    const stats = computeMarginStats(100, 100);
    expect(stats.level).toBe('CRITICAL_NEGATIVE');
    expect(stats.marginAmount).toBe(0);
  });

  it('5. Détecte un prix de vente manquant (0 DA) comme MISSING_PRICE', () => {
    const stats = computeMarginStats(100, 0);
    expect(stats.level).toBe('MISSING_PRICE');
  });

  it('6. suggestSellingPrice calcule correctement le prix de vente TTC selon la marge cible', () => {
    // Coût 200 DA avec 20% de marge cible -> 200 / 0.8 = 250 DA
    const price20 = suggestSellingPrice(200, 20);
    expect(price20).toBe(250);

    // Coût 100 DA avec 25% de marge cible -> 100 / 0.75 = 133.33 -> arrondi 134 DA
    const price25 = suggestSellingPrice(100, 25, 1);
    expect(price25).toBe(134);

    // Si coût <= 0 -> 0 DA
    expect(suggestSellingPrice(0, 25)).toBe(0);
  });
});
