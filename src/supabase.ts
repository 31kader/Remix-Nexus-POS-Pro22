import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database.types';
import { compressImage } from './lib/image-optimizer';
import { seedLocalImageCache } from './services/imageCache';
import { realtimeCircuitBreaker, getSafeWebSocketTransport } from './services/RealtimeCircuitBreaker';

export { realtimeCircuitBreaker };

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || '';
const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = (() => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const url = new URL(SUPABASE_URL);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return true;
  } catch (e) {
    return false;
  }
})();

/**
 * Liste exhaustive des en-têtes non autorisés par la stratégie CORS de Supabase/Kong
 * lors des requêtes preflight OPTIONS émises depuis des origines Web/localhost :
 * - 'x-supabase-api-version' (injecté par @supabase/auth-js)
 * - 'accept-profile' (injecté par @supabase/postgrest-js sur les requêtes GET/HEAD)
 * - 'content-profile' (injecté par @supabase/postgrest-js sur POST/PUT/PATCH/DELETE)
 * - 'x-retry-count' (injecté par @supabase/postgrest-js lors des réessais)
 * - 'traceparent', 'tracestate', 'baggage' (télémétrie W3C)
 * - 'prefer' (injecté par postgrest-js sur upsert/insert/update) : rejeté par le preflight dans
 *   le navigateur ; les upserts sont donc émulés côté client (voir emulateUpsert).
 */
export const BLOCKED_CORS_HEADERS = new Set([
  'x-supabase-api-version',
  'accept-profile',
  'content-profile',
  'x-retry-count',
  'traceparent',
  'tracestate',
  'baggage',
  'prefer'
]);

const readPreferValue = (input: RequestInfo | URL, init?: RequestInit): string => {
  try {
    const h = init?.headers;
    if (h) {
      if (typeof Headers !== 'undefined' && h instanceof Headers) return h.get('prefer') || '';
      if (Array.isArray(h)) return (h as [string, string][]).find(([k]) => k.toLowerCase() === 'prefer')?.[1] || '';
      for (const [k, v] of Object.entries(h as Record<string, string>)) {
        if (k.toLowerCase() === 'prefer') return String(v || '');
      }
    }
    if (typeof Request !== 'undefined' && input instanceof Request) return input.headers.get('prefer') || '';
  } catch (_) {}
  return '';
};

/**
 * Émule `Prefer: resolution=merge-duplicates` sans envoyer l'en-tête Prefer :
 * 1. POST du lot tel quel (INSERT) ; 2. si 409 (doublon), reprise ligne par ligne :
 * POST, puis PATCH `?<clé>=eq.<valeur>` si la ligne existe déjà.
 */
const emulateUpsert = async (
  customFetch: typeof fetch,
  url: string,
  cleanInit: RequestInit,
  ignoreDuplicates: boolean
): Promise<Response> => {
  const first = await customFetch(url, cleanInit);
  if (first.status !== 409) return first;

  let rows: any[];
  try {
    const parsed = JSON.parse(String(cleanInit.body));
    rows = Array.isArray(parsed) ? parsed : [parsed];
  } catch (_) {
    return first;
  }
  // Draine le corps de la réponse 409 sans avorter le contrôleur de flux
  try { await first.text(); } catch (_) {}

  const parsedUrl = new URL(url);
  const conflictCols = (parsedUrl.searchParams.get('on_conflict') || 'id').split(',').map(c => c.trim()).filter(Boolean);
  const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;

  // Détacher le signal d'origine qui a pu être consommé ou avorté par le premier POST
  const { signal: _discardedSignal, ...patchBaseInit } = cleanInit;

  for (const row of rows) {
    if (rows.length > 1) {
      const single = await customFetch(url, { ...patchBaseInit, body: JSON.stringify(row) });
      if (single.ok) continue;
      if (single.status !== 409) return single;
      try { await single.text(); } catch (_) {}
    }
    if (ignoreDuplicates) continue;

    const filter = conflictCols.map(c => `${encodeURIComponent(c)}=eq.${encodeURIComponent(String(row?.[c]))}`).join('&');
    const patchBody: Record<string, any> = { ...row };
    conflictCols.forEach(c => delete patchBody[c]);
    delete patchBody.created_at;

    const patchHeaders = new Headers(patchBaseInit.headers);
    cleanHeadersInstance(patchHeaders);
    patchHeaders.set('Content-Type', 'application/json');

    const patched = await customFetch(`${baseUrl}?${filter}`, {
      ...patchBaseInit,
      method: 'PATCH',
      headers: patchHeaders,
      body: JSON.stringify(patchBody)
    });
    if (!patched.ok) {
      console.warn(`[emulateUpsert] PATCH repli sur ${baseUrl}?${filter} code ${patched.status}`);
      return patched;
    }
  }
  return new Response('[]', { status: 201, headers: { 'Content-Type': 'application/json' } });
};

