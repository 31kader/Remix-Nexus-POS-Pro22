import React from 'react';
import { Button } from '../ui';

interface OrdersBulkActionBarProps {
  selectedOrderIds: Set<string>;
  clearSelection: () => void;
  handleBulkConfirm: () => void;
  handleBulkCancel: () => void;
  handleBulkDelete: () => void;
}

export const OrdersBulkActionBar: React.FC<OrdersBulkActionBarProps> = ({
  selectedOrderIds,
  clearSelection,
  handleBulkConfirm,
  handleBulkCancel,
  handleBulkDelete
}) => {
  if (!selectedOrderIds || selectedOrderIds.size === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-indigo-950/80 border border-indigo-500/40 rounded-xl shadow-md animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
        <span className="text-sm font-black text-white">
          {selectedOrderIds.size} commande(s) sélectionnée(s)
        </span>
        <button
          type="button"
          onClick={clearSelection}
          className="text-xs text-indigo-300 hover:text-white underline cursor-pointer font-bold ml-2"
        >
          Tout désélectionner
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleBulkConfirm}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20"
        >
          ✓ Confirmer ({selectedOrderIds.size})
        </Button>
        <Button
          onClick={handleBulkCancel}
          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-amber-600/20"
        >
          ✕ Annuler ({selectedOrderIds.size})
        </Button>
        <Button
          onClick={handleBulkDelete}
          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-rose-600/20"
        >
          🗑️ Supprimer ({selectedOrderIds.size})
        </Button>
      </div>
    </div>
  );
};
