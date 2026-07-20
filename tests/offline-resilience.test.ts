import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  enqueueSync,
  scheduleQueueProcessing
} from '../src/services/SyncService';
import { supabase, isSupabaseConfigured } from '../src/supabase';

// Mock navigator onLine property
const mockOnLine = vi.spyOn(navigator, 'onLine', 'get');

// Mock idb-keyval
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
  const mockUpsert = vi.fn(async () => ({ error: null }));
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      in: vi.fn(async () => ({
        data: [],
        error: null
      }))
    })),
    upsert: mockUpsert,
    delete: vi.fn(() => ({
      in: vi.fn(async () => ({ error: null }))
    }))
  }));
  
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: mockFrom,
      rpc: vi.fn(async () => ({ error: null })),
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { user: { id: 'test-user-id' } } },
          error: null
        }))
      }
    }
  };
});

// Mock local-db functions
vi.mock('../src/lib/local-db', () => {
  return {
    setLocalState: vi.fn(),
    saveStateToStorage: vi.fn(),
    triggerObservers: vi.fn(),
    dbState: {},
    TABLE_COLUMNS: {
      products: ['id', 'name', 'updated_at']
    }
  };
});

describe('Offline/Online Transition Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify Supabase config mock', () => {
    console.log('isSupabaseConfigured in test:', isSupabaseConfigured);
    expect(isSupabaseConfigured).toBe(true);
  });

  it('should queue changes offline and process them once back online', async () => {
    // 1. Simulate Offline state
    mockOnLine.mockReturnValue(false);
    
    // Perform sync enqueues
    enqueueSync('products', 'p_offline_1', { name: 'Offline Product' });
    
    // Verify that Supabase from has NOT been called yet
    expect(supabase.from).not.toHaveBeenCalled();

    // 2. Simulate going back online
    mockOnLine.mockReturnValue(true);
    
    // Trigger queue processing
    scheduleQueueProcessing(0);

    // Give it a moment to run the timeout microtasks
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that Supabase from has now been called to push the offline product
    expect(supabase.from).toHaveBeenCalledWith('products');
    
    const mockFromInstance = vi.mocked(supabase.from).mock.results[0].value;
    expect(mockFromInstance.upsert).toHaveBeenCalled();
  });
});
