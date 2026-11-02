import React from 'react';
import { PlusCircle, X } from 'lucide-react';

interface MobileCartonQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  quickName: string;
  setQuickName: (val: string) => void;
  quickBarcode: string;
  setQuickBarcode: (val: string) => void;
  quickUnitsPerCarton: number;
  setQuickUnitsPerCarton: (val: number) => void;
  quickCostPrice: number;
  setQuickCostPrice: (val: number) => void;
  quickSellingPrice: number;
  setQuickSellingPrice: (val: number) => void;
}

export function MobileCartonQuickCreateModal({
  isOpen,
  onClose,
  onSubmit,
  quickName,
  setQuickName,
  quickBarcode,
  setQuickBarcode,
  quickUnitsPerCarton,
  setQuickUnitsPerCarton,
  quickCostPrice,
  setQuickCostPrice,
  quickSellingPrice,
  setQuickSellingPrice
}: MobileCartonQuickCreateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <PlusCircle size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Création Rapide de l'Article</h3>
              <p className="text-[11px] text-slate-400">Ajout instantané au catalogue et association</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Désignation / Nom de l'article *
            </label>
            <input
              type="text"
              required
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Ex: Eau Minérale Ifri 12x0.5L"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm focus:border-indigo-500 outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Code-barres (EAN)
              </label>
              <input
                type="text"
                value={quickBarcode}
                onChange={(e) => setQuickBarcode(e.target.value)}
                placeholder="Optionnel"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Colisage (Pièces/Carton)
              </label>
              <input
                type="number"
                min="1"
                value={quickUnitsPerCarton}
                onChange={(e) => setQuickUnitsPerCarton(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Prix d'achat unitaire (DA)
              </label>
              <input
                type="number"
                step="any"
                value={quickCostPrice || ''}
                onChange={(e) => setQuickCostPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Prix de vente (DA)
              </label>
              <input
                type="number"
                step="any"
                value={quickSellingPrice || ''}
                onChange={(e) => setQuickSellingPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
            >
              Créer et Lier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
