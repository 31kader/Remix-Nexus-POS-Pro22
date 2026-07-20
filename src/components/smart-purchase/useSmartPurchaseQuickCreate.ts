import { useState } from 'react';
import { toast } from 'sonner';
import { localDb } from '../../services/LocalDatabase';
import { logAction } from '../../lib/utils';
import { Category, Product, PurchaseCartItem } from '../../types';

interface UseSmartPurchaseQuickCreateProps {
  categories: Category[];
  user: any;
  setCart: React.Dispatch<React.SetStateAction<PurchaseCartItem[]>>;
}

export function useSmartPurchaseQuickCreate({
  categories,
  user,
  setCart
}: UseSmartPurchaseQuickCreateProps) {
  const [draftItemToCreate, setDraftItemToCreate] = useState<PurchaseCartItem | null>(null);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [linkingItem, setLinkingItem] = useState<PurchaseCartItem | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [quickCreateSearchFilter, setQuickCreateSearchFilter] = useState('');
  const [quickCreateForm, setQuickCreateForm] = useState({
    name: '',
    price: '',
    costPrice: '',
    taxRate: '19',
    stock: '0',
    minStock: '5',
    categoryId: '',
    unit: 'unité',
    sku: '',
    barcode: ''
  });

  const linkDraftToProduct = (itemLineId: string, matchedProduct: Product) => {
    setCart(prev => prev.map(item => {
      if (item.lineId === itemLineId) {
        return {
          ...item,
          productId: matchedProduct.id,
          productName: matchedProduct.name,
          taxRate: matchedProduct.taxRate || 0,
          imageUrl: matchedProduct.imageUrl,
          isDraft: false
        };
      }
      return item;
    }));
    toast.success(`Associé avec succès à "${matchedProduct.name}" !`);
  };

  const openQuickCreateModal = (item: PurchaseCartItem) => {
    setDraftItemToCreate(item);
    setQuickCreateForm({
      name: item.productName || '',
      price: (item.costPrice * 1.3).toFixed(2), // prefill 30% margin
      costPrice: item.costPrice.toFixed(2),
      taxRate: String(item.taxRate || '19'),
      stock: String(item.quantity || '0'),
      minStock: '5',
      categoryId: categories[0]?.id || '',
      unit: 'unité',
      sku: 'AUTO_' + Math.floor(Math.random() * 1000000),
      barcode: ''
    });
    setIsQuickCreateOpen(true);
  };

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCreateForm.name.trim()) {
      toast.error("Le nom du produit est requis.");
      return;
    }

    try {
      const newProductId = Math.random().toString(36).substring(2, 11);
      const createdAt = new Date().toISOString();
      const newProductData = {
        id: newProductId,
        name: quickCreateForm.name.trim(),
        price: parseFloat(quickCreateForm.price) || 0,
        costPrice: parseFloat(quickCreateForm.costPrice) || 0,
        taxRate: parseFloat(quickCreateForm.taxRate) || 19,
        stock: parseFloat(quickCreateForm.stock) || 0,
        minStock: parseFloat(quickCreateForm.minStock) || 5,
        categoryId: quickCreateForm.categoryId || 'uncategorized',
        unit: quickCreateForm.unit,
        sku: quickCreateForm.sku || ('AUTO_' + Math.floor(Math.random() * 1000000)),
        barcode: quickCreateForm.barcode || '',
        createdAt,
        updatedAt: createdAt,
        status: 'active'
      };

      // Optimistic cache update event
      window.dispatchEvent(new CustomEvent('product-cache-update', { detail: newProductData }));

      // Save to localDb
      await localDb.insert(`products/${newProductId}`, newProductData);

      logAction(
        user?.uid || user?.id || 'system',
        user?.displayName || 'Utilisateur',
        'Création Rapide Produit (OCR)',
        'SmartPurchase',
        `Produit créé : ${newProductData.name}, ID: ${newProductId}`
      );

      // Map this item in the cart to the new product
      if (draftItemToCreate) {
        setCart(prev => prev.map(item => {
          if (item.lineId === draftItemToCreate.lineId) {
            return {
              ...item,
              productId: newProductId,
              productName: newProductData.name,
              taxRate: newProductData.taxRate,
              isDraft: false
            };
          }
          return item;
        }));
      }

      toast.success("Produit enregistré et ajouté à l'inventaire avec succès !");
      setIsQuickCreateOpen(false);
      setDraftItemToCreate(null);
    } catch (err: any) {
      toast.error(`Erreur de création : ${err.message}`);
    }
  };

  return {
    draftItemToCreate, setDraftItemToCreate,
    isQuickCreateOpen, setIsQuickCreateOpen,
    linkingItem, setLinkingItem,
    isLinkModalOpen, setIsLinkModalOpen,
    quickCreateSearchFilter, setQuickCreateSearchFilter,
    quickCreateForm, setQuickCreateForm,
    linkDraftToProduct,
    openQuickCreateModal,
    handleQuickCreateSubmit
  };
}
