import React from 'react';
import { cn } from '../../lib/utils';

interface PosterDiscountControlsProps {
  currency: string;
  showOldPrice: boolean;
  setShowOldPrice: (show: boolean) => void;
  discountPercent: number;
  applyDiscountPercent: (pct: number) => void;
  customOldPrice: string;
  setCustomOldPrice: (p: string) => void;
}

export const PosterDiscountControls: React.FC<PosterDiscountControlsProps> = ({
  currency,
  showOldPrice,
  setShowOldPrice,
  discountPercent,
  applyDiscountPercent,
  customOldPrice,
  setCustomOldPrice
}) => {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-800">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
          4. Remise & Prix Barré
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">Afficher ancien prix</span>
          <input 
            type="checkbox" 
            checked={showOldPrice} 
            onChange={(e) => setShowOldPrice(e.target.checked)} 
            className="w-3.5 h-3.5 text-indigo-600 bg-slate-950 border-slate-800 rounded" 
          />
        </div>
      </div>

      {showOldPrice && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Remise Rapide (%)
            </label>
            <div className="flex gap-1">
              {[10, 20, 30, 50].map(pct => (
                <button
                  key={pct}
                  onClick={() => applyDiscountPercent(pct)}
                  className={cn(
                    "flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all",
                    discountPercent === pct 
                      ? "bg-indigo-600 text-white border-indigo-500" 
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  )}
                >
                  -{pct}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Ancien Prix Barré ({currency})
            </label>
            <input 
              type="number"
              step="0.01"
              placeholder="Ex: 2500"
              value={customOldPrice}
              onChange={(e) => setCustomOldPrice(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
};
