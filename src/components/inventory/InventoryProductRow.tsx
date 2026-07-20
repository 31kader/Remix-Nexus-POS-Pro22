import React from 'react';
import { motion } from 'motion/react';
import { Package, Tag, Layers, RefreshCw, BarcodeIcon, Eye, Trash2, Printer, Check, Star, AlertTriangle, TrendingDown, History as HistoryIcon, Copy } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { cn, safeDate } from '../../lib/utils';
import { SafeImage, Button } from '../ui';
import { format } from 'date-fns';

interface InventoryProductRowProps {
  product: Product;
  style?: React.CSSProperties;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  isQuickSelectMode: boolean;
  onToggleQuickSelect: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string | null) => void;
  onPrintLabel: (product: Product) => void;
  onViewHistory: (product: Product) => void;
  onOpenAdjustment: (product: Product) => void;
  onCopy: (product: Product) => void;
  settings: CompanySettings;
  isDeleting: boolean;
  isExtremeMargin: { isMax: boolean; isMin: boolean };
}

export const InventoryProductRow = React.memo(({
  product,
  style,
  isSelected,
  onToggleSelect,
  isQuickSelectMode,
  onToggleQuickSelect,
  onEdit,
  onDelete,
  onPrintLabel,
  onViewHistory,
  onOpenAdjustment,
  onCopy,
  settings,
  isDeleting,
  isExtremeMargin
}: InventoryProductRowProps) => {
  const margin = product.price - (product.costPrice || 0);
  const isLowStock = product.stock <= (product.minStock || 5);

  return (
    <div style={style}>
      <motion.div 
        initial={false}
        className={cn(
          "group flex items-center gap-6 p-5 rounded-[2rem] bg-black/40 border transition-all duration-500 relative overflow-hidden mb-4 h-[100px] box-border px-10 ring-1 ring-white/5",
          isLowStock ? "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.05)]" : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10 hover:shadow-neon-indigo hover:-translate-y-0.5",
          isSelected ? "border-indigo-500/50 bg-indigo-500/5 shadow-neon-indigo ring-1 ring-indigo-500/20" : "",
          isDeleting && "opacity-50 grayscale pointer-events-none"
        )}
        onClick={() => onEdit(product)}
      >
        <div className="flex items-center gap-2 min-w-0" onClick={(e) => { e.stopPropagation(); onToggleSelect(product.id || ''); }}>
          <div className={cn(
            "w-12 h-12 rounded-2xl border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer shadow-2xl relative overflow-hidden group/check",
            isSelected 
              ? "bg-indigo-600 border-indigo-400 shadow-neon-indigo"
              : "border-white/10 bg-black/40 hover:border-white/30"
          )}>
            {isSelected ? (
              <Check size={20} className="text-white relative z-10" strokeWidth={4} />
            ) : (
              <div className="w-full h-full bg-white/5 opacity-0 group-hover/check:opacity-100 transition-opacity" />
            )}
          </div>
        </div>

        {isQuickSelectMode && (
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleQuickSelect(product); }}
              className={cn(
                "w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shadow-2xl active:scale-90",
                product.isQuickSelect ? "bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-neon-amber" : "bg-black/40 border-white/5 text-slate-700 hover:text-white hover:bg-white/5"
              )}
            >
              <Star size={20} fill={product.isQuickSelect ? "currentColor" : "none"} />
            </button>
          </div>
        )}

        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-3xl bg-black/60 border border-white/10 overflow-hidden flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500 shadow-2xl ring-1 ring-white/5">
          {(() => {
            const imgSource = product.imageUrl || (product.imageUrls && product.imageUrls[0]) || product.image || '';
            return imgSource ? (
              <SafeImage src={imgSource} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-800">
                <Package size={32} />
              </div>
            );
          })()}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {isExtremeMargin.isMax && (
             <div className="absolute top-0 right-0 p-1 bg-emerald-500 rounded-bl-xl shadow-lg animate-pulse" title="Marge Optimale">
                <TrendingDown size={10} className="text-white rotate-180" strokeWidth={4} />
             </div>
          )}
          {isExtremeMargin.isMin && (
             <div className="absolute top-0 right-0 p-1 bg-rose-500 rounded-bl-xl shadow-lg animate-pulse" title="Marge Critique">
                <AlertTriangle size={10} className="text-white" strokeWidth={4} />
             </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h4 className="text-lg font-black text-white truncate tracking-tight uppercase italic leading-none">{product.name}</h4>
            {isLowStock && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-500 text-[8px] font-black uppercase tracking-[0.2em] border border-rose-500/20 animate-pulse">STOCK BAS</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5 shadow-inner">
               <Tag size={12} className="text-indigo-400/60" />
               <p className="text-[10px] font-black font-mono text-indigo-400/60 uppercase tracking-[0.2em]">{product.sku || 'N/A'}</p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/5 shadow-inner" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Layers size={14} className="text-slate-700" />
              {product.unit || 'PCS'}
            </p>
            {(product as any).category && (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate max-w-[120px] italic">#{(product as any).category}</p>
              </>
            )}
          </div>
        </div>

        {/* Inventory Stats */}
        <div className="hidden lg:flex items-center gap-10">
          <div className="w-32 text-right flex flex-col justify-center items-end border-l border-white/5 pl-8">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1.5 italic">PRIX / MARGE</p>
            <div className="flex items-baseline gap-1.5">
               <p className="text-xl font-black text-white tabular-nums tracking-tighter italic">{product.price.toFixed(2)}</p>
               <span className="text-[10px] font-black text-slate-700 uppercase">{settings.currency}</span>
            </div>
            <p className={cn(
              "text-[9px] font-black tracking-[0.2em] uppercase mt-1",
              margin > 0 ? "text-emerald-500/60" : "text-rose-500/60"
            )}>
              {margin > 0 ? '+' : ''}{margin.toFixed(2)} NET
            </p>
          </div>

          <div className="w-40 text-right flex flex-col justify-center items-end border-l border-white/5 pl-8">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1.5 italic">UNITÉS RÉELLES</p>
            <div className="flex items-baseline gap-2">
               <p className={cn(
                 "text-2xl font-black tabular-nums tracking-tighter italic",
                 isLowStock ? "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]" : "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]"
               )}>
                 {product.stock}
               </p>
               <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{product.unit || 'PCS'}</span>
            </div>
          </div>
        </div>

        {/* Actions Overlay */}
        <div className="w-64 flex items-center justify-end gap-2 transition-all z-20 border-l border-white/5 pl-8" onClick={(e) => e.stopPropagation()}>
           <button 
             onClick={() => onOpenAdjustment(product)}
             className="p-3 bg-white/5 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-2xl border border-white/5 hover:border-indigo-400 active:scale-90"
             title="AJUSTER STOCK"
           >
             <RefreshCw size={18} />
           </button>

           <div className="flex items-center bg-black/40 rounded-2xl border border-white/5 p-1 shadow-inner">
             <button
               onClick={() => onCopy(product)}
               className="p-2.5 text-slate-600 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90"
               title="DUPLIQUER"
             >
               <Copy size={18} />
             </button>
             <button
               onClick={() => onPrintLabel(product)}
               className="p-2.5 text-slate-600 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90"
               title="ÉTIQUETTE"
             >
               <Printer size={18} />
             </button>
             <button
               onClick={() => onViewHistory(product)}
               className="p-2.5 text-slate-600 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90"
               title="LOGS"
             >
               <HistoryIcon size={18} />
             </button>
           </div>

           <button 
             onClick={() => onDelete(product.id || null)}
             className="p-3 bg-rose-500/5 text-rose-500/40 rounded-2xl hover:bg-rose-600 hover:text-white transition-all border border-rose-500/10 hover:border-rose-400 active:scale-90"
             title="SUPPRIMER"
           >
             <Trash2 size={18} />
           </button>
        </div>
      </motion.div>
    </div>
  );
});

InventoryProductRow.displayName = 'InventoryProductRow';
