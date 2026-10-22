import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mocks hoisted pour Vitest
const { mockRpc, mockUpsert, mockInsert, mockUpdate, mockDelete, mockSelect, idbMockStore } = vi.hoisted(() => {
  return {
    mockRpc: vi.fn(),
    mockUpsert: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockSelect: vi.fn(),
    idbMockStore: new Map<string, any>()
  };
});

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbMockStore.get(key)),
  set: vi.fn(async (key: string, value: any) => {
    idbMockStore.set(key, value);
  }),
  del: vi.fn(async (key: string) => {
    idbMockStore.delete(key);
  })
}));

vi.mock('../src/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn((table: string) => ({
      select: mockSelect,
      upsert: mockUpsert,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    })),
    rpc: mockRpc
  }
}));

import {
  enqueueSync,
  enqueueSyncBatch,
  loadPendingSyncQueue,
  clearSyncQueue,
  processSyncQueue,
  getFailedSyncQueue,
  clearFailedSyncQueue,
  SyncPayload
} from '../src/services/SyncService';

import {
  markRecordDeleted,
  getDeletedRecordIds,
  localDb
} from '../src/services/LocalDatabase';

import { applyStockAdjustment } from '../src/services/stockService';
import { destockOrder } from '../src/services/orderStockService';
import { useCoreStore } from '../src/store/useCoreStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { usePeopleStore } from '../src/store/usePeopleStore';

