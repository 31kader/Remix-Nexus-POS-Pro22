import React from 'react';
import { X } from 'lucide-react';
import { Product } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { cn } from '../../lib/utils';

interface QuickSelectProductCardProps {
  product: Product;
  currency: string;
  isEditMode: boolean;
  onSelect: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
}

export const QuickSelectProductCard: React.FC<QuickSelectProductCardProps> = ({
  product,
  currency,
  isEditMode,
  onSelect,
  onToggleFavorite
}) => {
  return (
    <div
      onClick={() => {
        if (isEditMode) {
          onToggleFavorite(product);
        } else {
          onSelect(product);
        }
      }}
      className={cn(
        "group relative bg-slate-900 border rounded-xl transition-all cursor-pointer overflow-hidden aspect-square shadow-xs hover:shadow-md hover:-translate-y-0.5 select-none",
        isEditMode 
          ? "border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/30" 
          : "border-slate-200 dark:border-slate-700 hover:border-amber-500"
      )}
      title={`${product.name} — ${product.price.toLocaleString()} ${currency}`}
    >
      {/* Image en plein format (100% de la surface du bloc) */}
      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
        <SafeImage 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
        />
      </div>

      {/* Superposition dégradée avec nom article et prix */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-6 pb-1.5 px-1.5 flex flex-col justify-end pointer-events-none">
        <p className="text-[10px] font-black text-white leading-tight uppercase truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {product.name}
        </p>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-[10px] font-black font-mono text-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] truncate">
            {product.price.toLocaleString()} {currency}
          </span>
          {product.stock !== undefined && (
            <span className={cn(
              "text-[8px] font-black px-1 py-0.5 rounded font-mono shrink-0 drop-shadow-sm",
              product.stock <= 0 
                ? "bg-rose-600 text-white" 
                : "bg-black/60 text-slate-200 border border-white/20 backdrop-blur-xs"
            )}>
              {product.stock}
            </span>
          )}
        </div>
      </div>

      {/* Croix de suppression : VISIBLE UNIQUEMENT EN MODE ÉDITION */}
      {isEditMode && (
        <button 
          type="button"
          onClick={(e) => { 
            e.stopPropagation(); 
            onToggleFavorite(product); 
          }} 
          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center transition-all hover:bg-rose-700 hover:scale-110 shadow-md z-10 cursor-pointer animate-in zoom-in-75 duration-150"
          title="Retirer des favoris"
        >
          <X size={13} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};
