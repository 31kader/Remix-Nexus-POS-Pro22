import { useState } from 'react';
import { Product } from '../../../../types';
import { useCoreStore } from '../../../../store/useCoreStore';
import { localDb } from '../../../../services/LocalDatabase';
import { generateUniqueId } from '../../../../lib/utils';
import { toast } from 'sonner';

export interface UseMobileCartonQuickCreateProps {
  onProductCreated: (product: Product) => void;
  onClearSearch: () => void;
}

export function useMobileCartonQuickCreate({
  onProductCreated,
  onClearSearch
}: UseMobileCartonQuickCreateProps) {
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState<boolean>(false);
  const [quickName, setQuickName] = useState<string>('');
  const [quickBarcode, setQuickBarcode] = useState<string>('');
  const [quickCostPrice, setQuickCostPrice] = useState<number>(0);
  const [quickSellingPrice, setQuickSellingPrice] = useState<number>(0);
  const [quickUnitsPerCarton, setQuickUnitsPerCarton] = useState<number>(12);

  const handleQuickCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      toast.error("Veuillez renseigner le nom de l'article.");
      return;
    }

    try {
      const newId = generateUniqueId();
      const newProduct: Product = {
        id: newId,
        name: quickName.trim(),
        barcode: quickBarcode.trim() || undefined,
        sku: `ART-${Date.now().toString().slice(-6)}`,
        costPrice: Number(quickCostPrice) || 0,
        price: Number(quickSellingPrice) || Number((quickCostPrice * 1.3).toFixed(2)) || 0,
        stock: 0,
        minStock: 5,
        taxRate: 0,
        categoryId: 'uncategorized',
        supplier: '',
        unit: 'piece',
        status: 'active',
        unitsPerParent: Number(quickUnitsPerCarton) || 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await localDb.insert(`products/${newId}`, newProduct);
      useCoreStore.getState().setProducts(prev => [newProduct, ...(prev || [])]);

      onProductCreated(newProduct);
      setIsQuickCreateOpen(false);
      onClearSearch();
      toast.success(`✨ Article "${newProduct.name}" créé et lié avec succès !`);
    } catch {
      toast.error("Erreur lors de la création de l'article.");
    }
  };

  return {
    isQuickCreateOpen,
    setIsQuickCreateOpen,
    quickName,
    setQuickName,
    quickBarcode,
    setQuickBarcode,
    quickCostPrice,
    setQuickCostPrice,
    quickSellingPrice,
    setQuickSellingPrice,
    quickUnitsPerCarton,
    setQuickUnitsPerCarton,
    handleQuickCreateProduct
  };
}
