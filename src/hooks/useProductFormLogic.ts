import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, CompanySettings, Brand } from '../types';
import { useProductVoiceAndAI } from '../components/product/useProductVoiceAndAI';
import { useProductImageUpload } from '../components/product/useProductImageUpload';
import { useProductBarcodeLookup } from '../components/product/useProductBarcodeLookup';
import { 
  formatDisplayDate, 
  parseDisplayDate, 
  handleDisplayDateChangeHelper 
} from '../components/product/productFormDateHelpers';
import { 
  buildInitialFormData, 
  ProductFormData 
} from '../components/product/productFormInitialState';
import { executeProductSubmit } from '../components/product/productFormSubmitService';

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
    isOpen, onClose, editingProduct, products, categories, settings, user, brands
  } = props;

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [parentCatId, setParentCatId] = useState<string>('');
  const [subCatId, setSubCatId] = useState<string>('');
  const [displayExpDate, setDisplayExpDate] = useState('');
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchExpiry, setNewBatchExpiry] = useState('');
  const [newBatchStock, setNewBatchStock] = useState('');

  const [formData, setFormData] = useState<ProductFormData>(() =>
    buildInitialFormData(editingProduct, settings?.taxRate)
  );

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
      setFormData(buildInitialFormData(editingProduct, settings?.taxRate));
    } else {
      setParentCatId('');
      setSubCatId('');
      setDisplayExpDate('');
      setFormData(buildInitialFormData(null, settings?.taxRate));
    }
  }, [editingProduct, settings?.taxRate, isOpen, categories]);

  const handleDisplayDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleDisplayDateChangeHelper(e, setDisplayExpDate, setFormData);
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
    if (skuError) return;
    await executeProductSubmit({
      formData,
      editingProduct,
      displayExpDate,
      subCatId,
      parentCatId,
      user,
      onClose
    });
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
