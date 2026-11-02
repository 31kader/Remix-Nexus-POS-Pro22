import { useState, useRef, useCallback, useEffect } from 'react';
import { Product } from '../../../../types';
import {
  compressCartonImage,
  addCartonIntake,
  recognizeCarton,
  getCartonTemplates,
  CartonRecognitionResult,
  CartonTemplate,
  CartonIntakeItem
} from '../../../../services/cartonIntakeService';
import { uploadImageBlobToStorage } from '../../../../supabase';
import { toast } from 'sonner';

export interface UseMobileCartonPhotoRecognitionProps {
  effectiveProducts: Product[];
  autoAddToCart: boolean;
  onAddToCartDirectly?: (item: any) => void;
  currentUserName?: string;
  onCartonRecognized: (match: CartonRecognitionResult) => void;
  onAutoAddSuccess: (saved: CartonIntakeItem) => void;
  resetForm: () => void;
}

export function useMobileCartonPhotoRecognition({
  effectiveProducts,
  autoAddToCart,
  onAddToCartDirectly,
  currentUserName,
  onCartonRecognized,
  onAutoAddSuccess,
  resetForm
}: UseMobileCartonPhotoRecognitionProps) {
  const [cartonPhoto, setCartonPhoto] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [recognitionResult, setRecognitionResult] = useState<CartonRecognitionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);
  const [savedTemplates, setSavedTemplates] = useState<CartonTemplate[]>([]);

  const loadTemplates = useCallback(async () => {
    try {
      const list = await getCartonTemplates();
      setSavedTemplates(list);
    } catch {}
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setRecognitionResult(null);

      const compressedDataUrl = await compressCartonImage(file, 1280, 0.85);
      setCartonPhoto(compressedDataUrl);

      (async () => {
        try {
          const blob = await (await fetch(compressedDataUrl)).blob();
          const uploadedUrl = await uploadImageBlobToStorage(blob, 'cartons', 'image/webp');
          if (uploadedUrl) {
            setCartonPhoto(uploadedUrl);
          }
        } catch (_) {}
      })();

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }

      setIsCompressing(false);
      setIsRecognizing(true);

      const match = await recognizeCarton(compressedDataUrl, effectiveProducts);

      if (match) {
        setRecognitionResult(match);
        onCartonRecognized(match);

        const colisage = match.template.unitsPerCarton || Number(match.product.unitsPerParent) || 12;
        const cartonCost = match.template.cartonCostPrice || 0;
        const unitCost = match.template.unitCostPrice || Number(match.product.costPrice) || 0;

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([60, 40, 100]);
        }

        if (autoAddToCart) {
          const totalUnitsDirect = 1 * colisage;

          if (onAddToCartDirectly) {
            onAddToCartDirectly({
              productId: match.product.id,
              productName: match.product.name,
              quantity: totalUnitsDirect,
              costPrice: unitCost,
              cartonCount: 1,
              unitsPerCarton: colisage,
              cartonCostPrice: cartonCost,
              cartonPhotoUrl: compressedDataUrl,
              imageUrl: match.product.imageUrl
            });
          }

          const saved = await addCartonIntake({
            productId: match.product.id,
            productName: match.product.name,
            cartonPhotoUrl: compressedDataUrl,
            cartonCount: 1,
            unitsPerCarton: colisage,
            totalUnits: totalUnitsDirect,
            cartonCostPrice: cartonCost,
            unitCostPrice: unitCost,
            totalCostAmount: cartonCost,
            agentName: currentUserName || 'Agent Dépôt'
          });

          onAutoAddSuccess(saved);
          loadTemplates();

          toast.success(`⚡ Carton reconnu & direct au panier : ${match.product.name} (1 carton de ${colisage} pcs) !`);
          resetForm();
        } else {
          toast.success(`✨ Carton reconnu : ${match.product.name} (${colisage} pcs/carton) !`);
        }
      } else {
        toast.info("💡 Nouveau carton : associez-le ci-dessous pour qu'il soit mémorisé !");
      }
    } catch {
      toast.error("Impossible de traiter la photo du carton.");
    } finally {
      setIsCompressing(false);
      setIsRecognizing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return {
    cartonPhoto,
    setCartonPhoto,
    isCompressing,
    fileInputRef,
    isRecognizing,
    recognitionResult,
    setRecognitionResult,
    isTemplatesModalOpen,
    setIsTemplatesModalOpen,
    savedTemplates,
    loadTemplates,
    handlePhotoCapture
  };
}
