import React from 'react';
import { Trash2, Search, Tag } from 'lucide-react';
import { Product } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { CustomOverrides, BADGE_PRESETS } from './types';

interface CatalogQueueListProps {
  queueProducts: Product[];
  onClearQueue: () => void;
  onSortQueue: (criterion: 'name_asc' | 'price_asc' | 'price_desc' | 'stock_desc') => void;
  onApplyBadgeToAll: (badge: string) => void;
  customOverrides: CustomOverrides;
  onUpdateOverride: (productId: string, patch: { customPrice?: number; oldPrice?: number; badge?: string }) => void;
  onRemoveProduct: (productId: string) => void;
  themeColor: string;
}

export const CatalogQueueList: React.FC<CatalogQueueListProps> = ({
  queueProducts,
  onClearQueue,
  onSortQueue,
  onApplyBadgeToAll,
  customOverrides,
  onUpdateOverride,
  onRemoveProduct,
  themeColor
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-zinc-800 space-y-3 bg-slate-50/50 dark:bg-zinc-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Articles Sélectionnés ({queueProducts.length})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Personnalisez le prix affiché ou ajoutez un badge promo par article
            </p>
          </div>
          {queueProducts.length > 0 && (
            <button
              type="button"
              onClick={onClearQueue}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={13} /> Tout vider
            </button>
          )}
        </div>

        {queueProducts.length > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-zinc-700">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-black uppercase text-slate-400 mr-1">Trier :</span>
              <button
                type="button"
                onClick={() => onSortQueue('name_asc')}
                className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                A → Z
              </button>
              <button
                type="button"
                onClick={() => onSortQueue('price_asc')}
                className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                Prix ↑
              </button>
              <button
                type="button"
                onClick={() => onSortQueue('price_desc')}
                className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                Prix ↓
              </button>
            </div>

            <div className="flex items-center gap-1">
              <select
                onChange={e => {
                  onApplyBadgeToAll(e.target.value);
                }}
                defaultValue=""
                className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 outline-none"
              >
                <option value="" disabled>
                  🏷️ Badge sur tout...
                </option>
                <option value="PROMO">Tout en PROMO</option>
                <option value="NOUVEAU">Tout en NOUVEAU</option>
                <option value="ARRIVAGE">Tout en ARRIVAGE</option>
                <option value="PRIX CHOC">Tout en PRIX CHOC</option>
                <option value="">Effacer les badges</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
        {queueProducts.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Search size={28} className="mx-auto text-indigo-400 opacity-70" />
            <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Votre sélection est vide (aucun produit chargé inutilement)
            </p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
              Utilisez la barre de recherche ci-dessus pour ajouter des articles de manière instantanée
            </p>
          </div>
        ) : (
          queueProducts.map((p, idx) => {
            const ov = customOverrides[p.id] || {};
            return (
              <div
                key={p.id}
                className="p-3 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-zinc-700">
                    {p.imageUrl || p.image ? (
                      <SafeImage
                        src={p.imageUrl || p.image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs">📦</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {p.sku || p.barcode || 'Sans SKU'} • Stock: {p.stock}
                    </div>
                  </div>
                </div>

                {/* Per-Product Overrides Inputs */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 font-bold">Prix :</span>
                      <input
                        type="number"
                        placeholder={String(p.price || 0)}
                        value={ov.customPrice !== undefined ? ov.customPrice : ''}
                        onChange={e => {
                          const val = e.target.value === '' ? undefined : Number(e.target.value);
                          onUpdateOverride(p.id, { customPrice: val });
                        }}
                        className="w-16 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-mono font-bold text-right outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] text-rose-500 font-bold">Barré :</span>
                      <input
                        type="number"
                        placeholder="Ex: 5000"
                        value={ov.oldPrice !== undefined ? ov.oldPrice : ''}
                        onChange={e => {
                          const val = e.target.value === '' ? undefined : Number(e.target.value);
                          onUpdateOverride(p.id, { oldPrice: val });
                        }}
                        className="w-16 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-mono font-bold text-rose-500 text-right outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <select
                    value={ov.badge || ''}
                    onChange={e => onUpdateOverride(p.id, { badge: e.target.value })}
                    className="py-1 px-1.5 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 outline-none"
                  >
                    <option value="">Sans badge</option>
                    {BADGE_PRESETS.filter(Boolean).map(b => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => onRemoveProduct(p.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                    title="Retirer du catalogue"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
