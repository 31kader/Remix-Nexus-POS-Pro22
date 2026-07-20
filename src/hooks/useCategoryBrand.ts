import React, { useState } from 'react';
import { localDb } from '../database';
import { Category, Brand, Product } from '../types';
import { useCoreStore } from '../store/useCoreStore';

export function useCategoryBrand() {
  const categories = useCoreStore(state => state.categories);
  const products = useCoreStore(state => state.products);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [categoryImageUrl, setCategoryImageUrl] = useState('');
  
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandLogo, setNewBrandLogo] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');

  const openCategoryModal = (category?: Category | null) => {
    if (category) {
      setEditingCategory(category);
      setNewCategoryName(category.name);
      setParentCategoryId(category.parentId || '');
      setCategoryImageUrl(category.imageUrl || '');
    } else {
      setEditingCategory(null);
      setNewCategoryName('');
      setParentCategoryId('');
      setCategoryImageUrl('');
    }
    setIsCategoryModalOpen(true);
  };

  const openBrandModal = (brand?: Brand | null) => {
    if (brand) {
      setEditingBrand(brand);
      setNewBrandName(brand.name);
      setNewBrandLogo(brand.logoUrl || '');
      setNewBrandDesc(brand.description || '');
    } else {
      setEditingBrand(null);
      setNewBrandName('');
      setNewBrandLogo('');
      setNewBrandDesc('');
    }
    setIsBrandModalOpen(true);
  };

  const handleSaveCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      alert("Le nom de la catégorie est obligatoire.");
      return;
    }

    // Duplicate check
    const duplicate = categories.find(c => 
      c.name.toLowerCase() === trimmedName.toLowerCase() && 
      c.parentId === (parentCategoryId || null) &&
      c.id !== editingCategory?.id
    );

    if (duplicate) {
      alert(`Une catégorie nommée "${duplicate.name}" existe déjà à ce niveau.`);
      return;
    }

    try {
      const catData = {
        name: trimmedName,
        parentId: parentCategoryId || null,
        imageUrl: categoryImageUrl || null,
        level: parentCategoryId ? 2 : 1
      };

      if (editingCategory) {
        await localDb.update(`categories/${editingCategory.id}`, catData);
      } else {
        const newId = 'cat_' + Math.random().toString(36).substring(2, 10);
        await localDb.insert(`categories/${newId}`, {
          id: newId,
          ...catData
        });
      }
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
      setParentCategoryId('');
      setCategoryImageUrl('');
      setEditingCategory(null);
    } catch (error: any) {
      alert("Erreur: " + error.message);
    }
  };

  const handleDeleteCategory = async (categoryToDelete?: Category | null) => {
    const targetCategory = categoryToDelete || editingCategory;
    if (!targetCategory) return;
    const hasProducts = products.some(p => p.categoryId === targetCategory.id);
    if (hasProducts) {
      alert("Impossible de supprimer une catégorie contenant des produits.");
      return;
    }
    const hasSubcategories = categories.some(c => c.parentId === targetCategory.id);
    if (hasSubcategories) {
      alert("Impossible de supprimer une catégorie contenant des sous-catégories.");
      return;
    }
    try {
      await localDb.delete(`categories/${targetCategory.id}`);
      
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
      setParentCategoryId('');
      setCategoryImageUrl('');
      setEditingCategory(null);
    } catch (error: any) {
      alert("Erreur: " + error.message);
    }
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const brandData = {
        name: newBrandName,
        logoUrl: newBrandLogo,
        description: newBrandDesc
      };
      if (editingBrand) {
        await localDb.update(`brands/${editingBrand.id}`, brandData);
      } else {
        const newId = 'brand_' + Math.random().toString(36).substring(2, 10);
        await localDb.insert(`brands/${newId}`, {
          id: newId,
          ...brandData,
          createdAt: new Date().toISOString()
        });
      }
      setIsBrandModalOpen(false);
      setEditingBrand(null);
      setNewBrandName('');
      setNewBrandLogo('');
      setNewBrandDesc('');
    } catch (err: any) {
      alert("Erreur: " + err.message);
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    const hasProducts = products.some(p => p.brandId === brand.id);
    if (hasProducts) {
      alert("Impossible de supprimer une marque contenant des produits.");
      return;
    }
    if (!window.confirm(`Supprimer la marque "${brand.name}" ?`)) return;
    try {
      await localDb.delete(`brands/${brand.id}`);
    } catch (err: any) {
      alert("Erreur: " + err.message);
    }
  };

  return {
    isCategoryModalOpen, setIsCategoryModalOpen,
    isBrandModalOpen, setIsBrandModalOpen,
    editingCategory, setEditingCategory,
    editingBrand, setEditingBrand,
    newCategoryName, setNewCategoryName,
    parentCategoryId, setParentCategoryId,
    categoryImageUrl, setCategoryImageUrl,
    newBrandName, setNewBrandName,
    newBrandLogo, setNewBrandLogo,
    newBrandDesc, setNewBrandDesc,
    openCategoryModal, openBrandModal,
    handleSaveCategory, handleDeleteCategory,
    handleSaveBrand, handleDeleteBrand
  }
}

