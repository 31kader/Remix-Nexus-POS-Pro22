import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export interface GlobalDiscountSectionProps {
  globalDiscount?: { type: 'percentage' | 'fixed'; value: number } | null;
  setGlobalDiscount?: (d: { type: 'percentage' | 'fixed'; value: number } | null) => void;
  discountAmount: number;
  currency: string;
}

export const GlobalDiscountSection: React.FC<GlobalDiscountSectionProps> = ({
  globalDiscount,
  setGlobalDiscount,
  discountAmount,
  currency
}) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    globalDiscount?.type || 'percentage'
  );
  const [discountInput, setDiscountInput] = useState<string>(
    globalDiscount && globalDiscount.value > 0 ? String(globalDiscount.value) : ''
  );

  useEffect(() => {
    if (globalDiscount && globalDiscount.value > 0) {
      setDiscountType(globalDiscount.type);
      setDiscountInput(String(globalDiscount.value));
    } else {
      setDiscountInput('');
    }
  }, [globalDiscount]);

  const handleApplyGlobalDiscount = () => {
    const val = parseFloat(discountInput);
    if (!isNaN(val) && val > 0) {
      if (setGlobalDiscount) {
        setGlobalDiscount({
          type: discountType,
          value: val
        });
        toast.success(`Remise globale de ${val}${discountType === 'percentage' ? '%' : ` ${currency}`} appliquée`);
      }
    } else {
      toast.warning("Veuillez saisir un montant de remise valide supérieur à 0");
    }
  };

  const handleApplyPreset = (preset: number) => {
    setDiscountInput(String(preset));
    if (setGlobalDiscount) {
      setGlobalDiscount({ type: discountType, value: preset });
      toast.success(`Remise de ${preset}${discountType === 'percentage' ? '%' : ` ${currency}`} appliquée`);
    }
  };

  const handleClearDiscount = () => {
    setDiscountInput('');
    if (setGlobalDiscount) setGlobalDiscount(null);
    toast.info("Remise globale retirée");
  };

  return (
    <div className="space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
          Remise Globale (Panier)
        </h4>
        {globalDiscount && globalDiscount.value > 0 && (
          <button
            type="button"
            onClick={handleClearDiscount}
            className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <X size={12} /> Effacer
          </button>
        )}
      </div>

      <div className="flex gap-1.5">
        <div className="flex bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setDiscountType('percentage')}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer",
              discountType === 'percentage' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setDiscountType('fixed')}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer",
              discountType === 'fixed' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            {currency}
          </button>
        </div>

        <div className="relative flex-1 min-w-0">
          <input
            id="global-discount-input"
            type="number"
            min="0"
            step="any"
            placeholder={discountType === 'percentage' ? "Ex: 10 (%)" : `Ex: 200 (${currency})`}
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyGlobalDiscount();
              }
            }}
            className="w-full h-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={handleApplyGlobalDiscount}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shrink-0 cursor-pointer shadow-xs"
        >
          APPLIQUER
        </button>
      </div>

      {/* Boutons de remise rapide en 1 clic */}
      <div className="flex items-center gap-1.5 pt-0.5">
        {(discountType === 'percentage'
          ? [5, 10, 15, 20]
          : [50, 100, 200, 500]
        ).map((preset) => {
          const isSelected = globalDiscount?.value === preset && globalDiscount?.type === discountType;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className={cn(
                "flex-1 py-1 rounded-lg text-[10px] font-bold font-mono border transition-all cursor-pointer active:scale-95",
                isSelected
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-emerald-500/50 hover:text-emerald-600"
              )}
            >
              -{preset}{discountType === 'percentage' ? '%' : ` ${currency}`}
            </button>
          );
        })}
      </div>

      {/* Badge de confirmation quand une remise globale est active */}
      {globalDiscount && globalDiscount.value > 0 && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-[11px] font-black">
          <span>
            ✓ Remise active : -{globalDiscount.value}{globalDiscount.type === 'percentage' ? '%' : ` ${currency}`} (-{(isNaN(discountAmount) ? 0 : discountAmount).toFixed(2)} {currency})
          </span>
          <button
            type="button"
            onClick={handleClearDiscount}
            className="p-1 hover:bg-rose-500/10 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
            title="Annuler la remise"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
