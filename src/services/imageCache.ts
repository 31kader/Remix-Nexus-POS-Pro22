import { get as getIDB, set as setIDB } from 'idb-keyval';

const MAX_CACHED_OBJECT_URLS = 2000;
const objectUrlMap = new Map<string, string>();

export function evictObjectUrl(url: string) {
  if (objectUrlMap.has(url)) {
    const existing = objectUrlMap.get(url);
    if (existing && existing.startsWith('blob:')) {
      try { URL.revokeObjectURL(existing); } catch (_) {}
    }
    objectUrlMap.delete(url);
  }
}

function setBoundedObjectUrl(url: string, objUrl: string) {
  if (objectUrlMap.has(url)) {
    const existing = objectUrlMap.get(url);
    if (existing && existing !== objUrl && existing.startsWith('blob:')) {
      try { URL.revokeObjectURL(existing); } catch (_) {}
    }
    objectUrlMap.delete(url);
  } else if (objectUrlMap.size >= MAX_CACHED_OBJECT_URLS) {
    // Élagage LRU sans révocation agressive pour ne pas casser le rendu des balises <img> montées
    const oldestKey = objectUrlMap.keys().next().value;
    if (oldestKey) {
      objectUrlMap.delete(oldestKey);
    }
  }
  objectUrlMap.set(url, objUrl);
}

/**
 * Resizes an image to maxWidth and compresses it to WebP format client-side.
 */
async function compressImageBlob(blob: Blob, maxWidth = 400, quality = 0.7): Promise<Blob> {
  if (!blob.type.startsWith('image/')) return blob;
  
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
          if (compressedBlob) {
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
  
  if (!forceFresh && objectUrlMap.has(url)) {
    const cached = objectUrlMap.get(url)!;
    // Re-insert to refresh LRU order
    objectUrlMap.delete(url);
    objectUrlMap.set(url, cached);
    return cached;
  }
  
  try {
    const cachedBlob = await getIDB(`img_${url}`);
    if (cachedBlob instanceof Blob) {
      const objUrl = URL.createObjectURL(cachedBlob);
      setBoundedObjectUrl(url, objUrl);
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
  
  if (objectUrlMap.has(url)) {
    const cached = objectUrlMap.get(url)!;
    objectUrlMap.delete(url);
    objectUrlMap.set(url, cached);
    return cached;
  }

  // Deduplicate concurrent requests for the same image
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url)!;
  }

  const fetchPromise = (async () => {
    try {
      const cachedBlob = await getIDB(`img_${url}`);
      if (cachedBlob instanceof Blob) {
        const objUrl = URL.createObjectURL(cachedBlob);
        setBoundedObjectUrl(url, objUrl);
        return objUrl;
      }
      
      // Throttle network fetches so we never exceed MAX_CONCURRENT_FETCHES
      await acquireFetchSlot();
      
      let rawBlob: Blob;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        let response: Response;
        try {
          response = await fetch(url, { 
            referrerPolicy: 'no-referrer',
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
      
      // Compress and convert to WebP before saving
      const compressedBlob = await compressImageBlob(rawBlob);
      
      await setIDB(`img_${url}`, compressedBlob);
      const objUrl = URL.createObjectURL(compressedBlob);
      setBoundedObjectUrl(url, objUrl);
      return objUrl;
    } catch (err: any) {
      return null;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, fetchPromise);
  return fetchPromise;
}
