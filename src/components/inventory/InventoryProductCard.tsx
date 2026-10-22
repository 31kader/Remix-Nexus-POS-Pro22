import React from 'react';
import { Package, Edit2, RefreshCw, Printer, Copy, History as HistoryIcon, Trash2, Check, Star, AlertTriangle, TrendingUp } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { SafeImage } from '../ui';

interface InventoryProductCardProps {
  product: Product;
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

export const InventoryProductCard = React.memo(({
  product,
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
}: InventoryProductCardProps) => {
  const margin = (product.price || 0) - (product.costPrice || 0);
  const marginPercent = product.costPrice && product.costPrice > 0 ? Math.round((margin / product.costPrice) * 100) : 0;
  const isOutOfStock = (product.stock || 0) <= 0;
  const isLowStock = !isOutOfStock && (product.stock || 0) <= (product.minStock || 5);

  const imgSource = product.imageUrl || (product.imageUrls && product.imageUrls[0]) || product.image || '';

  return (
    <div 
      onClick={() => onEdit(product)}
      className={cn(
        "group relative bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-900 border rounded-xl transition-all duration-200 cursor-pointer shadow-xs select-none",
        "p-2.5 sm:p-4 flex flex-col justify-between",
        isSelected 
          ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/20 dark:bg-slate-900" 
          : isOutOfStock
            ? "border-rose-300 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-700/60"
            : isLowStock
              ? "border-amber-300 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-700/60"
              : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/40",
        isDeleting && "opacity-40 pointer-events-none grayscale"
      )}
    >
      {/* 📱 DISPOSITION MOBILE (< sm) : Format compact horizontal ultra-optimisé */}
      <div className="flex sm:hidden items-center gap-2.5">
        {/* Vignette & Case à cocher */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
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

      {/* 💻 DISPOSITION DESKTOP (>= sm) : Carte Complète Haute Définition */}
      <div className="hidden sm:flex flex-col justify-between h-full">
        {/* Top Bar: Checkbox, QuickSelect Star & Stock Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onToggleSelect(product.id || '')}
              className={cn(
                "w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer",
                isSelected 
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-sm" 
                  : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:border-slate-400 dark:hover:border-slate-600 text-transparent hover:text-slate-500"
              )}
              title={isSelected ? "Désélectionner" : "Sélectionner"}
            >
              <Check size={14} strokeWidth={3} className={isSelected ? "opacity-100" : "opacity-0"} />
            </button>

            {isQuickSelectMode && (
              <button
                type="button"
                onClick={() => onToggleQuickSelect(product)}
                className={cn(
                  "w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer",
                  product.isQuickSelect 
                    ? "bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400" 
                    : "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-slate-400 hover:text-amber-500"
                )}
                title="Ajouter aux favoris de caisse"
              >
                <Star size={13} fill={product.isQuickSelect ? "currentColor" : "none"} />
              </button>
            )}
          </div>

          {/* Stock Status Badge */}
          <div>
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {Number(product.stock) < 0 ? `Stock: ${product.stock} ${product.unit || 'pcs'}` : 'Rupture'}
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Stock bas: {product.stock} {product.unit || 'pcs'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Stock: {product.stock} {product.unit || 'pcs'}
              </span>
            )}
          </div>
        </div>

        {/* Product Image / Thumbnail with gentle hover zoom */}
        <div className="relative aspect-square w-full rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 overflow-hidden mb-3.5 flex items-center justify-center group-hover:border-slate-300 dark:group-hover:border-slate-700/80 transition-colors">
          {imgSource ? (
            <SafeImage 
              src={imgSource} 
              alt={product.name} 
              className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-300" 
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-1">
              <Package size={36} strokeWidth={1.5} />
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Sans image</span>
            </div>
          )}

          {/* Margin badges if extreme */}
          {isExtremeMargin.isMax && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold shadow-md flex items-center gap-1">
              <TrendingUp size={10} /> Marge max
            </div>
          )}
          {isExtremeMargin.isMin && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-bold shadow-md flex items-center gap-1">
              <AlertTriangle size={10} /> Marge faible
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-1.5 flex-1">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {product.name}
          </h4>

          <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
            {product.sku && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-md font-mono text-slate-600 dark:text-slate-400 font-medium text-[10px]">
                {product.sku}
              </span>
            )}
            {(product as any).category && (
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/30 rounded-md text-indigo-700 dark:text-indigo-300 font-medium text-[10px]">
                {(product as any).category}
              </span>
            )}
          </div>
        </div>

        {/* Price & Margin Section */}
        <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-end justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Prix de vente</span>
            <div className="flex items-baseline gap-1 text-emerald-600 dark:text-emerald-400 font-black text-lg">
              <span>{(product.price || 0).toFixed(2)}</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{settings.currency}</span>
            </div>
          </div>

          {margin > 0 && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Marge</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400/90 font-mono">
                +{margin.toFixed(2)} ({marginPercent}%)
              </span>
            </div>
          )}
        </div>

        {/* Bottom Action Buttons */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onOpenAdjustment(product)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 dark:text-slate-300 dark:hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700/50 hover:border-indigo-500 cursor-pointer shadow-xs active:scale-95"
            title="Ajuster le stock"
          >
            <RefreshCw size={13} />
            <span>Ajuster</span>
          </button>

          <button
            type="button"
            onClick={() => onPrintLabel(product)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700/50 cursor-pointer shadow-xs active:scale-95"
            title="Imprimer l'étiquette"
          >
            <Printer size={14} />
          </button>

          <button
            type="button"
            onClick={() => onCopy(product)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700/50 cursor-pointer shadow-xs active:scale-95"
            title="Dupliquer l'article"
          >
            <Copy size={14} />
          </button>

          <button
            type="button"
            onClick={() => onViewHistory(product)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700/50 cursor-pointer shadow-xs active:scale-95"
            title="Historique des ventes et achats"
          >
            <HistoryIcon size={14} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(product.id || null)}
            className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-500/10 dark:hover:bg-rose-600 dark:text-rose-400 dark:hover:text-white rounded-xl transition-all border border-rose-200 dark:border-rose-500/20 hover:border-rose-500 cursor-pointer shadow-xs active:scale-95"
            title="Supprimer l'article"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

InventoryProductCard.displayName = 'InventoryProductCard';