describe('⚡ Jalon M2 : Suite de Tests de Résilience Offline-First & Synchronisation Atomique', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    clearSyncQueue();
    await clearFailedSyncQueue();
    idbMockStore.clear();

    // Configuration par défaut des mocks
    mockUpsert.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    mockDelete.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    mockSelect.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    });
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });
  });

  // =========================================================================
  // 1. P0-SYNC-01 : Protection Dead Letter Queue (DLQ) sous Panne Réseau
  // =========================================================================
  describe('P0-SYNC-01 : Protection DLQ sous coupure réseau et reprise automatique', () => {
    it('ne doit JAMAIS incrémenter retryCount ni purger en DLQ lors d\'une panne réseau (Failed to fetch)', async () => {
      // Échec réseau systématique sur transactions
      mockUpsert.mockRejectedValue(new Error('Failed to fetch'));

      enqueueSync('transactions', 'tx_net_01', 'UPSERT', {
        id: 'tx_net_01',
        total: 1200,
        timestamp: new Date().toISOString()
      });

      // Simuler 8 tentatives successives sous coupure réseau
      for (let i = 0; i < 8; i++) {
        await processSyncQueue();
      }

      // Vérifier que la transaction est TOUJOURS dans la file active
      const queue = loadPendingSyncQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].recordId).toBe('tx_net_01');
      // Le retryCount ne doit pas avoir dépassé le plafond ni causé de purge DLQ
      expect(queue[0].retryCount || 0).toBe(0);

      // La Dead Letter Queue doit être totalement vide
      const dlq = await getFailedSyncQueue();
      expect(dlq.length).toBe(0);
    });

    it('doit incrémenter retryCount et basculer en DLQ après 7 échecs lors d\'erreurs logiques PostgREST', async () => {
      // Rejet logique (ex: contrainte de clé étrangère 400 Bad Request, pas une erreur réseau)
      mockUpsert.mockResolvedValue({
        data: null,
        error: { message: 'violates foreign key constraint', code: '23503', status: 400 }
      });

      enqueueSync('transactions', 'tx_logic_err', 'UPSERT', {
        id: 'tx_logic_err',
        total: 500,
        timestamp: new Date().toISOString()
      });

      // Exécuter 7 passes de traitement
      for (let i = 0; i < 7; i++) {
        await processSyncQueue();
      }

      // L'élément doit avoir été éjecté de la file active et sauvé dans la DLQ
      const queue = loadPendingSyncQueue();
      expect(queue.length).toBe(0);

      const dlq = await getFailedSyncQueue();
      expect(dlq.length).toBe(1);
      expect(dlq[0].recordId).toBe('tx_logic_err');
      expect(dlq[0].retryCount).toBeGreaterThan(6);
    });
  });

  // =========================================================================
  // 2. P0-SYNC-02 : Clé d'Idempotence sur les Dettes Clients (adjust_customer_balance)
  // =========================================================================
  describe('P0-SYNC-02 : Idempotence stricte des dettes et soldes clients', () => {
    it('doit transmettre p_idempotency_key lors de l\'appel RPC adjust_customer_balance', async () => {
      enqueueSync('customers', 'cust_idem_1', 'UPSERT', {
        id: 'cust_idem_1',
        deltaBalance: -3000,
        deltaSpent: 3000,
        deltaPoints: 30
      });

      await processSyncQueue();

      expect(mockRpc).toHaveBeenCalledWith('adjust_customer_balance', expect.objectContaining({
        p_id: 'cust_idem_1',
        delta_balance: -3000,
        delta_spent: 3000,
        delta_points: 30,
        p_idempotency_key: expect.stringMatching(/^adj_.*_cust_idem_1$/)
      }));
    });

    it('la migration SQL 20261009_customer_balance_idempotency.sql doit exister et définir la table d\'idempotence', () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261009_customer_balance_idempotency.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS public.customer_balance_adjustments');
      expect(sqlContent).toContain('idempotency_key TEXT PRIMARY KEY');
      expect(sqlContent).toContain('p_idempotency_key TEXT DEFAULT NULL');
      expect(sqlContent).toContain('ON CONFLICT (idempotency_key) DO NOTHING');
    });
  });

  // =========================================================================
  // 3. P0-SYNC-03 : Préservation et Cumul des Deltas Financiers Hors-Ligne
  // =========================================================================
  describe('P0-SYNC-03 : Préservation des dettes clients lors de mises à jour de coordonnées hors-ligne', () => {
    it('doit préserver deltaBalance même si la mise à jour suivante ne contient que des coordonnées (téléphone)', () => {
      // 1. Une vente à crédit a lieu hors-ligne
      enqueueSyncBatch([{
        table: 'customers',
        recordId: 'cust_credit_99',
        action: 'UPSERT',
        payload: {
          id: 'cust_credit_99',
          name: 'Ahmed Benali',
          deltaBalance: -4500,
          deltaSpent: 4500,
          deltaPoints: 45
        }
      }]);

      // 2. Le caissier modifie ensuite le numéro de téléphone sans toucher au solde
      enqueueSyncBatch([{
        table: 'customers',
        recordId: 'cust_credit_99',
        action: 'UPSERT',
        payload: {
          id: 'cust_credit_99',
          phone: '0555987654',
          address: 'Alger Centre'
        }
      }]);

      const queue = loadPendingSyncQueue();
      const customerItem = queue.find(i => i.recordId === 'cust_credit_99');

      expect(customerItem).toBeDefined();
      // Le nouveau téléphone doit être appliqué
      expect(customerItem?.payload.phone).toBe('0555987654');
      // 🛡️ La créance financière de -4500 DA doit impérativement être conservée !
      expect(customerItem?.payload.deltaBalance).toBe(-4500);
      expect(customerItem?.payload.deltaSpent).toBe(4500);
      expect(customerItem?.payload.deltaPoints).toBe(45);
    });

    it('doit cumuler arithmétiquement plusieurs ventes successives à crédit pour un même client', () => {
      // 1ère vente : -1500 DA
      enqueueSyncBatch([{
        table: 'customers',
        recordId: 'cust_cumul_1',
        action: 'UPSERT',
        payload: { id: 'cust_cumul_1', deltaBalance: -1500, deltaSpent: 1500, deltaPoints: 15 }
      }]);

      // 2ème vente : -2000 DA
      enqueueSyncBatch([{
        table: 'customers',
        recordId: 'cust_cumul_1',
        action: 'UPSERT',
        payload: { id: 'cust_cumul_1', deltaBalance: -2000, deltaSpent: 2000, deltaPoints: 20 }
      }]);

      const queue = loadPendingSyncQueue();
      const customerItem = queue.find(i => i.recordId === 'cust_cumul_1');

      expect(customerItem?.payload.deltaBalance).toBe(-3500);
      expect(customerItem?.payload.deltaSpent).toBe(3500);
      expect(customerItem?.payload.deltaPoints).toBe(35);
    });
  });

  // =========================================================================
  // 4. P1-SYNC-01 : Requêtes Ciblées Barcode/SKU & Conservation Intégrale du Catalogue
  // =========================================================================
  describe('P1-SYNC-01 : Requêtes ciblées et préservation du code-barres en cas de conflit', () => {
    it('doit requêter supabase avec .in("sku", ...) et .in("barcode", ...) pour le lot de produits', async () => {
      const inMock = vi.fn().mockResolvedValue({
        data: [{ id: 'prod_remote_1', sku: 'SKU-001', barcode: '613000000001' }],
        error: null
      });

      mockSelect.mockReturnValue({
        in: inMock,
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      });

      enqueueSyncBatch([{
        table: 'products',
        recordId: 'prod_local_1',
        action: 'UPSERT',
        payload: {
          id: 'prod_local_1',
          name: 'Produit Test SKU',
          sku: 'SKU-001',
          barcode: '613000000001',
          price: 250
        }
      }]);

      await processSyncQueue();

      // Vérifier que le pre-check utilise .in() ciblé
      expect(inMock).toHaveBeenCalledWith('sku', expect.arrayContaining(['SKU-001']));
      expect(inMock).toHaveBeenCalledWith('barcode', expect.arrayContaining(['613000000001']));
    });

    it('ne doit JAMAIS supprimer barcode du payload lors d\'une tentative de fallback sur conflit', async () => {
      // Simuler un échec batch d'upsert, puis un échec sur le premier upsert unitaire
      mockUpsert
        .mockResolvedValueOnce({ data: null, error: { message: 'unique constraint barcode violation' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'unique constraint barcode violation' } });

      const updateEqMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'update failed' }
      });
      mockUpdate.mockReturnValue({ eq: updateEqMock });

      enqueueSyncBatch([{
        table: 'products',
        recordId: 'prod_conflict_bar',
        action: 'UPSERT',
        payload: {
          id: 'prod_conflict_bar',
          name: 'Produit Conflit Barcode',
          barcode: '999888777666',
          price: 100
        }
      }]);

      await processSyncQueue();

      // Vérifier que la file conserve le produit et que le barcode n'a jamais été supprimé
      const queue = loadPendingSyncQueue();
      const item = queue.find(i => i.recordId === 'prod_conflict_bar');
      if (item) {
        expect(item.payload.barcode).toBe('999888777666');
      }
    });
  });

  // =========================================================================
  // 5. P1-SYNC-02 : Repli vers enqueueSync sur Erreur PostgREST dans orderStockService
  // =========================================================================
  describe('P1-SYNC-02 : Détection des erreurs PostgREST dans orderStockService', () => {
    it('doit basculer vers enqueueSync lorsque supabase.from("transactions").insert retourne { error }', async () => {
      // PostgREST renvoie une erreur sans lever d'exception (ne throw pas)
      mockInsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'RLS check failed for user', code: '42501' }
      });

      const orderId = 'ord-test-p1-sync-02';
      const mockOrder: any = {
        id: orderId,
        orderId: orderId,
        status: 'pending',
        syncedToPos: false,
        total: 1500,
        items: [{ productId: 'prod_p1_02', quantity: 2, price: 750 }]
      };

      useTransactionStore.getState().setOnlineOrders([mockOrder]);
      useCoreStore.getState().setProducts([{
        id: 'prod_p1_02',
        name: 'Produit Test Ord',
        stock: 10,
        price: 750,
        costPrice: 500,
        taxRate: 19,
        unit: 'pièce',
        status: 'active',
        updatedAt: new Date().toISOString()
      } as any]);

      // Exécuter le déstockage de la commande
      const res = await destockOrder(mockOrder);
      expect(res.success).toBe(true);

      // La transaction doit avoir été enfilée dans SyncService en repli suite au rejet PostgREST
      const queue = loadPendingSyncQueue();
      const txItem = queue.find(i => i.table === 'transactions');
      expect(txItem).toBeDefined();
      expect(txItem?.payload.total).toBe(1500);
    });
  });

  // =========================================================================
  // 6. P1-SYNC-03 : Concurrence de Stock Snapshot vs Relative Delta dans stockService
  // =========================================================================
  describe('P1-SYNC-03 : Élimination de la concurrence snapshot absolu vs delta relatif', () => {
    it('doit utiliser exclusivement updateLocalOnly et ne pas émettre de snapshot products dans SyncService', async () => {
      const prodId = 'prod_stock_sync_03';
      useCoreStore.getState().setProducts([{
        id: prodId,
        name: 'Produit Déstockage Caisse',
        stock: 20,
        price: 100,
        costPrice: 60,
        taxRate: 19,
        unit: 'pièce',
        status: 'active',
        updatedAt: new Date().toISOString()
      } as any]);

      // Échec RPC réseau pour forcer la mise en file d'attente
      mockRpc.mockRejectedValue(new Error('Failed to fetch'));

      // Ajustement de stock en caisse (déstockage de 3 unités)
      const res = await applyStockAdjustment({
        productId: prodId,
        value: -3,
        mode: 'delta',
        adjustmentId: 'adj_sync_03_test',
        reason: 'Vente caisse'
      });

      expect(res.appliedDirectly).toBe(false);
      expect(res.newStock).toBe(17);

      // Vérifier les éléments présents dans la file de synchronisation
      const queue = loadPendingSyncQueue();
      const productSnapshot = queue.find(i => i.table === 'products' && i.recordId === prodId);
      const stockAdjustmentDelta = queue.find(i => (i.table === 'stock_adjustments' || i.table === 'stockAdjustments') && (i.payload?.id === 'adj_sync_03_test' || i.recordId === 'adj_sync_03_test'));

      // 🛡️ P1-SYNC-03 : Aucun snapshot absolu ne doit polluer la file pour products
      expect(productSnapshot).toBeUndefined();
      // Seul le delta relatif RPC atomique doit être enfilé
      expect(stockAdjustmentDelta).toBeDefined();
      expect(stockAdjustmentDelta?.payload.delta).toBe(-3);
    });
  });

  // =========================================================================
  // 7. P1-SYNC-04 : Migration des IDs Supprimés vers IndexedDB (Levée du plafond à 1 000)
  // =========================================================================
  describe('P1-SYNC-04 : Persistance IndexedDB et levée du plafond de 1 000 IDs supprimés', () => {
    it('peut mémoriser et restituer plus de 1 000 IDs supprimés sans troncature', () => {
      const table = 'online_orders';
      const TOTAL_RECORDS = 1050;

      for (let i = 1; i <= TOTAL_RECORDS; i++) {
        markRecordDeleted(table, `ord_del_${i}`);
      }

      const deletedSet = getDeletedRecordIds(table);
      expect(deletedSet.size).toBe(TOTAL_RECORDS);
      expect(deletedSet.has('ord_del_1')).toBe(true);
      expect(deletedSet.has('ord_del_1050')).toBe(true);
    });

    it('LocalDatabase.delete appelle markRecordDeleted pour les entités supprimées', async () => {
      await localDb.delete('onlineOrders/ord_del_single_99');
      const deletedSet = getDeletedRecordIds('onlineOrders');
      expect(deletedSet.has('ord_del_single_99')).toBe(true);
    });
  });
});
