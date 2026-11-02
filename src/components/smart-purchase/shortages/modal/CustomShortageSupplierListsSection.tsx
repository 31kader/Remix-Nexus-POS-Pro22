import React from 'react';
import { Building2, Layers, Check } from 'lucide-react';
import { Supplier } from '../../../../types';
import { CustomReplenishmentList } from '../../../../types/shortages';
import { cn } from '../../../../lib/utils';

interface CustomShortageSupplierListsSectionProps {
  suppliers: Supplier[];
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  customSupplierName: string;
  setCustomSupplierName: (name: string) => void;
  customLists: CustomReplenishmentList[];
  selectedListIds: string[];
  toggleListSelection: (listId: string) => void;
}

export const CustomShortageSupplierListsSection: React.FC<CustomShortageSupplierListsSectionProps> = ({
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId,
  customSupplierName,
  setCustomSupplierName,
  customLists,
  selectedListIds,
  toggleListSelection
}) => {
  return (
    <>
      {/* 4. Fournisseur */}
      <div>
        <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Building2 size={12} /> Fournisseur d'approvisionnement
        </label>
        <select
          value={selectedSupplierId}
          onChange={(e) => setSelectedSupplierId(e.target.value)}
          className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">-- Sans fournisseur spécifique --</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.phone ? `(${s.phone})` : ''}
            </option>
          ))}
          <option value="__custom__">Autre fournisseur (saisie libre)...</option>
        </select>

        {selectedSupplierId === '__custom__' && (
          <input
            type="text"
            value={customSupplierName}
            onChange={(e) => setCustomSupplierName(e.target.value)}
            placeholder="Nom du fournisseur ou grossiste libre"
            className="w-full mt-2 bg-industrial-900 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-industrial-600 focus:outline-none focus:border-indigo-500"
          />
        )}
      </div>

      {/* 5. Affectation aux Listes Personnalisées */}
      {customLists.length > 0 && (
        <div>
          <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers size={12} /> Affecter à une ou plusieurs listes
          </label>
          <div className="flex flex-wrap gap-2">
            {customLists.map((list) => {
              const isSelected = selectedListIds.includes(list.id);
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => toggleListSelection(list.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all",
                    isSelected
                      ? "bg-indigo-950/80 border-indigo-500 text-indigo-300 shadow-sm"
                      : "bg-industrial-900/60 border-industrial-800 text-industrial-400 hover:text-white"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: list.color || '#6366f1' }}
                  />
                  <span>{list.name}</span>
                  {isSelected && <Check size={12} className="text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
