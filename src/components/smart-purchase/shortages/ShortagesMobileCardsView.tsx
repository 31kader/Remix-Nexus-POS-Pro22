import React from 'react';
import { 
  ClipboardList, CheckSquare, Trash2, 
  Package, Sparkles, Minus, Plus 
} from 'lucide-react';
import { Button, SafeImage } from '../../ui';

interface ShortagesMobileCardsViewProps {
  filteredItems: any[];
  onOpenSuggestions?: () => void;
  toggleItemCheck: (id: string) => void;
  updateItemQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
}

export const ShortagesMobileCardsView: React.FC<ShortagesMobileCardsViewProps> = ({
  filteredItems,
  onOpenSuggestions,
  toggleItemCheck,
  updateItemQuantity,
  removeItem
}) => {
  if (filteredItems.length === 0) {
    return (
      <div className="block lg:hidden p-3">
        <div className="py-12 text-center">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3 px-4">
            <div className="w-14 h-14 rounded-2xl bg-industrial-950 border border-industrial-800 flex items-center justify-center text-industrial-600 shadow-inner">
              <ClipboardList size={28} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">
              Aucun article manquant dans cette vue
            </h3>
            <p className="text-xs text-industrial-400 font-mono">
              Scannez un code-barres ou ouvrez les suggestions de réassort.
            </p>
            {onOpenSuggestions && (
              <Button
                type="button"
                variant="secondary"
                onClick={onOpenSuggestions}
                className="mt-2 flex items-center gap-2 bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                <Sparkles size={14} />
                <span>Ouvrir les suggestions</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="block lg:hidden space-y-3 p-3">
      {filteredItems.map(item => {
        const subtotal = (item.quantityNeeded || 0) * (item.costPrice || 0);
        const isStockCritical = (item.currentStock || 0) <= 0;
        const isStockLow = !isStockCritical && (item.currentStock || 0) <= (item.minStock || 5);

        return (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border transition-all space-y-3 ${
              item.isChecked
                ? 'bg-indigo-950/20 border-indigo-500/40 shadow-sm'
                : 'bg-industrial-950/70 border-industrial-800'
            }`}
          >
            {/* Top row: Checkbox, Image, Nom & Référence */}
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleItemCheck(item.id)}
                className={`min-w-[38px] min-h-[38px] w-10 h-10 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                  item.isChecked
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                    : 'border-industrial-700 bg-industrial-900 text-transparent hover:border-industrial-500'
                }`}
                aria-label="Sélectionner l'article"
              >
                <CheckSquare size={18} className={item.isChecked ? 'opacity-100' : 'opacity-20'} />
              </button>

              <div className="w-12 h-12 rounded-xl bg-industrial-900 border border-industrial-800 flex items-center justify-center overflow-hidden shrink-0">
                {item.imageUrl ? (
                  <SafeImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    fallback={<Package size={20} className="text-industrial-600" />}
                  />
                ) : (
                  <Package size={20} className="text-industrial-600" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white uppercase text-sm truncate leading-snug">
                  {item.name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap font-mono text-[11px] text-industrial-400">
                  {item.barcode && <span>EAN: {item.barcode}</span>}
                  {item.supplierName && (
                    <span className="px-1.5 py-0.5 rounded bg-industrial-900 text-indigo-300 border border-industrial-800 text-[10px]">
                      {item.supplierName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stock actuel vs Seuil */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-industrial-900/90 border border-industrial-800/80 text-xs font-mono">
              <div>
                <span className="text-[10px] text-industrial-400 uppercase font-bold block">Stock / Seuil</span>
                <span className={`inline-flex items-center gap-1 font-bold mt-0.5 ${
                  isStockCritical
                    ? 'text-rose-400'
                    : isStockLow
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                }`}>
                  {item.currentStock ?? 0} / {item.minStock ?? 0}
                  {isStockCritical ? ' (Rupture)' : isStockLow ? ' (Alerte)' : ''}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-industrial-400 uppercase font-bold block">P.U Achat</span>
                <span className="font-bold text-white mt-0.5 block">
                  {(item.costPrice || 0).toFixed(2)} DA
                </span>
              </div>
            </div>

            {/* Quantité Souhaitée avec cibles tactiles >= 38px + Sous-total + Poubelle */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-industrial-800/80">
              {/* Stepper de quantité */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateItemQuantity(item.id, Math.max(1, (item.quantityNeeded || 1) - 1))}
                  className="w-10 h-10 rounded-xl bg-industrial-900 hover:bg-industrial-800 border border-industrial-700 text-industrial-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-xs"
                  aria-label="Diminuer la quantité"
                >
                  <Minus size={16} />
                </button>

                <input
                  type="number"
                  min="1"
                  value={item.quantityNeeded}
                  onChange={(e) => updateItemQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 h-10 text-center font-mono font-black text-sm bg-industrial-950 border border-industrial-700 rounded-xl text-white outline-none focus:border-indigo-500 shadow-inner"
                />

                <button
                  type="button"
                  onClick={() => updateItemQuantity(item.id, (item.quantityNeeded || 1) + 1)}
                  className="w-10 h-10 rounded-xl bg-industrial-900 hover:bg-industrial-800 border border-industrial-700 text-industrial-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-xs"
                  aria-label="Augmenter la quantité"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Sous-Total et Suppression */}
              <div className="flex items-center gap-3">
                <div className="text-right font-mono">
                  <span className="text-[9px] uppercase text-industrial-400 block">Total Est.</span>
                  <span className="font-bold text-indigo-300 text-sm">
                    {subtotal.toFixed(0)} DA
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="w-10 h-10 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 hover:text-rose-200 flex items-center justify-center transition-all active:scale-95"
                  title="Supprimer l'article"
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
