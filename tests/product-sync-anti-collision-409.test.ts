import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeSupabaseFetch } from '../src/supabase';

describe('🛡️ Anti-Collision 409 & Durcissement emulateUpsert pour les Produits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. emulateUpsert bascule directement sur PATCH sur un produit existant sans second POST 409', async () => {
    const postCalls: any[] = [];
    const patchCalls: any[] = [];
    const getCalls: any[] = [];

    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      const method = (init?.method || 'GET').toUpperCase();

      if (method === 'POST') {
        postCalls.push({ url: urlStr, body: init?.body });
        // Simuler le rejet 409 de PostgreSQL (unique constraint violation products_pkey)
        return new Response(JSON.stringify({
          code: '23505',
          message: 'duplicate key value violates unique constraint "products_pkey"'
        }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }

      if (method === 'GET') {
        getCalls.push({ url: urlStr });
        // Simuler la présence de la ressource en DB
        return new Response(JSON.stringify([{ id: 'nyhzsaxkg' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (method === 'PATCH') {
        patchCalls.push({ url: urlStr, body: init?.body });
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('[]', { status: 200 });
    });

    const targetUrl = 'https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/products?on_conflict=id';
    const rowPayload = [{ id: 'nyhzsaxkg', name: 'COMPOTE POMME', barcode: '6130760000560' }];

    const res = await safeSupabaseFetch(targetUrl, {
      method: 'POST',
      headers: {
        'apikey': 'test-anon-key',
        'Authorization': 'Bearer test-anon-key',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(rowPayload)
    }, mockFetch as any);

    // Vérifier que la réponse finale est un succès (201 émulé)
    expect(res.status).toBe(201);

    // Vérifier qu'un seul POST a été tenté (le POST initial) et AUCUN deuxième POST voué au 409
    expect(postCalls.length).toBe(1);

    // Vérifier qu'un PATCH a bien été appliqué avec la condition id=eq.nyhzsaxkg
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0].url).toContain('id=eq.nyhzsaxkg');
    const patchBody = JSON.parse(patchCalls[0].body);
    expect(patchBody.name).toBe('COMPOTE POMME');
    expect(patchBody.barcode).toBe('6130760000560');
    expect(patchBody.id).toBeUndefined(); // L'ID doit être retiré du corps du PATCH
  });

  it('2. emulateUpsert sur un lot multi-lignes ne tente aucun POST pour les lignes déjà existantes', async () => {
    const postCalls: any[] = [];
    const patchCalls: any[] = [];

    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      const method = (init?.method || 'GET').toUpperCase();

      if (method === 'POST') {
        postCalls.push({ url: urlStr, body: init?.body });
        if (postCalls.length === 1 || String(init?.body).includes('id-1')) {
          return new Response(JSON.stringify({ code: '23505' }), { status: 409 });
        }
        return new Response('[]', { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      if (method === 'GET') {
        // id-1 existe, id-2 n'existe pas
        if (urlStr.includes('id-1')) {
          return new Response(JSON.stringify([{ id: 'id-1' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (method === 'PATCH') {
        patchCalls.push({ url: urlStr, body: init?.body });
        return new Response('[]', { status: 200 });
      }

      return new Response('[]', { status: 200 });
    });

    const targetUrl = 'https://unlwfvldqxfccgrrgbwf.supabase.co/rest/v1/products?on_conflict=id';
    const batchPayload = [
      { id: 'id-1', name: 'Produit Existant' },
      { id: 'id-2', name: 'Nouveau Produit' }
    ];

    await safeSupabaseFetch(targetUrl, {
      method: 'POST',
      headers: {
        'apikey': 'test-key',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(batchPayload)
    }, mockFetch as any);

    // postCalls[0] : le POST initial du lot complet (2 lignes) qui échoue en 409
    // postCalls[1] : tentative sur id-1 qui échoue en 409 (reprise par PATCH)
    // postCalls[2] : tentative sur id-2 qui réussit en 201
    expect(postCalls.length).toBe(3);
    expect(postCalls[1].body).toContain('id-1');
    expect(postCalls[2].body).toContain('id-2');

    // patchCalls[0] : appliqué pour id-1
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0].url).toContain('id=eq.id-1');
  });
});
