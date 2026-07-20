import React from 'react';
import { motion } from 'motion/react';
import { Package, History, Tag, RefreshCw, Trash2, Plus, FileSpreadsheet, Upload, ShoppingBag, FileText } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../translations';
import { Product } from '../../types';

interface InventoryHeaderProps {
  inventoryTab: 'products' | 'history' | 'labels' | 'catalog' | 'sync' | 'losses';
  setInventoryTab: (tab: 'products' | 'history' | 'labels' | 'catalog' | 'sync' | 'losses') => void;
  productsCount: number;
  onAddProduct: () => void;
  onExportExcel: () => void;
  onCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLowStockOrder: () => void;
  isProcessing: boolean;
}

export const InventoryHeader = ({
  inventoryTab,
  setInventoryTab,
  productsCount,
  onAddProduct,
  onExportExcel,
  onCSVImport,
  onLowStockOrder,
  isProcessing
}: InventoryHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="bg-black/20 backdrop-blur-3xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-white/5 shadow-2xl space-y-6 sm:space-y-8 relative overflow-hidden group ring-1 ring-white/5">
      <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-indigo-600/5 rounded-full blur-[60px] sm:blur-[100px] -mr-32 -mt-32 sm:-mr-48 sm:-mt-48 transition-all duration-1000 group-hover:bg-indigo-600/10 group-hover:scale-110" />
      
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 sm:gap-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center gap-6 sm:gap-8">
          <div className="border-l-4 border-indigo-600 pl-4 sm:pl-6">
            <h3 className="text-xl sm:text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Catalog<span className="text-indigo-400">.nexus</span></h3>
            <div className="text-[8px] sm:text-[10px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-2 italic">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-neon-cyan" />
              {productsCount || 0} UNITÉS RÉPERTORIÉES
            </div>
          </div>

          <div className="h-10 sm:h-12 w-px bg-white/5 mx-2 hidden xl:block" />

          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner overflow-x-auto no-scrollbar max-w-full">
            {(['products', 'history', 'labels', 'catalog', 'sync', 'losses'] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => setInventoryTab(tab)}
                className={cn(
                  "px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all flex items-center gap-2 sm:gap-3 whitespace-nowrap active:scale-95 group/btn",
                  inventoryTab === tab
                    ? "bg-indigo-600 text-white shadow-neon-indigo border border-indigo-400 ring-1 ring-white/20 italic"
                    : "text-slate-600 hover:text-white hover:bg-white/5"
                )}
              >
                {tab === 'products' ? <Package size={14} /> : tab === 'history' ? <History size={14} /> : tab === 'labels' ? <Tag size={14} /> : tab === 'catalog' ? <FileText size={14} /> : tab === 'losses' ? <Trash2 size={14} /> : <RefreshCw size={14} />}
                <span className="inline font-black">
                  {tab === 'products' ? 'STOCK' : tab === 'history' ? 'LOGS' : tab === 'labels' ? 'TAGS' : tab === 'catalog' ? 'MKT' : tab === 'losses' ? 'REBUT' : 'SYNC'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 bg-white/5 p-1.5 sm:p-2 rounded-2xl sm:rounded-[1.75rem] border border-white/10 ring-1 ring-white/5 shadow-2xl w-full xl:w-auto overflow-hidden">
          <button
            onClick={onAddProduct}
            className="flex-1 xl:flex-none flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-neon-indigo transition-all active:scale-95 italic border border-indigo-400 whitespace-nowrap"
          >
            <Plus size={16} strokeWidth={3} /> NOUVEAU
          </button>

          <div className="h-8 sm:h-10 w-px bg-white/10 mx-0.5 sm:mx-1" />

          <div className="flex gap-1.5 sm:gap-2">
            <button
              onClick={onExportExcel}
              className="p-2.5 sm:p-3.5 bg-black/40 text-emerald-500 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-inner border border-white/5 active:scale-90"
              title="EXPORT"
            >
              <FileSpreadsheet size={16} />
            </button>

            <label className="cursor-pointer group/upload" title="IMPORT">
              <input type="file" accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" onChange={onCSVImport} />
              <div className="p-2.5 sm:p-3.5 bg-black/40 text-indigo-400 rounded-xl group-hover/upload:bg-indigo-600 group-hover/upload:text-white transition-all shadow-inner border border-white/5 active:scale-90">
                <Upload size={16} />
              </div>
            </label>

            <button
              onClick={onLowStockOrder}
              disabled={isProcessing}
              className="p-2.5 sm:p-3.5 bg-black/40 text-amber-500 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-inner border border-white/5 active:scale-90"
              title="RÉAPPRO"
            >
              <ShoppingBag size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
