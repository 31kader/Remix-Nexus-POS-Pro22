import React from 'react';
import { Building2, Layers, CheckSquare } from 'lucide-react';
import { formatDZD } from './shortageExportHelpers';
import { cn } from '../../../lib/utils';

interface ShortageExportScopeHeaderProps {
  targetItemsCount: number;
  totalQuantity: number;
  totalValuation: number;
  checkedItemsCount: number;
  filteredItemsCount: number;
  exportScope: 'checked' | 'filtered';
  onScopeChange: (scope: 'checked' | 'filtered') => void;
  resolvedSupplierName: string;
  resolvedListName: string;
}

export const ShortageExportScopeHeader: React.FC<ShortageExportScopeHeaderProps> = ({
  targetItemsCount,
  totalQuantity,
  totalValuation,
  checkedItemsCount,
  filteredItemsCount,
  exportScope,
  onScopeChange,
  resolvedSupplierName,
  resolvedListName
}) => {
  return (
    <div className="space-y-4">
      {/* 1. Sélecteur du Périmètre d'Export */}
      <div className="bg-industrial-900/40 p-3.5 rounded-2xl border border-industrial-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase text-industrial-400 tracking-wider block mb-0.5">
            Périmètre à exporter / imprimer
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              {targetItemsCount} article(s) ciblé(s)
            </span>
            <span className="text-xs font-mono text-indigo-400 font-bold">
              ({totalQuantity} unités • {formatDZD(totalValuation)} DA)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-industrial-950 p-1 rounded-xl border border-industrial-800">
          {checkedItemsCount > 0 && (
            <button
              type="button"
              onClick={() => onScopeChange('checked')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                exportScope === 'checked'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-industrial-400 hover:text-white"
              )}
            >
              <CheckSquare size={13} />
              <span>Cochés ({checkedItemsCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onScopeChange('filtered')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              exportScope === 'filtered'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-industrial-400 hover:text-white"
            )}
          >
            <span>Vue filtrée ({filteredItemsCount})</span>
          </button>
        </div>
      </div>

      {/* 2. Récapitulatif Contextuel */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="bg-industrial-950/60 p-3 rounded-xl border border-industrial-800 flex items-center gap-2">
          <Building2 size={16} className="text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-industrial-500 uppercase block">Fournisseur :</span>
            <span className="font-bold text-white truncate block">{resolvedSupplierName}</span>
          </div>
        </div>

        <div className="bg-industrial-950/60 p-3 rounded-xl border border-industrial-800 flex items-center gap-2">
          <Layers size={16} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-industrial-500 uppercase block">Liste :</span>
            <span className="font-bold text-white truncate block">{resolvedListName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