const cleanHeadersInstance = (headers: Headers) => {
  for (const name of BLOCKED_CORS_HEADERS) {
    try {
      headers.delete(name);
    } catch (_) {}
  }
};

const cleanHeadersArray = (headers: [string, string][]): [string, string][] => {
  return headers.filter(([key]) => !BLOCKED_CORS_HEADERS.has(key.toLowerCase()));
};

const cleanHeadersRecord = (headers: Record<string, string>): Record<string, string> => {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (!BLOCKED_CORS_HEADERS.has(k.toLowerCase()) && v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
};

/**
 * Custom Fetch wrapper pour le client Supabase.
 * Supprime systématiquement tous les en-têtes non autorisés par la configuration CORS de Supabase,
 * évitant ainsi le blocage preflight OPTIONS (net::ERR_FAILED) et garantissant le bon fonctionnement
 * de toutes les requêtes de base de données (settings, employees, products, cart_drafts, etc.).
 * Les upserts (POST ?on_conflict + Prefer: resolution=...) sont émulés sans l'en-tête Prefer.
 */
export const safeSupabaseFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
  injectedFetch?: typeof fetch
): Promise<Response> => {
  const customFetch = injectedFetch || (typeof fetch !== 'undefined' ? fetch : (globalThis as any).fetch);

  const preferValue = readPreferValue(input, init);
  const method = String(init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
  const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : ((input as Request)?.url || ''));
  const mergeMode = /resolution=merge-duplicates/i.test(preferValue);
  const ignoreMode = /resolution=ignore-duplicates/i.test(preferValue);
  const isUpsert =
    method === 'POST' &&
    (mergeMode || ignoreMode) &&
    (typeof input === 'string' || input instanceof URL) &&
    urlStr.includes('/rest/v1/') &&
    /[?&]on_conflict=/.test(urlStr) &&
    typeof init?.body === 'string';

  let finalInput = input;
  let finalInit = init ? { ...init } : undefined;

  // 1. Filtrer les en-têtes dans init.headers si fournis
  if (finalInit?.headers) {
    if (typeof Headers !== 'undefined' && finalInit.headers instanceof Headers) {
      finalInit.headers = new Headers(finalInit.headers);
      cleanHeadersInstance(finalInit.headers);
    } else if (Array.isArray(finalInit.headers)) {
      finalInit.headers = cleanHeadersArray(finalInit.headers as [string, string][]);
    } else if (typeof finalInit.headers === 'object') {
      finalInit.headers = cleanHeadersRecord(finalInit.headers as Record<string, string>);
    }
  }

  // 2. Filtrer les en-têtes dans input s'il s'agit d'une instance Request
  if (typeof Request !== 'undefined' && finalInput instanceof Request) {
    let needsClean = false;
    for (const name of BLOCKED_CORS_HEADERS) {
      try {
        if (finalInput.headers.has(name) || finalInput.headers.has(name.toLowerCase())) {
          needsClean = true;
          break;
        }
      } catch (_) {}
    }

    if (needsClean) {
      const cleanHeaders = new Headers(finalInput.headers);
      cleanHeadersInstance(cleanHeaders);
      finalInput = new Request(finalInput, { headers: cleanHeaders });
    }
  }

  if (isUpsert && finalInit) {
    return emulateUpsert(customFetch, urlStr, finalInit, ignoreMode && !mergeMode);
  }

  return customFetch(finalInput, finalInit);
};

