import React from 'react';
import { Search, Download } from 'lucide-react';
import { Card } from '../../ui';
import { Category } from '../../../types';
import { StockFilterStatus, StockSortBy } from './stockValueTypes';

interface StockValueFilterBarProps {
  categories: Category[];
  totalProductsCount: number;
  stockFilterSearch: string;
  setStockFilterSearch: (val: string) => void;
  stockFilterCategory: string;
  setStockFilterCategory: (cat: string) => void;
  stockFilterStatus: StockFilterStatus;
  setStockFilterStatus: (status: StockFilterStatus) => void;
  sortBy: StockSortBy;
  setSortBy: (sort: StockSortBy) => void;
  onPageReset: () => void;
  onExportCSV: () => void;
}

export const StockValueFilterBar: React.FC<StockValueFilterBarProps> = ({
  categories,
  totalProductsCount,
  stockFilterSearch,
  setStockFilterSearch,
  stockFilterCategory,
  setStockFilterCategory,
  stockFilterStatus,
  setStockFilterStatus,
  sortBy,
  setSortBy,
  onPageReset,
  onExportCSV,
}) => {
  return (
    <Card id="card-stock-filters" className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher produit, code-barres, SKU ou catégorie..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 text-xs font-medium"
            value={stockFilterSearch}
            onChange={e => {
              setStockFilterSearch(e.target.value);
              onPageReset();
            }}
          />
        </div>

        <select
          className="px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
          value={stockFilterCategory}
          onChange={e => {
            setStockFilterCategory(e.target.value);
            onPageReset();
          }}
        >
          <option value="all" className="bg-zinc-900 text-white">Toutes les catégories ({categories.length})</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
              {cat.name}
            </option>
          ))}
          <option value="uncategorized" className="bg-zinc-900 text-white">Sans Catégorie</option>
        </select>

        <select
          className="px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
          value={stockFilterStatus}
          onChange={e => {
            setStockFilterStatus(e.target.value as StockFilterStatus);
            onPageReset();
          }}
        >
          <option value="all" className="bg-zinc-900 text-white">Tous les stocks ({totalProductsCount})</option>
          <option value="in_stock" className="bg-zinc-900 text-white">En stock (&gt; 0)</option>
          <option value="low_stock" className="bg-zinc-900 text-white">Stock faible (Alerte)</option>
          <option value="out_of_stock" className="bg-zinc-900 text-white">En rupture (≤ 0)</option>
        </select>

        <div className="flex items-center justify-between gap-2">
          <select
            className="flex-1 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
            value={sortBy}
            onChange={e => {
              setSortBy(e.target.value as StockSortBy);
              onPageReset();
            }}
            title="Trier la liste des produits"
          >
            <option value="sale_val_desc" className="bg-zinc-900 text-white">Tri: Valeur Vente ↓</option>
            <option value="cost_val_desc" className="bg-zinc-900 text-white">Tri: Valeur Achat ↓</option>
            <option value="profit_desc" className="bg-zinc-900 text-white">Tri: Marge Brute ↓</option>
            <option value="qty_desc" className="bg-zinc-900 text-white">Tri: Quantité Stock ↓</option>
            <option value="name_asc" className="bg-zinc-900 text-white">Tri: Nom A → Z</option>
          </select>

          <button
            type="button"
            onClick={onExportCSV}
            className="px-3 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
            title="Exporter toute la valorisation du stock en CSV"
          >
            <Download size={15} /> CSV
          </button>
        </div>
      </div>
    </Card>
  );
};
