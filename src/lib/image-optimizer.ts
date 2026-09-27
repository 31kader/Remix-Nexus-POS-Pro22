/**
 * Image Optimizer Utility
 * Compresses and resizes images client-side before upload to save bandwidth and storage.
 */

export async function compressImage(
  file: File | Blob,
  maxWidth: number = 360,
  maxHeight: number = 360,
  quality: number = 0.6
): Promise<Blob> {
  // Si le Blob est déjà un WebP optimisé <= 12 Ko, éviter une double re-compression dégradante
  if (file.type === 'image/webp' && file.size > 0 && file.size <= 12 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Garder la version la plus légère entre le WebP généré et le fichier source (si déjà WebP)
              if (file.type === 'image/webp' && file.size < blob.size) {
                resolve(file);
              } else {
                resolve(blob);
              }
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Image load failed'));
    };
    reader.onerror = () => reject(new Error('File read failed'));
  });
}

/**
 * Retourne l'URL canonique `/storage/v1/object/public/...` pour les images Supabase Storage.
 * Pourquoi ne pas utiliser `/storage/v1/render/image/public/?width=...` :
 * 1) Les images du bucket sont déjà compressées en WebP (5-9 Ko) avant upload ; l'API `/render/image/`
 *    les ré-encode en augmentant leur poids de +26% (ex: 8.3 Ko -> 10.6 Ko).
 * 2) Ajouter `?width=60`, `?width=150`, `?width=300` crée 3 URLs différentes pour une même image et force
 *    3 téléchargements Egress distincts au lieu d'un seul en cache IndexedDB local.
 */
export function getOptimizedImageUrl(url: string, _width: number = 300): string {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('supabase.co/storage/')) return url;

  return url
    .replace('/storage/v1/render/image/public/', '/storage/v1/object/public/')
    .split('?')[0];
}
