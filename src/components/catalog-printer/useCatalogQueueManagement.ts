import React, { useState } from 'react';
import { Product } from '../../types';
import { toast } from 'sonner';
import { CustomOverrides } from './types';

interface UseCatalogQueueManagementProps {
  products: Product[];
  selectedProductIds: string[];
  setSelectedProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  queueProducts: Product[];
  customOverrides: CustomOverrides;
  setCustomOverrides: React.Dispatch<React.SetStateAction<CustomOverrides>>;
  selectedCategoryToAdd: string;
  setSelectedCategoryToAdd: (cat: string) => void;
  searchResults: Product[];
  setSearch: (s: string) => void;
}

export function useCatalogQueueManagement({
  products,
  selectedProductIds,
  setSelectedProductIds,
  queueProducts,
  customOverrides,
  setCustomOverrides,
  selectedCategoryToAdd,
  setSelectedCategoryToAdd,
  searchResults,
  setSearch
}: UseCatalogQueueManagementProps) {
  const addProductToQueue = (product: Product) => {
    if (!selectedProductIds.includes(product.id)) {
      setSelectedProductIds(prev => [...prev, product.id]);
      toast.success(`"${product.name}" ajouté au catalogue A4`);
    } else {
      toast.info(`"${product.name}" est déjà dans le catalogue`);
    }
  };

  const removeProductFromQueue = (id: string) => {
    setSelectedProductIds(prev => prev.filter(pid => pid !== id));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      const q = e.currentTarget.value.trim().toLowerCase();
      const exact = searchResults.find(
        p => String(p.barcode || '').toLowerCase() === q || String(p.sku || '').toLowerCase() === q
      );
      addProductToQueue(exact || searchResults[0]);
      setSearch('');
    }
  };

  const handleAddByCategory = () => {
    if (!selectedCategoryToAdd) return;
    const matchingIds = products
      .filter(p => p.categoryId === selectedCategoryToAdd && (Number(p.stock) || 0) > 0)
      .slice(0, 50)
      .map(p => p.id);
    if (matchingIds.length === 0) {
      toast.info('Aucun produit en stock trouvé dans cette catégorie.');
      return;
    }
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...matchingIds])));
    toast.success(`${matchingIds.length} produit(s) de la catégorie ajoutés.`);
    setSelectedCategoryToAdd('');
  };

  const handleQuickPick = (mode: 'top_stock' | 'newest' | 'low_stock') => {
    let picked: Product[] = [];
    if (mode === 'top_stock') {
      picked = [...products]
        .filter(p => (Number(p.stock) || 0) > 0)
        .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0))
        .slice(0, 12);
    } else if (mode === 'newest') {
      picked = [...products]
        .filter(p => (Number(p.stock) || 0) > 0)
        .slice(-12)
        .reverse();
    } else if (mode === 'low_stock') {
      picked = [...products]
        .filter(p => (Number(p.stock) || 0) <= (Number(p.minStock ?? (p as any).lowStockThreshold) || 5))
        .slice(0, 18);
    }
    if (picked.length === 0) {
      toast.info('Aucun article trouvé pour cette sélection rapide.');
      return;
    }
    const ids = picked.map(p => p.id);
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...ids])));
    toast.success(`${picked.length} article(s) ajoutés à la sélection.`);
  };

  const handleSortQueue = (criterion: 'name_asc' | 'price_asc' | 'price_desc' | 'stock_desc') => {
    const sorted = [...queueProducts];
    if (criterion === 'name_asc') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (criterion === 'price_asc') sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (criterion === 'price_desc') sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (criterion === 'stock_desc') sorted.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
    setSelectedProductIds(sorted.map(p => p.id));
    toast.success('Sélection triée avec succès.');
  };

  const handleApplyBadgeToAll = (badge: string) => {
    const nextOverrides = { ...customOverrides };
    for (const id of selectedProductIds) {
      nextOverrides[id] = { ...(nextOverrides[id] || {}), badge };
    }
    setCustomOverrides(nextOverrides);
    toast.success(badge ? `Badge "${badge}" appliqué à toute la sélection.` : 'Badges effacés.');
  };

  const updateProductOverride = (
    productId: string,
    patch: Partial<{ customPrice?: number; oldPrice?: number; badge?: string }>
  ) => {
    setCustomOverrides(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        ...patch
      }
    }));
  };

  return {
    addProductToQueue,
    removeProductFromQueue,
    handleSearchKeyDown,
    handleAddByCategory,
    handleQuickPick,
    handleSortQueue,
    handleApplyBadgeToAll,
    updateProductOverride
  };
}
