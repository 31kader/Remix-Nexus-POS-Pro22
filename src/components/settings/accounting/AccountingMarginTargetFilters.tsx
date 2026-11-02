import React from 'react';
import { Category, Supplier, Brand } from '../../../types';

interface AccountingMarginTargetFiltersProps {
  categories: Category[];
  suppliers: Supplier[];
  brands: Brand[];
  execSearch: string;
  setExecSearch: (val: string) => void;
  execCategory: string;
  setExecCategory: (val: string) => void;
  execSupplier: string;
  setExecSupplier: (val: string) => void;
  execBrand: string;
  setExecBrand: (val: string) => void;
  execStockFilter: 'all' | 'in_stock' | 'out_of_stock' | 'low_stock';
  setExecStockFilter: (val: 'all' | 'in_stock' | 'out_of_stock' | 'low_stock') => void;
  execMinCost: string;
  setExecMinCost: (val: string) => void;
  execMaxCost: string;
  setExecMaxCost: (val: string) => void;
  execBaseMode: 'from_cost' | 'from_retail';
  setExecBaseMode: (val: 'from_cost' | 'from_retail') => void;
  execRounding: '5' | '10' | '1' | 'none';
  setExecRounding: (val: '5' | '10' | '1' | 'none') => void;
}

export const AccountingMarginTargetFilters: React.FC<AccountingMarginTargetFiltersProps> = ({
  categories,
  suppliers,
  brands,
  execSearch,
  setExecSearch,
  execCategory,
  setExecCategory,
  execSupplier,
  setExecSupplier,
  execBrand,
  setExecBrand,
  execStockFilter,
  setExecStockFilter,
  execMinCost,
  setExecMinCost,
  execMaxCost,
  setExecMaxCost,
  execBaseMode,
  setExecBaseMode,
  execRounding,
  setExecRounding
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Recherche texte */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">1. Recherche (Nom / SKU)</label>
        <input
          type="text"
          placeholder="Ex: Huile, Boisson, 613..."
          value={execSearch}
          onChange={e => setExecSearch(e.target.value)}
          className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 text-xs font-bold text-slate-900 dark:text-white"
        />
      </div>

      {/* 2. Catégorie / Rayon */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">2. Catégorie / Rayon</label>
        <select
          value={execCategory}
          onChange={e => setExecCategory(e.target.value)}
          className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
        >
          <option value="ALL">Toutes les catégories ({categories.length})</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 3. Fournisseur */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">3. Fournisseur</label>
        <select
          value={execSupplier}
          onChange={e => setExecSupplier(e.target.value)}
          className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
        >
          <option value="ALL">Tous les fournisseurs ({suppliers.length})</option>
          {suppliers.map((s: any) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* 4. Marque */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">4. Marque</label>
        <select
          value={execBrand}
          onChange={e => setExecBrand(e.target.value)}
          className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
        >
          <option value="ALL">Toutes les marques ({brands.length})</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* 5. État du Stock */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">5. État du Stock</label>
        <select
          value={execStockFilter}
          onChange={e => setExecStockFilter(e.target.value as any)}
          className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
        >
          <option value="all">Tous les articles (Stock & Rupture)</option>
          <option value="in_stock">En Stock uniquement (&gt; 0)</option>
          <option value="out_of_stock">En Rupture uniquement (0)</option>
          <option value="low_stock">En Alerte Stock Faible</option>
        </select>
      </div>

      {/* 6. Tranche de Prix d'Achat */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">6. Prix d'Achat Min / Max (DA)</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            placeholder="Min DA"
            value={execMinCost}
            onChange={e => setExecMinCost(e.target.value)}
            className="w-1/2 h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
          />
          <input
            type="number"
            placeholder="Max DA"
            value={execMaxCost}
            onChange={e => setExecMaxCost(e.target.value)}
            className="w-1/2 h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* 7. Base de Calcul */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">7. Base de Calcul</label>
        <select
          value={execBaseMode}
          onChange={e => setExecBaseMode(e.target.value as any)}
          className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
        >
          <option value="from_cost">Depuis Prix d'Achat (+% Marge)</option>
          <option value="from_retail">Depuis Prix Détail (-% Remise)</option>
        </select>
      </div>

      {/* 8. Arrondi Commercial */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">8. Arrondi des Prix Calculés</label>
        <select
          value={execRounding}
          onChange={e => setExecRounding(e.target.value as any)}
          className="w-full h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs font-bold text-slate-900 dark:text-white"
        >
          <option value="5">Arrondir à 5 DA (Recommandé)</option>
          <option value="10">Arrondir à 10 DA</option>
          <option value="1">Arrondir à 1 DA</option>
          <option value="none">Aucun arrondi (Exact)</option>
        </select>
      </div>
    </div>
  );
};
