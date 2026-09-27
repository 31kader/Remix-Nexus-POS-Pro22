import { createClient } from '@supabase/supabase-js';
import { compressImage } from './lib/image-optimizer';
import { seedLocalImageCache } from './services/imageCache';
import { realtimeCircuitBreaker, getSafeWebSocketTransport } from './services/RealtimeCircuitBreaker';

export { realtimeCircuitBreaker };

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

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
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

  let finalBlob = blob;
  let finalContentType = contentType;

  // Validation stricte du type MIME (S9 : Images uniquement)
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/svg+xml'
  ];
  if (blob.type && !allowedTypes.includes(blob.type.toLowerCase())) {
    console.error(
      `[Storage] Upload bloqué: Type de fichier '${blob.type}' non autorisé. Format d'image requis.`
    );
    return null;
  }

  // AUTO-OPTIMIZATION ULTRA-LÉGÈRE (360x360 WebP q=0.60 => ~5 à 9 Ko par vignette POS)
  try {
    finalBlob = await compressImage(blob, 360, 360, 0.6);
    finalContentType = 'image/webp';
  } catch (optErr) {
    console.warn('[Storage] Optimization failed, uploading original:', optErr);
  }

  // File size validation (limit to 5MB)
  if (finalBlob.size > 5 * 1024 * 1024) {
    console.error('[Storage] Upload blocked: File size exceeds 5MB limit.');
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
