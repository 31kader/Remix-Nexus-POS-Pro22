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
  'prefer',
  'x-upsert',
  'x-metadata'
]);

export const readPreferValue = (input: RequestInfo | URL, init?: RequestInit): string => {
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

export const cleanHeadersInstance = (headers: Headers) => {
  for (const name of BLOCKED_CORS_HEADERS) {
    try {
      headers.delete(name);
    } catch (_) {}
  }
};

export const cleanHeadersArray = (headers: [string, string][]): [string, string][] => {
  return headers.filter(([key]) => !BLOCKED_CORS_HEADERS.has(key.toLowerCase()));
};

export const cleanHeadersRecord = (headers: Record<string, string>): Record<string, string> => {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (!BLOCKED_CORS_HEADERS.has(k.toLowerCase()) && v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
};

/**
 * Émule `Prefer: resolution=merge-duplicates` sans envoyer l'en-tête Prefer :
 * 1. POST du lot tel quel (INSERT) ; 2. si 409 (doublon), reprise ligne par ligne :
 * POST, puis PATCH `?<clé>=eq.<valeur>` si la ligne existe déjà.
 */
export const emulateUpsert = async (
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
    delete patchBody.isUpdate;

    // Assainissement auth_uid : supprimer les chaînes vides ou invalides qui violent les index uniques PostgreSQL
    if (patchBody.auth_uid !== undefined && (typeof patchBody.auth_uid !== 'string' || !patchBody.auth_uid.trim() || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patchBody.auth_uid))) {
      delete patchBody.auth_uid;
    }

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
    try { await patched.text(); } catch (_) {}
  }
  return new Response('[]', { status: 201, headers: { 'Content-Type': 'application/json' } });
};

/**
 * Custom Fetch wrapper pour le client Supabase.
 * Supprime systématiquement tous les en-têtes non autorisés par la configuration CORS de Supabase,
 * évitant ainsi le blocage preflight OPTIONS (net::ERR_FAILED) et garantissant le bon fonctionnement
 * de toutes les requêtes de base de données.
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
