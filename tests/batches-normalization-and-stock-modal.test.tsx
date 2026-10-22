import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { normalizeBatches } from '../src/types/products';
import { convertKeysToCamel } from '../src/lib/db-converters';
import { StockAdjustmentModal } from '../src/components/StockAdjustmentModal';
import { Product, CompanySettings } from '../src/types';

// Mock dependencies of StockAdjustmentModal
vi.mock('../src/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      })),
      insert: vi.fn().mockResolvedValue({ error: null })
    }))
  },
  isSupabaseConfigured: true
}));

vi.mock('../src/services/SyncService', () => ({
  enqueueStockAdjustment: vi.fn(),
  enqueueSync: vi.fn()
}));

vi.mock('../src/services/stockService', () => ({
  applyStockAdjustment: vi.fn().mockResolvedValue({ newStock: 25, appliedDirectly: true })
}));

vi.mock('../src/services/LocalDatabase', () => ({
  localDb: {
    update: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('🛡️ Normalisation Sécurisée de batches (Anti-Crash TypeError: t.batches.map is not a function)', () => {
  const mockSettings = {
    name: 'Test Shop',
    currency: 'DA',
    taxRate: 19,
    address: 'Alger',
    phone: '0555000000',
    email: 'test@shop.dz'
  } as CompanySettings;

  const mockUser = {
    uid: 'user_123',
    displayName: 'Admin Test'
  };

  it('1. normalizeBatches gère de manière résiliente tous les types de données non-tableaux', () => {
    expect(normalizeBatches(null)).toEqual([]);
    expect(normalizeBatches(undefined)).toEqual([]);
    expect(normalizeBatches('')).toEqual([]);
    expect(normalizeBatches('   ')).toEqual([]);
    expect(normalizeBatches('not_json')).toEqual([]);
    expect(normalizeBatches('{ "invalid": true }')).toEqual([]);
    expect(normalizeBatches(123)).toEqual([]);
    expect(normalizeBatches(true)).toEqual([]);
    expect(normalizeBatches({})).toEqual([]);
  });

  it('2. normalizeBatches parse avec succès les chaînes JSON valides', () => {
    const rawJson = JSON.stringify([
      { id: 'b1', batchNumber: 'LOT-A1', expirationDate: '2026-12-31', stock: 15 },
      { id: 'b2', batchNumber: 'LOT-A2', expirationDate: '2027-06-30', stock: 10 }
    ]);
    const result = normalizeBatches(rawJson);
    expect(result).toHaveLength(2);
    expect(result[0].batchNumber).toBe('LOT-A1');
    expect(result[1].stock).toBe(10);
  });

  it('3. normalizeBatches préserve les tableaux déjà valides', () => {
    const arr = [{ id: 'b1', batchNumber: 'LOT-1', expirationDate: '2026-12-31', stock: 5 }];
    expect(normalizeBatches(arr)).toEqual(arr);
  });

  it('4. convertKeysToCamel convertit automatiquement batches chaîne JSON en tableau', () => {
    const rawPostgresProduct = {
      id: 'prod_test',
      name: 'Produit Test',
      use_multi_expiry: true,
      batches: JSON.stringify([{ id: 'lot1', batch_number: 'LOT-99', expiration_date: '2026-10-10', stock: 8 }])
    };

    const converted: any = convertKeysToCamel(rawPostgresProduct);
    expect(Array.isArray(converted.batches)).toBe(true);
    expect(converted.batches).toHaveLength(1);
    expect(converted.batches[0].batchNumber).toBe('LOT-99');
    expect(converted.batches[0].stock).toBe(8);
  });

  it('5. StockAdjustmentModal ne plante pas (zéro crash) quand un produit a batches = chaîne JSON', () => {
    const productWithJsonBatches: any = {
      id: 'prod_with_str_batches',
      name: 'Produit Chaine Batches',
      stock: 20,
      price: 150,
      costPrice: 100,
      taxRate: 19,
      updatedAt: new Date().toISOString(),
      useMultiExpiry: true,
      batches: JSON.stringify([
        { id: 'b1', batchNumber: 'LOT-STRING-1', expirationDate: '2026-12-31', stock: 20 }
      ])
    };

    // Le rendu ne doit lever aucune exception TypeError: t.batches.map is not a function
    expect(() => {
      render(
        <StockAdjustmentModal
          isOpen={true}
          onClose={vi.fn()}
          product={productWithJsonBatches}
          user={mockUser}
          settings={mockSettings}
        />
      );
    }).not.toThrow();
  });

  it('6. StockAdjustmentModal ne plante pas quand batches est un objet corrompu ou null', () => {
    const productWithCorruptedBatches: any = {
      id: 'prod_corrupted',
      name: 'Produit Batches Corrompus',
      stock: 10,
      price: 200,
      costPrice: 120,
      taxRate: 19,
      updatedAt: new Date().toISOString(),
      useMultiExpiry: true,
      batches: { corrupted: true } // Non-tableau truthy
    };

    expect(() => {
      render(
        <StockAdjustmentModal
          isOpen={true}
          onClose={vi.fn()}
          product={productWithCorruptedBatches}
          user={mockUser}
          settings={mockSettings}
        />
      );
    }).not.toThrow();
  });
});
