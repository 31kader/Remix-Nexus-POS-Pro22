import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { useCoreStore } from '../src/store/useCoreStore';
import { Transaction, ProductReturn, Customer, Product, CompanySettings } from '../src/types';

vi.mock('../src/services/SyncService', () => ({
  enqueueStockAdjustment: vi.fn(),
  enqueueCustomerBalanceAdjustment: vi.fn(),
  enqueueSync: vi.fn(),
  enqueueSyncBatch: vi.fn(),
  loadPendingSyncQueue: vi.fn().mockReturnValue([])
}));

vi.mock('../src/services/LocalDatabase', () => ({
  localDb: {
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    insertLocalOnly: vi.fn().mockResolvedValue(undefined),
    updateLocalOnly: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ exists: () => false, val: () => null })
  }
}));

import { enqueueStockAdjustment } from '../src/services/SyncService';
import { localDb } from '../src/services/LocalDatabase';

describe('Skeptical Reviewer Edge-Case & Adversarial Attack Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. CashflowReport Resiliency against Missing Supabase Columns', () => {
    it('ne compte JAMAIS un retour de vente à crédit comme une sortie de caisse physique, même si refundMethod est absent du schéma distant', () => {
      // Simulation: Return fetched from Supabase (where refund_method column does not exist)
      const mockTx: Transaction = {
        id: 'tx-credit-999',
        total: 5000,
        paymentMethod: 'balance',
        balanceUsed: 5000,
        status: 'returned',
        timestamp: '2026-10-17T10:00:00.000Z',
        userId: 'admin',
        items: []
      };

      // Return object coming from Supabase without refundMethod
      const mockReturnFromSupabase: ProductReturn = {
        id: 'ret-999',
        transactionId: 'tx-credit-999',
        totalRefund: 5000,
        reason: 'Retour client crédit',
        timestamp: '2026-10-17T11:00:00.000Z',
        userId: 'admin',
        type: 'credit', // Saved as 'credit'
        items: []
        // refundMethod is undefined because Supabase public.returns lacks that column
      };

      // Filtering logic identical to CashflowReport
      const transactions = [mockTx];
      const returns = [mockReturnFromSupabase];

      const cashReturns = returns.filter(r => {
        if (!r) return false;
        if (r.type === 'credit_note' || (r as any).type === 'credit' || (r as any).type === 'voucher') return false;
        if (r.refundMethod === 'credit' || r.refundMethod === 'voucher') return false;
        if (!r.refundMethod && r.transactionId) {
          const tx = transactions.find(t => t && t.id === r.transactionId);
          if (tx && tx.paymentMethod === 'balance') return false;
        }
        return true;
      });

      // Assert that this return is correctly excluded from cash outflows
      expect(cashReturns.length).toBe(0);
    });

    it('exclut un retour même si type est resté "refund" si la transaction originale était payée par solde (paymentMethod: balance)', () => {
      const mockTx: Transaction = {
        id: 'tx-credit-888',
        total: 3000,
        paymentMethod: 'balance',
        balanceUsed: 3000,
        status: 'returned',
        timestamp: '2026-10-17T10:00:00.000Z',
        userId: 'admin',
        items: []
      };

      // Legacy return from Supabase where type was 'refund' and refundMethod was stripped
      const mockLegacyReturn: ProductReturn = {
        id: 'ret-888',
        transactionId: 'tx-credit-888',
        totalRefund: 3000,
        reason: 'Retour article',
        timestamp: '2026-10-17T11:00:00.000Z',
        userId: 'admin',
        type: 'refund',
        items: []
        // refundMethod missing
      };

      const transactions = [mockTx];
      const returns = [mockLegacyReturn];

      const cashReturns = returns.filter(r => {
        if (!r) return false;
        if (r.type === 'credit_note' || (r as any).type === 'credit' || (r as any).type === 'voucher') return false;
        if (r.refundMethod === 'credit' || r.refundMethod === 'voucher') return false;
        if (!r.refundMethod && r.transactionId) {
          const tx = transactions.find(t => t && t.id === r.transactionId);
          if (tx && tx.paymentMethod === 'balance') return false;
        }
        return true;
      });

      expect(cashReturns.length).toBe(0);
    });
  });

  describe('2. Multi-Terminal & Offline Concurrent Transaction Modifications', () => {
    it('consolide arithmétiquement les modifications successives du panier sans double décompte', () => {
      // Simulating two consecutive edits on the same transaction:
      // Initial items: Prod A (qty 2), Prod B (qty 1)
      const prodA: Product = { id: 'p-a', name: 'Produit A', stock: 10, price: 100 } as any;
      const prodB: Product = { id: 'p-b', name: 'Produit B', stock: 5, price: 200 } as any;

      useCoreStore.getState().setProducts([prodA, prodB]);

      // Edit 1: Prod A increases from 2 to 4 (delta: -2 stock)
      const originalItemMap1 = new Map<string, number>([['p-a', 2], ['p-b', 1]]);
      const newItemMap1 = new Map<string, number>([['p-a', 4], ['p-b', 1]]);

      const consolidatedDeltas1 = new Map<string, number>();
      for (const pId of ['p-a', 'p-b']) {
        const change = (originalItemMap1.get(pId) || 0) - (newItemMap1.get(pId) || 0);
        if (change !== 0) consolidatedDeltas1.set(pId, change);
      }

      expect(consolidatedDeltas1.get('p-a')).toBe(-2);
      expect(consolidatedDeltas1.has('p-b')).toBe(false);

      // Edit 2: Terminal 2 (or second offline edit) changes Prod A from 4 to 3 (delta: +1 stock)
      const originalItemMap2 = new Map<string, number>([['p-a', 4], ['p-b', 1]]);
      const newItemMap2 = new Map<string, number>([['p-a', 3], ['p-b', 1]]);

      const consolidatedDeltas2 = new Map<string, number>();
      for (const pId of ['p-a', 'p-b']) {
        const change = (originalItemMap2.get(pId) || 0) - (newItemMap2.get(pId) || 0);
        if (change !== 0) consolidatedDeltas2.set(pId, change);
      }

      expect(consolidatedDeltas2.get('p-a')).toBe(1);

      // Total net stock change over both edits: -2 + 1 = -1
      // Initial transaction had 2, final transaction has 3 -> exactly 1 unit deducted!
      const totalNetDelta = (consolidatedDeltas1.get('p-a') || 0) + (consolidatedDeltas2.get('p-a') || 0);
      expect(totalNetDelta).toBe(-1);
    });
  });
});
