import React, { useState, useEffect } from 'react';
import { localDb } from '../services/LocalDatabase';
import { getLocalValue } from '../lib/local-db';
import { Product, Category, CompanySettings, Brand } from '../types';
import { generateUniqueId, logAction, sanitizeProductForSupabase } from '../lib/utils';
import { useProductVoiceAndAI } from './product/useProductVoiceAndAI';
import { useProductImageUpload } from './product/useProductImageUpload';
import { useProductBarcodeLookup } from './product/useProductBarcodeLookup';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  products: Product[];
  categories: Category[];
  settings: CompanySettings;
  user: any;
  brands: Brand[];
  setIsPurchaseHistoryModalOpen?: (v: boolean) => void;
  setIsSalesHistoryModalOpen?: (v: boolean) => void;
  setActiveTab?: (tab: string) => void;
}

export function useProductFormLogic(props: ProductFormModalProps) {
  const {
    isOpen, onClose, editingProduct, products, categories, settings, user, brands,
    setIsPurchaseHistoryModalOpen, setIsSalesHistoryModalOpen, setActiveTab
  } = props;

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [parentCatId, setParentCatId] = useState<string>('');
  const [subCatId, setSubCatId] = useState<string>('');
  const [displayExpDate, setDisplayExpDate] = useState('');
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchExpiry, setNewBatchExpiry] = useState('');
  const [newBatchStock, setNewBatchStock] = useState('');

  const [formData, setFormData] = useState({
    name: '', price: '', costPrice: '', taxRate: settings?.taxRate?.toString() || '0', 
    stock: '', minStock: '5', categoryId: '', brandId: '', supplier: '', 
    unit: 'unité', sku: '', status: 'active', imageUrl: '', description: '',
    imageUrls: [] as string[],
    isBundle: false, wholesalePrice: '', onlinePrice: '', tags: '', location: '', reference: '', expirationDate: '', batchNumber: '', showInPos: true, isQuickSelect: false, bundleItems: [] as { productId: string; quantity: number }[],
    parentId: '', unitsPerParent: '', autoUnpack: false,
    quantityDiscounts: [] as { minQuantity: number; discountPrice: number }[],
    operationalCosts: { packaging: '', shipping: '', other: '' },
    batches: [] as { id: string; batchNumber: string; expirationDate: string; stock: number }[],
    useMultiExpiry: false
  });

  // SKU Uniqueness validation
  useEffect(() => {
    if (!formData.sku) {
      setSkuError(null);
      return;
    }
    const duplicate = products.find(p => p.sku === formData.sku && p.id !== editingProduct?.id);
    if (duplicate) {
      setSkuError(`Ce code-barre est déjà utilisé par le produit : "${duplicate.name}"`);
    } else {
      setSkuError(null);
    }
  }, [formData.sku, products, editingProduct]);

  const formatDisplayDate = (isoDate: string) => {
    if (!isoDate) return '';
    try {
      const [y, m, d] = isoDate.split('-');
      if (!y || !m || !d) return '';
      return `${d} ${m} ${y.substring(2)}`;
    } catch (e) {
      return '';
    }
  };

  const parseDisplayDate = (display: string) => {
    const numbers = display.replace(/\D/g, '');
    if (numbers.length < 6) return '';
    
    const day = numbers.substring(0, 2);
    const month = numbers.substring(2, 4);
    const year = numbers.substring(4, 6);
    
    if (parseInt(day) > 31 || parseInt(month) > 12) return '';
    
    const fullYear = `20${year}`;
    return `${fullYear}-${month}-${day}`;
  };

  useEffect(() => {
    if (editingProduct) {
      const currentCat = categories.find(c => c.id === editingProduct.categoryId);
      if (currentCat && currentCat.parentId) {
        setParentCatId(currentCat.parentId);
        setSubCatId(currentCat.id);
      } else {
        setParentCatId(editingProduct.categoryId || '');
        setSubCatId('');
      }

      setDisplayExpDate(formatDisplayDate(editingProduct.expirationDate || ''));
      setFormData({
        name: editingProduct.name || '',
        price: (editingProduct.price ?? '').toString(),
        costPrice: (editingProduct.costPrice ?? 0).toString(),
        taxRate: (editingProduct.taxRate ?? settings?.taxRate ?? 0).toString(),
        stock: (editingProduct.stock ?? 0).toString(),
        minStock: (editingProduct.minStock ?? 5).toString(),
        categoryId: editingProduct.categoryId || '',
        brandId: editingProduct.brandId || '',
        supplier: editingProduct.supplier || '',
        unit: editingProduct.unit || 'unité',
        sku: editingProduct.sku || '',
        status: editingProduct.status || 'active',
        imageUrl: editingProduct.imageUrl || '',
        imageUrls: editingProduct.imageUrls || (editingProduct.imageUrl ? [editingProduct.imageUrl] : []),
        description: editingProduct.description || '',
        isBundle: editingProduct.isBundle || false,
        wholesalePrice: (editingProduct.wholesalePrice ?? '').toString(),
        onlinePrice: (editingProduct.onlinePrice ?? '').toString(),
        tags: (editingProduct.tags || []).join(', '),
        location: editingProduct.location || '',
        reference: editingProduct.reference || '',
        batchNumber: editingProduct.batchNumber || '',
        parentId: editingProduct.parentId || '',
        unitsPerParent: editingProduct.unitsPerParent?.toString() || '',
        autoUnpack: editingProduct.autoUnpack || false,
        expirationDate: editingProduct.expirationDate || '',
        showInPos: editingProduct.showInPos !== false,
        isQuickSelect: editingProduct.isQuickSelect || false,
        bundleItems: editingProduct.bundleItems || [],
        quantityDiscounts: editingProduct.quantityDiscounts || [],
        operationalCosts: {
          packaging: editingProduct.operationalCosts?.packaging?.toString() || '',
          shipping: editingProduct.operationalCosts?.shipping?.toString() || '',
          other: editingProduct.operationalCosts?.other?.toString() || ''
        },
        batches: editingProduct.batches || [],
        useMultiExpiry: editingProduct.useMultiExpiry || false
      });
    } else {
      setParentCatId('');
      setSubCatId('');
      setDisplayExpDate('');
      setFormData({ 
        name: '', price: '', costPrice: '', taxRate: settings?.taxRate?.toString() || '0', 
        stock: '', minStock: '5', categoryId: '', brandId: '', supplier: '', 
        unit: 'unité', sku: '', status: 'active', imageUrl: '', description: '',
        imageUrls: [],
        isBundle: false, wholesalePrice: '', onlinePrice: '', tags: '', location: '', reference: '', expirationDate: '', batchNumber: '', showInPos: true, isQuickSelect: false, bundleItems: [], quantityDiscounts: [],
        operationalCosts: { packaging: '', shipping: '', other: '' },
        parentId: '', unitsPerParent: '1', autoUnpack: false,
        batches: [],
        useMultiExpiry: false
      });
    }
  }, [editingProduct, settings?.taxRate, isOpen]);

  const handleDisplayDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 6) val = val.substring(0, 6);
    
    let formatted = '';
    if (val.length > 0) formatted += val.substring(0, 2);
    if (val.length > 2) formatted += ' ' + val.substring(2, 4);
    if (val.length > 4) formatted += ' ' + val.substring(4, 6);
    
    setDisplayExpDate(formatted);
    if (val.length === 6) {
      const iso = parseDisplayDate(formatted);
      setFormData(prev => ({ ...prev, expirationDate: iso }));
    } else {
      setFormData(prev => ({ ...prev, expirationDate: '' }));
    }
  };

  // Delegate sub-hooks
  const {
    isVoiceScanning,
    isGeneratingDescription,
    startVoiceEntry,
    generateAiDescription
  } = useProductVoiceAndAI({ formData, setFormData, brands });

  const {
    isUploadingImage,
    handleImageUpload,
    removeImage
  } = useProductImageUpload({ formData, setFormData });

  const { isGlobalLoading } = useProductBarcodeLookup({
    sku: formData.sku,
    name: formData.name,
    products,
    categories,
    setFormData
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (
        (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'submit') ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        e.preventDefault();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = formData.name.trim();
    const trimmedSku = formData.sku.trim();
    
    if (!trimmedName) {
      alert("Le nom du produit est obligatoire.");
      return;
    }
    
    if (skuError) {
      alert("Veuillez corriger l'erreur de SKU/Code-barre.");
      return;
    }

    const newPrice = parseFloat(formData.price || '0');
    const newCostPrice = parseFloat(formData.costPrice || '0');
    const newStock = parseFloat(formData.stock || '0');
    
    if (newPrice < 0 || newCostPrice < 0) {
      alert("Les prix ne peuvent pas être négatifs.");
      return;
    }

    if (newStock < -1000) {
      alert("La valeur de stock semble incorrecte.");
      return;
    }
    
    let priceHistory = editingProduct?.priceHistory || [];
    
    if (editingProduct && (editingProduct.price !== newPrice || editingProduct.costPrice !== newCostPrice)) {
      priceHistory = [
        {
          price: editingProduct.price,
          costPrice: editingProduct.costPrice || 0,
          timestamp: new Date().toISOString(),
          reason: 'Mise à jour manuelle'
        },
        ...priceHistory
      ].slice(0, 50);
    }

    let earliestDate = formData.expirationDate;
    let primaryBatch = formData.batchNumber;
    if (formData.useMultiExpiry && formData.batches && formData.batches.length > 0) {
      const sorted = [...formData.batches].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
      earliestDate = sorted[0].expirationDate;
      primaryBatch = sorted[0].batchNumber;
    }

    const data = {
      ...formData,
      name: trimmedName,
      sku: trimmedSku,
      price: newPrice,
      costPrice: newCostPrice,
      taxRate: parseFloat(formData.taxRate || '0'),
      stock: newStock,
      minStock: parseFloat(formData.minStock || '5'),
      unitsPerParent: formData.unitsPerParent ? parseFloat(formData.unitsPerParent) : null,
      parentId: formData.parentId || null,
      autoUnpack: !!formData.autoUnpack,
      wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : null,
      onlinePrice: formData.onlinePrice ? parseFloat(formData.onlinePrice) : null,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      categoryId: subCatId || parentCatId || '',
      updatedAt: new Date().toISOString(),
      expirationDate: earliestDate,
      batchNumber: primaryBatch,
      priceHistory,
      operationalCosts: {
        packaging: formData.operationalCosts.packaging ? parseFloat(formData.operationalCosts.packaging) : null,
        shipping: formData.operationalCosts.shipping ? parseFloat(formData.operationalCosts.shipping) : null,
        other: formData.operationalCosts.other ? parseFloat(formData.operationalCosts.other) : null,
      }
    };

    try {
      const submitPayload = sanitizeProductForSupabase(data);

      if (!submitPayload.category_id || submitPayload.category_id === "") {
        submitPayload.category_id = 'uncategorized';
      } else {
        const localCategories = getLocalValue('categories') || {};
        const existingCat = localCategories[submitPayload.category_id];
        
        if (!existingCat) {
          console.warn("Category not found in database, defaulting to 'uncategorized':", submitPayload.category_id);
          submitPayload.category_id = 'uncategorized';
        }
      }

      // Ensure 'uncategorized' category exists in database before inserting/updating product
      if (submitPayload.category_id === 'uncategorized') {
        await localDb.insert('categories/uncategorized', { id: 'uncategorized', name: 'Sans catégorie', level: 1 });
      }

      let brandId = submitPayload.brand_id;
      if (brandId === "") brandId = null;
      submitPayload.brand_id = brandId;

      if (brandId) {
        const localBrands = getLocalValue('brands') || {};
        const existingBrand = localBrands[brandId];
          
        if (!existingBrand) {
          console.warn("Brand not found in database, removing from product update:", brandId);
          submitPayload.brand_id = null;
        }
      }

      if (editingProduct && editingProduct.id) {
        const updatedProduct = {
          ...editingProduct,
          ...data,
          id: editingProduct.id
        } as Product;
        
        window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProduct }));
        
        await localDb.update(`products/${editingProduct.id}`, updatedProduct);
        
        logAction(user?.uid || 'admin', user?.displayName || 'Utilisateur', 'Modification Produit', 'Inventaire', `Produit: ${data.name}, SKU: ${data.sku}`);
      } else {
        const newProductId = Math.random().toString(36).substring(2, 11);
        const createdProduct = {
          ...data,
          id: newProductId,
          createdAt: new Date().toISOString()
        } as Product;
        
        window.dispatchEvent(new CustomEvent('product-cache-update', { detail: createdProduct }));
        
        await localDb.insert(`products/${newProductId}`, createdProduct);

        logAction(user?.uid || 'admin', user?.displayName || 'Utilisateur', 'Création Produit', 'Inventaire', `Produit: ${data.name}, SKU: ${data.sku}`);
      }
      onClose();
    } catch (error: any) {
      console.error("Error submitting product:", error);
      alert("Erreur: " + error.message);
    }
  };

  return {
    isScannerOpen,
    setIsScannerOpen,
    isGeneratingDescription,
    isVoiceScanning,
    isGlobalLoading,
    isUploadingImage,
    parentCatId,
    setParentCatId,
    subCatId,
    setSubCatId,
    displayExpDate,
    setDisplayExpDate,
    newBatchNumber,
    setNewBatchNumber,
    newBatchExpiry,
    setNewBatchExpiry,
    newBatchStock,
    setNewBatchStock,
    formData,
    setFormData,
    skuError,
    // Add setters back to keep type signatures matched if any external callers use them
    setIsGeneratingDescription: () => {},
    setIsVoiceScanning: () => {},
    setIsGlobalLoading: () => {},
    setIsUploadingImage: () => {},
    setSkuError,
    formatDisplayDate,
    parseDisplayDate,
    handleDisplayDateChange,
    generateAiDescription,
    handleImageUpload,
    removeImage,
    handleSubmit,
    startVoiceEntry,
    handleKeyDown
  };
}
