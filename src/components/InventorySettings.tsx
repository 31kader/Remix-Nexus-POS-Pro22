import React, { useState, useMemo } from 'react';
import { FolderTree, Award, Package, Layers } from 'lucide-react';
import { Category, Brand, Product } from '../types';
import { cn } from '../lib/utils';
import { Categories } from './Categories';
import { Brands } from './Brands';

interface InventorySettingsProps {
  categories: Category[];
  brands: Brand[];
  products?: Product[];
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onAddCategory: (parentId?: string) => void;
  onEditBrand: (brand: Brand) => void;
  onDeleteBrand: (brand: Brand) => void;
  onAddBrand: () => void;
}

export function InventorySettings({
  categories,
  brands,
  products = [],
  onEditCategory,
  onDeleteCategory,
  onAddCategory,
  onEditBrand,
  onDeleteBrand,
  onAddBrand
}: InventorySettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'brands'>('categories');

  const stats = useMemo(() => {
    const rootCount = categories.filter((c: any) => !c.parentId).length;
    const subCount = categories.length - rootCount;
    const categorizedProducts = products.filter(p => Boolean(p.categoryId || (p as any).category)).length;
    const brandedProducts = products.filter(p => Boolean(p.brandId || (p as any).brand)).length;
    return { rootCount, subCount, categorizedProducts, brandedProducts };
  }, [categories, products]);

  return (
    <div className="space-y-6 pb-8">
      {/* En-tête et KPIs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Classification & Structure Catalogue
              </h2>
              <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm">
                Gérez l'organisation hiérarchique des rayons, sous-catégories et marques de votre magasin.
              </p>
            </div>
          </div>
        </div>

        {/* Cartes KPI compactes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400">
              <FolderTree size={12} className="text-indigo-500" /> Rayons & Sous-Cat.
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{categories.length}</span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                ({stats.rootCount} principales)
              </span>
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400">
              <Award size={12} className="text-amber-500" /> Marques Actives
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{brands.length}</span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                marques
              </span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400">
              <Package size={12} className="text-emerald-500" /> Produits Classés
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                {stats.categorizedProducts}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                / {products.length} réf.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sélecteur d'onglets Catégories / Marques */}
      <div className="flex items-center gap-2 bg-slate-200/70 dark:bg-zinc-900 p-1.5 rounded-xl w-fit border border-slate-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('categories')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer",
            activeSubTab === 'categories'
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800"
          )}
        >
          <FolderTree size={17} />
          Catégories & Rayons
          <span
            className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums",
              activeSubTab === 'categories'
                ? "bg-white/20 text-white"
                : "bg-slate-300/70 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
            )}
          >
            {categories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('brands')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer",
            activeSubTab === 'brands'
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800"
          )}
        >
          <Award size={17} />
          Marques & Fabricants
          <span
            className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums",
              activeSubTab === 'brands'
                ? "bg-white/20 text-white"
                : "bg-slate-300/70 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
            )}
          >
            {brands.length}
          </span>
        </button>
      </div>

      {/* Conteneur Principal Clair / Sombre */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 min-h-[500px] shadow-xs">
        {activeSubTab === 'categories' ? (
          <Categories
            categories={categories}
            products={products}
            onEdit={onEditCategory}
            onDelete={onDeleteCategory}
            onAdd={onAddCategory}
          />
        ) : (
          <Brands
            brands={brands}
            products={products}
            onEdit={onEditBrand}
            onDelete={onDeleteBrand}
            onAdd={onAddBrand}
          />
        )}
      </div>
    </div>
  );
}
