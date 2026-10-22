import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { printCustomerStatement } from '../src/services/documentPrintService';
import { parseCashierNotes } from '../src/lib/utils';
import { Button, Modal, ConfirmDialog } from '../src/components/ui';
import type { Customer, Transaction, CompanySettings, CartItem } from '../src/types';

describe('Advanced Customer Management Tests', () => {
  const mockCustomer: Customer = {
    id: 'cust-123',
    name: 'Mourad Benali',
    phone: '0555123456',
    email: 'mourad@example.com',
    balance: -4500, // Debt of 4500 DA
    loyaltyPoints: 120,
    totalSpent: 35000,
    favoriteItems: [],
    alerts: [],
    cashierNotes: [],
    isWholesale: true,
    creditLimit: 10000,
    address: 'Rue Didouche Mourad',
    city: 'Alger',
  };

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-001',
      timestamp: new Date('2026-09-01T14:30:00Z').toISOString(),
      userId: 'user-1',
      customerName: mockCustomer.name,
      customerId: 'cust-123',
      items: [
        {
          id: 'p1',
          cartItemId: 'item-1',
          name: 'Huile Elio 5L',
          price: 900,
          costPrice: 800,
          stock: 10,
          categoryId: 'Alimentaire',
          quantity: 2,
          minStock: 5,
          supplier: '',
          unit: 'unité',
          taxRate: 19,
          status: 'active',
          updatedAt: new Date().toISOString()
        } as CartItem,
      ],
      total: 1800,
      paymentMethod: 'cash',
      status: 'completed',
    },
    {
      id: 'tx-002',
      timestamp: new Date('2026-09-02T10:15:00Z').toISOString(),
      userId: 'user-1',
      customerName: mockCustomer.name,
      customerId: 'cust-123',
      items: [
        {
          id: 'p2',
          cartItemId: 'item-2',
          name: 'Farine Sim 10kg',
          price: 450,
          costPrice: 400,
          stock: 5,
          categoryId: 'Alimentaire',
          quantity: 1,
          minStock: 5,
          supplier: '',
          unit: 'unité',
          taxRate: 19,
          status: 'active',
          updatedAt: new Date().toISOString()
        } as CartItem,
      ],
      total: 450,
      paymentMethod: 'debt' as any,
      status: 'completed',
    },
  ];

  const mockSettings: CompanySettings = {
    name: 'Superette El Bahdja',
    address: '12 Boulevard des Martyrs, Alger',
    phone: '021000000',
    email: 'contact@elbahdja.dz',
    taxRate: 19,
    currency: 'DA',
    receiptTemplate: 'classic',
    labelTemplate: 'standard',
    loyaltyPointsPerCurrencyUnit: 1,
    loyaltyPointValue: 1,
    footerText: 'Merci pour votre confiance !',
  };

  it('generates a detailed customer statement document with correct calculations', () => {
    // Call printCustomerStatement
    printCustomerStatement(mockCustomer, mockTransactions, mockSettings);

    // The executePrint function creates or uses #document-print-iframe
    const iframe = document.getElementById('document-print-iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    expect(doc).toBeTruthy();
    const generatedHtml = doc?.documentElement?.innerHTML || '';

    // Verify critical elements in statement
    expect(generatedHtml).toContain('RELEVÉ DE COMPTE');
    expect(generatedHtml).toContain('Mourad Benali');
    expect(generatedHtml).toContain('0555123456');
    expect(generatedHtml).toContain('4500.00 DA');
    expect(generatedHtml).toContain('SOLDE DÉBITEUR');
    expect(generatedHtml).toContain('À Crédit');
    expect(generatedHtml).toContain('#TX-001');
    expect(generatedHtml).toContain('#TX-002');
    expect(generatedHtml).toContain('Cachet et Signature du Magasin');
  });

  it('correctly handles customer status filtering criteria', () => {
    const customers: Customer[] = [
      { id: '1', name: 'Client Endetté', balance: -200, loyaltyPoints: 10, totalSpent: 1000, favoriteItems: [], alerts: [], cashierNotes: [] },
      { id: '2', name: 'Client Avoir', balance: 500, loyaltyPoints: 20, totalSpent: 2000, favoriteItems: [], alerts: [], cashierNotes: [] },
      { id: '3', name: 'Client App Mobile', balance: 0, loyaltyPoints: 0, totalSpent: 500, isAppUser: true, favoriteItems: [], alerts: [], cashierNotes: [] },
      { id: '4', name: 'Client VIP', balance: 0, loyaltyPoints: 150, totalSpent: 45000, favoriteItems: [], alerts: [], cashierNotes: [] },
      { id: '5', name: 'Client Inactif', balance: 0, loyaltyPoints: 0, totalSpent: 100, lastVisit: new Date(Date.now() - 90 * 86400000).toISOString(), favoriteItems: [], alerts: [], cashierNotes: [] },
    ];

    const debtors = customers.filter(c => (c.balance || 0) < 0);
    expect(debtors).toHaveLength(1);
    expect(debtors[0].name).toBe('Client Endetté');

    const credits = customers.filter(c => (c.balance || 0) > 0);
    expect(credits).toHaveLength(1);
    expect(credits[0].name).toBe('Client Avoir');

    const appUsers = customers.filter(c => !!c.isAppUser);
    expect(appUsers).toHaveLength(1);
    expect(appUsers[0].name).toBe('Client App Mobile');

    const vip = customers.filter(c => (c.loyaltyPoints || 0) >= 100 || (c.totalSpent || 0) >= 20000);
    expect(vip).toHaveLength(1);
    expect(vip[0].name).toBe('Client VIP');

    const sixtyDaysAgo = Date.now() - 60 * 86400000;
    const inactive = customers.filter(c => c.lastVisit && new Date(c.lastVisit).getTime() < sixtyDaysAgo);
    expect(inactive).toHaveLength(1);
    expect(inactive[0].name).toBe('Client Inactif');
  });

  it('safely parses cashierNotes in various raw formats (Array, JSON string, plain text, corrupted fragments, null)', () => {
    // 1. Array format
    const arr = [{ note: 'Acompte 1000 DA', author: 'Kader', timestamp: '2026-09-01T10:00:00Z' }];
    expect(parseCashierNotes(arr)).toEqual(arr);

    // 2. JSON string format (as returned by Supabase or stringified)
    const jsonStr = JSON.stringify(arr);
    const parsedFromJson = parseCashierNotes(jsonStr);
    expect(parsedFromJson).toHaveLength(1);
    expect(parsedFromJson[0].note).toBe('Acompte 1000 DA');
    expect(parsedFromJson[0].author).toBe('Kader');

    // 3. Plain text format
    const plainText = 'Client fidèle, chèque de garantie déposé';
    const parsedFromPlain = parseCashierNotes(plainText);
    expect(parsedFromPlain).toHaveLength(1);
    expect(parsedFromPlain[0].note).toBe(plainText);
    expect(parsedFromPlain[0].author).toBe('Direction');

    // 4. Corrupted punctuation fragments from prior string spreading
    expect(parseCashierNotes(['[', '"', '}', ','])).toEqual([]);

    // 5. null or undefined or empty string
    expect(parseCashierNotes(null)).toEqual([]);
    expect(parseCashierNotes(undefined)).toEqual([]);
    expect(parseCashierNotes('')).toEqual([]);
    expect(parseCashierNotes('   ')).toEqual([]);
  });

  it('prints customer statement without crashing even when customer.cashierNotes is a string (prevents TypeError)', () => {
    // Exact scenario that crashed: cashierNotes is a string
    const stringNotesCustomer: Customer = {
      ...mockCustomer,
      cashierNotes: '[{"note":"Versement 2000 DA","timestamp":"2026-09-02T12:00:00Z","author":"Caisse"}]' as any,
    };

    expect(() => {
      printCustomerStatement(stringNotesCustomer, mockTransactions, mockSettings);
    }).not.toThrow();

    const iframe = document.getElementById('document-print-iframe') as HTMLIFrameElement;
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    const html = doc?.documentElement?.innerHTML || '';

    expect(html).toContain('Versement 2000 DA');
    expect(html).toContain('Caisse');
  });

  it('safely handles Button clicks when onClick is undefined or not a function (no crash)', () => {
    expect(() => {
      const { container } = render(<Button onClick={undefined}>Test Button</Button>);
      const btn = container.querySelector('button');
      if (btn) fireEvent.click(btn);
    }).not.toThrow();
  });

  it('safely handles Modal close button when onClose is undefined or not a function (no crash)', () => {
    expect(() => {
      const { container } = render(
        <Modal isOpen={true} onClose={undefined} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      const closeBtn = container.querySelector('button');
      if (closeBtn) fireEvent.click(closeBtn);
    }).not.toThrow();
  });

  it('safely handles ConfirmDialog with onCancel instead of onClose (no crash on cancel or confirm)', () => {
    const onCancelMock = vi.fn();
    const onConfirmMock = vi.fn();

    expect(() => {
      const { getByText } = render(
        <ConfirmDialog
          isOpen={true}
          title="Confirmation"
          message="Voulez-vous supprimer ?"
          onConfirm={onConfirmMock}
          onCancel={onCancelMock}
          confirmText="Oui, supprimer"
          cancelText="Annuler"
        />
      );

      const cancelBtn = getByText('Annuler');
      fireEvent.click(cancelBtn);
      expect(onCancelMock).toHaveBeenCalledTimes(1);

      const confirmBtn = getByText('Oui, supprimer');
      fireEvent.click(confirmBtn);
      expect(onConfirmMock).toHaveBeenCalledTimes(1);
    }).not.toThrow();
  });

  it('safely prepares expenses payload with exact Postgres snake_case columns and date formatting', async () => {
    const { preparePayload, TABLE_COLUMNS } = await import('../src/lib/db-converters');
    const rawExpense = {
      description: 'Encaissement Règlement Client : Mourad Benali (Acompte)',
      amount: -1500,
      category: 'Versement Client',
      date: '2026-09-04T12:30:00.000Z',
      userId: 'system',
      paymentMethod: 'cash',
      extraUnknownField: 'should_be_stripped'
    };

    const cleaned = preparePayload('expenses', 'exp-123', rawExpense);

    // Only allowed columns must be present
    expect(Object.keys(cleaned).sort()).toEqual([
      'amount', 'category', 'date', 'description', 'id', 'payment_method', 'user_id'
    ]);

    expect(cleaned.id).toBe('exp-123');
    expect(cleaned.amount).toBe(-1500);
    expect(cleaned.category).toBe('Versement Client');
    expect(cleaned.date).toBe('2026-09-04'); // Formatted to YYYY-MM-DD
    expect(cleaned.user_id).toBe('system');
    expect(cleaned.payment_method).toBe('cash');
    expect((cleaned as any).userId).toBeUndefined();
    expect((cleaned as any).paymentMethod).toBeUndefined();
    expect((cleaned as any).extraUnknownField).toBeUndefined();

    // Verify all keys in cleaned are in TABLE_COLUMNS.expenses
    Object.keys(cleaned).forEach(col => {
      expect(TABLE_COLUMNS.expenses).toContain(col);
    });
  });

  it('safely prepares customers payload without non-existent Postgres columns', async () => {
    const { preparePayload, TABLE_COLUMNS } = await import('../src/lib/db-converters');
    const rawCustomer = {
      ...mockCustomer,
      password: 'plain_password',
      password_hash: '$2a$10$hash',
      address: '12 Rue Didouche',
      city: 'Alger',
      isWholesale: true,
      creditLimit: 50000
    };

    const cleaned = preparePayload('customers', mockCustomer.id, rawCustomer);

    expect(cleaned.id).toBe(mockCustomer.id);
    expect(cleaned.name).toBe(mockCustomer.name);
    expect(cleaned.password_hash).toBe('$2a$10$hash');
    expect((cleaned as any).password).toBeUndefined();
    expect(cleaned.address).toBe('12 Rue Didouche');
    expect(cleaned.city).toBe('Alger');
    expect(cleaned.is_wholesale).toBe(true);
    expect(cleaned.credit_limit).toBe(50000);

    // Verify all keys are in TABLE_COLUMNS.customers
    Object.keys(cleaned).forEach(col => {
      expect(TABLE_COLUMNS.customers).toContain(col);
    });
  });
});

