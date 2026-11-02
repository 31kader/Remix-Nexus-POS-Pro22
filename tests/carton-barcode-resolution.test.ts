import { describe, it, expect } from 'vitest';
import { resolveBarcodeOrCarton, CartonTemplate } from '../src/services/cartonIntakeService';
import { Product } from '../src/types';

describe('resolveBarcodeOrCarton', () => {
  const mockProduct: Product = {
    id: 'jotws25of',
    name: 'BABOU MAX 35G',
    price: 50,
    costPrice: 35,
    stock: 100,
    barcode: '6132524550182',
    sku: 'BABOU-35G'
  } as Product;

  const mockCartonTemplate: CartonTemplate = {
    id: 'mvpqjbw1CH0ATCIE3',
    productId: 'jotws25of',
    productName: 'BABOU MAX 35G',
    unitsPerCarton: 12,
    cartonCostPrice: 420,
    unitCostPrice: 35,
    barcode: '6132524550885',
    sku: 'CART-6132524550885',
    productBarcode: '6132524550182',
    cartonPhotoUrl: 'https://example.com/carton.jpg',
    updatedAt: new Date().toISOString(),
    usageCount: 1
  };

  const products = [mockProduct];
  const templates = [mockCartonTemplate];

  it('devrait reconnaître immédiatement le code-barres du carton et renvoyer le colisage', () => {
    const result = resolveBarcodeOrCarton('6132524550885', products, templates);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('carton');
    if (result?.type === 'carton') {
      expect(result.product.id).toBe('jotws25of');
      expect(result.product.name).toBe('BABOU MAX 35G');
      expect(result.cartonCount).toBe(1);
      expect(result.unitsPerCarton).toBe(12);
      expect(result.cartonCostPrice).toBe(420);
      expect(result.unitCostPrice).toBe(35);
      expect(result.cartonPhotoUrl).toBe('https://example.com/carton.jpg');
    }
  });

  it('devrait gérer le préfixe multiplicateur (ex: 3*code_carton)', () => {
    const result = resolveBarcodeOrCarton('3*6132524550885', products, templates);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('carton');
    if (result?.type === 'carton') {
      expect(result.cartonCount).toBe(3);
      expect(result.unitsPerCarton).toBe(12);
    }
  });

  it('devrait reconnaître le SKU du carton (ex: CART-6132524550885)', () => {
    const result = resolveBarcodeOrCarton('CART-6132524550885', products, templates);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('carton');
    if (result?.type === 'carton') {
      expect(result.product.id).toBe('jotws25of');
    }
  });

  it('devrait reconnaître un code-barres produit standard pour ajout unitaire', () => {
    const result = resolveBarcodeOrCarton('6132524550182', products, templates);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('product');
    if (result?.type === 'product') {
      expect(result.product.id).toBe('jotws25of');
    }
  });

  it('devrait renvoyer null si le code-barres est inconnu', () => {
    const result = resolveBarcodeOrCarton('9999999999999', products, templates);
    expect(result).toBeNull();
  });
});
