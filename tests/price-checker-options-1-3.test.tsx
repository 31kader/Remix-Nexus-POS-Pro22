import { describe, it, expect, vi } from 'vitest';
import { getProductPriceDetails, formatCurrencyDA } from '../src/components/public-price-checker/priceUtils';
import type { Product, Promotion, CompanySettings } from '../src/types';

describe('Public Price Checker — Options 1 & 3 Suite', () => {
  const mockSettings: CompanySettings = {
    name: 'Supermarché Test Algérie',
    currency: 'DA',
    taxRate: 19,
    receiptTemplate: 'standard',
    labelTemplate: 'standard',
    loyaltyPointsPerCurrencyUnit: 1,
    loyaltyPointValue: 1,
  };

  const mockProduct: Product = {
    id: 'prod-001',
    name: 'Huile de Tournesol 5L',
    barcode: '6131234567890',
    sku: 'HUILE-5L',
    price: 650,
    costPrice: 500, // Doit rester strictement confidentiel
    stock: 25,      // Ne doit jamais être affiché en chiffre exact au client
    minStock: 5,
    taxRate: 19,
    categoryId: 'cat-epicerie',
    supplier: 'Fournisseur National',
    unit: 'bouteille',
    status: 'active',
  };

  it('1. Calcule le prix normal en DA sans fuite de marge ni de coût d’achat', () => {
    const details = getProductPriceDetails(mockProduct, []);
    
    expect(details.finalPrice).toBe(650);
    expect(details.originalPrice).toBe(650);
    expect(details.hasDiscount).toBe(false);
    expect(details.isAvailable).toBe(true);
    expect(formatCurrencyDA(details.finalPrice)).toBe('650.00 DA');

    // Vérification de sécurité : l'objet calculé pour le client ne contient ni marge ni coût
    expect((details as any).costPrice).toBeUndefined();
    expect((details as any).margin).toBeUndefined();
  });

  it('2. Applique automatiquement une promotion active en pourcentage', () => {
    const promo: Promotion = {
      id: 'promo-10',
      name: 'Remise Spéciale 10%',
      type: 'percentage',
      value: 10,
      isActive: true,
      applicableProducts: ['prod-001'],
    };

    const details = getProductPriceDetails(mockProduct, [promo]);

    expect(details.hasDiscount).toBe(true);
    expect(details.originalPrice).toBe(650);
    expect(details.finalPrice).toBe(585); // 650 - 10% (65) = 585
    expect(details.savedAmount).toBe(65);
    expect(details.discountLabel).toBe('-10%');
    expect(formatCurrencyDA(details.finalPrice)).toBe('585.00 DA');
  });

  it('3. Applique automatiquement une promotion fixe en Dinars Algériens (DA)', () => {
    const promo: Promotion = {
      id: 'promo-fixe',
      name: 'Remise 100 DA',
      type: 'fixed',
      value: 100,
      isActive: true,
      applicableCategories: ['cat-epicerie'],
    };

    const details = getProductPriceDetails(mockProduct, [promo]);

    expect(details.hasDiscount).toBe(true);
    expect(details.finalPrice).toBe(550); // 650 - 100 = 550
    expect(details.savedAmount).toBe(100);
    expect(details.discountLabel).toBe('-100 DA');
  });

  it('4. Gère la disponibilité sans divulguer les quantités réelles en stock', () => {
    const inStockProduct = { ...mockProduct, stock: 3 };
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    const inactiveProduct = { ...mockProduct, stock: 50, status: 'inactive' as const };

    const inStockDetails = getProductPriceDetails(inStockProduct);
    const outDetails = getProductPriceDetails(outOfStockProduct);
    const inactiveDetails = getProductPriceDetails(inactiveProduct);

    expect(inStockDetails.isAvailable).toBe(true);
    expect(outDetails.isAvailable).toBe(false);
    expect(inactiveDetails.isAvailable).toBe(false);
  });
});
