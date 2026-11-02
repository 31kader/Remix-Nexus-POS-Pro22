import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Category, Product } from '../../../types';
import { PricingScope } from './bulkPricingTypes';

interface BulkPricingScopeSelectorProps {
  scope: PricingScope;
  setScope: (scope: PricingScope) => void;
  targetCategoryId: string;
  setTargetCategoryId: (id: string) => void;
  products: Product[];
  filteredProducts: Product[];
  selectedProductIds: string[];
  categories: Category[];
  targetProductsCount: number;
  isApplying: boolean;
  isZeroConfirmOpen: boolean;
  setIsZeroConfirmOpen: (open: boolean) => void;
  zeroConfirmInput: string;
  setZeroConfirmInput: (val: string) => void;
  onOpenZeroStockConfirm: () => void;
  onConfirmZeroAllStock: () => void;
}

export const BulkPricingScopeSelector = memo(function BulkPricingScopeSelector({
  scope,
  setScope,
  targetCategoryId,
  setTargetCategoryId,
  products,
  filteredProducts,
  selectedProductIds,
  categories,
  targetProductsCount,
  isApplying,
  isZeroConfirmOpen,
  setIsZeroConfirmOpen,
  zeroConfirmInput,
  setZeroConfirmInput,
  onOpenZeroStockConfirm,
  onConfirmZeroAllStock,
}: BulkPricingScopeSelectorProps) {
  return (
    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
          1. Articles à mettre à jour ({targetProductsCount} articles ciblés)
        </span>
        <button
          type="button"
          onClick={onOpenZeroStockConfirm}
          disabled={isApplying}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
        >
          <AlertTriangle size={13} />
          <span>Mettre Stock à 0 ({targetProductsCount})</span>
        </button>
      </div>

      {isZeroConfirmOpen && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
            <AlertTriangle size={15} />
            <span>Confirmer la remise à 0 de {targetProductsCount} article(s)</span>
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400">
            Cette action est irréversible (Local & Supabase). Pour valider, tapez <strong>ZERO</strong> :
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={zeroConfirmInput}
              onChange={(e) => setZeroConfirmInput(e.target.value)}
              placeholder="Tapez ZERO"
              autoFocus
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-rose-500 text-center flex-1 min-w-[120px] max-w-[160px]"
            />
            <button
              type="button"
              onClick={onConfirmZeroAllStock}
              disabled={zeroConfirmInput.trim().toUpperCase() !== 'ZERO' || isApplying}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isApplying ? "Application..." : "Confirmer"}
            </button>
            <button
              type="button"
              onClick={() => setIsZeroConfirmOpen(false)}
              disabled={isApplying}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { id: 'all', label: `Tous (${products.length})` },
          { id: 'filtered', label: `Liste filtrée (${filteredProducts.length})` },
          { id: 'selected', label: `Cochés (${selectedProductIds.length})`, disabled: selectedProductIds.length === 0 },
          { id: 'category', label: 'Par Catégorie' }
        ].map(opt => (
          <button
            key={opt.id}
            type="button"
            disabled={opt.disabled}
            onClick={() => setScope(opt.id as any)}
            className={cn(
              "py-2.5 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
              scope === opt.id
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {scope === 'category' && (
        <select
          value={targetCategoryId}
          onChange={e => setTargetCategoryId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
        >
          <option value="">-- Choisir une catégorie --</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
    </div>
  );
});
