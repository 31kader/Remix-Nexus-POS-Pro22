import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database.types';
import { realtimeCircuitBreaker, getSafeWebSocketTransport } from './services/RealtimeCircuitBreaker';
import { BLOCKED_CORS_HEADERS, safeSupabaseFetch } from './lib/supabase/corsFetchFilter';
import { deleteImageFromStorage, uploadImageBlob } from './lib/supabase/storageHelpers';
import { 
  safeSubscribeChannel as baseSubscribeChannel, 
  disconnectRealtime as baseDisconnectRealtime, 
  reconnectRealtime as baseReconnectRealtime, 
  removeChannelByName as baseRemoveChannelByName, 
  safeRemoveChannel as baseRemoveChannel 
} from './lib/supabase/realtimeChannelHelpers';

export { realtimeCircuitBreaker, BLOCKED_CORS_HEADERS, safeSupabaseFetch };

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
 * Fonctions Realtime déléguées
 */
export const safeSubscribeChannel = (channel: any, callback?: (status: string, err?: any) => void) => {
  return baseSubscribeChannel(supabase, channel, callback);
};

export const disconnectRealtime = async (): Promise<void> => {
  return baseDisconnectRealtime(supabase);
};

export const reconnectRealtime = (): void => {
  baseReconnectRealtime();
};

export const removeChannelByName = (channelName: string) => {
  return baseRemoveChannelByName(supabase, channelName);
};

export const safeRemoveChannel = (channelOrName: any) => {
  return baseRemoveChannel(supabase, channelOrName);
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
 * Fonctions Storage déléguées
 */
export async function deleteImageFromStorageByUrl(url: string): Promise<void> {
  return deleteImageFromStorage(supabase, url);
}

export async function uploadImageBlobToStorage(
  blob: Blob,
  bucketName: string,
  contentType: string = 'image/webp'
): Promise<string | null> {
  return uploadImageBlob(supabase, blob, bucketName, contentType);
}
