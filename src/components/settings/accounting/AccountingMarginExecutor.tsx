import React from 'react';
import { TrendingUp, Percent, Filter, RefreshCw, Zap } from 'lucide-react';
import { CompanySettings } from '../../../types';
import { useAccountingMarginsLogic } from './useAccountingMarginsLogic';
import { AccountingMarginTargetFilters } from './AccountingMarginTargetFilters';
import { AccountingMarginSimulationPreview } from './AccountingMarginSimulationPreview';

interface AccountingMarginExecutorProps {
  formData: CompanySettings;
  updateField: (key: keyof CompanySettings | string, value: any) => void;
  marginsLogic: ReturnType<typeof useAccountingMarginsLogic>;
}

export function AccountingMarginExecutor({
  formData,
  updateField,
  marginsLogic
}: AccountingMarginExecutorProps) {
  const {
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
    execOnlyMissingPrices,
    setExecOnlyMissingPrices,
    execBaseMode,
    setExecBaseMode,
    execRounding,
    setExecRounding,
    applyToRetail,
    setApplyToRetail,
    applyToWholesale,
    setApplyToWholesale,
    applyToOnline,
    setApplyToOnline,
    isExecutingMargins,
    targetedProducts,
    computeNewPrices,
    resetFilters,
    handleExecuteMarginsOnFiltered
  } = marginsLogic;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-5 shadow-xs">
      <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-500" />
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              Règles de Marges par Défaut (Détail, Gros & En Ligne) + Exécution Filtrée
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Définissez vos pourcentages et exécutez-les sur tout ou partie du catalogue grâce aux 8 filtres de ciblage
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase self-start sm:self-auto">
          {targetedProducts.length} article(s) ciblé(s)
        </span>
      </div>

      {/* Les 3 Pourcentages de Marge */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1">
              <Percent size={12} /> 1. Marge Détail (%)
            </label>
            <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToRetail}
                onChange={e => setApplyToRetail(e.target.checked)}
                className="rounded accent-emerald-600"
              />
              Exécuter
            </label>
          </div>
          <input
            type="number"
            value={formData.defaultRetailMarginPercent ?? 30}
            onChange={e => updateField('defaultRetailMarginPercent', parseFloat(e.target.value) || 0)}
            className="w-full h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 text-slate-900 dark:text-white text-sm font-black outline-none focus:border-emerald-500"
          />
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1">
              <Percent size={12} /> 2. Marge Prix de Gros (%)
            </label>
            <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToWholesale}
                onChange={e => setApplyToWholesale(e.target.checked)}
                className="rounded accent-amber-600"
              />
              Exécuter
            </label>
          </div>
          <input
            type="number"
            value={formData.defaultWholesaleMarginPercent ?? 15}
            onChange={e => updateField('defaultWholesaleMarginPercent', parseFloat(e.target.value) || 0)}
            className="w-full h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 text-slate-900 dark:text-white text-sm font-black outline-none focus:border-amber-500"
          />
        </div>

        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase flex items-center gap-1">
              <Percent size={12} /> 3. Marge Prix En Ligne (%)
            </label>
            <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToOnline}
                onChange={e => setApplyToOnline(e.target.checked)}
                className="rounded accent-blue-600"
              />
              Exécuter
            </label>
          </div>
          <input
            type="number"
            value={formData.defaultOnlineMarginPercent ?? 25}
            onChange={e => updateField('defaultOnlineMarginPercent', parseFloat(e.target.value) || 0)}
            className="w-full h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 text-slate-900 dark:text-white text-sm font-black outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Panneau des 8 Filtres d'Exécution */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-zinc-200 uppercase">
            <Filter size={14} className="text-indigo-500" />
            Filtres de Ciblage pour Exécuter la Règle
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={11} /> Réinitialiser les filtres
          </button>
        </div>

        <AccountingMarginTargetFilters
          categories={categories}
          suppliers={suppliers}
          brands={brands}
          execSearch={execSearch}
          setExecSearch={setExecSearch}
          execCategory={execCategory}
          setExecCategory={setExecCategory}
          execSupplier={execSupplier}
          setExecSupplier={setExecSupplier}
          execBrand={execBrand}
          setExecBrand={setExecBrand}
          execStockFilter={execStockFilter}
          setExecStockFilter={setExecStockFilter}
          execMinCost={execMinCost}
          setExecMinCost={setExecMinCost}
          execMaxCost={execMaxCost}
          setExecMaxCost={setExecMaxCost}
          execBaseMode={execBaseMode}
          setExecBaseMode={setExecBaseMode}
          execRounding={execRounding}
          setExecRounding={setExecRounding}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-zinc-700/70">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={execOnlyMissingPrices}
              onChange={e => setExecOnlyMissingPrices(e.target.checked)}
              className="rounded accent-indigo-600"
            />
            Ne modifier que les articles dont le Prix de Gros ou En Ligne est égal à 0 DA
          </label>

          <button
            type="button"
            disabled={isExecutingMargins || targetedProducts.length === 0}
            onClick={handleExecuteMarginsOnFiltered}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
          >
            <Zap size={15} />
            {isExecutingMargins
              ? 'Application en cours...'
              : `Exécuter sur ${targetedProducts.length} article(s) filtré(s)`}
          </button>
        </div>

        {/* Mini-Aperçu des 4 premiers articles touchés */}
        <AccountingMarginSimulationPreview
          targetedProducts={targetedProducts}
          computeNewPrices={computeNewPrices}
          applyToRetail={applyToRetail}
          applyToWholesale={applyToWholesale}
          applyToOnline={applyToOnline}
        />
      </div>
    </div>
  );
}
