import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../supabase';
import { localDb } from '../services/LocalDatabase';
import { enqueueStockAdjustment } from '../services/SyncService';
import { getLocalValue } from '../lib/local-db';
import { Product, Category, CompanySettings, Brand, normalizeBatches } from '../types';
import { generateUniqueId, logAction, sanitizeProductForSupabase } from '../lib/utils';
import { useProductVoiceAndAI } from '../components/product/useProductVoiceAndAI';
import { useProductImageUpload } from '../components/product/useProductImageUpload';
import { useProductBarcodeLookup } from '../components/product/useProductBarcodeLookup';

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
    stock: '0', minStock: '5', categoryId: '', brandId: '', supplier: '', 
    unit: 'unité', sku: '', barcode: '', status: 'active', imageUrl: '', description: '',
    imageUrls: [] as string[],
    isBundle: false, wholesalePrice: '', onlinePrice: '', tags: '', location: '', reference: '', expirationDate: '', batchNumber: '', showInPos: true, isQuickSelect: false, bundleItems: [] as { productId: string; quantity: number }[],
    parentId: '', unitsPerParent: '', autoUnpack: false,
    quantityDiscounts: [] as { minQuantity: number; discountPrice: number }[],
    operationalCosts: { packaging: '', shipping: '', other: '' },
    batches: [] as { id: string; batchNumber: string; expirationDate: string; stock: number }[],
    useMultiExpiry: false,
    damagedStock: '0'
  });

  // Map d'indexation O(1) ultra-rapide des SKU et codes-barres existants
  const productCodesMap = useMemo(() => {
    const map = new Map<string, Product>();
    (products || []).forEach(p => {
      if (!p) return;
      if (p.sku) map.set(p.sku.trim().toLowerCase(), p);
      if (p.barcode) map.set(p.barcode.trim().toLowerCase(), p);
    });
    return map;
  }, [products]);

  // Validation stricte O(1) de l'unicité du SKU et du Code-barres
  useEffect(() => {
    const trimmedSku = formData.sku ? formData.sku.trim().toLowerCase() : '';
    const trimmedBarcode = formData.barcode ? formData.barcode.trim().toLowerCase() : '';
    
    if (!trimmedSku && !trimmedBarcode) {
      setSkuError(null);
      return;
    }
    
    const dupSku = trimmedSku ? productCodesMap.get(trimmedSku) : null;
    const dupBarcode = trimmedBarcode ? productCodesMap.get(trimmedBarcode) : null;
    
    const duplicate = (dupSku && dupSku.id !== editingProduct?.id) 
      ? dupSku 
      : ((dupBarcode && dupBarcode.id !== editingProduct?.id) ? dupBarcode : null);
    
    if (duplicate) {
      const conflictCode = duplicate.barcode || duplicate.sku || 'N/A';
      setSkuError(`Le Code-barres/SKU "${conflictCode}" est déjà utilisé par : "${duplicate.name}"`);
    } else {
      setSkuError(null);
    }
  }, [formData.sku, formData.barcode, productCodesMap, editingProduct]);

  const formatDisplayDate = (isoDate: string) => {
    if (!isoDate) return '';
    try {
      const cleanDate = isoDate.split('T')[0].split(' ')[0].trim();
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${d} ${m} ${y.slice(-2)}`;
      }
      return '';
    } catch (e) {
      return '';
    }
  };

  const parseDisplayDate = (display: string) => {
    if (!display) return '';
    const numbers = display.replace(/\D/g, '');
    if (numbers.length < 6) return '';
    
    const day = numbers.substring(0, 2);
    const month = numbers.substring(2, 4);
    const year = numbers.substring(4, 6);
    
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return '';
    }
    
    const fullYear = `20${year}`;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
        barcode: (!editingProduct.id ? '' : (editingProduct as any).barcode) || '',
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
        batches: normalizeBatches(editingProduct.batches),
        useMultiExpiry: editingProduct.useMultiExpiry || false,
        damagedStock: (editingProduct.damagedStock ?? 0).toString()
      });
    } else {
      setParentCatId('');
      setSubCatId('');
      setDisplayExpDate('');
      setFormData({ 
        name: '', price: '', costPrice: '', taxRate: settings?.taxRate?.toString() || '0', 
        stock: '', minStock: '5', categoryId: '', brandId: '', supplier: '', 
        unit: 'unité', sku: '', barcode: '', status: 'active', imageUrl: '', description: '',
        imageUrls: [],
        isBundle: false, wholesalePrice: '', onlinePrice: '', tags: '', location: '', reference: '', expirationDate: '', batchNumber: '', showInPos: true, isQuickSelect: false, bundleItems: [], quantityDiscounts: [],
        operationalCosts: { packaging: '', shipping: '', other: '' },
        parentId: '', unitsPerParent: '1', autoUnpack: false,
        batches: [],
        useMultiExpiry: false,
        damagedStock: '0'
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
      toast.error("Le nom du produit est obligatoire.");
      return;
    }
    
    if (skuError) {
      toast.error("Veuillez corriger le SKU / Code-barre en double avant d'enregistrer.");
      return;
    }

    const newPrice = parseFloat(formData.price || '0');
    const newCostPrice = parseFloat(formData.costPrice || '0');
    const newStock = parseFloat(formData.stock || '0');
    
    if (newPrice < 0 || newCostPrice < 0) {
      toast.error("Les prix ne peuvent pas être négatifs.");
      return;
    }

    if (newStock < -1000) {
      toast.error("La valeur de stock semble incorrecte.");
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
    if (!formData.useMultiExpiry && (!earliestDate || earliestDate.trim() === '') && displayExpDate) {
      earliestDate = parseDisplayDate(displayExpDate);
    }
    let primaryBatch = formData.batchNumber;
    const safeBatches = normalizeBatches(formData.batches);
    const batchSum = safeBatches.reduce((acc, b) => acc + (Number(b.stock) || 0), 0);
    const finalStock = (formData.useMultiExpiry && safeBatches.length > 0) ? batchSum : newStock;

    if (formData.useMultiExpiry && safeBatches.length > 0) {
      const sorted = [...safeBatches].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
      earliestDate = sorted[0].expirationDate;
      primaryBatch = sorted[0].batchNumber;
    }

    const chosenCatId = subCatId || parentCatId || formData.categoryId || 'uncategorized';
    const chosenBrandId = formData.brandId || null;

    const data = {
      ...formData,
      name: trimmedName,
      sku: trimmedSku,
      barcode: formData.barcode ? formData.barcode.trim() : null,
      supplier: formData.supplier ? formData.supplier.trim() : '',
      showInPos: formData.showInPos !== false,
      isQuickSelect: !!formData.isQuickSelect,
      damagedStock: parseFloat(formData.damagedStock || '0') || 0,
      price: newPrice,
      costPrice: newCostPrice,
      taxRate: parseFloat(formData.taxRate || '0'),
      stock: finalStock,
      minStock: parseFloat(formData.minStock || '5'),
      unitsPerParent: formData.unitsPerParent ? parseFloat(formData.unitsPerParent) : null,
      parentId: formData.parentId || null,
      autoUnpack: !!formData.autoUnpack,
      wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : null,
      onlinePrice: formData.onlinePrice ? parseFloat(formData.onlinePrice) : null,
      tags: formData.tags ? (Array.isArray(formData.tags) ? formData.tags : formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)) : [],
      categoryId: chosenCatId,
      brandId: chosenBrandId,
      updatedAt: new Date().toISOString(),
      expirationDate: earliestDate ? earliestDate.trim() : null,
      batchNumber: primaryBatch || null,
      priceHistory,
      operationalCosts: {
        packaging: formData.operationalCosts.packaging ? parseFloat(formData.operationalCosts.packaging) : null,
        shipping: formData.operationalCosts.shipping ? parseFloat(formData.operationalCosts.shipping) : null,
        other: formData.operationalCosts.other ? parseFloat(formData.operationalCosts.other) : null,
      }
    };

    try {
      // Fermer immédiatement la fenêtre pour une réactivité instantanée
      onClose();

      if (editingProduct && editingProduct.id) {
        const oldStock = Number(editingProduct.stock) || 0;
        const stockChanged = finalStock !== oldStock;

        if (stockChanged) {
          enqueueStockAdjustment(editingProduct.id, finalStock, {
            mode: 'set',
            newQuantity: finalStock,
            reason: 'Correction manuelle formulaire produit'
          });
        }

        const updatedProduct = {
          ...editingProduct,
          ...data,
          stock: finalStock,
          id: editingProduct.id
        } as Product;
        
        window.dispatchEvent(new CustomEvent('product-cache-update', { detail: updatedProduct }));
        localDb.update(`products/${editingProduct.id}`, updatedProduct).catch(console.error);

        if (isSupabaseConfigured) {
          const supabasePayload = sanitizeProductForSupabase(updatedProduct);
          if (stockChanged) {
            delete supabasePayload.stock;
          }
          delete supabasePayload.stock; delete supabasePayload.id; delete supabasePayload.created_at; supabase.from('products').update(supabasePayload).eq('id', editingProduct.id).then(({ error }: { error: any }) => {
            if (error) console.warn('[Supabase Direct Update] Retrying via SyncService:', error.message);
          }).catch(console.warn);
        }

        logAction(user?.uid || 'admin', user?.displayName || 'Utilisateur', 'Modification Produit', 'Inventaire', `Produit: ${data.name}, SKU: ${data.sku}`);
        toast.success(`Produit "${data.name}" mis à jour !`);
      } else {
        const newProductId = Math.random().toString(36).substring(2, 11);
        const createdProduct = {
          ...data,
          id: newProductId,
          createdAt: new Date().toISOString()
        } as Product;
        
        window.dispatchEvent(new CustomEvent('product-cache-update', { detail: createdProduct }));
        localDb.insert(`products/${newProductId}`, createdProduct).catch(console.error);

        if (isSupabaseConfigured) {
          const supabasePayload = sanitizeProductForSupabase(createdProduct);
          supabase.from('products').insert(supabasePayload).then(({ error }: { error: any }) => {
            if (error) console.warn('[Supabase Direct Insert] Retrying via SyncService:', error.message);
          }).catch(console.warn);
        }

        logAction(user?.uid || 'admin', user?.displayName || 'Utilisateur', 'Création Produit', 'Inventaire', `Produit: ${data.name}, SKU: ${data.sku}`);
        toast.success(`Nouveau produit "${data.name}" créé avec succès !`);
      }
    } catch (error: any) {
      console.error("Error submitting product:", error);
      toast.error("Erreur lors de la sauvegarde: " + error.message);
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
