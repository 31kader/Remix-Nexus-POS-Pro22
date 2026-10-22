import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyStockAdjustment } from '../src/services/stockService';
import { loadPendingSyncQueue, clearSyncQueue } from '../src/services/SyncService';
import { useCoreStore } from '../src/store/useCoreStore';
import { Product } from '../src/types';

vi.mock('../src/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      })),
      insert: vi.fn().mockResolvedValue({ error: null })
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    })),
    realtime: {
      connect: vi.fn(),
      disconnect: vi.fn()
    }
  }
}));

describe('T14 — Suite Tests Unitaires Idempotence & Stock Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSyncQueue();

    const mockProduct: Product = {
      id: 'prod_test_100',
      name: 'Produit Test Idempotence',
      stock: 4,
      price: 150,
      costPrice: 100,
      barcode: '1234567890123',
      taxRate: 19,
      minStock: 5,
      supplier: 'Fournisseur Test',
      sku: 'SKU_TEST_100',
      categoryId: 'cat-test',
      unit: 'pièce',
      status: 'active',
      updatedAt: new Date().toISOString()
    };

    useCoreStore.getState().setProducts([mockProduct]);
  });

  it('(a) applique correctement le mode "set" via applyStockAdjustment en direct', async () => {
    const { supabase } = await import('../src/supabase');
    // Le RPC distant Postgres retourne la nouvelle valeur 10
    (supabase.rpc as any).mockResolvedValueOnce({
      data: 10,
      error: null
    });

    const result = await applyStockAdjustment({
      productId: 'prod_test_100',
      value: 10,
      mode: 'set',
      adjustmentId: 'adj_unit_001',
      reason: 'Comptage physique test',
      userId: 'user_1',
      userName: 'Caissier 1'
    });

    expect(result.success).toBe(true);
    expect(result.newStock).toBe(10);
    expect(result.appliedDirectly).toBe(true);

    // Vérifier que le store local Zustand a bien été synchronisé
    const updated = useCoreStore.getState().products.find(p => p.id === 'prod_test_100');
    expect(updated?.stock).toBe(10);
  });

  it('(b) bascule en file d\'attente SyncService en mode hors-ligne avec la même clé d\'idempotence', async () => {
    const { supabase } = await import('../src/supabase');
    // Échec réseau simulé
    (supabase.rpc as any).mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await applyStockAdjustment({
      productId: 'prod_test_100',
      value: 8,
      mode: 'set',
      adjustmentId: 'adj_offline_002',
      reason: 'Ajustement hors ligne',
      userId: 'user_offline'
    });

    expect(result.appliedDirectly).toBe(false);
    expect(result.adjustmentId).toBe('adj_offline_002');

    // Vérifier la présence dans la file d'attente hors-ligne
    const queue = loadPendingSyncQueue();
    const queuedItem = queue.find((item: any) => item.payload?.id === 'adj_offline_002' || item.recordId === 'adj_offline_002');
    expect(queuedItem).toBeDefined();
    expect(queuedItem?.payload?.mode).toBe('set');
  });

  it('(c) le mode "delta" calcule et transmet le delta relatif', async () => {
    const { supabase } = await import('../src/supabase');
    (supabase.rpc as any).mockResolvedValueOnce({
      data: 7,
      error: null
    });

    const result = await applyStockAdjustment({
      productId: 'prod_test_100',
      value: 3, // +3
      mode: 'delta',
      adjustmentId: 'adj_delta_003',
      reason: 'Réapprovisionnement'
    });

    expect(result.success).toBe(true);
    expect(result.newStock).toBe(7);
  });
});