export const supabase = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: {
        schema: undefined as any // Empêche postgrest-js d'injecter accept-profile / content-profile par défaut
      },
      global: {
        fetch: safeSupabaseFetch
      },
      auth: {
        fetch: safeSupabaseFetch
      } as any,
      realtime: {
        timeout: 10000,
        transport: getSafeWebSocketTransport(realtimeCircuitBreaker),
        reconnectAfterMs: (tries: number) => realtimeCircuitBreaker.getReconnectInterval(tries)
      }
    })
  : ({} as any);

if (isSupabaseConfigured && supabase?.realtime) {
  realtimeCircuitBreaker.registerSocketHandlers(
    () => {
      try {
        supabase.realtime.disconnect();
      } catch (_) {}
    },
    () => {
      try {
        supabase.realtime.connect();
      } catch (_) {}
    }
  );
}

// Empêcher le spam de POST /auth/v1/token?grant_type=refresh_token (ERR_NAME_NOT_RESOLVED) lorsque la caisse est hors-ligne
if (isSupabaseConfigured && typeof window !== 'undefined' && supabase?.auth) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    try { supabase.auth.stopAutoRefresh(); } catch (_) {}
  }
  window.addEventListener('offline', () => {
    try { supabase.auth.stopAutoRefresh(); } catch (_) {}
  });
  window.addEventListener('online', () => {
    try { supabase.auth.startAutoRefresh(); } catch (_) {}
  });

  // Nettoyer les résidus de session lors de la déconnexion
  try {
    supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') {
        try {
          sessionStorage.removeItem('nexus_auth_user');
          localStorage.removeItem('nexus_auth_user');
        } catch (_) {}
      }
    });
  } catch (_) {}
}

/**
 * Souscrit en toute sécurité à un canal Supabase Realtime sans jamais déclencher
 * "Uncaught Error: tried to join multiple times. 'join' can only be called a single time per channel instance".
 */
export const safeSubscribeChannel = (channel: any, callback?: (status: string, err?: any) => void) => {
  if (!isSupabaseConfigured || !channel) return channel;
  try {
    if (channel.state === 'joined' || channel.state === 'joining') {
      return channel;
    }
    if (channel.joinedOnce) {
      // Le canal a déjà été joint une première fois : on demande à Phoenix Socket de se reconnecter/rejoindre sans rappeler .join()
      if (typeof supabase?.realtime?.connect === 'function') {
        try { supabase.realtime.connect(); } catch (_) {}
      }
      if (typeof channel.rejoin === 'function') {
        try { channel.rejoin(); } catch (_) {}
      }
      return channel;
    }
    return channel.subscribe(callback);
  } catch (err: any) {
    if (!String(err?.message || '').includes('tried to join multiple times')) {
      console.warn('[Supabase] Channel subscribe warning:', err);
    }
    return channel;
  }
};

export const disconnectRealtime = async (): Promise<void> => {
  if (!isSupabaseConfigured || !supabase?.realtime) return;
  try {
    await supabase.realtime.disconnect();
  } catch (_) {}
};

export const reconnectRealtime = (): void => {
  realtimeCircuitBreaker.reset('manual_request');
};

export const removeChannelByName = (channelName: string) => {
  if (!isSupabaseConfigured) return;
  try {
    const channels = supabase.getChannels();
    const matched = channels.find(
      (c: any) => c.name === channelName || c.topic === `realtime:${channelName}`
    );
    if (matched) {
      supabase.removeChannel(matched).catch(() => {});
    }
  } catch (err) {}
};

export const safeRemoveChannel = (channelOrName: any) => {
  if (!isSupabaseConfigured || !channelOrName) return;
  try {
    if (typeof channelOrName === 'string') {
      removeChannelByName(channelOrName);
    } else {
      if (typeof channelOrName.unsubscribe === 'function') {
        try {
          channelOrName.unsubscribe();
        } catch (_) {}
      }
      supabase.removeChannel(channelOrName).catch(() => {});
    }
  } catch (err) {
    console.warn('[Supabase] Channel cleanup warning:', err);
  }
};

