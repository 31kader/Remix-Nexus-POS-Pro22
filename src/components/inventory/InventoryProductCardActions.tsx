import React from 'react';
import { RefreshCw, Printer, Copy, History as HistoryIcon, Trash2 } from 'lucide-react';
import { Product } from '../../types';

interface InventoryProductCardActionsProps {
  product: Product;
  onOpenAdjustment: (product: Product) => void;
  onPrintLabel: (product: Product) => void;
  onCopy: (product: Product) => void;
  onViewHistory: (product: Product) => void;
  onDelete: (id: string | null) => void;
}

export const InventoryProductCardActions: React.FC<InventoryProductCardActionsProps> = ({
  product,
  onOpenAdjustment,
  onPrintLabel,
  onCopy,
  onViewHistory,
  onDelete
}) => {
  return (
    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => onOpenAdjustment(product)}
        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 dark:text-slate-300 dark:hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700/50 hover:border-indigo-500 cursor-pointer shadow-xs active:scale-95"
        title="Ajuster le stock"
      >
        <RefreshCw size={13} />
        <span>Ajuster</span>
      </button>

      <button
        type="button"
        onClick={() => onPrintLabel(product)}
        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700/50 cursor-pointer shadow-xs active:scale-95"
        title="Imprimer l'étiquette"
      >
        <Printer size={14} />
      </button>

      <button
        type="button"
        onClick={() => onCopy(product)}
        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700/50 cursor-pointer shadow-xs active:scale-95"
        title="Dupliquer l'article"
      >
        <Copy size={14} />
      </button>

      <button
        type="button"
        onClick={() => onViewHistory(product)}
        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700/50 cursor-pointer shadow-xs active:scale-95"
        title="Historique des ventes et achats"
      >
        <HistoryIcon size={14} />
      </button>

      <button
        type="button"
        onClick={() => onDelete(product.id || null)}
        className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-500/10 dark:hover:bg-rose-600 dark:text-rose-400 dark:hover:text-white rounded-xl transition-all border border-rose-200 dark:border-rose-500/20 hover:border-rose-500 cursor-pointer shadow-xs active:scale-95"
        title="Supprimer l'article"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};
