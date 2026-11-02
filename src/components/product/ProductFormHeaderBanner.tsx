import React from 'react';
import { Package } from 'lucide-react';
import { SafeImage } from '../ui/SafeImage';
import { cn } from '../../lib/utils';

interface ProductFormHeaderBannerProps {
  formData: any;
  currency: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  currentStock: number;
  netMarginDA: number;
  marginPercent: number;
}

export function ProductFormHeaderBanner({
  formData,
  currency,
  costPrice,
  retailPrice,
  wholesalePrice,
  currentStock,
  netMarginDA,
  marginPercent
}: ProductFormHeaderBannerProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-5 py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
          {formData.imageUrl ? (
            <SafeImage src={formData.imageUrl} alt={formData.name || ''} className="w-full h-full object-contain" />
          ) : (
            <Package size={20} className="text-indigo-500" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 dark:text-white truncate">
            {formData.name || 'Nouvel Article (Saisissez la désignation)'}
          </p>
          <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
            SKU: <span className="font-mono">{formData.sku || 'Auto'}</span> • Code-barres:{' '}
            <span className="font-mono">{formData.barcode || 'Non défini'}</span>
          </p>
        </div>
      </div>

      {/* 4 Indicateurs Clés en Direct (Achat, Détail, Marge, Stock) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
          <span className="block text-[9px] font-black uppercase text-slate-400">Prix Achat</span>
          <span className="text-xs font-black text-slate-800 dark:text-white">
            {costPrice.toFixed(2)} {currency}
          </span>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <span className="block text-[9px] font-black uppercase text-indigo-500">Prix Vente Détail</span>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
            {retailPrice.toFixed(2)} {currency}
          </span>
        </div>

        <div
          className={cn(
            'px-3 py-1.5 rounded-xl border',
            netMarginDA > 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          )}
        >
          <span className="block text-[9px] font-black uppercase">Marge Nette</span>
          <span className="text-xs font-black">
            {netMarginDA >= 0 ? '+' : ''}
            {netMarginDA.toFixed(0)} {currency} ({marginPercent.toFixed(0)}%)
          </span>
        </div>

        <div
          className={cn(
            'px-3 py-1.5 rounded-xl border',
            currentStock > 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          )}
        >
          <span className="block text-[9px] font-black uppercase">Stock Actuel</span>
          <span className="text-xs font-black">
            {currentStock} {formData.unit || 'u.'} {wholesalePrice > 0 ? `• Gros: ${wholesalePrice} ${currency}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
