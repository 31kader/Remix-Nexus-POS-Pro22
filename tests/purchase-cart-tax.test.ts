import { describe, it, expect } from 'vitest';
import { parseRawInvoiceText } from '../src/components/smart-purchase/invoiceParser';
import { renderHook, act } from '@testing-library/react';
import { usePurchaseCart } from '../src/hooks/usePurchaseCart';

describe('Smart Purchase TVA par défaut à 0%', () => {
  it('usePurchaseCart initialise les articles ajoutés avec une TVA à 0% par défaut', () => {
    const { result } = renderHook(() => usePurchaseCart());

    act(() => {
      // Produit catalogue standard avec TVA de vente à 19%
      result.current.addToCart({
        id: 'prod-001',
        name: 'Produit Test',
        price: 100,
        costPrice: 80,
        taxRate: 19
      });
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.cart[0].taxRate).toBe(0);
  });

  it('usePurchaseCart permet une TVA d\'achat explicite (ex: taux réduit 9%)', () => {
    const { result } = renderHook(() => usePurchaseCart());

    act(() => {
      result.current.addToCart({
        id: 'prod-002',
        name: 'Produit Laitier',
        price: 50,
        costPrice: 40,
        taxRate: 9
      });
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.cart[0].taxRate).toBe(9);
  });

  it('parseRawInvoiceText extrait les articles avec taxRate = 0 par défaut pour les produits connus', () => {
    const mockProducts = [
      { id: 'p1', name: 'EAU IFRI 1.5L', barcode: '613000000001', taxRate: 19, costPrice: 30 }
    ] as any[];

    const invoiceText = `
    EAU IFRI 1.5L 10 30.00 300.00
    `;

    const res = parseRawInvoiceText(invoiceText, [], mockProducts);
    expect(res.items.length).toBeGreaterThanOrEqual(1);
    const item = res.items[0];
    expect(item.taxRate).toBe(0);
  });

  it('parseRawInvoiceText extrait les articles non reconnus (draft) avec taxRate = 0', () => {
    const invoiceText = `
    FROMAGE FONDUPACK 16P 5 150.00 750.00
    `;

    const res = parseRawInvoiceText(invoiceText, [], []);
    expect(res.items.length).toBeGreaterThanOrEqual(1);
    const item = res.items[0];
    expect(item.taxRate).toBe(0);
    expect(item.isDraft).toBe(true);
  });
});
