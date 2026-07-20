import { createClient } from '@supabase/supabase-js';
import { compressImage } from './lib/image-optimizer';

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
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : ({} as any);

export const removeChannelByName = (channelName: string) => {
  if (!isSupabaseConfigured) return;
  try {
    const channels = supabase.getChannels();
    const matched = channels.find((c: any) => c.name === channelName || c.topic === `realtime:${channelName}`);
    if (matched) {
      supabase.removeChannel(matched).catch(() => {});
    }
  } catch (err) {}
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

export async function uploadImageBlobToStorage(
  blob: Blob,
  bucketName: string,
  contentType: string = 'image/webp'
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  let finalBlob = blob;
  let finalContentType = contentType;

  // AUTO-OPTIMIZATION: Always compress and convert to WebP before upload
  // This saves massive amounts of data and storage space.
  try {
    finalBlob = await compressImage(blob, 1024, 1024, 0.7);
    finalContentType = 'image/webp';
  } catch (optErr) {
    console.warn("[Storage] Optimization failed, uploading original:", optErr);
  }

  // File size validation (limit to 5MB)
  if (finalBlob.size > 5 * 1024 * 1024) {
    console.error("[Storage] Upload blocked: File size exceeds 5MB limit.");
    return null;
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.webp`;
  
  try {
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, finalBlob, {
        contentType: finalContentType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.warn(`[Storage] Upload échoué vers bucket '${bucketName}':`, uploadError.message);
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
        console.error(`[Storage] ⚠️ Le bucket '${bucketName}' n'existe pas dans Supabase Storage. Créez-le dans le Dashboard Supabase.`);
      } else if (uploadError.message.includes('policy') || uploadError.message.includes('Permission') || uploadError.message.includes('RLS')) {
        console.error(`[Storage] ⚠️ Politique RLS bloquée. Ajoutez une politique PUBLIC INSERT sur le bucket '${bucketName}'.`);
      }
      return null;
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    console.log(`[Storage] ✅ Image uploadée: ${data?.publicUrl}`);
    return data?.publicUrl || null;
  } catch (error) {
    console.warn('[Storage] Erreur inattendue:', error);
    return null;
  }
}
