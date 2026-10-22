import React, { useState, useEffect } from 'react';
import { Tag, Check, Trash2, Percent } from 'lucide-react';
import { CartItem } from '../../types';
import { Modal } from '../ui';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface LineDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem | null;
  currency: string;
  isWholesale?: boolean;
  onApply: (discount: { type: 'percentage' | 'fixed'; value: number } | null) => void;
}

export const LineDiscountModal: React.FC<LineDiscountModalProps> = ({
  isOpen,
  onClose,
  item,
  currency,
  isWholesale = false,
  onApply
}) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');

  useEffect(() => {
    if (isOpen && item) {
      if (item.lineDiscount) {
        setDiscountType(item.lineDiscount.type);
        setDiscountValue(item.lineDiscount.value.toString());
      } else {
        setDiscountType('percentage');
        setDiscountValue('');
      }
    }
  }, [isOpen, item]);

  if (!item) return null;

  const basePrice = item.overriddenPrice !== undefined 
    ? item.overriddenPrice 
    : (isWholesale && item.wholesalePrice ? item.wholesalePrice : item.price);

  const numVal = parseFloat(discountValue) || 0;
  
  // Calcul de la remise unitaire
  const unitDiscount = discountType === 'percentage'
    ? (basePrice * (numVal / 100))
    : Math.min(basePrice, numVal);

  const finalUnitPrice = Math.max(0, basePrice - unitDiscount);
  const totalLineBefore = basePrice * Math.abs(item.quantity);
  const totalLineAfter = finalUnitPrice * Math.abs(item.quantity);
  const totalSaved = Math.max(0, totalLineBefore - totalLineAfter);

  const handleApply = () => {
    if (numVal <= 0) {
      onApply(null);
      toast.info("Remise réinitialisée pour cet article");
    } else {
      onApply({
        type: discountType,
        value: numVal
      });
      toast.success(`Remise de ${numVal}${discountType === 'percentage' ? '%' : ` ${currency}`} appliquée sur "${item.name}"`);
    }
    onClose();
  };

  const handleRemove = () => {
    onApply(null);
    toast.info(`Remise supprimée sur "${item.name}"`);
    onClose();
  };

  const presets = discountType === 'percentage' 
    ? [5, 10, 15, 20, 25, 30] 
    : [50, 100, 200, 500, 1000];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Remise sur la ligne d'article"
      size="sm"
    >
      <div className="space-y-5">
        {/* En-tête Article */}
        <div className="p-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-900 dark:text-white truncate max-w-[200px]">
              {item.name}
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Qté: {Math.abs(item.quantity)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-zinc-400">
            <span>Prix unitaire de base :</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {basePrice.toFixed(2)} {currency}
            </span>
          </div>
        </div>

        {/* Sélecteur de type de remise : Pourcentage ou Montant Fixe */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Type de Remise
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
            <button
              type="button"
              onClick={() => setDiscountType('percentage')}
              className={cn(
                "py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                discountType === 'percentage'
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Percent size={14} />
              <span>Pourcentage (%)</span>
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('fixed')}
              className={cn(
                "py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                discountType === 'fixed'
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Tag size={14} />
              <span>Montant Fixe ({currency})</span>
            </button>
          </div>
        </div>

        {/* Champ de saisie valeur de la remise */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Valeur de la Remise
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="any"
              autoFocus
              placeholder={discountType === 'percentage' ? "Ex: 10" : `Ex: 200`}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApply();
                }
              }}
              className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-base font-black font-mono text-slate-900 dark:text-white outline-none transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black font-mono text-slate-400">
              {discountType === 'percentage' ? '%' : currency}
            </span>
          </div>
        </div>

        {/* Boutons Rapides Prédéfinis */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Raccourcis rapides
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {presets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setDiscountValue(val.toString())}
                className={cn(
                  "py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer active:scale-95",
                  discountValue === val.toString()
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                    : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-emerald-500"
                )}
              >
                -{val}{discountType === 'percentage' ? '%' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Aperçu Dynamique de la Remise */}
        {numVal > 0 && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span>Nouveau prix unitaire :</span>
              <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                {finalUnitPrice.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-emerald-700/80 dark:text-emerald-300/80">
              <span>Économie client :</span>
              <span className="font-black">
                -{totalSaved.toFixed(2)} {currency}
              </span>
            </div>
          </div>
        )}

        {/* Boutons d'Action */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
          {item.lineDiscount && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Retirer</span>
            </button>
          )}
          <div className="flex-1 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold transition-all cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Check size={16} />
              <span>Valider la Remise</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
