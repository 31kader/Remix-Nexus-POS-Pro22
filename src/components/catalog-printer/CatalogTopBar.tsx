import React, { useState, useRef, useEffect } from 'react';
import {
  Printer, Search, Plus, Download, Share2, Sparkles
} from 'lucide-react';
import { Product } from '../../types';
import { Button } from '../ui';
import { cn } from '../../lib/utils';
import { LayoutMode } from './types';

interface CatalogTopBarProps {
  themeColor: string;
  queueProductsCount: number;
  pagesCount: number;
  search: string;
  setSearch: (s: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchResults: Product[];
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddProduct: (p: Product) => void;
  selectedCategoryToAdd: string;
  setSelectedCategoryToAdd: (c: string) => void;
  uniqueCategories: string[];
  onAddByCategory: () => void;
  onQuickPick: (mode: 'top_stock' | 'newest' | 'low_stock') => void;
  onApplyInventorySheetPreset: () => void;
  layoutMode: LayoutMode;
  onSaveTemplatePreset: () => void;
  onLoadTemplatePreset: () => void;
  onExportHtml: () => void;
  onShare: (target: 'whatsapp' | 'email') => void;
  isSharing: boolean;
  onPrint: () => void;
}

export const CatalogTopBar: React.FC<CatalogTopBarProps> = ({
  themeColor,
  queueProductsCount,
  pagesCount,
  search,
  setSearch,
  searchInputRef,
  searchResults,
  onSearchKeyDown,
  onAddProduct,
  selectedCategoryToAdd,
  setSelectedCategoryToAdd,
  uniqueCategories,
  onAddByCategory,
  onQuickPick,
  onApplyInventorySheetPreset,
  layoutMode,
  onSaveTemplatePreset,
  onLoadTemplatePreset,
  onExportHtml,
  onShare,
  isSharing,
  onPrint
}) => {
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSharePanelOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setIsSharePanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isSharePanelOpen]);

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: themeColor }}
          >
            <Printer size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Studio d'Impression Catalogue & Prospectus A4
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ⚡ Mode Recherche Rapide (0 produit préchargé)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Recherchez uniquement les articles à inclure, personnalisez leurs prix/badges promo et imprimez en A4 haute définition
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={onExportHtml}
            variant="secondary"
            disabled={queueProductsCount === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700"
          >
            <Download size={15} /> Exporter HTML
          </Button>

          <div className="relative" ref={shareDropdownRef}>
            <Button
              onClick={() => setIsSharePanelOpen(v => !v)}
              variant="secondary"
              disabled={queueProductsCount === 0 || isSharing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700"
            >
              <Share2 size={15} /> Partager
            </Button>
            {isSharePanelOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 z-50 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onShare('whatsapp');
                    setIsSharePanelOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  📱 Partager via WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onShare('email');
                    setIsSharePanelOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                >
                  ✉️ Envoyer par Email
                </button>
              </div>
            )}
          </div>

          <Button
            onClick={onPrint}
            disabled={queueProductsCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm"
            style={{ backgroundColor: themeColor }}
          >
            <Printer size={16} /> Imprimer le Catalogue A4 ({queueProductsCount} art. • {Math.max(1, pagesCount)} p.)
          </Button>
        </div>
      </div>

      {/* DEDICATED SEARCH BAR (No products loaded until user searches!) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
        <div className="lg:col-span-8 relative">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="🔍 Tapez au moins 2 caractères (Nom, Code-barres, Référence SKU)... [Entrée pour ajouter direct]"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
              {searchResults.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    onAddProduct(p);
                    setSearch('');
                  }}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-zinc-700">
                      {p.imageUrl || p.image ? (
                        <img
                          src={p.imageUrl || p.image}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">📦</span>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {p.sku || p.barcode || 'N/A'} • Stock: {p.stock}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {Number(p.price || 0).toFixed(2)} DA
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-[11px]"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 flex items-center gap-2">
          <select
            value={selectedCategoryToAdd}
            onChange={e => setSelectedCategoryToAdd(e.target.value)}
            className="w-full py-3.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">➕ Ajouter par catégorie entière...</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <Button
            onClick={onAddByCategory}
            disabled={!selectedCategoryToAdd}
            variant="secondary"
            className="py-3.5 px-4 rounded-xl text-xs font-bold shrink-0"
          >
            Ajouter
          </Button>
        </div>
      </div>

      {/* BARRE DE SÉLECTIONS INTELLIGENTES EN 1 CLIC & MODÈLES FAVORIS */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Ajouts Rapides :</span>
          <button
            type="button"
            onClick={() => onQuickPick('top_stock')}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold cursor-pointer"
          >
            + Top 12 En Stock
          </button>
          <button
            type="button"
            onClick={() => onQuickPick('newest')}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold cursor-pointer"
          >
            + 12 Nouveautés
          </button>
          <button
            type="button"
            onClick={() => onQuickPick('low_stock')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold cursor-pointer"
          >
            + Alertes Stock (Fiche Inventaire)
          </button>
          <button
            type="button"
            onClick={onApplyInventorySheetPreset}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer transition-all",
              layoutMode === 'inventory_sheet'
                ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700"
            )}
          >
            📋 Mode Fiche d'Inventaire A4
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onSaveTemplatePreset}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-xs font-bold cursor-pointer"
          >
            💾 Sauver Modèle
          </button>
          <button
            type="button"
            onClick={onLoadTemplatePreset}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-xs font-bold cursor-pointer"
          >
            📂 Charger Modèle
          </button>
        </div>
      </div>
    </div>
  );
};
