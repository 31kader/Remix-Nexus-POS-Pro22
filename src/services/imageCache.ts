import { get as getIDB, set as setIDB } from 'idb-keyval';
import { isSafeExternalUrl } from '../lib/utils';

const MAX_CACHED_OBJECT_URLS = 2000;
const objectUrlMap = new Map<string, string>();

/**
 * Normalise toute URL d'image Supabase Storage en URL canonique unique
 * afin d'éviter de télécharger plusieurs fois la même image sous différentes largeurs (?width=...).
 */
export function getCanonicalCacheUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('supabase.co/storage/')) return url;
  return url
    .replace('/storage/v1/render/image/public/', '/storage/v1/object/public/')
    .split('?')[0];
}

export function evictObjectUrl(url: string) {
  const key = getCanonicalCacheUrl(url);
  if (objectUrlMap.has(key)) {
    const existing = objectUrlMap.get(key);
    if (existing && existing.startsWith('blob:')) {
      try { URL.revokeObjectURL(existing); } catch (_) {}
    }
    objectUrlMap.delete(key);
  }
}

function setBoundedObjectUrl(url: string, objUrl: string) {
  const key = getCanonicalCacheUrl(url);
  if (objectUrlMap.has(key)) {
    const existing = objectUrlMap.get(key);
    if (existing && existing !== objUrl && existing.startsWith('blob:')) {
      try { URL.revokeObjectURL(existing); } catch (_) {}
    }
    objectUrlMap.delete(key);
  } else if (objectUrlMap.size >= MAX_CACHED_OBJECT_URLS) {
    const oldestKey = objectUrlMap.keys().next().value;
    if (oldestKey) {
      objectUrlMap.delete(oldestKey);
    }
  }
  objectUrlMap.set(key, objUrl);
}

/**
 * Pré-remplit immédiatement le cache local IndexedDB et mémoire au moment de l'upload.
 * Évite que la caisse qui vient d'uploader l'image ne la retélécharge depuis Supabase (0 Egress).
 */
export async function seedLocalImageCache(url: string, blob: Blob): Promise<void> {
  if (!url || !blob) return;
  const key = getCanonicalCacheUrl(url);
  try {
    await setIDB(`img_${key}`, blob);
    const objUrl = URL.createObjectURL(blob);
    setBoundedObjectUrl(key, objUrl);
  } catch (err) {
    console.warn('[ImageCache] Failed to seed local cache after upload:', err);
  }
}

/**
 * Redimensionne et compresse une image en WebP (360x360, q=0.60) côté client
 * uniquement si elle dépasse 15 Ko ou n'est pas déjà en WebP.
 */
async function compressImageBlob(blob: Blob, maxWidth = 360, quality = 0.6): Promise<Blob> {
  if (!blob.type.startsWith('image/')) return blob;
  // Si le fichier est déjà un WebP léger (<= 15 Ko), le conserver tel quel sans re-compression CPU
  if (blob.type === 'image/webp' && blob.size <= 15 * 1024) {
    return blob;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob && compressedBlob.size < blob.size) {
            resolve(compressedBlob);
          } else {
            resolve(blob);
          }
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(blob);
    };
  });
}

export async function getLocalImage(url: string, forceFresh = false): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const key = getCanonicalCacheUrl(url);

  if (!forceFresh && objectUrlMap.has(key)) {
    const cached = objectUrlMap.get(key)!;
    objectUrlMap.delete(key);
    objectUrlMap.set(key, cached);
    return cached;
  }

  try {
    let cachedBlob = await getIDB(`img_${key}`);
    // Compatibilité rétroactive avec d'anciennes entrées indexées sous l'URL non canonique
    if (!(cachedBlob instanceof Blob) && key !== url) {
      cachedBlob = await getIDB(`img_${url}`);
      if (cachedBlob instanceof Blob) {
        await setIDB(`img_${key}`, cachedBlob);
      }
    }
    if (cachedBlob instanceof Blob) {
      const objUrl = URL.createObjectURL(cachedBlob);
      setBoundedObjectUrl(key, objUrl);
      return objUrl;
    }
  } catch (err) {
    console.warn('[ImageCache] Error loading from IDB', err);
  }
  return null;
}

const inFlightRequests = new Map<string, Promise<string | null>>();
const MAX_CONCURRENT_FETCHES = 3;
let activeFetches = 0;
const fetchQueue: Array<() => void> = [];

async function acquireFetchSlot(): Promise<void> {
  if (activeFetches < MAX_CONCURRENT_FETCHES) {
    activeFetches++;
    return;
  }
  return new Promise<void>((resolve) => {
    fetchQueue.push(() => {
      activeFetches++;
      resolve();
    });
  });
}

function releaseFetchSlot(): void {
  activeFetches--;
  if (fetchQueue.length > 0) {
    const next = fetchQueue.shift();
    if (next) next();
  }
}

export async function cacheImage(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  const key = getCanonicalCacheUrl(url);

  if (objectUrlMap.has(key)) {
    const cached = objectUrlMap.get(key)!;
    objectUrlMap.delete(key);
    objectUrlMap.set(key, cached);
    return cached;
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const fetchPromise = (async () => {
    try {
      const cachedBlob = await getIDB(`img_${key}`);
      if (cachedBlob instanceof Blob) {
        const objUrl = URL.createObjectURL(cachedBlob);
        setBoundedObjectUrl(key, objUrl);
        return objUrl;
      }

      // 🛡️ Protection Anti-SSRF (CWE-918)
      if (key.startsWith('http://') || key.startsWith('https://')) {
        if (!isSafeExternalUrl(key)) {
          return null;
        }
      } else if (!key.startsWith('data:image/') && !key.startsWith('blob:')) {
        return null;
      }

      await acquireFetchSlot();

      let rawBlob: Blob;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let response: Response;
        try {
          response = await fetch(key, {
            referrerPolicy: 'no-referrer',
            cache: 'force-cache',
            signal: controller.signal
          });
        } catch (netErr: any) {
          return null;
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) return null;
        rawBlob = await response.blob();
      } finally {
        releaseFetchSlot();
      }

      const compressedBlob = await compressImageBlob(rawBlob);

      await setIDB(`img_${key}`, compressedBlob);
      const objUrl = URL.createObjectURL(compressedBlob);
      setBoundedObjectUrl(key, objUrl);
      return objUrl;
    } catch (err: any) {
      return null;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, fetchPromise);
  return fetchPromise;
}
