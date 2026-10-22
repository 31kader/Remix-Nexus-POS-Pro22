import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { preparePayload, TABLE_COLUMNS } from '../src/lib/db-converters';
import { isTopUpTransaction } from '../src/types/sales';
import { Orders } from '../src/components/Orders';
import { LanguageProvider } from '../src/translations';

// Liste certifiée des 37 colonnes physiques de la table `transactions` du projet Supabase unlwfvldqxfccgrrgbwf
const SUPABASE_REMOTE_TRANSACTION_COLUMNS = [
  'id', 'total', 'payment_method', 'delivery_method', 'timestamp', 'user_id', 
  'customer_id', 'customer_name', 'status', 'promotion_id', 'points_earned', 
  'discount_amount', 'points_discount', 'balance_used', 'voucher_discount', 
  'is_wholesale', 'online_order_id', 'items', 'audit_status', 'audited_by', 
  'audited_at', 'audit_duration', 'audit_note', 'created_at', 'amount_received', 
  'amount_returned', 'cashier_id', 'cashier_name', 'employee_id', 'employee_name', 
  'is_edited', 'edited_at', 'edited_by', 'original_total', 'updated_at', 
  'terminal_id', 'terminal_name'
];

describe('Empirical Challenger M1 Suite — Baseline & Filtrage preparePayload', () => {
  describe('1. Vérification Contradictoire de TABLE_COLUMNS.transactions', () => {
    it('doit correspondre à 100% au schéma physique distant Supabase (exactement 37 colonnes)', () => {
      const localCols = TABLE_COLUMNS.transactions;
      expect(localCols).toHaveLength(37);
      expect(localCols.sort()).toEqual([...SUPABASE_REMOTE_TRANSACTION_COLUMNS].sort());
    });

    it('exclut formellement les colonnes fantômes source, subtotal et tax_amount', () => {
      expect(TABLE_COLUMNS.transactions).not.toContain('source');
      expect(TABLE_COLUMNS.transactions).not.toContain('subtotal');
      expect(TABLE_COLUMNS.transactions).not.toContain('tax_amount');
      expect(TABLE_COLUMNS.transactions).not.toContain('taxAmount');
    });
  });

  describe('2. Robustesse empirique de preparePayload("transactions", ...)', () => {
    it('filtre drastiquement les colonnes parasites et inattendues sur un payload forgé', () => {
      const forgedPayload = {
        id: 'tx-forged-adversarial-1',
        total: 12500,
        source: 'pos',
        subtotal: 10504.2,
        tax_amount: 1995.8,
        taxAmount: 1995.8,
        unexpected_meta: 'hack_injection',
        unknown_flag: true,
        random_field: { dangerous: true },
        source_channel: 'offline_sync',
        notes: '[REGLEMENT] Paiement client espèces'
      };

      const prepared = preparePayload('transactions', forgedPayload.id, forgedPayload);

      // Champs fantômes et parasites obligatoirement absents
      expect(prepared.source).toBeUndefined();
      expect(prepared.subtotal).toBeUndefined();
      expect(prepared.tax_amount).toBeUndefined();
      expect(prepared.taxAmount).toBeUndefined();
      expect(prepared.unexpected_meta).toBeUndefined();
      expect(prepared.unknown_flag).toBeUndefined();
      expect(prepared.random_field).toBeUndefined();
      expect(prepared.source_channel).toBeUndefined();

      // Champs valides préservés
      expect(prepared.id).toBe('tx-forged-adversarial-1');
      expect(prepared.total).toBe(12500);
      expect(prepared.audit_note).toBe('[REGLEMENT] Paiement client espèces');

      // Toutes les clés retournées doivent appartenir au schéma officiel
      for (const key of Object.keys(prepared)) {
        expect(SUPABASE_REMOTE_TRANSACTION_COLUMNS).toContain(key);
      }
    });

    it('gère les conversions camelCase vers snake_case pour transactions', () => {
      const camelPayload = {
        id: 'tx-camel-002',
        total: 3500,
        paymentMethod: 'credit_card',
        deliveryMethod: 'in_store',
        employeeId: 'emp-42',
        employeeName: 'Ahmed Benali',
        cashierId: 'cash-01',
        cashierName: 'Fatima',
        customerId: 'cust-99',
        customerName: 'Samir',
        onlineOrderId: 'ord-online-123',
        isWholesale: true,
        pointsEarned: 35,
        discountAmount: 100,
        pointsDiscount: 50,
        balanceUsed: 200,
        voucherDiscount: 0,
        originalTotal: 3850,
        isEdited: true,
        editedAt: '2026-10-18T12:00:00.000Z',
        editedBy: 'admin',
        terminalId: 'term-main',
        terminalName: 'Caisse Principale',
        auditStatus: 'verified',
        auditedBy: 'admin',
        auditedAt: '2026-10-18T13:00:00.000Z',
        auditDuration: 45,
        auditNote: 'Vérification conforme',
        items: [{ id: 'prod-1', name: 'Produit 1', quantity: 2, price: 1750 }]
      };

      const prepared = preparePayload('transactions', camelPayload.id, camelPayload);

      expect(prepared.payment_method).toBe('credit_card');
      expect(prepared.delivery_method).toBe('in_store');
      expect(prepared.employee_id).toBe('emp-42');
      expect(prepared.employee_name).toBe('Ahmed Benali');
      expect(prepared.cashier_id).toBe('cash-01');
      expect(prepared.cashier_name).toBe('Fatima');
      expect(prepared.customer_id).toBe('cust-99');
      expect(prepared.customer_name).toBe('Samir');
      expect(prepared.online_order_id).toBe('ord-online-123');
      expect(prepared.is_wholesale).toBe(true);
      expect(prepared.points_earned).toBe(35);
      expect(prepared.discount_amount).toBe(100);
      expect(prepared.points_discount).toBe(50);
      expect(prepared.balance_used).toBe(200);
      expect(prepared.original_total).toBe(3850);
      expect(prepared.is_edited).toBe(true);
      expect(prepared.terminal_id).toBe('term-main');
      expect(prepared.terminal_name).toBe('Caisse Principale');
      expect(prepared.audit_status).toBe('verified');
      expect(prepared.items).toEqual([{ id: 'prod-1', name: 'Produit 1', quantity: 2, price: 1750 }]);
    });

    it('préserve la logique métier locale isTopUpTransaction sans compromettre le schéma Supabase', () => {
      const localTopUpTx = {
        id: 'tx-topup-loc',
        total: 5000,
        paymentMethod: 'cash' as const,
        source: 'topup',
        notes: '[REGLEMENT] Versement espèces'
      };

      // 1. Logique métier locale
      expect(isTopUpTransaction(localTopUpTx)).toBe(true);

      // 2. Préparation pour synchronisation Supabase
      const prepared = preparePayload('transactions', localTopUpTx.id, localTopUpTx);

      // Le champ local `source` est filtré pour Supabase
      expect(prepared.source).toBeUndefined();
      // Le note est reporté dans `audit_note`
      expect(prepared.audit_note).toBe('[REGLEMENT] Versement espèces');
      expect(prepared.total).toBe(5000);
    });

    it('gère avec résilience les valeurs nulles, indéfinies et types anormaux', () => {
      const edgePayload = {
        id: 'tx-edge-003',
        total: '1250.50' as any,
        payment_method: null,
        items: '[]' as any,
        is_wholesale: null,
        points_earned: '25' as any,
        discount_amount: null
      };

      const prepared = preparePayload('transactions', edgePayload.id, edgePayload);

      expect(prepared.total).toBe(1250.5);
      expect(prepared.payment_method).toBeNull();
      expect(prepared.items).toEqual([]);
      expect(prepared.is_wholesale).toBeNull();
      expect(prepared.points_earned).toBe(25);
      expect(prepared.discount_amount).toBe(0);
    });
  });

  describe('3. Vérification de l\'intégrité de Orders.tsx au niveau du rendu', () => {
    it('rend le composant Orders sans exception d\'exécution avec des props complètes', () => {
      const mockProps = {
        orders: [
          {
            id: 'ord-1',
            orderNumber: 'CMD-001',
            customerName: 'Karim',
            customerPhone: '0555123456',
            total: 4500,
            status: 'pending' as const,
            createdAt: '2026-10-18T10:00:00Z',
            items: []
          }
        ],
        products: [],
        settings: { store_name: 'Nexus Store' },
        employees: [],
        customers: [],
        autoSync: false,
        setAutoSync: vi.fn()
      };

      const { container } = render(
        <LanguageProvider>
          <Orders {...(mockProps as any)} />
        </LanguageProvider>
      );
      expect(container).toBeTruthy();
      expect(screen.getByText(/Commandes en Ligne/i)).toBeDefined();
      expect(screen.getAllByText(/En attente/i).length).toBeGreaterThanOrEqual(1);
    });

    it('rend le composant Orders sans crash même avec des listes vides ou partielles', () => {
      const emptyProps = {
        orders: [],
        products: [],
        settings: {},
        employees: [],
        customers: []
      };

      const { container } = render(
        <LanguageProvider>
          <Orders {...(emptyProps as any)} />
        </LanguageProvider>
      );
      expect(container).toBeTruthy();
      expect(screen.getByText(/0 affichées sur 0 au total/i)).toBeDefined();
    });
  });
});
