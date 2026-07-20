import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dbState,
  normalizePath,
  parsePath,
  getLocalValue,
  setLocalState,
  updateLocalState,
  removeLocalState,
  addObserver,
  removeObserver,
  triggerObservers,
  queryLocalState
} from '../src/lib/local-db';

// Mock idb-keyval to avoid IndexedDB errors in testing environment
vi.mock('idb-keyval', () => {
  const store = new Map();
  return {
    get: vi.fn(async (key) => store.get(key)),
    set: vi.fn(async (key, value) => {
      store.set(key, value);
    })
  };
});

describe('local-db state management', () => {
  beforeEach(() => {
    // Reset dbState before each test
    for (const key in dbState) {
      delete dbState[key];
    }
  });

  describe('normalizePath', () => {
    it('should normalize paths and map tables correctly', () => {
      expect(normalizePath('onlineOrders/123')).toBe('online_orders/123');
      expect(normalizePath('/products/abc/')).toBe('products/abc');
      expect(normalizePath('shifts')).toBe('cash_shifts');
      expect(normalizePath('stockAdjustments/1')).toBe('stock_adjustments/1');
    });
  });

  describe('parsePath', () => {
    it('should parse normalized path into table and id', () => {
      expect(parsePath('onlineOrders/order-123')).toEqual({
        table: 'online_orders',
        id: 'order-123'
      });
      expect(parsePath('products')).toEqual({
        table: 'products',
        id: ''
      });
    });
  });

  describe('State CRUD operations', () => {
    it('should set and get local state correctly', () => {
      setLocalState('products/p1', { id: 'p1', name: 'Product 1' });
      expect(getLocalValue('products/p1')).toEqual({ id: 'p1', name: 'Product 1' });
      expect(getLocalValue('products')).toEqual({
        p1: { id: 'p1', name: 'Product 1' }
      });
    });

    it('should update local state by merging fields', () => {
      setLocalState('products/p1', { id: 'p1', name: 'Product 1', price: 10 });
      updateLocalState('products/p1', { price: 15, stock: 100 });
      
      expect(getLocalValue('products/p1')).toEqual({
        id: 'p1',
        name: 'Product 1',
        price: 15,
        stock: 100
      });
    });

    it('should remove local state correctly', () => {
      setLocalState('products/p1', { id: 'p1', name: 'Product 1' });
      setLocalState('products/p2', { id: 'p2', name: 'Product 2' });
      
      removeLocalState('products/p1');
      expect(getLocalValue('products/p1')).toBeNull();
      expect(getLocalValue('products/p2')).toBeDefined();
      
      removeLocalState('products');
      expect(getLocalValue('products')).toBeNull();
    });
  });

  describe('Observers', () => {
    it('should trigger observers on path changes', () => {
      const observerCallback = vi.fn();
      addObserver('products/p1', observerCallback);
      
      setLocalState('products/p1', { id: 'p1', name: 'Observed Product' });
      triggerObservers('products/p1');
      
      expect(observerCallback).toHaveBeenCalledTimes(1);
      const arg = observerCallback.mock.calls[0][0];
      expect(arg.exists()).toBe(true);
      expect(arg.val()).toEqual({ id: 'p1', name: 'Observed Product' });
      
      // Remove observer and verify it is not called anymore
      removeObserver('products/p1', observerCallback);
      triggerObservers('products/p1');
      expect(observerCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('queryLocalState', () => {
    it('should filter, order, limit and offset local state items', () => {
      dbState.products = {
        'p1': { id: 'p1', name: 'Apple', price: 2 },
        'p2': { id: 'p2', name: 'Banana', price: 1 },
        'p3': { id: 'p3', name: 'Cherry', price: 5 }
      };

      // Filter products costing more than 1.5
      const filtered = queryLocalState('products', {
        filter: (item) => item.price > 1.5
      });
      expect(filtered.length).toBe(2);
      expect(filtered.map(f => f.id)).toContain('p1');
      expect(filtered.map(f => f.id)).toContain('p3');

      // Order by price descending
      const ordered = queryLocalState('products', {
        orderBy: 'price',
        orderDirection: 'desc'
      });
      expect(ordered[0].id).toBe('p3'); // Cherry (5)
      expect(ordered[1].id).toBe('p1'); // Apple (2)
      expect(ordered[2].id).toBe('p2'); // Banana (1)

      // Limit and Offset
      const paginated = queryLocalState('products', {
        orderBy: 'price',
        orderDirection: 'asc',
        offset: 1,
        limit: 1
      });
      expect(paginated.length).toBe(1);
      expect(paginated[0].id).toBe('p1'); // Apple (2) is at index 1 when sorted ascending [1, 2, 5]
    });
  });
});
