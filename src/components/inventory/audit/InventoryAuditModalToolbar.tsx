import React from 'react';
import { Search, X, Printer, EyeOff, Eye, Layers } from 'lucide-react';
import { Product } from '../../../types';
import { cn } from '../../../lib/utils';

interface InventoryAuditModalToolbarProps {
  search: string;
  setSearch: (s: string) => void;
  filteredProducts: Product[];
  addProductToAudit: (p: Product) => void;
  categoryToAdd: string;
  setCategoryToAdd: (c: string) => void;
  uniqueCategories: string[];
  handleAddCategoryToAudit: () => void;
  handleAddLowStockProducts: () => void;
  itemFilter: 'all' | 'discrepancy' | 'ok';
  setItemFilter: (f: 'all' | 'discrepancy' | 'ok') => void;
  auditItemsCount: number;
  discrepancyCount: number;
  okCount: number;
  blindCountMode: boolean;
  setBlindCountMode: React.Dispatch<React.SetStateAction<boolean>>;
  handlePrintInventorySheetA4: () => void;
}

export const InventoryAuditModalToolbar: React.FC<InventoryAuditModalToolbarProps> = ({
  search,
  setSearch,
  filteredProducts,
  addProductToAudit,
  categoryToAdd,
  setCategoryToAdd,
  uniqueCategories,
  handleAddCategoryToAudit,
  handleAddLowStockProducts,
  itemFilter,
  setItemFilter,
  auditItemsCount,
  discrepancyCount,
  okCount,
  blindCountMode,
  setBlindCountMode,
  handlePrintInventorySheetA4,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Recherche d'article à ajouter */}
        <div className="lg:col-span-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
          <input
            type="text"
            placeholder="Scanner code-barres ou chercher un produit à compter..."
            className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-slate-900 dark:text-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}

          {search.trim().length >= 2 && (
            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-40 divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredProducts.length === 0 ? (
                <p className="p-3 text-center text-xs text-slate-400">Aucun produit trouvé.</p>
              ) : (
                filteredProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      addProductToAudit(p);
                      setSearch('');
                    }}
                    className="w-full p-2.5 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-500">
                        SKU: {p.sku || p.barcode || 'N/A'} • Stock théorique: <strong>{p.stock}</strong>
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold">
                      + Ajouter
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Ajout rapide par Rayon / Catégorie */}
        <div className="lg:col-span-4 flex items-center gap-2">
          <select
            value={categoryToAdd}
            onChange={e => setCategoryToAdd(e.target.value)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="">+ Charger tout un Rayon / Catégorie...</option>
            {uniqueCategories.map(c => (
              <option key={c} value={c}>
                Rayon : {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!categoryToAdd}
            onClick={handleAddCategoryToAudit}
            className="px-3.5 py-2.5 rounded-xl bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold shrink-0 cursor-pointer"
          >
            Charger
          </button>
        </div>

        {/* Ajout rapide Alertes Stock */}
        <div className="lg:col-span-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddLowStockProducts}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Layers size={14} /> + Articles en Alerte Stock
          </button>
        </div>
      </div>

      {/* Sous-barre : Filtres Écarts + Mode Aveugle + Bouton Impression Fiche A4 */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `Tous (${auditItemsCount})` },
            {
              id: 'discrepancy',
              label: `🔴 Avec Écart (${discrepancyCount})`
            },
            {
              id: 'ok',
              label: `🟢 Conformes (${okCount})`
            }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setItemFilter(f.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                itemFilter === f.id
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBlindCountMode(v => !v)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all',
              blindCountMode
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
            )}
            title="Masque le stock théorique sur la feuille imprimée pour obliger le magasinier à compter réellement"
          >
            {blindCountMode ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{blindCountMode ? 'Comptage à l’aveugle : Actif' : 'Comptage à l’aveugle : Inactif'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintInventorySheetA4}
            className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:opacity-90 text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer size={14} /> Imprimer Fiche de Comptage A4
          </button>
        </div>
      </div>
    </div>
  );
};
