import React from 'react';
import { supabase } from '../supabase';
import { cn } from '../lib/utils';
import { SafeImage } from './ui';
import { Product, Brand, Category, CompanySettings } from '../types';
import { Check, Package, RefreshCw, History, Printer, Copy, Trash2 } from 'lucide-react';

interface ProductMobileCardProps {
  product: Product;
  settings: CompanySettings;
  brands?: Brand[];
  categories?: Category[];
  onEdit: () => void;
  onAdjust: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onHistory: (e: React.MouseEvent) => void;
  onPrint: (e: React.MouseEvent) => void;
  isQuickSelectMode?: boolean;
  isDeleting?: boolean;
  selectedProductIds?: string[];
  onToggleSelect?: () => void;
  onCopy: (e: React.MouseEvent) => void;
}

export function ProductMobileCard({
  product,
  settings,
  brands,
  categories,
  onEdit,
  onAdjust,
  onDelete,
  onHistory,
  onPrint,
  isDeleting,
  selectedProductIds,
  onToggleSelect,
  onCopy
}: ProductMobileCardProps) {
  const margin = product.price - (product.costPrice || 0);
  const isLowStock = product.stock <= (product.minStock || 5);
  const isSelected = selectedProductIds && selectedProductIds.includes(product.id || '');

  return (
    <div 
      onClick={onEdit}
      className={cn(
        "bg-black/40 backdrop-blur-3xl p-4 sm:p-6 rounded-[2rem] border transition-all duration-500 relative overflow-hidden group shadow-2xl ring-1 ring-white/5",
        isLowStock ? "border-rose-500/30 bg-rose-500/5 shadow-[0_0_25px_rgba(244,63,94,0.05)]" : "border-white/5 hover:border-white/10",
        isSelected ? "border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/30 shadow-neon-indigo" : ""
      )}
    >
      <div className="flex items-start gap-3 sm:gap-5">
        {selectedProductIds && onToggleSelect && (
          <div className="flex items-center self-center" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer shadow-2xl relative overflow-hidden",
              isSelected 
                ? "bg-indigo-600 border-indigo-400 shadow-neon-indigo ring-1 ring-white/20"
                : "border-white/10 bg-black/40 hover:border-white/30"
            )}>
              {isSelected && <Check size={16} className="text-white" strokeWidth={4} />}
            </div>
          </div>
        )}

        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[1.75rem] bg-black/60 flex items-center justify-center overflow-hidden border border-white/10 flex-shrink-0 shadow-2xl group-hover:scale-105 transition-all duration-500 relative ring-1 ring-white/5">
          <SafeImage 
            src={product.imageUrl || (product.imageUrls && product.imageUrls[0]) || product.image || ''} 
            className="w-full h-full object-cover"
            containerClassName="w-full h-full"
            fallback={<Package size={32} className="text-slate-800" />}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col">
            <h5 className="font-black text-white truncate uppercase text-base tracking-tight italic leading-tight">{product.name}</h5>
            <div className="flex items-center gap-3 mt-2">
               <div className="bg-black/40 px-2 py-0.5 rounded-lg border border-white/5 shadow-inner">
                  <p className="text-[8px] font-black font-mono text-indigo-400/60 uppercase tracking-[0.2em]">{product.sku || 'SANS SKU'}</p>
               </div>
               {isLowStock && (
                 <span className="text-[7px] font-black text-rose-500 uppercase tracking-[0.2em] animate-pulse">STOCK CRITIQUE</span>
               )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
             <span className={cn(
                "px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] border shadow-2xl",
                isLowStock ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
             )}>
                {product.stock} {product.unit || 'PCS'} DISPO
             </span>
             {product.brandId && brands && (
                <span className="bg-white/5 text-slate-500 border border-white/10 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] italic">
                  {brands.find((b) => b.id === product.brandId)?.name || 'BRAND'}
                </span>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="p-4 bg-black/40 rounded-3xl border border-white/5 shadow-inner flex flex-col justify-center">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1.5 italic leading-none">PRIX UNITAIRE</span>
          <div className="flex items-baseline gap-1.5">
             <span className="text-xl font-black text-white tracking-tighter italic">{product.price.toFixed(2)}</span>
             <span className="text-[9px] font-black text-indigo-500/60 uppercase tracking-widest leading-none">{settings.currency}</span>
          </div>
        </div>
        <div className="p-4 bg-black/40 rounded-3xl border border-white/5 shadow-inner flex flex-col justify-center text-right">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1.5 italic leading-none">MARGE NETTE</span>
          <span className={cn("text-lg font-black tracking-tighter italic", margin > 0 ? "text-emerald-400" : "text-rose-500")}>
            {margin > 0 ? '+' : ''}{margin.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onAdjust}
          className="flex-1 flex items-center justify-center gap-3 py-5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-neon-indigo transition-all border border-indigo-400 ring-1 ring-white/20 active:scale-90 italic"
        >
          <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> AJUSTER
        </button>
        <div className="flex gap-2.5">
           {[
             { icon: Printer, onClick: onPrint, title: "PRINT" },
             { icon: Trash2, onClick: onDelete, danger: true, loading: isDeleting, title: "DEL" }
           ].map((btn, i) => (
             <button 
                key={i}
                onClick={btn.onClick}
                disabled={btn.loading}
                className={cn(
                  "h-14 w-14 flex items-center justify-center rounded-[1.5rem] border transition-all active:scale-90 shadow-2xl relative overflow-hidden group/btn",
                  btn.danger 
                    ? "bg-rose-500/5 border-rose-500/20 text-rose-500/40 hover:bg-rose-600 hover:text-white"
                    : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:text-white"
                )}
             >
                {btn.loading ? <RefreshCw size={20} className="animate-spin text-rose-500" /> : <btn.icon size={22} />}
              </button>
           ))}
        </div>
      </div>
    </div>
  );
}
