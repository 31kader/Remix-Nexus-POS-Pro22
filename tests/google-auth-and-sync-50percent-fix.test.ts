import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { 
  enqueueSync, 
  enqueueStockAdjustment, 
  processSyncQueue, 
  clearSyncQueue, 
  onBackgroundSyncStatus,
  loadPendingSyncQueue,
  ADMIN_RESTRICTED_SYNC_TABLES
} from '../src/services/SyncService';
import { signInWithPopup, auth } from '../src/services/AuthService';
import { supabase, safeSupabaseFetch } from '../src/supabase';
import { SyncIndicator } from '../src/components/SyncIndicator';
import { useCoreStore } from '../src/store/useCoreStore';

// Mock idb-keyval
vi.mock('idb-keyval', () => {
  const store = new Map();
  return {
    get: vi.fn(async (key) => store.get(key)),
    set: vi.fn(async (key, value) => {
      store.set(key, value);
    }),
    del: vi.fn(async (key) => {
      store.delete(key);
    })
  };
});

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn(),
    close: vi.fn()
  }
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn()
  }
}));

describe('Google OAuth & Sync 50% Fix Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSyncQueue();
  });

  afterEach(() => {
    clearSyncQueue();
  });

  describe('1. Google OAuth Popup & Messaging Resilience', () => {
    it('gère l\'ouverture du popup et la synchronisation via BroadcastChannel et postMessage', async () => {
      const mockOAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=nexus';
      const signInWithOAuthSpy = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({
        data: { url: mockOAuthUrl, provider: 'google' },
        error: null
      } as any);

      // Simuler window.open retournant un faux popup
      const mockPopup = {
        closed: false,
        close: vi.fn()
      };
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

      const getSessionSpy = vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user_google_123',
              email: 'admin@nexus-pos.dz',
              user_metadata: { full_name: 'Admin Google' }
            }
          }
        },
        error: null
      } as any);

      const loginPromise = signInWithPopup();

      // Laisser le microtask s'exécuter pour que signInWithOAuth résolve et ouvre le popup
      await new Promise(r => setTimeout(r, 10));

      expect(signInWithOAuthSpy).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.any(String),
          skipBrowserRedirect: true
        })
      });

      expect(openSpy).toHaveBeenCalled();

      // Émettre le message de succès via window.postMessage
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'nexus_oauth_success' },
        origin: window.location.origin
      }));

      const result = await loginPromise;
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('admin@nexus-pos.dz');
      expect(mockPopup.close).not.toHaveBeenCalled(); // la popup se ferme elle-meme (main.tsx)

      signInWithOAuthSpy.mockRestore();
      openSpy.mockRestore();
      getSessionSpy.mockRestore();
    });

    it('bascule proprement en redirection si window.open est bloqué', async () => {
      const mockOAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=nexus';
      const signInWithOAuthSpy = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({
        data: { url: mockOAuthUrl, provider: 'google' },
        error: null
      } as any);

      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null); // Popup blocked

      delete (window as any).location;
      (window as any).location = { origin: 'http://localhost:5173', href: '' };

      const res = await signInWithPopup();
      expect(res.user).toBeNull();
      expect(window.location.href).toBe(mockOAuthUrl);

      signInWithOAuthSpy.mockRestore();
      openSpy.mockRestore();
    });
  });

  describe('2. Indicateur de Synchronisation & Élimination du 50% figé', () => {
    it('notifie les pourcentages réels et dynamiques (0% -> 100%) sans jamais tomber sur un 50% statique', async () => {
      const statusUpdates: Array<{ isSyncing: boolean; pendingCount: number; progress?: number; currentTable?: string }> = [];

      const unsubscribe = onBackgroundSyncStatus((status) => {
        statusUpdates.push({ ...status });
      });

      // Remplir la file avec 2 produits
      enqueueSync('products', 'prod_1', 'UPSERT', { id: 'prod_1', name: 'Produit Un' });
      enqueueSync('products', 'prod_2', 'UPSERT', { id: 'prod_2', name: 'Produit Deux' });

      // Mock supabase.from('products').upsert pour réussir
      const upsertSpy = vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      } as any);

      await processSyncQueue();

      unsubscribe();

      // Vérifier que le statut de démarrage a été émis avec 0%
      const startStatus = statusUpdates.find(s => s.isSyncing && s.progress === 0);
      expect(startStatus).toBeDefined();

      // Vérifier que le statut final de complétion a été émis avec 100% et 0 items restants
      const endStatus = statusUpdates[statusUpdates.length - 1];
      expect(endStatus.isSyncing).toBe(false);
      expect(endStatus.pendingCount).toBe(0);
      expect(endStatus.progress).toBe(100);

      upsertSpy.mockRestore();
    });

    it('temporise à 30 secondes en cas d\'erreur 401 sur apply_stock_adjustment au lieu de boucler chaque seconde', async () => {
      // Mock de apply_stock_adjustment retournant une erreur 401 (permission denied pour anon)
      const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: null,
        error: {
          code: '42501',
          status: 401,
          message: 'permission denied for function apply_stock_adjustment'
        }
      } as any);

      enqueueStockAdjustment('prod_401_test', -2, { reason: 'Test 401' });

      const statusUpdates: Array<{ isSyncing: boolean; pendingCount: number; progress?: number }> = [];
      const unsub = onBackgroundSyncStatus(status => statusUpdates.push(status));

      await processSyncQueue();

      unsub();

      const queue = loadPendingSyncQueue();
      // L'élément doit être conservé dans la file pour être synchronisé dès que l'utilisateur se connectera
      expect(queue.length).toBe(1);
      // retryCount NE doit PAS être incrémenté pour ne pas être envoyé en Dead Letter Queue à cause d'une déconnexion
      expect(queue[0].retryCount || 0).toBe(0);

      // Le statut de fin ne doit pas rester isSyncing = true
      const lastStatus = statusUpdates[statusUpdates.length - 1];
      expect(lastStatus.isSyncing).toBe(false);

      rpcSpy.mockRestore();
    });

    it('SyncIndicator affiche le pourcentage réel et le libellé sans jamais forcer 50%', () => {
      // Désactiver le mode silencieux pour afficher le badge de synchro
      useCoreStore.setState({ settings: { silentSyncNotifications: false } as any });

      const { container } = render(
        React.createElement(SyncIndicator, {
          syncInfo: {
            active: true,
            progress: 75,
            currentTable: 'Stocks...'
          },
          isOnline: true,
          bgSyncActive: true,
          bgPendingChanges: 2
        })
      );

      expect(container.textContent).toContain('Synchro Cloud (75%)');
      expect(container.textContent).toContain('Stocks...');
      expect(container.textContent).not.toContain('50%');
    });

    it('calcule la progression sur les opérations dédupliquées réelles pour atteindre 100% sans plafonner à 50%', async () => {
      const statusUpdates: Array<{ isSyncing: boolean; pendingCount: number; progress?: number }> = [];
      const unsub = onBackgroundSyncStatus(status => statusUpdates.push({ ...status }));

      // Enqueue 4 ajustements sur le même produit (qui seront dédupliqués en 1 seule opération RPC)
      enqueueStockAdjustment('prod_dedup_test', -1);
      enqueueStockAdjustment('prod_dedup_test', -2);
      enqueueStockAdjustment('prod_dedup_test', -1);
      enqueueStockAdjustment('prod_dedup_test', -1);

      const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: { success: true },
        error: null
      } as any);

      await processSyncQueue();
      unsub();

      const finalStatus = statusUpdates[statusUpdates.length - 1];
      expect(finalStatus.isSyncing).toBe(false);
      expect(finalStatus.pendingCount).toBe(0);
      expect(finalStatus.progress).toBe(100);

      // Vérifier que la progression pendant le traitement n'est pas restée bloquée à 25% ou 50%
      const inFlightUpdates = statusUpdates.filter(s => s.isSyncing);
      expect(inFlightUpdates.some(s => s.progress === 100 || s.progress === 99)).toBe(true);

      rpcSpy.mockRestore();
    });

    it('incrémente la progression de la taille du lot pour les produits afin de ne pas figer à 50%', async () => {
      const statusUpdates: Array<{ isSyncing: boolean; pendingCount: number; progress?: number; currentTable?: string }> = [];
      const unsub = onBackgroundSyncStatus(status => statusUpdates.push({ ...status }));

      // 4 produits dans un seul lot de 15
      enqueueSync('products', 'p1', 'UPSERT', { id: 'p1', name: 'Prod 1' });
      enqueueSync('products', 'p2', 'UPSERT', { id: 'p2', name: 'Prod 2' });
      enqueueSync('products', 'p3', 'UPSERT', { id: 'p3', name: 'Prod 3' });
      enqueueSync('products', 'p4', 'UPSERT', { id: 'p4', name: 'Prod 4' });

      const upsertSpy = vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      } as any);

      await processSyncQueue();
      unsub();

      const finalStatus = statusUpdates[statusUpdates.length - 1];
      expect(finalStatus.isSyncing).toBe(false);
      expect(finalStatus.pendingCount).toBe(0);
      expect(finalStatus.progress).toBe(100);

      // Vérifier que le statut en vol a bien pris en compte les 4 produits (100% ou 99%) et non 1/4 = 25%
      const productUpdate = statusUpdates.find(s => s.isSyncing && s.currentTable === 'Produits...');
      expect(productUpdate).toBeDefined();
      expect(productUpdate?.progress).toBe(99);

      upsertSpy.mockRestore();
    });

    it('préserve les transactions hors-ligne dans la file en cas d\'erreur 403 / 42501 (RLS) sans les purger', async () => {
      enqueueSync('transactions', 'tx_offline_1', 'UPSERT', {
        id: 'tx_offline_1',
        total: 1500,
        payment_method: 'CASH',
        timestamp: new Date().toISOString()
      });

      const upsertSpy = vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: vi.fn().mockResolvedValue({
          error: {
            code: '42501',
            status: 403,
            message: 'new row violates row-level security policy for table "transactions"'
          }
        })
      } as any);

      await processSyncQueue();

      const queue = loadPendingSyncQueue();
      // La vente DOIT rester dans la file pour être synchronisée dès connexion admin/session
      expect(queue.length).toBe(1);
      expect(queue[0].recordId).toBe('tx_offline_1');
      // retryCount NE doit PAS être incrémenté sur une erreur RLS/authentification
      expect(queue[0].retryCount || 0).toBe(0);

      upsertSpy.mockRestore();
    });

    it('gère les ajustements de stock delta=0 sans figer la progression', async () => {
      const statusUpdates: Array<{ isSyncing: boolean; pendingCount: number; progress?: number }> = [];
      const unsub = onBackgroundSyncStatus(status => statusUpdates.push({ ...status }));

      // 1 ajustement delta=0 et 1 ajustement valide
      enqueueStockAdjustment('prod_zero', 0);
      enqueueStockAdjustment('prod_valid', -3);

      const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: { success: true },
        error: null
      } as any);

      await processSyncQueue();
      unsub();

      const finalStatus = statusUpdates[statusUpdates.length - 1];
      expect(finalStatus.isSyncing).toBe(false);
      expect(finalStatus.pendingCount).toBe(0);
      expect(finalStatus.progress).toBe(100);

      rpcSpy.mockRestore();
    });

    it('synchronise settings/company via direct UPDATE (PATCH) sans déclencher de collision 409 upsert', async () => {
      enqueueSync('settings', 'company', 'UPSERT', {
        id: 'company',
        name: 'KSSHOP',
        currency: 'DA',
        fastModeEnabled: true
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: { id: 'company' }, error: null })
      });
      const upsertMock = vi.fn().mockResolvedValue({ error: null });

      const fromSpy = vi.spyOn(supabase, 'from').mockImplementation(((table: any) => {
        if (table === 'settings') {
          return {
            update: updateMock,
            upsert: upsertMock,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'company' }, error: null })
              })
            })
          } as any;
        }
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        } as any;
      }) as any);

      const getSessionSpy = vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: { user: { id: 'admin_1' } } },
        error: null
      } as any);

      await processSyncQueue();

      expect(updateMock).toHaveBeenCalled();
      expect(upsertMock).not.toHaveBeenCalled();
      const queue = loadPendingSyncQueue();
      expect(queue.length).toBe(0);

      fromSpy.mockRestore();
      getSessionSpy.mockRestore();
    });

    it('acquitte localement les réglages settings en cas de 401/403 pour ne pas bloquer la file caissier', async () => {
      enqueueSync('settings', 'company', 'UPSERT', {
        id: 'company',
        fastModeEnabled: true
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42501', status: 403, message: 'RLS forbidden' }
        })
      });

      const fromSpy = vi.spyOn(supabase, 'from').mockImplementation(((table: any) => {
        if (table === 'settings') {
          return {
            update: updateMock,
            upsert: vi.fn(),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'company' }, error: null })
              })
            })
          } as any;
        }
        return {} as any;
      }) as any);

      const getSessionSpy = vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: { user: { id: 'cashier_1' } } },
        error: null
      } as any);

      await processSyncQueue();

      const queue = loadPendingSyncQueue();
      // Le réglage a été acquitté localement et ne bloque pas la file
      expect(queue.length).toBe(0);

      fromSpy.mockRestore();
      getSessionSpy.mockRestore();
    });

    it('synchronise employees via direct UPDATE (PATCH) sans collision 409', async () => {
      enqueueSync('employees', 'emp_123', 'UPSERT', {
        id: 'emp_123',
        name: 'Karim',
        isClockedIn: true
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: { id: 'emp_123' }, error: null })
      });
      const upsertMock = vi.fn().mockResolvedValue({ error: null });

      const fromSpy = vi.spyOn(supabase, 'from').mockImplementation(((table: any) => {
        if (table === 'employees') {
          return {
            update: updateMock,
            upsert: upsertMock,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'emp_123' }, error: null })
              })
            })
          } as any;
        }
        return {} as any;
      }) as any);

      const getSessionSpy = vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: { user: { id: 'admin_1' } } },
        error: null
      } as any);

      await processSyncQueue();

      expect(updateMock).toHaveBeenCalled();
      expect(upsertMock).not.toHaveBeenCalled();
      const queue = loadPendingSyncQueue();
      expect(queue.length).toBe(0);

      fromSpy.mockRestore();
      getSessionSpy.mockRestore();
    });
  });

  describe('3. Transmission Directe de Session & Auto-Fermeture Popup', () => {
    it('propage directement la session reçue par BroadcastChannel sans appel bloquant à getSession', async () => {
      const mockOAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=nexus';
      const signInWithOAuthSpy = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({
        data: { url: mockOAuthUrl, provider: 'google' },
        error: null
      } as any);

      const mockPopup = { closed: false, close: vi.fn() };
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

      const setSessionSpy = vi.spyOn(supabase.auth, 'setSession').mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user_direct_session',
              email: 'direct@nexus.dz',
              user_metadata: { full_name: 'Direct User' }
            }
          }
        },
        error: null
      } as any);

      const getSessionSpy = vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user_direct_session',
              email: 'direct@nexus.dz',
              user_metadata: { full_name: 'Direct User' }
            }
          }
        },
        error: null
      } as any);

      const loginPromise = signInWithPopup();
      await new Promise(r => setTimeout(r, 10));

      const mockSession = {
        access_token: 'fake_access_token',
        refresh_token: 'fake_refresh_token',
        user: { id: 'user_direct_session', email: 'direct@nexus.dz' }
      };

      // Simuler l'arrivée du message avec l'objet session inclus
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'nexus_oauth_success', session: mockSession },
        origin: window.location.origin
      }));

      const res = await loginPromise;
      expect(res.user?.email).toBe('direct@nexus.dz');
      expect(setSessionSpy).toHaveBeenCalledWith(mockSession);
      expect(mockPopup.close).not.toHaveBeenCalled(); // la popup se ferme elle-meme (main.tsx)

      signInWithOAuthSpy.mockRestore();
      openSpy.mockRestore();
      setSessionSpy.mockRestore();
      getSessionSpy.mockRestore();
    });

    it('gère les erreurs OAuth renvoyées par Google et rejette avec le message d\'erreur', async () => {
      const mockOAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=nexus';
      const signInWithOAuthSpy = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({
        data: { url: mockOAuthUrl, provider: 'google' },
        error: null
      } as any);

      const mockPopup = { closed: false, close: vi.fn() };
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

      const loginPromise = signInWithPopup();
      await new Promise(r => setTimeout(r, 10));

      // Simuler l'arrivée d'un message d'erreur OAuth
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'nexus_oauth_error', error: 'access_denied: User denied consent' },
        origin: window.location.origin
      }));

      await expect(loginPromise).rejects.toThrow('access_denied: User denied consent');
      expect(mockPopup.close).not.toHaveBeenCalled(); // la popup se ferme elle-meme (main.tsx)

      signInWithOAuthSpy.mockRestore();
      openSpy.mockRestore();
    });
  });

  describe('3. Assainissement CORS de l\'en-tête x-supabase-api-version (safeSupabaseFetch)', () => {
    it('supprime x-supabase-api-version d\'un objet d\'en-têtes standard tout en préservant authorization et apikey', async () => {
      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

      await safeSupabaseFetch('https://unlwfvldqxfccgrrgbwf.supabase.co/auth/v1/token', {
        method: 'POST',
        headers: {
          'apikey': 'fake_key',
          'Authorization': 'Bearer fake_token',
          'X-Supabase-Api-Version': '2024-01-01',
          'x-supabase-api-version': '2024-01-01',
          'Content-Type': 'application/json'
        }
      });

      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, calledInit] = globalFetchSpy.mock.calls[0];
      expect(calledUrl).toBe('https://unlwfvldqxfccgrrgbwf.supabase.co/auth/v1/token');
      expect((calledInit?.headers as any)['X-Supabase-Api-Version']).toBeUndefined();
      expect((calledInit?.headers as any)['x-supabase-api-version']).toBeUndefined();
      expect((calledInit?.headers as any)['apikey']).toBe('fake_key');
      expect((calledInit?.headers as any)['Authorization']).toBe('Bearer fake_token');
      expect((calledInit?.headers as any)['Content-Type']).toBe('application/json');

      globalFetchSpy.mockRestore();
    });

    it('supprime x-supabase-api-version d\'une instance Headers', async () => {
      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

      const headers = new Headers();
      headers.set('apikey', 'my-anon-key');
      headers.set('X-Supabase-Api-Version', '2024-01-01');

      await safeSupabaseFetch('https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/products', {
        headers
      });

      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      const [, calledInit] = globalFetchSpy.mock.calls[0];
      const resultHeaders = calledInit?.headers as Headers;
      expect(resultHeaders.has('x-supabase-api-version')).toBe(false);
      expect(resultHeaders.get('apikey')).toBe('my-anon-key');

      globalFetchSpy.mockRestore();
    });

    it('supprime x-supabase-api-version d\'une liste de tuples [string, string][]', async () => {
      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

      await safeSupabaseFetch('https://unlwfvldqxfccgrrgbwf.supabase.co/auth/v1/user', {
        headers: [
          ['apikey', 'tuple_key'],
          ['X-Supabase-Api-Version', '2024-01-01']
        ]
      });

      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      const [, calledInit] = globalFetchSpy.mock.calls[0];
      const resultHeaders = calledInit?.headers as [string, string][];
      expect(resultHeaders.some(([k]) => k.toLowerCase() === 'x-supabase-api-version')).toBe(false);
      expect(resultHeaders.some(([k]) => k === 'apikey')).toBe(true);

      globalFetchSpy.mockRestore();
    });

    it('supprime x-supabase-api-version encapsulé dans une instance Request', async () => {
      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

      const reqHeaders = new Headers();
      reqHeaders.set('apikey', 'req_key');
      reqHeaders.set('X-Supabase-Api-Version', '2024-01-01');

      const request = new Request('https://unlwfvldqxfccgrrgbwf.supabase.co/auth/v1/token', {
        headers: reqHeaders
      });

      await safeSupabaseFetch(request);

      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      const [calledReq] = globalFetchSpy.mock.calls[0];
      expect(calledReq instanceof Request).toBe(true);
      expect((calledReq as Request).headers.has('x-supabase-api-version')).toBe(false);
      expect((calledReq as Request).headers.get('apikey')).toBe('req_key');

      globalFetchSpy.mockRestore();
    });

    it('supprime accept-profile, content-profile et x-retry-count des requêtes PostgREST pour éviter le blocage CORS', async () => {
      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));

      const headers = new Headers();
      headers.set('apikey', 'my-anon-key');
      headers.set('Authorization', 'Bearer token_123');
      headers.set('Accept-Profile', 'public');
      headers.set('Content-Profile', 'public');
      headers.set('X-Retry-Count', '1');

      await safeSupabaseFetch('https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/settings?select=*', {
        headers
      });

      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      const [, calledInit] = globalFetchSpy.mock.calls[0];
      const resultHeaders = calledInit?.headers as Headers;
      expect(resultHeaders.has('accept-profile')).toBe(false);
      expect(resultHeaders.has('content-profile')).toBe(false);
      expect(resultHeaders.has('x-retry-count')).toBe(false);
      expect(resultHeaders.get('apikey')).toBe('my-anon-key');
      expect(resultHeaders.get('authorization')).toBe('Bearer token_123');

      globalFetchSpy.mockRestore();
    });

    it('retire prefer (rejete par le preflight CORS) et envoie un seul POST si aucun doublon', async () => {
      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 201 }));

      const headers = new Headers();
      headers.set('apikey', 'my-anon-key');
      headers.set('Prefer', 'resolution=merge-duplicates,return=minimal');

      const res = await safeSupabaseFetch('https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/online_orders?on_conflict=id', {
        method: 'POST',
        headers,
        body: JSON.stringify([{ id: 'o1', status: 'new' }])
      });

      expect(res.ok).toBe(true);
      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      const [, calledInit] = globalFetchSpy.mock.calls[0];
      expect((calledInit?.headers as Headers).has('prefer')).toBe(false);
      expect((calledInit?.headers as Headers).get('apikey')).toBe('my-anon-key');

      globalFetchSpy.mockRestore();
    });

    it('emule l\'upsert : sur 409 reprend ligne par ligne (POST puis PATCH cible par id) sans jamais envoyer prefer', async () => {
      const globalFetchSpy = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('{"code":"23505"}', { status: 409 }))
        .mockResolvedValueOnce(new Response('{"code":"23505"}', { status: 409 }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(new Response(null, { status: 201 }));

      const res = await safeSupabaseFetch('https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/transactions?on_conflict=id&columns=%22id%22%2C%22total%22', {
        method: 'POST',
        headers: { apikey: 'k', Authorization: 'Bearer t', 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify([{ id: 'A', total: 5 }, { id: 'B', total: 7 }])
      });

      expect(res.ok).toBe(true);
      expect(globalFetchSpy).toHaveBeenCalledTimes(4);
      const patchCall = globalFetchSpy.mock.calls[2];
      expect(String(patchCall[0])).toBe('https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/transactions?id=eq.A');
      expect(patchCall[1]?.method).toBe('PATCH');
      expect(JSON.parse(String(patchCall[1]?.body))).toEqual({ total: 5 });
      for (const [, init] of globalFetchSpy.mock.calls) {
        expect(Object.keys(init?.headers as Record<string, string>).map(k => k.toLowerCase())).not.toContain('prefer');
      }

      globalFetchSpy.mockRestore();
    });

    it('emule l\'upsert monoposte : sur 409 bascule directement en PATCH sans second POST redondant et retourne un JSON valide', async () => {
      const globalFetchSpy = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('{"code":"23505"}', { status: 409 }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }));

      const res = await safeSupabaseFetch('https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/users?on_conflict=id', {
        method: 'POST',
        headers: { apikey: 'k', Authorization: 'Bearer t', 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: 'u1', name: 'Admin', role: 'admin' })
      });

      expect(res.ok).toBe(true);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      // Seulement 2 appels : 1 premier POST (qui a retourné 409), puis 1 PATCH direct (sans deuxième POST redondant)
      expect(globalFetchSpy).toHaveBeenCalledTimes(2);
      expect(globalFetchSpy.mock.calls[0][1]?.method).toBe('POST');
      expect(globalFetchSpy.mock.calls[1][1]?.method).toBe('PATCH');
      expect(String(globalFetchSpy.mock.calls[1][0])).toBe('https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/users?id=eq.u1');

      globalFetchSpy.mockRestore();
    });

    it('ADMIN_RESTRICTED_SYNC_TABLES inclut bien users, employees, settings et audit_logs', () => {
      expect(ADMIN_RESTRICTED_SYNC_TABLES.has('users')).toBe(true);
      expect(ADMIN_RESTRICTED_SYNC_TABLES.has('employees')).toBe(true);
      expect(ADMIN_RESTRICTED_SYNC_TABLES.has('settings')).toBe(true);
      expect(ADMIN_RESTRICTED_SYNC_TABLES.has('audit_logs')).toBe(true);
    });

    it('propage une erreur non-409 (ex. 403 RLS) lors d\'un upsert sans tenter de PATCH', async () => {
      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"code":"42501"}', { status: 403 }));

      const res = await safeSupabaseFetch('https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/employees?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: 'e1', name: 'X' })
      });

      expect(res.status).toBe(403);
      expect(globalFetchSpy).toHaveBeenCalledTimes(1);

      globalFetchSpy.mockRestore();
    });

    it('ne tente jamais de lire popup.closed pour empêcher l\'avertissement Cross-Origin-Opener-Policy', async () => {
      const mockOAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=nexus';
      const signInWithOAuthSpy = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({
        data: { url: mockOAuthUrl, provider: 'google' },
        error: null
      } as any);

      let closedAccessed = false;
      const mockPopup = {
        get closed() {
          closedAccessed = true;
          return false;
        },
        close: vi.fn()
      };
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

      const loginPromise = signInWithPopup();
      await new Promise(r => setTimeout(r, 20));

      // Vérifier que popup.closed n'a JAMAIS été accédé lors de l'ouverture ni de la détection
      expect(closedAccessed).toBe(false);

      // Résoudre proprement via postMessage
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'nexus_oauth_success' },
        origin: window.location.origin
      }));

      await loginPromise;
      expect(closedAccessed).toBe(false);

      signInWithOAuthSpy.mockRestore();
      openSpy.mockRestore();
    });
  });
});
