import React, { useMemo } from 'react';
import { 
  ClipboardList, CheckSquare, Trash2, 
  ArrowUpDown, Package, Sparkles, Minus, Plus 
} from 'lucide-react';
import { useShortageStore } from '../../../store/useShortageStore';
import { ShortageTableRow } from './ShortageTableRow';
import { Button, SafeImage } from '../../ui';

interface ShortagesTableProps {
  onOpenSuggestions?: () => void;
}

export const ShortagesTable: React.FC<ShortagesTableProps> = ({
  onOpenSuggestions
}) => {
  const items = useShortageStore(s => s.items);
  const activeListId = useShortageStore(s => s.activeListId);
  const selectedSupplierFilter = useShortageStore(s => s.selectedSupplierFilter);
  const searchQuery = useShortageStore(s => s.searchQuery);
  const getFilteredItems = useShortageStore(s => s.getFilteredItems);
  const toggleItemCheck = useShortageStore(s => s.toggleItemCheck);
  const toggleAllCheck = useShortageStore(s => s.toggleAllCheck);
  const updateItemQuantity = useShortageStore(s => s.updateItemQuantity);
  const updateItemCostPrice = useShortageStore(s => s.updateItemCostPrice);
  const removeItem = useShortageStore(s => s.removeItem);
  const clearCheckedItems = useShortageStore(s => s.clearCheckedItems);

  const filteredItems = useMemo(
    () => getFilteredItems(),
    [items, activeListId, selectedSupplierFilter, searchQuery, getFilteredItems]
  );

  const isAllChecked = useMemo(() => {
    return filteredItems.length > 0 && filteredItems.every(i => i.isChecked);
  }, [filteredItems]);

  const checkedCount = useMemo(() => {
    return filteredItems.filter(i => i.isChecked).length;
  }, [filteredItems]);

  const totalFilteredQuantity = useMemo(() => {
    return filteredItems.reduce((acc, i) => acc + i.quantityNeeded, 0);
  }, [filteredItems]);

  const totalFilteredValuation = useMemo(() => {
    return filteredItems.reduce((acc, i) => acc + (i.quantityNeeded * (i.costPrice || 0)), 0);
  }, [filteredItems]);

  const handleHeaderCheckToggle = () => {
    toggleAllCheck(!isAllChecked);
  };

  const handleClearSelected = async () => {
    if (checkedCount === 0) return;
    if (window.confirm(`Voulez-vous supprimer les ${checkedCount} article(s) sélectionné(s) ?`)) {
      await clearCheckedItems();
    }
  };

  return (
    <div className="bg-industrial-900/60 rounded-2xl border border-industrial-800 shadow-xl overflow-hidden flex flex-col">
      {/* Barre d'état au-dessus du tableau si sélection active */}
      {checkedCount > 0 && (
        <div className="bg-indigo-950/40 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-indigo-300">
            <CheckSquare size={14} className="text-indigo-400" />
            <span className="font-bold">
              {checkedCount} sur {filteredItems.length} article(s) sélectionné(s)
            </span>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleClearSelected}
            className="flex items-center gap-1.5 bg-rose-950/40 border-rose-800/40 hover:bg-rose-900/60 text-rose-300 text-[11px] px-2.5 py-1 rounded-lg transition-all"
          >
            <Trash2 size={12} />
            <span>Supprimer la sélection</span>
          </Button>
        </div>
      )}

      {/* Conteneur défilant du tableau & Cartes Mobiles */}
      {/* Vue Cartes Tactiles Mobiles (< lg) */}
      <div className="block lg:hidden space-y-3 p-3">
        {filteredItems.length === 0 ? (
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
        ) : (
          filteredItems.map(item => {
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
          })
        )}
      </div>

      {/* Tableau Traditionnel Bureau (>= lg) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-industrial-950/80 border-b border-industrial-800 text-[10px] uppercase font-mono text-industrial-400 tracking-wider">
              <th className="px-3 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllChecked}
                  onChange={handleHeaderCheckToggle}
                  aria-label="Tout sélectionner"
                  className="w-4 h-4 rounded border-industrial-700 bg-industrial-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 min-w-[200px]">Article & Référence</th>
              <th className="px-3 py-3 min-w-[130px]">Stock / Seuil</th>
              <th className="px-3 py-3 min-w-[140px]">Fournisseur</th>
              <th className="px-3 py-3 min-w-[110px]">P.U Achat</th>
              <th className="px-3 py-3 min-w-[150px]">Quantité Souhaitée</th>
              <th className="px-3 py-3 min-w-[130px] text-right">Sous-Total Estimé</th>
              <th className="px-3 py-3 w-12 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-industrial-800/50">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-industrial-950 border border-industrial-800 flex items-center justify-center text-industrial-600 shadow-inner">
                      <ClipboardList size={32} />
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                      Aucun article manquant dans cette vue
                    </h3>
                    <p className="text-xs text-industrial-400 font-mono">
                      Scannez un code-barres à la douchette, recherchez un produit ou ouvrez le panneau de suggestions pour ajouter automatiquement les articles en rupture.
                    </p>
                    {onOpenSuggestions && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={onOpenSuggestions}
                        className="mt-2 flex items-center gap-2 bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                      >
                        <Sparkles size={14} />
                        <span>Ouvrir les suggestions de réassort</span>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map(item => (
                <ShortageTableRow
                  key={item.id}
                  item={item}
                  onToggleCheck={toggleItemCheck}
                  onUpdateQuantity={updateItemQuantity}
                  onUpdateCostPrice={updateItemCostPrice}
                  onRemove={removeItem}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ligne de pied de tableau récapitulative */}
      {filteredItems.length > 0 && (
        <div className="bg-industrial-950/90 border-t border-industrial-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="text-industrial-400 flex items-center gap-3">
            <span>
              Total affiché : <strong className="text-white font-bold">{filteredItems.length}</strong> ligne(s)
            </span>
            <span>•</span>
            <span>
              Quantité totale : <strong className="text-indigo-300 font-bold">{totalFilteredQuantity}</strong> unité(s)
            </span>
          </div>

          <div className="flex items-center gap-2 text-right">
            <span className="text-industrial-400 uppercase text-[10px]">
              Montant estimé :
            </span>
            <span className="text-base font-black font-mono text-white">
              {Number(totalFilteredValuation).toLocaleString('fr-DZ', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
            <span className="text-xs font-bold text-indigo-400">DA</span>
          </div>
        </div>
      )}
    </div>
  );
};
