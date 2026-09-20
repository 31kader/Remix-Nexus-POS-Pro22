import { describe, it, expect } from 'vitest';
import { safeGetItems, safeArray, safeLower, safeIncludes } from '../src/lib/utils';

describe('Safe Items & Array Access Robustness Suite', () => {
  describe('safeGetItems utility', () => {
    it('returns empty array when record is null or undefined', () => {
      expect(safeGetItems(null)).toEqual([]);
      expect(safeGetItems(undefined)).toEqual([]);
    });

    it('returns empty array when items property is null, undefined, or missing', () => {
      expect(safeGetItems({})).toEqual([]);
      expect(safeGetItems({ items: null })).toEqual([]);
      expect(safeGetItems({ items: undefined })).toEqual([]);
    });

    it('returns items array when items is already an array', () => {
      const items = [{ id: 'p1', name: 'Produit 1', quantity: 2, price: 500 }];
      expect(safeGetItems({ items })).toEqual(items);
    });

    it('correctly parses items when serialized as a JSON string', () => {
      const items = [{ id: 'p1', name: 'Produit 1', quantity: 2, price: 500 }];
      const record = { items: JSON.stringify(items) };
      expect(safeGetItems(record)).toEqual(items);
    });

    it('gracefully returns empty array on invalid JSON string', () => {
      expect(safeGetItems({ items: '{malformed_json}' })).toEqual([]);
      expect(safeGetItems({ items: 'not a json' })).toEqual([]);
    });

    it('gracefully returns empty array when items is non-array non-string type', () => {
      expect(safeGetItems({ items: 42 })).toEqual([]);
      expect(safeGetItems({ items: true })).toEqual([]);
      expect(safeGetItems({ items: { foo: 'bar' } })).toEqual([]);
    });
  });

  describe('safeArray utility', () => {
    it('returns empty array for falsy or non-array inputs', () => {
      expect(safeArray(null)).toEqual([]);
      expect(safeArray(undefined)).toEqual([]);
      expect(safeArray('')).toEqual([]);
      expect(safeArray(123)).toEqual([]);
      expect(safeArray({})).toEqual([]);
    });

    it('returns original array when input is an array', () => {
      const arr = [1, 2, 3];
      expect(safeArray(arr)).toEqual(arr);
    });
  });

  describe('Anti-Crash Protection for Transactions, Purchases & Returns', () => {
    it('prevents TypeError: Cannot read properties of undefined (reading some) on empty records', () => {
      const rawRecordsWithCorruptedItems = [
        { id: 'tx-1' }, // items is undefined
        { id: 'tx-2', items: null }, // items is null
        { id: 'tx-3', items: 'invalid-json' }, // items is broken json
        { id: 'tx-4', items: [{ id: 'prod-target', quantity: 3, price: 120 }] },
      ];

      const targetId = 'prod-target';

      // Ensure filtering with safeGetItems does NOT throw
      expect(() => {
        const matches = rawRecordsWithCorruptedItems.filter(record => 
          safeGetItems(record).some((item: any) => (item.id === targetId || item.productId === targetId))
        );
        expect(matches).toHaveLength(1);
        expect(matches[0].id).toBe('tx-4');
      }).not.toThrow();
    });

    it('prevents crashes when calculating totals on transactions with missing items', () => {
      const brokenTx = { id: 'tx-broken', total: 0 }; // items is undefined
      
      expect(() => {
        const totalQty = safeGetItems(brokenTx).reduce((sum, item: any) => sum + (item.quantity || 0), 0);
        expect(totalQty).toBe(0);

        const mapped = safeGetItems(brokenTx).map((item: any) => item.name);
        expect(mapped).toEqual([]);
      }).not.toThrow();
    });
  });

  describe('safeLower & safeIncludes String Defensive Suite', () => {
    it('handles null, undefined, numbers, and objects without throwing', () => {
      expect(safeLower(null)).toBe('');
      expect(safeLower(undefined)).toBe('');
      expect(safeLower('')).toBe('');
      expect(safeLower('BONJOUR')).toBe('bonjour');
      expect(safeLower(123)).toBe('123');

      expect(safeIncludes(null, 'test')).toBe(false);
      expect(safeIncludes(undefined, 'test')).toBe(false);
      expect(safeIncludes('Coca-Cola 33cl', 'COCA')).toBe(true);
      expect(safeIncludes('Pain complet', 'pain')).toBe(true);
      expect(safeIncludes('Pain complet', null)).toBe(true); // empty query matches all
    });

    it('prevents TypeError on damagedRecords with missing productName or reason (LossReport scenario)', () => {
      const corruptedDamagedRecords = [
        { id: 'dmg-1', productId: 'p1', date: '2026-09-20' }, // productName and reason undefined!
        { id: 'dmg-2', productId: 'p2', productName: null, reason: null, date: '2026-09-20' },
        { id: 'dmg-3', productId: 'p3', productName: 'Yaourt Pêche', reason: 'Périmé', date: '2026-09-20' }
      ];

      const search = 'périmé';

      expect(() => {
        const filtered = corruptedDamagedRecords.filter(r => {
          const matchesSearch = !search || safeIncludes(r.productName, search) || safeIncludes(r.reason, search);
          return matchesSearch;
        });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('dmg-3');
      }).not.toThrow();
    });
  });
});
