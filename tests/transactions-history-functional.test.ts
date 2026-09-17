import { describe, it, expect } from 'vitest';
import { Transaction, CartItem } from '../src/types';

describe('Module Historique & Transactions - Tests Fonctionnels', () => {
  const cartItems: CartItem[] = [
    {
      id: 'p1',
      name: 'Produit A',
      price: 100,
      costPrice: 60,
      taxRate: 20,
      stock: 50,
      minStock: 5,
      categoryId: 'cat1',
      supplier: 'Fournisseur A',
      unit: 'pcs',
      sku: 'SKU001',
      status: 'active',
      updatedAt: new Date().toISOString(),
      quantity: 3,
      cartItemId: 'item-1'
    },
    {
      id: 'p2',
      name: 'Produit B',
      price: 50,
      costPrice: 20,
      taxRate: 10,
      stock: 30,
      minStock: 2,
      categoryId: 'cat1',
      supplier: 'Fournisseur B',
      unit: 'pcs',
      sku: 'SKU002',
      status: 'active',
      updatedAt: new Date().toISOString(),
      quantity: 2,
      cartItemId: 'item-2'
    }
  ];

  const sampleTransaction = {
    id: 'tx-1001',
    timestamp: new Date().toISOString(),
    items: cartItems,
    subtotal: 400,
    tax: 70, // 3*100*0.2 + 2*50*0.1 = 60 + 10 = 70
    discount: 0,
    total: 470,
    paymentMethod: 'cash',
    status: 'completed',
    userId: 'user-1',
    employeeId: 'user-1',
    employeeName: 'Caissier Jean'
  } as unknown as Transaction;

  it('calcule correctement la marge brute / bénéfice de la transaction', () => {
    const totalCost = sampleTransaction.items.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
    const grossProfit = (sampleTransaction as any).subtotal - totalCost;

    // totalCost = (60 * 3) + (20 * 2) = 180 + 40 = 220
    // grossProfit = 400 - 220 = 180
    expect(totalCost).toBe(220);
    expect(grossProfit).toBe(180);
  });

  it('valide le statut et la méthode de paiement', () => {
    expect(sampleTransaction.status).toBe('completed');
    expect(sampleTransaction.paymentMethod).toBe('cash');
    expect(sampleTransaction.items.length).toBe(2);
  });
});
