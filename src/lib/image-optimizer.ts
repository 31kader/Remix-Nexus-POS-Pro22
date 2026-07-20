/**
 * Image Optimizer Utility
 * Compresses and resizes images client-side before upload to save bandwidth and storage.
 */

export async function compressImage(
  file: File | Blob,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.7
): Promise<Blob> {
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
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
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

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob (WebP is preferred for web performance)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
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
 * Returns an optimized Supabase URL with transformations if applicable.
 * Helps mobile devices download much smaller image files.
 */
export function getOptimizedImageUrl(url: string, width: number = 300): string {
  if (!url || !url.includes('supabase.co')) return url;

  // Check if URL already has transformations
  if (url.includes('?width=') || url.includes('&width=')) return url;

  // Supabase Image Transformation API format
  // Note: This requires Supabase Pro plan or self-hosted transformation service enabled.
  // If using free tier, this might return the original image unless configured.
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=${width}&quality=70&resize=contain`;
}
