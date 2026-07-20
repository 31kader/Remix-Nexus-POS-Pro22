import { get as getIDB, set as setIDB } from 'idb-keyval';

const objectUrlMap = new Map<string, string>();

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

export async function getLocalImage(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  if (objectUrlMap.has(url)) {
    return objectUrlMap.get(url)!;
  }
  
  try {
    const cachedBlob = await getIDB(`img_${url}`);
    if (cachedBlob instanceof Blob) {
      const objUrl = URL.createObjectURL(cachedBlob);
      objectUrlMap.set(url, objUrl);
      return objUrl;
    }
  } catch (err) {
    console.warn('[ImageCache] Error loading from IDB', err);
  }
  return null;
}

export async function cacheImage(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  if (objectUrlMap.has(url)) {
    return objectUrlMap.get(url)!;
  }
  
  try {
    const cachedBlob = await getIDB(`img_${url}`);
    if (cachedBlob instanceof Blob) {
      const objUrl = URL.createObjectURL(cachedBlob);
      objectUrlMap.set(url, objUrl);
      return objUrl;
    }
    
    const response = await fetch(url, { referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const rawBlob = await response.blob();
    
    // Compress and convert to WebP before saving
    const compressedBlob = await compressImageBlob(rawBlob);
    
    await setIDB(`img_${url}`, compressedBlob);
    const objUrl = URL.createObjectURL(compressedBlob);
    objectUrlMap.set(url, objUrl);
    return objUrl;
  } catch (err) {
    console.warn(`[ImageCache] Failed to fetch and cache image: ${url}`, err);
    return null;
  }
}
