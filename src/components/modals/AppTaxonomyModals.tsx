import React, { Suspense, lazy } from 'react';
import { Category, Brand } from '../../types';

const CategoryModal = lazy(() => import('../CategoryModal').then(m => ({ default: m.CategoryModal })));
const BrandModal = lazy(() => import('../BrandModal').then(m => ({ default: m.BrandModal })));

export interface AppTaxonomyModalsProps {
  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (open: boolean) => void;
  editingCategory: Category | null;
  setEditingCategory: (c: Category | null) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  parentCategoryId: string;
  setParentCategoryId: (id: string) => void;
  categoryImageUrl: string;
  setCategoryImageUrl: (url: string) => void;
  handleSaveCategory: () => Promise<void>;
  handleDeleteCategory: (category: Category) => Promise<void>;
  categories: Category[];

  isBrandModalOpen: boolean;
  setIsBrandModalOpen: (open: boolean) => void;
  editingBrand: Brand | null;
  setEditingBrand: (b: Brand | null) => void;
  newBrandName: string;
  setNewBrandName: (name: string) => void;
  newBrandLogo: string;
  setNewBrandLogo: (logo: string) => void;
  newBrandDesc: string;
  setNewBrandDesc: (desc: string) => void;
  handleSaveBrand: (e: React.FormEvent) => Promise<void>;
  brands: Brand[];
}

export const AppTaxonomyModals: React.FC<AppTaxonomyModalsProps> = ({
  isCategoryModalOpen,
  setIsCategoryModalOpen,
  editingCategory,
  setEditingCategory,
  newCategoryName,
  setNewCategoryName,
  parentCategoryId,
  setParentCategoryId,
  categoryImageUrl,
  setCategoryImageUrl,
  handleSaveCategory,
  handleDeleteCategory,
  categories,
  isBrandModalOpen,
  setIsBrandModalOpen,
  editingBrand,
  setEditingBrand,
  newBrandName,
  setNewBrandName,
  newBrandLogo,
  setNewBrandLogo,
  newBrandDesc,
  setNewBrandDesc,
  handleSaveBrand,
  brands
}) => {
  return (
    <>
      {isCategoryModalOpen && (
        <Suspense fallback={null}>
          <CategoryModal 
            isOpen={isCategoryModalOpen} 
            onClose={() => {
              setIsCategoryModalOpen(false);
              setEditingCategory(null);
              setNewCategoryName('');
              setParentCategoryId('');
              setCategoryImageUrl('');
            }}
            onSave={handleSaveCategory}
            onDelete={() => {
              if (editingCategory) handleDeleteCategory(editingCategory);
            }}
            name={newCategoryName}
            setName={setNewCategoryName}
            parentId={parentCategoryId}
            setParentId={setParentCategoryId}
            imageUrl={categoryImageUrl}
            setImageUrl={setCategoryImageUrl}
            categories={categories}
            editingCategory={editingCategory}
          />
        </Suspense>
      )}

      {isBrandModalOpen && (
        <Suspense fallback={null}>
          <BrandModal
            isOpen={isBrandModalOpen}
            onClose={() => {
              setIsBrandModalOpen(false);
              setEditingBrand(null);
              setNewBrandName('');
              setNewBrandLogo('');
              setNewBrandDesc('');
            }}
            onSave={handleSaveBrand}
            name={newBrandName}
            setName={setNewBrandName}
            logo={newBrandLogo}
            setLogo={setNewBrandLogo}
            description={newBrandDesc}
            setDescription={setNewBrandDesc}
            editingBrand={editingBrand}
          />
        </Suspense>
      )}
    </>
  );
};
