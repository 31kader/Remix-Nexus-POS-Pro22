import React from 'react';
import { Package, Tag, RefreshCw, Printer, Check, Star, AlertTriangle, TrendingUp, History as HistoryIcon, Copy, Trash2 } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { SafeImage } from '../ui';

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
  const margin = (product.price || 0) - (product.costPrice || 0);
  const isOutOfStock = (product.stock || 0) <= 0;
  const isLowStock = !isOutOfStock && (product.stock || 0) <= (product.minStock || 5);
  const imgSource = product.imageUrl || (product.imageUrls && product.imageUrls[0]) || product.image || '';

  return (
    <div style={style} className="px-1 py-1.5">
      <div 
        onClick={() => onEdit(product)}
        className={cn(
          "group flex items-center justify-between gap-4 p-3 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-900 border rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md",
          isSelected 
            ? "border-indigo-500 ring-1 ring-indigo-500/20 bg-indigo-50/20 dark:bg-slate-900" 
            : isOutOfStock
              ? "border-rose-200 dark:border-rose-950/40 hover:border-rose-300 dark:hover:border-rose-800/60"
              : isLowStock
                ? "border-amber-200 dark:border-amber-950/40 hover:border-amber-300 dark:hover:border-amber-800/60"
                : "border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700",
          isDeleting && "opacity-40 pointer-events-none grayscale"
        )}
      >
        {/* Left: Checkbox & Thumbnail */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleSelect(product.id || '')}
              className={cn(
                "w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer",
                isSelected 
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-sm" 
                  : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-transparent hover:text-slate-500"
              )}
            >
              <Check size={12} strokeWidth={3} className={isSelected ? "opacity-100" : "opacity-0"} />
            </button>

            {isQuickSelectMode && (
              <button
                type="button"
                onClick={() => onToggleQuickSelect(product)}
                className={cn(
                  "w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer",
                  product.isQuickSelect 
                    ? "bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400" 
                    : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500"
                )}
              >
                <Star size={11} fill={product.isQuickSelect ? "currentColor" : "none"} />
              </button>
            )}
          </div>

          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {imgSource ? (
              <SafeImage src={imgSource} alt={product.name} className="w-full h-full object-contain p-0.5" />
            ) : (
              <Package size={20} className="text-slate-400 dark:text-slate-500" />
            )}
          </div>

          {/* Product Title, SKU, Category */}
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {product.name}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {product.sku && <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">{product.sku}</span>}
              {(product as any).category && <span className="text-slate-500 dark:text-slate-400">#{(product as any).category}</span>}
            </div>
          </div>
        </div>

        {/* Center: Prices & Margin */}
        <div className="hidden md:flex items-center gap-6 text-right">
          <div className="flex flex-col items-end min-w-[80px]">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">Achat</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {(product.costPrice || 0).toFixed(2)} <span className="text-[9px] text-slate-500">{settings.currency}</span>
            </span>
          </div>

          <div className="flex flex-col items-end min-w-[90px]">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">Vente</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {(product.price || 0).toFixed(2)} <span className="text-[9px] text-slate-500 dark:text-slate-400">{settings.currency}</span>
            </span>
          </div>

          <div className="flex flex-col items-end min-w-[70px]">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">Marge</span>
            <span className={cn("text-xs font-black", margin > 0 ? "text-emerald-600 dark:text-emerald-400" : margin < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400")}>
              {margin > 0 ? `+${margin.toFixed(2)}` : margin.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right: Stock Status */}
        <div className="min-w-[85px] text-right">
          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase block">Stock</span>
          {isOutOfStock ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-extrabold">
              0 {product.unit || 'pcs'}
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-extrabold">
              {product.stock} {product.unit || 'pcs'}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold">
              {product.stock} {product.unit || 'pcs'}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onOpenAdjustment(product)}
            className="p-2 bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 dark:text-slate-300 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700/60 cursor-pointer shadow-sm"
            title="Ajuster le stock"
          >
            <RefreshCw size={14} />
          </button>
          <button
            type="button"
            onClick={() => onPrintLabel(product)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700/60 hidden md:block cursor-pointer shadow-sm"
            title="Imprimer l'étiquette"
          >
            <Printer size={14} />
          </button>
          <button
            type="button"
            onClick={() => onCopy(product)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700/60 hidden md:block cursor-pointer shadow-sm"
            title="Dupliquer"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={() => onViewHistory(product)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700/60 hidden md:block cursor-pointer shadow-sm"
            title="Historique"
          >
            <HistoryIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(product.id || null)}
            className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-500/10 dark:hover:bg-rose-600 dark:text-rose-400 dark:hover:text-white rounded-xl transition-all border border-rose-200 dark:border-rose-500/20 cursor-pointer shadow-sm"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

InventoryProductRow.displayName = 'InventoryProductRow';