export const serializeError = (err: any): string => {
  if (!err) return 'null';
  if (typeof err === 'object') {
    try {
      const standardKeys = ['message', 'code', 'status', 'details', 'hint'];
      const res: any = {};
      for (const key of standardKeys) {
        if (key in err) res[key] = err[key];
      }
      return JSON.stringify(res, null, 2);
    } catch {
      return String(err);
    }
  }
  return String(err);
};

/**
 * Supprime un fichier image de Supabase Storage lorsqu'il est remplacé ou supprimé d'un produit,
 * afin d'empêcher l'accumulation de fichiers orphelins dans les buckets.
 */
export async function deleteImageFromStorageByUrl(url: string): Promise<void> {
  if (!isSupabaseConfigured || !url || typeof url !== 'string') return;
  try {
    const match = url.match(/\/storage\/v1\/(?:object|render\/image)\/public\/([^/]+)\/([^?]+)/);
    if (!match) return;
    const [, bucketName, filePath] = match;
    if (bucketName && filePath) {
      await supabase.storage.from(bucketName).remove([decodeURIComponent(filePath)]);
    }
  } catch (err) {
    console.warn('[Storage] Impossible de supprimer l’ancienne image:', err);
  }
}

export async function uploadImageBlobToStorage(
  blob: Blob,
  bucketName: string,
  contentType: string = 'image/webp'
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  // Validation stricte du type MIME (Images matricielles uniquement, exclusion de SVG non assaini)
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
  ];

  const mime = (blob.type || contentType || '').toLowerCase().trim();
  if (!mime || !allowedTypes.includes(mime)) {
    console.error(
      `[Storage] Upload bloqué: Type de fichier '${mime || 'inconnu'}' non autorisé. Seules les images matricielles (JPEG, PNG, WebP, GIF, AVIF) sont permises.`
    );
    return null;
  }

  let finalBlob: Blob;
  let finalContentType = 'image/webp';

  // AUTO-OPTIMIZATION ULTRA-LÉGÈRE (360x360 WebP q=0.60 => ~5 à 9 Ko par vignette POS)
  try {
    finalBlob = await compressImage(blob, 360, 360, 0.6);
  } catch (optErr) {
    console.error('[Storage] Compression de sécurité échouée, rejet du blob suspect :', optErr);
    return null; // Échec sécurisé (Fail-closed)
  }

  // File size validation (limit to 5MB)
  if (finalBlob.size > 5 * 1024 * 1024) {
    console.error('[Storage] Upload bloqué: File size exceeds 5MB limit.');
    return null;
  }

  const fileName = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}.webp`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, finalBlob, {
        contentType: finalContentType,
        // Cache HTTP/CDN Cloudflare de 1 an (31 536 000s) pour éliminer le Uncached Storage Egress !
        cacheControl: '31536000',
        upsert: true
      });

    if (uploadError) {
      console.warn(`[Storage] Upload échoué vers bucket '${bucketName}':`, uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    let publicUrl = data?.publicUrl || null;
    if (
      publicUrl &&
      publicUrl.includes('/storage/v1/object/') &&
      !publicUrl.includes('/storage/v1/object/public/')
    ) {
      publicUrl = publicUrl.replace('/storage/v1/object/', '/storage/v1/object/public/');
    }

    // Pré-remplir immédiatement le cache local IndexedDB pour que ce terminal ne retélécharge JAMAIS cette image
    if (publicUrl) {
      await seedLocalImageCache(publicUrl, finalBlob);
    }

    console.log(
      `[Storage] ✅ Image WebP optimisée (${(finalBlob.size / 1024).toFixed(1)} Ko) uploadée avec Cache 1 an: ${publicUrl}`
    );
    return publicUrl;
  } catch (error) {
    console.warn('[Storage] Erreur inattendue:', error);
    return null;
  }
}
