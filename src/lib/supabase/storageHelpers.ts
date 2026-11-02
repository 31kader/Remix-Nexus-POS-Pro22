import { compressImage } from '../image-optimizer';
import { seedLocalImageCache } from '../../services/imageCache';

/**
 * Supprime un fichier image de Supabase Storage lorsqu'il est remplacé ou supprimé d'un produit,
 * afin d'empêcher l'accumulation de fichiers orphelins dans les buckets.
 */
export async function deleteImageFromStorage(
  supabaseClient: any,
  url: string
): Promise<void> {
  if (!supabaseClient || !supabaseClient.storage || !url || typeof url !== 'string') return;
  try {
    const match = url.match(/\/storage\/v1\/(?:object|render\/image)\/public\/([^/]+)\/([^?]+)/);
    if (!match) return;
    const [, bucketName, filePath] = match;
    if (bucketName && filePath) {
      await supabaseClient.storage.from(bucketName).remove([decodeURIComponent(filePath)]);
    }
  } catch (err) {
    console.warn('[Storage] Impossible de supprimer l’ancienne image:', err);
  }
}

/**
 * Téléverse un Blob image compressé vers Supabase Storage avec cache long et pré-remplissage local.
 */
export async function uploadImageBlob(
  supabaseClient: any,
  blob: Blob,
  bucketName: string,
  contentType: string = 'image/webp'
): Promise<string | null> {
  if (!supabaseClient || !supabaseClient.storage) return null;

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
  const finalContentType = 'image/webp';

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
    const { error: uploadError } = await supabaseClient.storage
      .from(bucketName)
      .upload(fileName, finalBlob, {
        contentType: finalContentType,
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError) {
      console.warn(`[Storage] Upload échoué vers bucket '${bucketName}':`, uploadError.message);
      return null;
    }

    const { data } = supabaseClient.storage.from(bucketName).getPublicUrl(fileName);
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
