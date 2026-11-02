import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product } from '../../../types';
import { 
  CartonTemplate, 
  getCartonTemplates, 
  saveCartonTemplate, 
  deleteCartonTemplate, 
  quickAdjustCartonStock,
  compressCartonImage,
  detectBarcodeFromImage
} from '../../../services/cartonIntakeService';
import { useAuthStore } from '../../../store/useAuthStore';
import { toast } from 'sonner';
import { uploadImageBlobToStorage } from '../../../supabase';
import {
  EnrichedCarton,
  computeEnrichedCartons,
  filterAndSortCartons,
  computeCartonTotals
} from './cartonManagerFilterUtils';

export type { EnrichedCarton };

export function useCartonManagerLogic(products: Product[]) {
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const currentUserName = (profile as any)?.fullName || (profile as any)?.full_name || (profile as any)?.name || user?.email?.split('@')[0] || 'Admin';

  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  const [editingProductSheet, setEditingProductSheet] = useState<Product | null>(null);
  const [isProductSheetModalOpen, setIsProductSheetModalOpen] = useState<boolean>(false);

  const [templates, setTemplates] = useState<CartonTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'carton_stock' | 'updated'>('updated');

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<CartonTemplate | null>(null);

  const [adjustingTemplate, setAdjustingTemplate] = useState<CartonTemplate | null>(null);
  const [cartonDeltaInput, setCartonDeltaInput] = useState<number>(1);
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [isFormScannerOpen, setIsFormScannerOpen] = useState<boolean>(false);

  const [formProductId, setFormProductId] = useState<string>('');
  const [formProductSearch, setFormProductSearch] = useState<string>('');
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [formSku, setFormSku] = useState<string>('');
  const [formUnitsPerCarton, setFormUnitsPerCarton] = useState<number>(12);
  const [formCartonCostPrice, setFormCartonCostPrice] = useState<number>(0);
  const [formRetailPrice, setFormRetailPrice] = useState<number>(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>('');
  const [isFormSaving, setIsFormSaving] = useState<boolean>(false);
  const formFileInputRef = useRef<HTMLInputElement | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getCartonTemplates();
      setTemplates(list);
    } catch (err) {
      console.error('Erreur chargement carton templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const formSelectedProduct = useMemo(() => {
    if (!formProductId) return null;
    return products.find(p => p.id === formProductId) || null;
  }, [formProductId, products]);

  const filteredProductOptions = useMemo(() => {
    if (!formProductSearch.trim()) return products.slice(0, 15);
    const q = formProductSearch.toLowerCase().trim();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [products, formProductSearch]);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormProductId('');
    setFormProductSearch('');
    setFormBarcode('');
    setFormSku('');
    setFormUnitsPerCarton(12);
    setFormCartonCostPrice(0);
    setFormRetailPrice(0);
    setFormWholesalePrice(0);
    setFormPhotoUrl('');
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (tmpl: CartonTemplate) => {
    setEditingTemplate(tmpl);
    setFormProductId(tmpl.productId);
    setFormProductSearch(tmpl.productName);
    setFormBarcode(tmpl.barcode || '');
    setFormSku(tmpl.sku || '');
    setFormUnitsPerCarton(tmpl.unitsPerCarton || 12);
    setFormCartonCostPrice(tmpl.cartonCostPrice || 0);
    setFormRetailPrice(tmpl.retailPrice || 0);
    setFormWholesalePrice(tmpl.wholesalePrice || 0);
    setFormPhotoUrl(tmpl.cartonPhotoUrl || '');
    setIsEditModalOpen(true);
  };

  const handleSelectProductInForm = (p: Product) => {
    setFormProductId(p.id);
    setFormProductSearch(p.name);
    const colisage = Number(p.unitsPerParent) || formUnitsPerCarton || 12;
    setFormUnitsPerCarton(colisage);

    const unitCost = Number(p.costPrice) || Number(p.cost_price) || 0;
    const unitPrice = Number(p.price) || 0;
    const unitWholesale = Number(p.wholesalePrice) || Number(p.wholesale_price) || (unitPrice * 0.9);

    if (formCartonCostPrice === 0 && unitCost > 0) {
      setFormCartonCostPrice(Number((unitCost * colisage).toFixed(2)));
    }
    if (formRetailPrice === 0 && unitPrice > 0) {
      setFormRetailPrice(Number((unitPrice * colisage).toFixed(2)));
    }
    if (formWholesalePrice === 0 && unitWholesale > 0) {
      setFormWholesalePrice(Number((unitWholesale * colisage).toFixed(2)));
    }
    if (!formPhotoUrl && (p as any).cartonPhotoUrl) {
      setFormPhotoUrl((p as any).cartonPhotoUrl);
    }
    if (!formSku) {
      setFormSku(`CART-${p.sku || p.barcode || p.id.slice(0, 6)}`);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading("Compression et téléversement...", { id: 'photo-proc' });
      const compressed = await compressCartonImage(file, 1024, 0.85);

      if (!formBarcode) {
        const detected = await detectBarcodeFromImage(compressed);
        if (detected) {
          setFormBarcode(detected);
          toast.success(`Code-barres détecté : ${detected}`);
        }
      }

      let targetUrl = compressed;
      try {
        const blob = await (await fetch(compressed)).blob();
        const uploadedUrl = await uploadImageBlobToStorage(blob, 'cartons', 'image/webp');
        if (uploadedUrl) targetUrl = uploadedUrl;
      } catch (_) {}

      setFormPhotoUrl(targetUrl);
      toast.dismiss('photo-proc');
    } catch {
      toast.error("Erreur lors du traitement de l'image", { id: 'photo-proc' });
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId) {
      toast.error("Veuillez sélectionner le produit unitaire lié");
      return;
    }

    const linkedProd = products.find(p => p.id === formProductId);
    const prodName = linkedProd?.name || editingTemplate?.productName || 'Produit';

    setIsFormSaving(true);
    try {
      await saveCartonTemplate({
        id: editingTemplate?.id,
        productId: formProductId,
        productName: prodName,
        unitsPerCarton: Number(formUnitsPerCarton) || 12,
        cartonCostPrice: Number(formCartonCostPrice) || 0,
        unitCostPrice: Number((Number(formCartonCostPrice) / (Number(formUnitsPerCarton) || 12)).toFixed(2)),
        retailPrice: Number(formRetailPrice) || 0,
        wholesalePrice: Number(formWholesalePrice) || 0,
        sku: formSku.trim() || undefined,
        cartonPhotoUrl: formPhotoUrl,
        barcode: formBarcode.trim() || undefined,
        productBarcode: linkedProd?.barcode
      });

      toast.success(editingTemplate ? "Modèle de carton mis à jour !" : "Nouveau carton enregistré !");
      setIsEditModalOpen(false);
      await loadTemplates();
    } catch {
      toast.error("Erreur lors de l'enregistrement du carton");
    } finally {
      setIsFormSaving(false);
    }
  };

  const handleDeleteTemplate = async (tmpl: CartonTemplate) => {
    if (!window.confirm(`Supprimer le modèle de carton pour "${tmpl.productName}" ?`)) return;
    try {
      await deleteCartonTemplate(tmpl.id);
      toast.success("Modèle de carton supprimé.");
      await loadTemplates();
    } catch {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleQuickAdjust = async () => {
    if (!adjustingTemplate || cartonDeltaInput === 0) return;
    const linkedProd = products.find(p => p.id === adjustingTemplate.productId);
    if (!linkedProd) {
      toast.error("Produit lié introuvable.");
      return;
    }

    setIsAdjusting(true);
    try {
      const res = await quickAdjustCartonStock(
        adjustingTemplate,
        cartonDeltaInput,
        linkedProd,
        user?.uid,
        currentUserName
      );
      toast.success(`Stock mis à jour : ${res.newCartonStock} cartons (${res.newUnitsStock} pièces)`);
      setAdjustingTemplate(null);
      setCartonDeltaInput(1);
    } catch {
      toast.error("Erreur lors de l'ajustement du stock.");
    } finally {
      setIsAdjusting(false);
    }
  };

  const enrichedCartons = useMemo<EnrichedCarton[]>(() => {
    return computeEnrichedCartons(templates, products);
  }, [templates, products]);

  const filteredCartons = useMemo(() => {
    return filterAndSortCartons(enrichedCartons, searchQuery, stockFilter, sortBy);
  }, [enrichedCartons, searchQuery, stockFilter, sortBy]);

  const totals = useMemo(() => {
    return computeCartonTotals(enrichedCartons);
  }, [enrichedCartons]);

  return {
    historyProduct,
    setHistoryProduct,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    editingProductSheet,
    setEditingProductSheet,
    isProductSheetModalOpen,
    setIsProductSheetModalOpen,
    templates,
    isLoading,
    searchQuery,
    setSearchQuery,
    stockFilter,
    setStockFilter,
    sortBy,
    setSortBy,
    isEditModalOpen,
    setIsEditModalOpen,
    editingTemplate,
    adjustingTemplate,
    setAdjustingTemplate,
    cartonDeltaInput,
    setCartonDeltaInput,
    isAdjusting,
    zoomedImage,
    setZoomedImage,
    isFormScannerOpen,
    setIsFormScannerOpen,
    formProductId,
    formProductSearch,
    setFormProductSearch,
    formBarcode,
    setFormBarcode,
    formSku,
    setFormSku,
    formUnitsPerCarton,
    setFormUnitsPerCarton,
    formCartonCostPrice,
    setFormCartonCostPrice,
    formRetailPrice,
    setFormRetailPrice,
    formWholesalePrice,
    setFormWholesalePrice,
    formPhotoUrl,
    setFormPhotoUrl,
    isFormSaving,
    formFileInputRef,
    formSelectedProduct,
    filteredProductOptions,
    handleOpenCreate,
    handleOpenEdit,
    handleSelectProductInForm,
    handlePhotoUpload,
    handleSaveForm,
    handleDeleteTemplate,
    handleQuickAdjust,
    filteredCartons,
    totals
  };
}
