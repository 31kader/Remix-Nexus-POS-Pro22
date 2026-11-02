import { Product } from '../../../../types';
import {
  addCartonIntake,
  directValidateCartonReception,
  CartonIntakeItem,
  saveCartonTemplate
} from '../../../../services/cartonIntakeService';
import { toast } from 'sonner';

export interface UseMobileCartonActionsProps {
  selectedProduct: Product | null;
  setSelectedProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  cartonCount: number;
  unitsPerCarton: number;
  totalUnits: number;
  cartonCostPrice: number;
  unitCostPrice: number;
  totalCostAmount: number;
  cartonPhoto: string;
  currentUserId?: string;
  currentUserName?: string;
  onAddToCartDirectly?: (item: any) => void;
  setRecentIntakes: React.Dispatch<React.SetStateAction<CartonIntakeItem[]>>;
  loadTemplates: () => Promise<void>;
  resetForm: () => void;
}

export function useMobileCartonActions({
  selectedProduct,
  setSelectedProduct,
  cartonCount,
  unitsPerCarton,
  totalUnits,
  cartonCostPrice,
  unitCostPrice,
  totalCostAmount,
  cartonPhoto,
  currentUserId,
  currentUserName,
  onAddToCartDirectly,
  setRecentIntakes,
  loadTemplates,
  resetForm
}: UseMobileCartonActionsProps) {
  const handleSendToCart = async (setIsSubmitting: (v: boolean) => void) => {
    if (!selectedProduct) {
      toast.error("Veuillez sélectionner un produit existant.");
      return;
    }
    if (cartonCount <= 0 || unitsPerCarton <= 0) {
      toast.error("Quantités invalides.");
      return;
    }

    try {
      setIsSubmitting(true);

      const intakePayload = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        cartonPhotoUrl: cartonPhoto,
        cartonCount,
        unitsPerCarton,
        totalUnits,
        cartonCostPrice,
        unitCostPrice,
        totalCostAmount,
        agentName: currentUserName || 'Agent Dépôt'
      };

      if (onAddToCartDirectly) {
        onAddToCartDirectly({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: totalUnits,
          costPrice: unitCostPrice,
          cartonCount,
          unitsPerCarton,
          cartonCostPrice,
          cartonPhotoUrl: cartonPhoto,
          imageUrl: selectedProduct.imageUrl
        });
      }

      const saved = await addCartonIntake(intakePayload);
      setRecentIntakes(prev => [saved, ...prev.slice(0, 4)]);

      if (cartonPhoto && selectedProduct) {
        const unitRetail = Number(selectedProduct.price) || 0;
        const unitWholesale = Number(selectedProduct.wholesalePrice) || Number(selectedProduct.wholesale_price) || (unitRetail * 0.9);
        saveCartonTemplate({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          unitsPerCarton,
          cartonCostPrice,
          unitCostPrice,
          retailPrice: Number((unitRetail * unitsPerCarton).toFixed(2)),
          wholesalePrice: Number((unitWholesale * unitsPerCarton).toFixed(2)),
          sku: `CART-${selectedProduct.sku || selectedProduct.barcode || selectedProduct.id.slice(0, 6)}`,
          cartonPhotoUrl: cartonPhoto,
          productBarcode: selectedProduct.barcode
        }).then(() => loadTemplates()).catch(() => {});
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 100, 50]);
      }

      toast.success(`📦 Ajouté au panier : ${cartonCount} cartons (${totalUnits} unités) de ${selectedProduct.name} !`);
      resetForm();
    } catch {
      toast.error("Erreur lors de l'envoi au panier.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectValidate = async (setIsSubmitting: (v: boolean) => void) => {
    if (!selectedProduct) {
      toast.error("Veuillez sélectionner un produit existant.");
      return;
    }
    if (cartonCount <= 0 || unitsPerCarton <= 0) {
      toast.error("Quantités invalides.");
      return;
    }

    try {
      setIsSubmitting(true);

      const intakePayload: CartonIntakeItem = {
        id: '',
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        cartonPhotoUrl: cartonPhoto,
        cartonCount,
        unitsPerCarton,
        totalUnits,
        cartonCostPrice,
        unitCostPrice,
        totalCostAmount,
        timestamp: new Date().toISOString(),
        agentName: currentUserName || 'Agent Dépôt'
      };

      const result = await directValidateCartonReception(
        intakePayload,
        selectedProduct,
        currentUserId,
        currentUserName
      );

      if (cartonPhoto && selectedProduct) {
        const unitRetail = Number(selectedProduct.price) || 0;
        const unitWholesale = Number(selectedProduct.wholesalePrice) || Number(selectedProduct.wholesale_price) || (unitRetail * 0.9);
        saveCartonTemplate({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          unitsPerCarton,
          cartonCostPrice,
          unitCostPrice,
          retailPrice: Number((unitRetail * unitsPerCarton).toFixed(2)),
          wholesalePrice: Number((unitWholesale * unitsPerCarton).toFixed(2)),
          sku: `CART-${selectedProduct.sku || selectedProduct.barcode || selectedProduct.id.slice(0, 6)}`,
          cartonPhotoUrl: cartonPhoto,
          productBarcode: selectedProduct.barcode
        }).then(() => loadTemplates()).catch(() => {});
      }

      setSelectedProduct(prev => prev ? { ...prev, stock: result.newStock } : null);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      toast.success(`⚡ Réception enregistrée ! Nouveau stock : ${result.newStock} unités.`);
      resetForm();
    } catch {
      toast.error("Erreur lors de la validation directe du stock.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleSendToCart,
    handleDirectValidate
  };
}
