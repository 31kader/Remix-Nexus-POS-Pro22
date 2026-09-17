import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc, mockUpsert, idbMockStore } = vi.hoisted(() => {
  return {
    mockRpc: vi.fn(async () => ({ error: null })),
    mockUpsert: vi.fn(async () => ({ error: null })),
    idbMockStore: new Map<string, any>()
  };
});

import { 
  enqueueSync,
  enqueueSyncBatch,
  enqueueStockAdjustment,
  loadPendingSyncQueue,
  clearSyncQueue,
  TABLE_PRIORITY
} from '../src/services/SyncService';

// Mock idb-keyval
vi.mock('idb-keyval', () => {
  return {
    get: vi.fn(async (key: string) => idbMockStore.get(key)),
    set: vi.fn(async (key: string, value: any) => {
      idbMockStore.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      idbMockStore.delete(key);
    })
  };
});
vi.mock('../src/supabase', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          range: vi.fn(async (from: number, to: number) => ({
            data: [{ id: 'item_' + from }],
            error: null
          })),
          order: vi.fn(() => ({
            range: vi.fn(async (from: number, to: number) => ({
              data: [{ id: 'item_' + from }],
              error: null
            }))
          }))
        })),
        upsert: mockUpsert,
        delete: vi.fn(() => ({ in: vi.fn(async () => ({ error: null })) }))
      })),
      rpc: mockRpc
    }
  };
});

vi.mock('../src/lib/local-db', () => ({
  setLocalState: vi.fn(),
  saveStateToStorage: vi.fn(),
  triggerObservers: vi.fn(),
  dbState: {},
  TABLE_COLUMNS: {
    products: ['id', 'name', 'stock', 'updated_at'],
    customers: ['id', 'name', 'balance', 'loyalty_points', 'total_spent', 'updated_at'],
    transactions: ['id', 'total', 'user_id', 'items', 'timestamp']
  }
}));

describe('Atomic Sync & Offline POS Resilience Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSyncQueue();
  });

  it('devrait respecter la priorité relationnelle stricte des tables', () => {
    // Les tables parentes doivent impérativement être synchronisées avant les tables filles
    expect(TABLE_PRIORITY['customers']).toBeLessThan(TABLE_PRIORITY['transactions']);
    expect(TABLE_PRIORITY['products']).toBeLessThan(TABLE_PRIORITY['transactions']);
    expect(TABLE_PRIORITY['transactions']).toBeLessThan(TABLE_PRIORITY['returns']);
    expect(TABLE_PRIORITY['goods_receipt_notes']).toBeLessThan(TABLE_PRIORITY['stock_adjustments']);
  });

  it('devrait cumuler arithmétiquement les deltas de stock hors-ligne au lieu décraser', async () => {
    // 1ère vente : réduction de 2 unités
    enqueueStockAdjustment('prod_404', -2);

    // 2ème vente hors-ligne sur le même produit : réduction de 3 unités
    enqueueStockAdjustment('prod_404', -3);

    // Vérifier la file en mémoire
    const queue = loadPendingSyncQueue();
    const stockItems = queue.filter((item: any) => item.recordId === 'prod_404');

    expect(stockItems.length).toBe(1);
    expect(stockItems[0].payload.adjustment).toBe(-5);
  });

  it('devrait cumuler correctement les deltas positifs et négatifs', async () => {
    // Vente de 5 articles
    enqueueStockAdjustment('prod_abc', -5);

    // Retour client ou réapprovisionnement de 2 articles
    enqueueStockAdjustment('prod_abc', 2);

    const queue = loadPendingSyncQueue();
    const stockItems = queue.filter((item: any) => item.recordId === 'prod_abc');

    expect(stockItems.length).toBe(1);
    expect(stockItems[0].payload.adjustment).toBe(-3);
  });

  it('devrait enregistrer une mise à jour atomique de solde client RPC', async () => {
    enqueueSyncBatch([
      {
        table: 'customers',
        action: 'UPSERT',
        recordId: 'cust_999',
        payload: {
          id: 'cust_999',
          deltaBalance: -1500, // dette de 1500 DA
          deltaSpent: 2500,    // dépense totale + 2500 DA
          deltaPoints: 25      // 25 points gagnés
        }
      }
    ]);

    const queue = loadPendingSyncQueue();
    const custRpc = queue.find((item: any) => item.recordId === 'cust_999');

    expect(custRpc).toBeDefined();
    expect(custRpc?.payload.deltaBalance).toBe(-1500);
    expect(custRpc?.payload.deltaSpent).toBe(2500);
    expect(custRpc?.payload.deltaPoints).toBe(25);
  });
});
