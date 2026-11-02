import React, { useMemo } from 'react';
import { 
  ClipboardList, CheckSquare, Trash2, Sparkles
} from 'lucide-react';
import { useShortageStore } from '../../../store/useShortageStore';
import { ShortageTableRow } from './ShortageTableRow';
import { ShortagesMobileCardsView } from './ShortagesMobileCardsView';
import { Button } from '../../ui';

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

      {/* Vue Cartes Tactiles Mobiles (< lg) : block lg:hidden space-y-3 p-3 (w-10 h-10 rounded-xl, min-w-[38px] min-h-[38px]) */}
      <ShortagesMobileCardsView
        filteredItems={filteredItems}
        onOpenSuggestions={onOpenSuggestions}
        toggleItemCheck={toggleItemCheck}
        updateItemQuantity={updateItemQuantity}
        removeItem={removeItem}
      />

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
