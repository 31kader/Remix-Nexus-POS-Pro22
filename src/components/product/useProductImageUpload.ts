import { useState } from 'react';
import { uploadImageBlobToStorage, deleteImageFromStorageByUrl } from '../../supabase';
import { compressImage } from '../../lib/image-optimizer';

interface UseProductImageUploadProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export function useProductImageUpload({
  formData,
  setFormData
}: UseProductImageUploadProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      // Compression unique en WebP 360x360 (q=0.60) => ~5 à 9 Ko
      const compressedBlob = await compressImage(file, 360, 360, 0.6);

      // Si remplacement d'une image existante sur Supabase Storage, supprimer l'ancien fichier orphelin
      const oldUrl =
        index !== undefined ? formData.imageUrls?.[index] : undefined;
      if (oldUrl && typeof oldUrl === 'string' && oldUrl.includes('supabase.co/storage/')) {
        deleteImageFromStorageByUrl(oldUrl).catch(() => {});
      }

      const publicUrl = await uploadImageBlobToStorage(compressedBlob, 'products', 'image/webp');
      if (publicUrl) {
        if (index !== undefined) {
          const newUrls = [...formData.imageUrls];
          newUrls[index] = publicUrl;
          setFormData((curr: any) => ({
            ...curr,
            imageUrls: newUrls,
            imageUrl: newUrls[0] || ''
          }));
        } else if (formData.imageUrls.length < 5) {
          const newUrls = [...formData.imageUrls, publicUrl];
          setFormData((curr: any) => ({
            ...curr,
            imageUrls: newUrls,
            imageUrl: newUrls[0] || ''
          }));
        } else {
          setFormData((curr: any) => ({ ...curr, imageUrl: publicUrl }));
        }
      } else {
        // Fallback hors-ligne (Base64 WebP 360x360 ultra-léger)
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result || '');
          if (index !== undefined) {
            const newUrls = [...formData.imageUrls];
            newUrls[index] = result;
            setFormData((curr: any) => ({
              ...curr,
              imageUrls: newUrls,
              imageUrl: newUrls[0] || ''
            }));
          } else if (formData.imageUrls.length < 5) {
            const newUrls = [...formData.imageUrls, result];
            setFormData((curr: any) => ({
              ...curr,
              imageUrls: newUrls,
              imageUrl: newUrls[0] || ''
            }));
          } else {
            setFormData((curr: any) => ({ ...curr, imageUrl: result }));
          }
        };
        reader.readAsDataURL(compressedBlob);
      }
    } catch (err) {
      console.warn('[useProductImageUpload] Erreur optimisation/upload:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    const removedUrl = formData.imageUrls?.[index];
    if (
      removedUrl &&
      typeof removedUrl === 'string' &&
      removedUrl.includes('supabase.co/storage/')
    ) {
      deleteImageFromStorageByUrl(removedUrl).catch(() => {});
    }
    const newUrls = formData.imageUrls.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, imageUrls: newUrls, imageUrl: newUrls[0] || '' });
  };

  return {
    isUploadingImage,
    handleImageUpload,
    removeImage
  };
}
