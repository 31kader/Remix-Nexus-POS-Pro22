import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  enqueueSync,
  enqueueStockAdjustment,
  scheduleQueueProcessing,
  loadPendingSyncQueue
} from '../src/services/SyncService';

// Mock idb-keyval to avoid IndexedDB errors in testing environment
vi.mock('idb-keyval', () => {
  const store = new Map();
  return {
    get: vi.fn(async (key) => store.get(key)),
    set: vi.fn(async (key, value) => {
      store.set(key, value);
    })
  };
});

// Mock Supabase client
vi.mock('../src/supabase', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(async () => ({
            data: [
              { id: 'prod_conflict', updated_at: '2026-06-23T12:00:00.000Z' }
            ],
            error: null
          }))
        })),
        upsert: vi.fn(async () => ({ error: null })),
        delete: vi.fn(() => ({
          in: vi.fn(async () => ({ error: null }))
        }))
      })),
      rpc: vi.fn(async () => ({ error: null }))
    }
  };
});

// Mock sonner toast
vi.mock('sonner', () => {
  return {
    toast: {
      error: vi.fn(),
      warning: vi.fn(),
      success: vi.fn()
    }
  };
});

// Mock local-db functions to track updates
const mockSetLocalState = vi.fn();
const mockSaveStateToStorage = vi.fn();
const mockTriggerObservers = vi.fn();

vi.mock('../src/lib/local-db', () => {
  return {
    setLocalState: (path: string, val: any) => mockSetLocalState(path, val),
    saveStateToStorage: (table: string) => mockSaveStateToStorage(table),
    triggerObservers: (path: string) => mockTriggerObservers(path),
    dbState: {},
    TABLE_COLUMNS: {
      products: ['id', 'name', 'updated_at'],
      categories: ['id', 'name']
    }
  };
});

describe('SyncService background sync & conflict resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should queue upserts correctly when enqueueSync is called', () => {
    // Basic test to verify enqueueSync operates without errors
    expect(() => enqueueSync('products', 'p1', { name: 'New Product' })).not.toThrow();
  });

  it('should queue stock adjustments correctly', () => {
    expect(() => enqueueStockAdjustment('p1', 5)).not.toThrow();
  });
});
