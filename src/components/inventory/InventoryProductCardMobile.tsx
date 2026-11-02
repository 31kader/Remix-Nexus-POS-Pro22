import React from 'react';
import { Package, Edit2, RefreshCw, Check } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { SafeImage } from '../ui';

interface InventoryProductCardMobileProps {
  product: Product;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (product: Product) => void;
  onOpenAdjustment: (product: Product) => void;
  settings: CompanySettings;
  imgSource: string;
  margin: number;
  marginPercent: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  onZoomImage?: (url: string) => void;
}

export const InventoryProductCardMobile: React.FC<InventoryProductCardMobileProps> = ({
  product,
  isSelected,
  onToggleSelect,
  onEdit,
  onOpenAdjustment,
  settings,
  imgSource,
  margin,
  marginPercent,
  isOutOfStock,
  isLowStock,
  onZoomImage
}) => {
  return (
    <div className="flex sm:hidden items-center gap-2.5">
      {/* Vignette & Case à cocher */}
      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
        <div 
          onClick={(e) => {
            if (imgSource && onZoomImage) {
              e.stopPropagation();
              onZoomImage(imgSource);
            }
          }}
          className={cn(
            "w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center transition-transform",
            imgSource && onZoomImage && "cursor-zoom-in active:scale-95"
          )}
          title={imgSource ? "Cliquer pour agrandir l'image" : undefined}
        >
          {imgSource ? (
            <SafeImage src={imgSource} alt={product.name} className="w-full h-full object-contain p-0.5" />
          ) : (
            <Package size={22} className="text-slate-400 dark:text-slate-500" />
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleSelect(product.id || '')}
          className={cn(
            "absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md border flex items-center justify-center shadow-xs transition-all cursor-pointer",
            isSelected 
              ? "bg-indigo-600 border-indigo-500 text-white" 
              : "border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-800 text-transparent"
          )}
          title={isSelected ? "Désélectionner" : "Sélectionner"}
        >
          <Check size={11} strokeWidth={3} className={isSelected ? "opacity-100" : "opacity-0"} />
        </button>
      </div>

      {/* Détails du Produit */}
      <div className="min-w-0 flex-1">
        <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate leading-tight">
          {product.name}
        </h4>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
          <span className="font-mono">{product.sku || 'N/A'}</span>
          <span>•</span>
          <span className={cn(
            "font-bold px-1.5 py-0.2 rounded text-[9px] border",
            isOutOfStock 
              ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
              : isLowStock
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
          )}>
            {isOutOfStock ? 'Rupture' : `Stock: ${product.stock ?? 0}`}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mt-1 font-mono">
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
            {(product.price || 0).toFixed(2)} {settings.currency}
          </span>
          {margin > 0 && (
            <span className="text-[9px] text-emerald-700/80 dark:text-emerald-400/80 font-bold">
              +{margin.toFixed(0)} ({marginPercent}%)
            </span>
          )}
        </div>
      </div>

      {/* Actions rapides mobiles */}
      <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onOpenAdjustment(product)}
          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-90 transition-all cursor-pointer"
          title="Ajuster le stock"
        >
          <RefreshCw size={12} />
        </button>
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-90 transition-all cursor-pointer"
          title="Modifier le produit"
        >
          <Edit2 size={12} />
        </button>
      </div>
    </div>
  );
};
