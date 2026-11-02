import React from 'react';
import { Plus, Palette, Check } from 'lucide-react';
import { Button } from '../../../ui';
import { cn } from '../../../../lib/utils';

export const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#64748b', // Slate
];

interface CreateCustomListSectionProps {
  newName: string;
  setNewName: (name: string) => void;
  newDescription: string;
  setNewDescription: (desc: string) => void;
  newColor: string;
  setNewColor: (color: string) => void;
  isCreating: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateCustomListSection: React.FC<CreateCustomListSectionProps> = ({
  newName,
  setNewName,
  newDescription,
  setNewDescription,
  newColor,
  setNewColor,
  isCreating,
  onSubmit
}) => {
  return (
    <div className="bg-industrial-900/40 p-4 rounded-2xl border border-industrial-800/80">
      <h3 className="text-xs font-black uppercase text-indigo-300 font-mono tracking-wider flex items-center gap-2 mb-3">
        <Plus size={14} /> Créer une nouvelle liste libre
      </h3>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Nom */}
          <div>
            <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1">
              Nom de la liste <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Tournée Détergents, Frais, Boissons..."
              className="w-full bg-industrial-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-industrial-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1">
              Note / Description (optionnel)
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Ex: Commandes hebdomadaires mardi"
              className="w-full bg-industrial-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-industrial-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Sélection de la couleur */}
        <div>
          <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Palette size={12} /> Pastille de couleur
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all border",
                  newColor === c
                    ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-industrial-950 scale-110 border-white/40"
                    : "border-transparent opacity-80 hover:opacity-100"
                )}
                style={{ backgroundColor: c }}
                title={`Couleur ${c}`}
                aria-label={`Sélectionner couleur ${c}`}
              >
                {newColor === c && <Check size={13} className="text-white drop-shadow" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={!newName.trim() || isCreating}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Ajouter la liste</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
