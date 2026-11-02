import React, { memo } from 'react';
import { Boxes, Globe } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { WholesaleBase, OnlineBase, RoundingMode } from './bulkPricingTypes';

interface BulkPricingRulesColumnsProps {
  enableWholesale: boolean;
  setEnableWholesale: (v: boolean) => void;
  wholesaleBase: WholesaleBase;
  setWholesaleBase: (v: WholesaleBase) => void;
  wholesalePercent: string;
  setWholesalePercent: (v: string) => void;
  enableOnline: boolean;
  setEnableOnline: (v: boolean) => void;
  onlineBase: OnlineBase;
  setOnlineBase: (v: OnlineBase) => void;
  onlinePercent: string;
  setOnlinePercent: (v: string) => void;
  roundingMode: RoundingMode;
  setRoundingMode: (v: RoundingMode) => void;
  currency: string;
}

export const BulkPricingRulesColumns = memo(function BulkPricingRulesColumns({
  enableWholesale,
  setEnableWholesale,
  wholesaleBase,
  setWholesaleBase,
  wholesalePercent,
  setWholesalePercent,
  enableOnline,
  setEnableOnline,
  onlineBase,
  setOnlineBase,
  onlinePercent,
  setOnlinePercent,
  roundingMode,
  setRoundingMode,
  currency,
}: BulkPricingRulesColumnsProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Colonne Prix de Gros */}
        <div className={cn(
          "p-4 rounded-xl border transition-all space-y-4",
          enableWholesale
            ? "bg-sky-500/5 border-sky-500/30"
            : "bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60"
        )}>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={enableWholesale}
                onChange={e => setEnableWholesale(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <Boxes size={15} /> Prix de Gros (Wholesale)
              </span>
            </label>
          </div>

          {enableWholesale && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setWholesaleBase('retail_discount'); setWholesalePercent('10'); }}
                  className={cn(
                    "p-2.5 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer",
                    wholesaleBase === 'retail_discount'
                      ? "bg-sky-600 text-white border-sky-500"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  )}
                >
                  Prix Détail - X % (Remise)
                </button>
                <button
                  type="button"
                  onClick={() => { setWholesaleBase('cost_margin'); setWholesalePercent('10'); }}
                  className={cn(
                    "p-2.5 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer",
                    wholesaleBase === 'cost_margin'
                      ? "bg-sky-600 text-white border-sky-500"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  )}
                >
                  Prix d'Achat + X % (Marge)
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                  {wholesaleBase === 'retail_discount' ? 'Pourcentage de remise sur le Prix Détail (-%)' : "Pourcentage de marge sur le Prix d'Achat (+%)"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={wholesalePercent}
                    onChange={e => setWholesalePercent(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-sky-500/40 rounded-xl py-2.5 px-3.5 text-sm font-black font-mono text-slate-900 dark:text-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-sky-500">%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[5, 8, 10, 12, 15, 20, 25].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setWholesalePercent(String(pct))}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black font-mono border transition-all cursor-pointer",
                      wholesalePercent === String(pct)
                        ? "bg-sky-600 text-white border-sky-500"
                        : "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/10"
                    )}
                  >
                    {wholesaleBase === 'retail_discount' ? `-${pct}%` : `+${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Colonne Tarif En Ligne */}
        <div className={cn(
          "p-4 rounded-xl border transition-all space-y-4",
          enableOnline
            ? "bg-violet-500/5 border-violet-500/30"
            : "bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60"
        )}>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={enableOnline}
                onChange={e => setEnableOnline(e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <span className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                <Globe size={15} /> Prix En Ligne (E-Commerce)
              </span>
            </label>
          </div>

          {enableOnline && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => { setOnlineBase('same_as_retail'); setOnlinePercent('0'); }}
                  className={cn(
                    "p-2 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer",
                    onlineBase === 'same_as_retail'
                      ? "bg-violet-600 text-white border-violet-500"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  )}
                >
                  = Prix Détail
                </button>
                <button
                  type="button"
                  onClick={() => { setOnlineBase('retail_adjust'); setOnlinePercent('-5'); }}
                  className={cn(
                    "p-2 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer",
                    onlineBase === 'retail_adjust'
                      ? "bg-violet-600 text-white border-violet-500"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  )}
                >
                  Détail ± %
                </button>
                <button
                  type="button"
                  onClick={() => { setOnlineBase('cost_margin'); setOnlinePercent('15'); }}
                  className={cn(
                    "p-2 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer",
                    onlineBase === 'cost_margin'
                      ? "bg-violet-600 text-white border-violet-500"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  )}
                >
                  Achat + %
                </button>
              </div>

              {onlineBase !== 'same_as_retail' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                      {onlineBase === 'retail_adjust' ? 'Ajustement % sur le Prix Détail (ex: -5 ou +5)' : "Marge % sur le Prix d'Achat (ex: +15)"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        value={onlinePercent}
                        onChange={e => setOnlinePercent(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-violet-500/40 rounded-xl py-2.5 px-3.5 text-sm font-black font-mono text-slate-900 dark:text-white"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-violet-500">%</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(onlineBase === 'retail_adjust' ? [-15, -10, -5, 5, 10] : [10, 15, 20, 25, 30]).map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setOnlinePercent(String(pct))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black font-mono border transition-all cursor-pointer",
                          onlinePercent === String(pct)
                            ? "bg-violet-600 text-white border-violet-500"
                            : "bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/10"
                        )}
                      >
                        {pct > 0 ? `+${pct}%` : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Règle d'arrondi */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Arrondi Commercial ({currency}) :
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'none', label: 'Exact (0.01)' },
            { id: '1', label: 'Arrondi 1 DA' },
            { id: '5', label: 'Arrondi 5 DA' },
            { id: '10', label: 'Arrondi 10 DA' }
          ].map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoundingMode(r.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all cursor-pointer",
                roundingMode === r.id
                  ? "bg-emerald-600 text-white border-emerald-500"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
});
