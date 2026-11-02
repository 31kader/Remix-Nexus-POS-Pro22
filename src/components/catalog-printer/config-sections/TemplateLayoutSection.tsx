import React from 'react';
import { cn } from '../../../lib/utils';
import { LayoutMode, Orientation, CellBorder } from '../types';

export interface TemplateLayoutSectionProps {
  layoutMode: LayoutMode;
  setLayoutMode: (m: LayoutMode) => void;
  columns: number;
  setColumns: (c: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (r: number) => void;
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  cellBorder: CellBorder;
  setCellBorder: (b: CellBorder) => void;
}

export const TemplateLayoutSection: React.FC<TemplateLayoutSectionProps> = ({
  layoutMode,
  setLayoutMode,
  columns,
  setColumns,
  rowsPerPage,
  setRowsPerPage,
  orientation,
  setOrientation,
  cellBorder,
  setCellBorder
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-black text-slate-700 dark:text-zinc-200 uppercase mb-2">
          Disposition Principale A4
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'grid', label: 'Grille Catalogues', desc: 'Cartes avec photos' },
            { id: 'table', label: 'Tableau Liste', desc: 'Compact type devis' },
            { id: 'inventory_sheet', label: 'Feuille Inventaire', desc: 'Comptage magasin' }
          ].map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setLayoutMode(m.id as LayoutMode)}
              className={cn(
                'p-2.5 rounded-xl border text-left transition-all',
                layoutMode === m.id
                  ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
              )}
            >
              <div className="text-xs font-black">{m.label}</div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {layoutMode === 'grid' && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase">Colonnes ({columns})</label>
            <input
              type="range"
              min={2}
              max={5}
              value={columns}
              onChange={e => setColumns(Number(e.target.value))}
              className="w-full mt-1 accent-indigo-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase">Lignes / Page ({rowsPerPage})</label>
            <input
              type="range"
              min={1}
              max={6}
              value={rowsPerPage}
              onChange={e => setRowsPerPage(Number(e.target.value))}
              className="w-full mt-1 accent-indigo-600"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Orientation A4</label>
          <select
            value={orientation}
            onChange={e => setOrientation(e.target.value as Orientation)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
          >
            <option value="portrait">Portrait (Vertical)</option>
            <option value="landscape">Paysage (Horizontal)</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bordure des Cartes</label>
          <select
            value={cellBorder}
            onChange={e => setCellBorder(e.target.value as CellBorder)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold"
          >
            <option value="thin">Cadre Fin Pro</option>
            <option value="shadow">Ombre Légère</option>
            <option value="none">Sans Bordure</option>
          </select>
        </div>
      </div>
    </div>
  );
};
