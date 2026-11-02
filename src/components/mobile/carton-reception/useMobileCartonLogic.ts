import { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Supplier } from '../../../types';
import { CartonIntakeItem, CartonRecognitionResult } from '../../../services/cartonIntakeService';
import { useCoreStore } from '../../../store/useCoreStore';
import { localDb } from '../../../services/LocalDatabase';
import { toast } from 'sonner';
import {
  useMobileCartonQuickCreate,
  useMobileCartonPhotoRecognition,
  useMobileCartonActions
} from './logic';
import {
  calculateCartonCostChange,
  calculateUnitCostChange,
  calculateUnitsPerCartonChange
} from './logic/cartonCostCalculation';
import { useMobileCartonScanning } from './logic/useMobileCartonScanning';

export interface UseMobileCartonLogicParams {
  initialProducts?: Product[];
  suppliers?: Supplier[];
  onAddToCartDirectly?: (item: any) => void;
  currentUserId?: string;
  currentUserName?: string;
}

export function useMobileCartonLogic({
  initialProducts = [],
  onAddToCartDirectly,
  currentUserId,
  currentUserName
}: UseMobileCartonLogicParams) {
  const storeProducts = useCoreStore(s => s.products);
  const effectiveProducts = useMemo(() => {
    if (initialProducts && initialProducts.length > 0) return initialProducts;
    return storeProducts || [];
  }, [initialProducts, storeProducts]);

  useEffect(() => {
    if (effectiveProducts.length === 0) {
      localDb.get('products').then(snap => {
        if (snap?.exists() && snap.val()) {
          const list = Object.values(snap.val()) as Product[];
          if (list.length > 0) {
            useCoreStore.getState().setProducts(list);
          }
        }
      }).catch(() => {});
    }
  }, [effectiveProducts.length]);

  const [viewMode, setViewMode] = useState<'inventory' | 'scanner'>('inventory');

  // Recherche & Produit
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Colisage & Prix
  const [unitsPerCarton, setUnitsPerCarton] = useState<number>(12);
  const [cartonCount, setCartonCount] = useState<number>(1);
  const [cartonCostPrice, setCartonCostPrice] = useState<number>(0);
  const [unitCostPrice, setUnitCostPrice] = useState<number>(0);

  // Validation
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [recentIntakes, setRecentIntakes] = useState<CartonIntakeItem[]>([]);

  // Auto add to cart
  const [autoAddToCart, setAutoAddToCart] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nexus_carton_auto_add') === 'true';
    } catch {
      return false;
    }
  });

  const toggleAutoAddToCart = () => {
    const nextVal = !autoAddToCart;
    setAutoAddToCart(nextVal);
    try {
      localStorage.setItem('nexus_carton_auto_add', String(nextVal));
    } catch {}
    if (nextVal) {
      toast.success("⚡ Mode 'Ajout direct au panier' activé !");
    } else {
      toast.info("Mode 'Ajout direct' désactivé.");
    }
  };

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    const colisage = Number(product.unitsPerParent) || 12;
    setUnitsPerCarton(colisage);

    const unitCost = Number(product.costPrice) || Number(product.cost_price) || 0;
    setUnitCostPrice(unitCost);
    setCartonCostPrice(Number((unitCost * colisage).toFixed(2)));

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, []);

  const resetForm = useCallback(() => {
    setSelectedProduct(null);
    setSearchQuery('');
    setCartonCount(1);
    setUnitsPerCarton(12);
    setCartonCostPrice(0);
    setUnitCostPrice(0);
  }, []);

  // Module Reconnaissance Photo & Templates
  const {
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
  } = useMobileCartonPhotoRecognition({
    effectiveProducts,
    autoAddToCart,
    onAddToCartDirectly,
    currentUserName,
    onCartonRecognized: (match: CartonRecognitionResult) => {
      handleSelectProduct(match.product);
      const colisage = match.template.unitsPerCarton || Number(match.product.unitsPerParent) || 12;
      const cartonCost = match.template.cartonCostPrice || 0;
      const unitCost = match.template.unitCostPrice || Number(match.product.costPrice) || 0;
      setUnitsPerCarton(colisage);
      setCartonCostPrice(cartonCost);
      setUnitCostPrice(unitCost);
    },
    onAutoAddSuccess: (saved: CartonIntakeItem) => {
      setRecentIntakes(prev => [saved, ...prev.slice(0, 4)]);
    },
    resetForm: () => {
      setCartonPhoto('');
      setRecognitionResult(null);
      resetForm();
    }
  });

  const fullResetForm = useCallback(() => {
    setCartonPhoto('');
    setRecognitionResult(null);
    resetForm();
  }, [resetForm, setCartonPhoto, setRecognitionResult]);

  // Module Quick Create
  const {
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
  } = useMobileCartonQuickCreate({
    onProductCreated: (newProduct: Product) => {
      handleSelectProduct(newProduct);
    },
    onClearSearch: () => setSearchQuery('')
  });

  const totalUnits = cartonCount * unitsPerCarton;
  const totalCostAmount = Number((cartonCostPrice * cartonCount).toFixed(2));

  // Module Actions (Panier & Validation directe)
  const { handleSendToCart: doSendToCart, handleDirectValidate: doDirectValidate } = useMobileCartonActions({
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
    resetForm: fullResetForm
  });

  const handleSendToCart = () => doSendToCart(setIsSubmitting);
  const handleDirectValidate = () => doDirectValidate(setIsSubmitting);

  // Module Scan & Douchette
  const { handleBarcodeScan } = useMobileCartonScanning({
    effectiveProducts,
    savedTemplates,
    handleSelectProduct,
    setUnitsPerCarton,
    setCartonCostPrice,
    setUnitCostPrice,
    setCartonPhoto,
    setSearchQuery,
    setQuickBarcode,
    setQuickName,
    setIsScannerOpen
  });

  const handleCartonCostChange = (val: number) => {
    const res = calculateCartonCostChange(val, unitsPerCarton);
    setCartonCostPrice(res.cartonCostPrice);
    setUnitCostPrice(res.unitCostPrice);
  };

  const handleUnitCostChange = (val: number) => {
    const res = calculateUnitCostChange(val, unitsPerCarton);
    setCartonCostPrice(res.cartonCostPrice);
    setUnitCostPrice(res.unitCostPrice);
  };

  const handleUnitsPerCartonChange = (val: number) => {
    const res = calculateUnitsPerCartonChange(val, unitCostPrice, cartonCostPrice);
    setUnitsPerCarton(res.unitsPerCarton);
    setCartonCostPrice(res.cartonCostPrice);
    setUnitCostPrice(res.unitCostPrice);
  };

  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return (effectiveProducts || []).slice(0, 8);
    }
    const cleanQuery = normalize(searchQuery);
    const terms = cleanQuery.split(/\s+/).filter(Boolean);
    const rawLower = searchQuery.trim().toLowerCase();

    return (effectiveProducts || [])
      .filter(p => {
        const nameNorm = normalize(p.name);
        const skuNorm = (p.sku || '').toLowerCase();
        const barcodeNorm = (p.barcode || '').toLowerCase();
        const refNorm = (p.reference || '').toLowerCase();
        const catNorm = normalize(p.category || '');

        if (barcodeNorm.includes(rawLower) || skuNorm.includes(rawLower) || refNorm.includes(rawLower)) {
          return true;
        }

        const combined = `${nameNorm} ${catNorm} ${skuNorm} ${barcodeNorm}`;
        return terms.every(term => combined.includes(term));
      })
      .slice(0, 20);
  }, [effectiveProducts, searchQuery]);

  return {
    effectiveProducts,
    viewMode,
    setViewMode,
    cartonPhoto,
    setCartonPhoto,
    isCompressing,
    fileInputRef,
    searchQuery,
    setSearchQuery,
    selectedProduct,
    setSelectedProduct,
    isScannerOpen,
    setIsScannerOpen,
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
    unitsPerCarton,
    cartonCount,
    setCartonCount,
    cartonCostPrice,
    unitCostPrice,
    isSubmitting,
    recentIntakes,
    isRecognizing,
    recognitionResult,
    autoAddToCart,
    toggleAutoAddToCart,
    isTemplatesModalOpen,
    setIsTemplatesModalOpen,
    savedTemplates,
    loadTemplates,
    handleSelectProduct,
    handleBarcodeScan,
    handleCartonCostChange,
    handleUnitCostChange,
    handleUnitsPerCartonChange,
    filteredProducts,
    handlePhotoCapture,
    handleQuickCreateProduct,
    totalUnits,
    totalCostAmount,
    resetForm: fullResetForm,
    handleSendToCart,
    handleDirectValidate
  };
}
