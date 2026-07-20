import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../src/store/useCartStore';
import { Product, CartItem } from '../src/types';

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({
      posSessions: [{ id: 'test-session', name: 'Ticket 1', cart: [], selectedCustomer: null }],
      activeSessionId: 'test-session',
      isWholesale: false,
      deliveryMethod: 'in_store'
    });
  });

  it('adds an item to cart correctly', () => {
    const store = useCartStore.getState();
    const cartItem: CartItem = {
      id: 'p1',
      name: 'Test',
      price: 10,
      costPrice: 5,
      taxRate: 0,
      stock: 100,
      minStock: 0,
      categoryId: 'c1',
      supplier: 'Test Supplier',
      unit: 'pcs',
      sku: '1',
      status: 'active',
      updatedAt: new Date().toISOString(),
      quantity: 1,
      cartItemId: 'test-cart-item-1'
    };

    store.setCart([cartItem]);
    
    const updatedStore = useCartStore.getState();
    const cart = updatedStore.getCart();
    
    expect(cart.length).toBe(1);
    expect(cart[0].id).toBe('p1');
    expect(cart[0].quantity).toBe(1);
  });

  it('updates cart items', () => {
    const store = useCartStore.getState();
    const cartItem: CartItem = {
      id: 'p1',
      name: 'Test',
      price: 10,
      costPrice: 5,
      taxRate: 0,
      stock: 100,
      minStock: 0,
      categoryId: 'c1',
      supplier: 'Test Supplier',
      unit: 'pcs',
      sku: '1',
      status: 'active',
      updatedAt: new Date().toISOString(),
      quantity: 1,
      cartItemId: '1'
    };

    store.setCart([cartItem]);
    
    // Simulate updating quantity
    store.setCart((prev) => prev.map(item => item.id === 'p1' ? { ...item, quantity: 2 } : item));

    const cart = useCartStore.getState().getCart();
    expect(cart[0].quantity).toBe(2);
  });
});
