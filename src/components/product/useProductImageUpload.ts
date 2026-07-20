import { useState } from 'react';
import { supabase, uploadImageBlobToStorage } from '../../supabase';

interface UseProductImageUploadProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export function useProductImageUpload({
  formData,
  setFormData
}: UseProductImageUploadProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 640;
        const MAX_HEIGHT = 640;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to WebP with 0.5 quality for ultimate storage efficiency, fallback to JPEG if not supported
        let targetType = 'image/webp';
        const quality = 0.5;
        let result = canvas.toDataURL(targetType, quality);
        if (!result.startsWith('data:image/webp')) {
          targetType = 'image/jpeg';
          result = canvas.toDataURL(targetType, quality);
        }

        // Convert the resized canvas to a Blob and upload to Supabase Storage
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          setIsUploadingImage(true);
          try {
            const publicUrl = await uploadImageBlobToStorage(blob, 'products', targetType);
            if (!publicUrl) {
              throw new Error('Supabase uploads returned null or were bypassed.');
            }

            // Update the product URLs with the public bucket image link
            if (index !== undefined) {
              const newUrls = [...formData.imageUrls];
              newUrls[index] = publicUrl;
              setFormData((curr: any) => ({ ...curr, imageUrls: newUrls, imageUrl: newUrls[0] || '' }));
            } else if (formData.imageUrls.length < 5) {
              const newUrls = [...formData.imageUrls, publicUrl];
              setFormData((curr: any) => ({ ...curr, imageUrls: newUrls, imageUrl: newUrls[0] || '' }));
            } else {
              setFormData((curr: any) => ({ ...curr, imageUrl: publicUrl }));
            }
          } catch (storageErr: any) {
            console.warn("[Supabase Storage Fallback] Direct upload failed, using ultra-efficient offline Base64 string:", storageErr);
            // Fallback gracefully so POS system never blocks during internet outages or bucket permission misconfigs
            if (index !== undefined) {
              const newUrls = [...formData.imageUrls];
              newUrls[index] = result;
              setFormData((curr: any) => ({ ...curr, imageUrls: newUrls, imageUrl: newUrls[0] || '' }));
            } else if (formData.imageUrls.length < 5) {
              const newUrls = [...formData.imageUrls, result];
              setFormData((curr: any) => ({ ...curr, imageUrls: newUrls, imageUrl: newUrls[0] || '' }));
            } else {
              setFormData((curr: any) => ({ ...curr, imageUrl: result }));
            }
          } finally {
            setIsUploadingImage(false);
          }
        }, targetType, quality);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    const newUrls = formData.imageUrls.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, imageUrls: newUrls, imageUrl: newUrls[0] || '' });
  };

  return {
    isUploadingImage,
    handleImageUpload,
    removeImage
  };
}
