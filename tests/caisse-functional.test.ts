import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../src/store/useCartStore';
import { CartItem } from '../src/types';
import { calculateItemPrice } from '../src/lib/utils';

describe('Module Caisse / Panier - Tests Fonctionnels', () => {
  beforeEach(() => {
    useCartStore.setState({
      posSessions: [{ id: 'test-session', name: 'Ticket 1', cart: [], selectedCustomer: null }],
      activeSessionId: 'test-session',
      isWholesale: false,
      deliveryMethod: 'in_store'
    });
  });

  const sampleItem: CartItem = {
    id: 'p1',
    name: 'Produit Test',
    price: 100,
    wholesalePrice: 80,
    costPrice: 50,
    taxRate: 20,
    stock: 50,
    minStock: 5,
    categoryId: 'cat1',
    supplier: 'Fournisseur A',
    unit: 'pcs',
    sku: 'SKU001',
    status: 'active',
    updatedAt: new Date().toISOString(),
    quantity: 2,
    cartItemId: 'item-1'
  };

  it('calcule correctement les totaux avec TVA', () => {
    const store = useCartStore.getState();
    store.setCart([sampleItem]);

    const cart = store.getCart();
    const totalHT = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalTVA = cart.reduce((acc, item) => acc + (item.price * item.quantity * (item.taxRate / 100)), 0);
    const totalTTC = totalHT + totalTVA;

    expect(totalHT).toBe(200);
    expect(totalTVA).toBe(40);
    expect(totalTTC).toBe(240);
  });

  it('applique correctement le tarif de gros (Wholesale)', () => {
    const store = useCartStore.getState();
    store.setIsWholesale(true);
    store.setCart([sampleItem]);

    const isWholesale = useCartStore.getState().isWholesale;

    const unitPrice = calculateItemPrice(sampleItem, isWholesale);
    expect(unitPrice).toBe(80);
    expect(unitPrice * sampleItem.quantity).toBe(160);
  });

  it('applique correctement une remise par ligne', () => {
    const itemWithDiscount: CartItem = {
      ...sampleItem,
      lineDiscount: {
        type: 'percentage',
        value: 10
      }
    };

    const priceAfterLineDiscount = calculateItemPrice(itemWithDiscount);
    expect(priceAfterLineDiscount).toBe(90);

    const lineTotal = priceAfterLineDiscount * itemWithDiscount.quantity;
    expect(lineTotal).toBe(180);
  });
});
