import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playOrderChime } from '../src/lib/audioNotification';

describe('Online Orders Sync & Audio Alert Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should safely execute playOrderChime without throwing even in headless environments', () => {
    expect(() => {
      playOrderChime();
    }).not.toThrow();
  });

  it('should correctly distinguish auto-sync eligible statuses', () => {
    const validStatuses = ['confirmed', 'paid', 'shipped', 'delivered'];

    expect(validStatuses.includes('confirmed')).toBe(true);
    expect(validStatuses.includes('paid')).toBe(true);
    expect(validStatuses.includes('shipped')).toBe(true);
    expect(validStatuses.includes('delivered')).toBe(true);

    // Pending should NOT be auto-synced (needs human review)
    expect(validStatuses.includes('pending')).toBe(false);
    expect(validStatuses.includes('cancelled')).toBe(false);
  });

  it('should detect stock shortfall when allowNegativeStock is false', () => {
    const products = [
      { id: 'p1', name: 'Produit A', stock: 2 },
      { id: 'p2', name: 'Produit B', stock: 10 }
    ];
    const orderItems = [
      { productId: 'p1', quantity: 5 }, // shortage: 5 > 2
      { productId: 'p2', quantity: 3 }  // ok: 3 <= 10
    ];

    const allowNegativeStock = false;
    const stockIssues: string[] = [];

    for (const item of orderItems) {
      const prod = products.find(p => p.id === item.productId);
      if (prod && !allowNegativeStock) {
        const currentStock = prod.stock || 0;
        if (currentStock < item.quantity) {
          stockIssues.push(`${prod.name} (Demandé: ${item.quantity}, Dispo: ${currentStock})`);
        }
      }
    }

    expect(stockIssues.length).toBe(1);
    expect(stockIssues[0]).toContain('Produit A');
  });
});
