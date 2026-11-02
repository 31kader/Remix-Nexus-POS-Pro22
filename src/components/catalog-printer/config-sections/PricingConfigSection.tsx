import React from 'react';
import { cn } from '../../../lib/utils';
import { PriceDisplayMode } from '../types';

export interface PricingConfigSectionProps {
  priceDisplayMode: PriceDisplayMode;
  setPriceDisplayMode: (m: PriceDisplayMode) => void;
  setShowPrice: (s: boolean) => void;
  discountPercent: number;
  setDiscountPercent: (d: number) => void;
}

export const PricingConfigSection: React.FC<PricingConfigSectionProps> = ({
  priceDisplayMode,
  setPriceDisplayMode,
  setShowPrice,
  discountPercent,
  setDiscountPercent
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-black text-slate-700 dark:text-zinc-200 uppercase mb-2">
          Mode d'Affichage des Prix sur le Catalogue
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { id: 'retail', label: '💰 Prix Détail (Public)', desc: 'Affiche le prix de vente standard' },
            { id: 'wholesale', label: '📦 Prix de Gros', desc: 'Pour vos clients revendeurs' },
            { id: 'both', label: '⚖️ Double Prix (Public + Gros)', desc: 'Affiche les 2 tarifs sur chaque carte' },
            { id: 'promo', label: '🔥 Mode Promo (Prix Barré)', desc: 'Affiche un ancien prix barré + prix promo' },
            { id: 'none', label: '🖼️ Catalogue Vitrine (Sans Prix)', desc: 'Photos et références uniquement' }
          ].map(mode => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setPriceDisplayMode(mode.id as PriceDisplayMode);
                setShowPrice(mode.id !== 'none');
              }}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                priceDisplayMode === mode.id
                  ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
              )}
            >
              <div className="text-xs font-black">{mode.label}</div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {priceDisplayMode === 'promo' && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
          <label className="block text-xs font-black text-rose-700 dark:text-rose-300">
            Remise Promo Automatique par Défaut : -{discountPercent}%
          </label>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={discountPercent}
            onChange={e => setDiscountPercent(Number(e.target.value))}
            className="w-full accent-rose-600"
          />
          <p className="text-[10px] text-slate-600 dark:text-zinc-300">
            Simule automatiquement un ancien prix barré (+{discountPercent}%) si vous n'avez pas saisi d'ancien prix spécifique sur l'article.
          </p>
        </div>
      )}
    </div>
  );
};
