import React from 'react';
import { Package, History, Tag, RefreshCw, Trash2, Plus, FileSpreadsheet, Upload, ShoppingBag, AlertTriangle, Boxes, TrendingUp, AlertCircle, FileText } from 'lucide-react';
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
    { id: 'history', label: 'Historique Mouvements', icon: History },
    { id: 'labels', label: 'Étiquettes', icon: Tag },
    { id: 'catalog', label: 'Catalogue & Affiches', icon: FileText },
    { id: 'losses', label: 'Pertes & Démarque', icon: Trash2 },
    { id: 'sync', label: 'Synchronisation', icon: RefreshCw },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Top Row: Title, Subtitle, and Main Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80  p-6 rounded-xl shadow-sm dark:shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Boxes size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Gestion des Stocks & Inventaire
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consultez, ajoutez et suivez vos articles en temps réel
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={onAddProduct}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Nouveau Produit</span>
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Exporter le catalogue en fichier Excel / CSV"
          >
            <FileSpreadsheet size={15} />
            <span className="hidden sm:inline">Exporter</span>
          </button>

          <label 
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
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

      {/* KPI Cards (Summary Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Package size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Produits</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{totalProducts}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Valeur du Stock</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase">{settings?.currency || 'DZD'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Stocks Faibles</span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{lowStockCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
            <AlertCircle size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">En Rupture</span>
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{outOfStockCount}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = inventoryTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setInventoryTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                isActive 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/50"
              )}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
