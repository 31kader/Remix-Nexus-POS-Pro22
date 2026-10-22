import React from 'react';
import { Package, History, Tag, RefreshCw, Trash2, Plus, FileSpreadsheet, Upload, Boxes, TrendingUp, AlertCircle, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Product, CompanySettings } from '../../types';

interface InventoryHeaderProps {
  inventoryTab: 'products' | 'history' | 'labels' | 'catalog' | 'sync' | 'losses';
  setInventoryTab: (tab: 'products' | 'history' | 'labels' | 'catalog' | 'sync' | 'losses') => void;
  products: Product[];
  settings: CompanySettings;
  onAddProduct: () => void;
  onExportExcel: () => void;
  onCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessing: boolean;
}

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  inventoryTab,
  setInventoryTab,
  products = [],
  settings,
  onAddProduct,
  onExportExcel,
  onCSVImport,
  isProcessing
}) => {
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.minStock || 5)).length;
  const outOfStockCount = products.filter(p => (p.stock || 0) <= 0).length;
  const totalStockValue = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.price || 0)), 0);

  const tabs = [
    { id: 'products', label: 'Articles & Stock', icon: Package },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'labels', label: 'Étiquettes', icon: Tag },
    { id: 'catalog', label: 'Catalogue', icon: FileText },
    { id: 'losses', label: 'Pertes', icon: Trash2 },
    { id: 'sync', label: 'Synchronisation', icon: RefreshCw },
  ] as const;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Top Row: Titre compact & Boutons d'actions rapides */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3 sm:p-5 rounded-xl shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Boxes size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Gestion des Stocks & Inventaire
            </h2>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Consultez, ajoutez et suivez vos articles en temps réel
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onAddProduct}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nouveau</span>
            <span className="hidden sm:inline">Produit</span>
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            className="h-9 w-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2.5 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
            title="Exporter le catalogue en fichier Excel / CSV"
          >
            <FileSpreadsheet size={15} />
            <span className="hidden sm:inline">Exporter</span>
          </button>

          <label 
            className="h-9 w-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2.5 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
            title="Importer des articles depuis un fichier CSV ou Excel"
          >
            <input 
              type="file" 
              accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
              className="hidden" 
              onChange={onCSVImport} 
            />
            <Upload size={15} />
            <span className="hidden sm:inline">Importer</span>
          </label>
        </div>
      </div>

      {/* KPI Cards (Compacts sur smartphone) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Package size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Total Produits</span>
            <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">{totalProducts}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Valeur Stock</span>
            <span className="text-sm sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
              {totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} 
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 ml-1 font-sans">{settings?.currency || 'DA'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Stock Faible</span>
            <span className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{lowStockCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertCircle size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">En Rupture</span>
            <span className="text-base sm:text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{outOfStockCount}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar — Défilement horizontal fluide sur mobile */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-x-auto no-scrollbar shadow-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = inventoryTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setInventoryTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
                isActive 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/50"
              )}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
