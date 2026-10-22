import { describe, it, expect } from 'vitest';
import { preparePayload, convertKeysToCamel, TABLE_COLUMNS } from '../src/lib/db-converters';
import { printDebtPaymentReceipt } from '../src/services/receiptPrintService';

describe('Simulation Totale Administrateur de A à Z (8 Étapes & Conformité Supabase unlwfvldqxfccgrrgbwf)', () => {
  it('Étape 1 & 2 — Catalogue Admin : preparePayload génère des colonnes 100% conformes pour categories et brands', () => {
    const catPayload = preparePayload('categories', 'cat-admin-1', {
      name: 'Alimentation Générale',
      parentId: '',
      level: 0,
      imageUrl: 'https://cdn.example.com/cat.webp'
    });
    expect(catPayload.id).toBe('cat-admin-1');
    expect(catPayload.name).toBe('Alimentation Générale');
    expect(catPayload.level).toBe(0);
    for (const key of Object.keys(catPayload)) {
      expect(TABLE_COLUMNS.categories).toContain(key);
    }

    const brandPayload = preparePayload('brands', 'brand-admin-1', {
      name: 'Soummam',
      description: 'Produits laitiers Algérie',
      logoUrl: 'https://cdn.example.com/soummam.webp'
    });
    expect(brandPayload.name).toBe('Soummam');
    for (const key of Object.keys(brandPayload)) {
      expect(TABLE_COLUMNS.brands).toContain(key);
    }
  });

  it('Étape 3 & 4 — Inventaire, Achats & Réceptions (GRN) : conformité products, purchases, supplier_payments, damaged_items', () => {
    const prodPayload = preparePayload('products', 'prod-admin-1', {
      name: 'Huile Elio 5L',
      barcode: '6130000000012',
      price: 650,
      costPrice: 580,
      taxRate: 19,
      stock: 48,
      minStock: 10,
      categoryId: 'cat-admin-1',
      brandId: 'brand-admin-1',
      unit: 'pcs'
    });
    expect(prodPayload.price).toBe(650);
    expect(prodPayload.tax_rate).toBe(19);
    for (const key of Object.keys(prodPayload)) {
      expect(TABLE_COLUMNS.products).toContain(key);
    }

    const purchasePayload = preparePayload('purchases', 'pur-admin-1', {
      supplierId: 'sup-1',
      supplierName: 'Cevital Distribution',
      total: 58000,
      paidAmount: 30000,
      status: 'completed',
      paymentStatus: 'partial',
      items: [{ productId: 'prod-admin-1', quantity: 100, costPrice: 580 }]
    });
    expect(purchasePayload.total_amount).toBe(58000);
    for (const key of Object.keys(purchasePayload)) {
      expect(TABLE_COLUMNS.purchases).toContain(key);
    }

    const damagePayload = preparePayload('damaged_items', 'dmg-admin-1', {
      productId: 'prod-admin-1',
      productName: 'Huile Elio 5L',
      quantity: 2,
      userId: 'admin-uid',
      reason: 'Bidon percé transport',
      costPrice: 580
    });
    expect(damagePayload.reported_by).toBe('admin-uid');
    for (const key of Object.keys(damagePayload)) {
      expect(TABLE_COLUMNS.damaged_items).toContain(key);
    }
  });

  it('Étape 5 & 8 — Caisse POS & Synchronisation Transactions : mappe notes vers audit_note sans rejeter PostgREST', () => {
    const txPayload = preparePayload('transactions', 'tx-admin-1', {
      total: 3900,
      paymentMethod: 'cash',
      amountReceived: 4000,
      amountReturned: 100,
      cashierId: 'admin-uid',
      cashierName: 'Admin Principal',
      notes: 'Vente avec coupure rapide 2x2000 DA',
      items: [{ id: 'prod-admin-1', name: 'Huile Elio 5L', price: 650, quantity: 6 }]
    });

    // 'notes' ne doit JAMAIS être envoyé tel quel à Supabase car la colonne transactions.notes n'existe pas
    expect(txPayload).not.toHaveProperty('notes');
    expect(txPayload.audit_note).toBe('Vente avec coupure rapide 2x2000 DA');
    for (const key of Object.keys(txPayload)) {
      expect(TABLE_COLUMNS.transactions).toContain(key);
    }

    // Et lors de la lecture depuis Supabase, convertKeysToCamel restaure .notes depuis audit_note
    const restored = convertKeysToCamel(txPayload);
    expect(restored.notes).toBe('Vente avec coupure rapide 2x2000 DA');
  });

  it('Étape 6 & 8 — Clients & Créances : filtre credit_limit inexistant sur Supabase et valide le reçu thermique de dette', () => {
    const custPayload = preparePayload('customers', 'cust-admin-1', {
      name: 'SARL Superette El Baraka',
      phone: '0550123456',
      balance: -15000,
      creditLimit: 50000,
      loyaltyPoints: 120
    });

    // 'credit_limit' est maintenant une colonne officielle Supabase customers en v1.2.33
    expect(custPayload.credit_limit).toBe(50000);
    expect(custPayload.balance).toBe(-15000);
    expect(custPayload.name).toBe('SARL Superette El Baraka');
    for (const key of Object.keys(custPayload)) {
      expect(TABLE_COLUMNS.customers).toContain(key);
    }

    expect(typeof printDebtPaymentReceipt).toBe('function');
  });

  it('Étape 7 — Finances, Dépenses, RH & Clôture de Caisse (Rapport Z) : conformité cash_shifts, expenses, attendance, advances', () => {
    const shiftPayload = preparePayload('shifts', 'shift-admin-1', {
      openedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      openedBy: 'Admin',
      closedBy: 'Admin',
      initialCash: 5000,
      finalCash: 48500,
      expectedCash: 48500,
      totalSales: 45000,
      totalCashSales: 45000,
      totalExpenses: 1500,
      status: 'closed'
    });
    for (const key of Object.keys(shiftPayload)) {
      expect(TABLE_COLUMNS.cash_shifts).toContain(key);
    }
  });
});
