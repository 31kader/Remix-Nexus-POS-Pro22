import { describe, it, expect } from 'vitest';
import { formatProductStock } from '../src/lib/utils';
import { Product } from '../src/types';

describe('Module Gestion de Stock - Tests Fonctionnels', () => {
  const normalProduct: Product = {
    id: 'p1',
    name: 'Jus d Orange',
    price: 150,
    costPrice: 100,
    taxRate: 19,
    stock: 15,
    minStock: 5,
    categoryId: 'c1',
    supplier: 'Fournisseur B',
    unit: 'bouteille',
    sku: 'SKU123',
    status: 'active',
    updatedAt: new Date().toISOString()
  };

  it('détecte correctement le seuil de stock alerte/critique', () => {
    const isLowStock = normalProduct.stock <= normalProduct.minStock;
    expect(isLowStock).toBe(false);

    const productLow: Product = { ...normalProduct, stock: 3 };
    const isLowStockAlert = productLow.stock <= productLow.minStock;
    expect(isLowStockAlert).toBe(true);
  });

  it('formate correctement le stock simple', () => {
    const formatted = formatProductStock(normalProduct, [normalProduct]);
    expect(formatted).toBe('15');
  });

  it('formate correctement le stock d un Pack / Bundle', () => {
    const componentProd: Product = {
      id: 'c1',
      name: 'Bouteille d eau',
      price: 50,
      costPrice: 30,
      taxRate: 0,
      stock: 24,
      minStock: 5,
      categoryId: 'c1',
      supplier: 'Fournisseur B',
      unit: 'pcs',
      sku: 'SKU001',
      status: 'active',
      updatedAt: new Date().toISOString()
    };

    const packProd: Product = {
      id: 'pack1',
      name: 'Pack Eau x6',
      price: 280,
      costPrice: 180,
      taxRate: 0,
      stock: 0,
      minStock: 1,
      categoryId: 'c1',
      supplier: 'Fournisseur B',
      unit: 'pack',
      sku: 'SKU002',
      status: 'active',
      updatedAt: new Date().toISOString(),
      isBundle: true,
      bundleItems: [{ productId: 'c1', quantity: 6 }]
    };

    const formatted = formatProductStock(packProd, [componentProd, packProd]);
    expect(formatted).toBe('4 (Pack)');
  });
});
