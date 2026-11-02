import { Product, normalizeBatches } from '../../types';
import { localDb } from '../../services/LocalDatabase';
import { toast } from 'sonner';

interface UseExpiryPriceActionsProps {
  products: Product[];
  analyzedProducts: any[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  setQuickDateProduct: (p: any) => void;
}

export function useExpiryPriceActions({
  products,
  analyzedProducts,
  onUpdateProduct,
  setQuickDateProduct,
}: UseExpiryPriceActionsProps) {
  const handleApplyPromo = async (product: any, percent: number) => {
    const oldPrice = product.price;
    const targetId = product.originalId || product.id;
    try {
      const discount = percent / 100;
      const newPrice = Math.round(Number(product.price) * (1 - discount));
      
      const updates: any = { price: newPrice };
      if (!product.originalPrice) {
        updates.originalPrice = oldPrice;
      }
      
      await onUpdateProduct(targetId, updates);
      localDb.update(`products/${targetId}`, updates);
      toast.success(`Promo -${percent}% appliquée sur ${product.name}`, {
        action: {
          label: "Annuler",
          onClick: () => {
            onUpdateProduct(targetId, { price: oldPrice, originalPrice: undefined });
            localDb.update(`products/${targetId}`, { price: oldPrice, originalPrice: null });
          }
        }
      });
    } catch (err) {
      toast.error("Erreur lors de l'application de la promo");
    }
  };

  const handleRestorePrice = async (product: any) => {
    const targetId = product.originalId || product.id;
    try {
      const realProd = (products || []).find(p => p.id === targetId);
      const origPrice = product.originalPrice || realProd?.originalPrice ||
        (realProd?.priceHistory && realProd.priceHistory.length > 0 ? realProd.priceHistory[0].price : null) ||
        (product.priceHistory && product.priceHistory.length > 0 ? product.priceHistory[0].price : null);

      if (origPrice) {
        await onUpdateProduct(targetId, { price: origPrice, originalPrice: undefined });
        localDb.update(`products/${targetId}`, { price: origPrice, originalPrice: null });
        toast.success(`Prix normal restauré pour ${product.name}`);
      } else {
        const restoredPrice = Math.round(product.price / 0.8);
        await onUpdateProduct(targetId, { price: restoredPrice });
        localDb.update(`products/${targetId}`, { price: restoredPrice });
        toast.success(`Prix restauré pour ${product.name}`);
      }
    } catch (err) {
      toast.error("Erreur lors de la restauration du prix");
    }
  };

  const handleSaveQuickDate = async (product: any, newDate: string, batchNumber?: string) => {
    const targetId = product.originalId || product.id;
    try {
      const updates: any = { expirationDate: newDate };
      if (batchNumber) updates.batchNumber = batchNumber;

      const realProd = (products || []).find(p => p.id === targetId);
      if (realProd && realProd.useMultiExpiry) {
        const normBatches = normalizeBatches(realProd.batches).map(b => ({ ...b }));
        if (normBatches.length > 0) {
          const updatedBatches = normBatches.map(b => {
            if ((product.batchId && b.id === product.batchId) || (product.batchNumber && b.batchNumber === product.batchNumber)) {
              return { ...b, expirationDate: newDate, ...(batchNumber ? { batchNumber } : {}) };
            }
            return b;
          });
          updates.batches = updatedBatches;
          const sorted = [...updatedBatches].sort((a, b) => new Date(a.expirationDate || 0).getTime() - new Date(b.expirationDate || 0).getTime());
          if (sorted[0]?.expirationDate) {
            updates.expirationDate = sorted[0].expirationDate;
          }
        }
      }

      await onUpdateProduct(targetId, updates);
      localDb.update(`products/${targetId}`, updates);
      toast.success(`Date de péremption mise à jour pour ${product.name}`);
      setQuickDateProduct(null);
    } catch (err) {
      toast.error("Erreur lors de la mise à jour de la date");
    }
  };

  const handleBatchDiscount = async (status: 'expired' | 'critical') => {
    const rawTargets = analyzedProducts.filter(p => p.expiryStatus === status);
    // Déduplication par produit parent pour éviter d'appliquer plusieurs fois -20% sur un produit multi-lots
    const uniqueTargetsMap = new Map<string, any>();
    rawTargets.forEach(p => {
      const targetId = p.originalId || p.id;
      if (targetId && !uniqueTargetsMap.has(targetId)) {
        uniqueTargetsMap.set(targetId, p);
      }
    });
    const targets = Array.from(uniqueTargetsMap.values());
    if (targets.length === 0) {
      toast.info("Aucun produit trouvé pour cette catégorie.");
      return;
    }

    const confirmMsg = `Voulez-vous appliquer une réduction de 20% sur les ${targets.length} produits ${status === 'expired' ? 'expirés' : 'critiques'} ?`;
    if (!window.confirm(confirmMsg)) return;

    let successCount = 0;
    for (const p of targets) {
      try {
        const targetId = p.originalId || p.id;
        const basePrice = Number(p.originalPrice || p.price);
        const newPrice = Math.round(basePrice * 0.8);
        await onUpdateProduct(targetId, { price: newPrice, originalPrice: basePrice });
        localDb.update(`products/${targetId}`, { price: newPrice, originalPrice: basePrice });
        successCount++;
      } catch (_) {}
    }

    toast.success(`Réduction appliquée sur ${successCount} produits !`);
  };

  return {
    handleApplyPromo,
    handleRestorePrice,
    handleSaveQuickDate,
    handleBatchDiscount,
  };
}
