import React from 'react';
import { X, Minus, Plus, RefreshCw, Layers } from 'lucide-react';
import { CartonTemplate } from '../../../services/cartonIntakeService';
import { Product } from '../../../types';

interface CartonQuickAdjustModalProps {
  adjustingTemplate: CartonTemplate | null;
  onClose: () => void;
  cartonDeltaInput: number;
  setCartonDeltaInput: React.Dispatch<React.SetStateAction<number>>;
  isAdjusting: boolean;
  onConfirmAdjust: () => Promise<void>;
  linkedProduct?: Product;
}

export function CartonQuickAdjustModal({
  adjustingTemplate,
  onClose,
  cartonDeltaInput,
  setCartonDeltaInput,
  isAdjusting,
  onConfirmAdjust,
  linkedProduct
}: CartonQuickAdjustModalProps) {
  if (!adjustingTemplate) return null;

  const currentUnits = Number(linkedProduct?.stock) || 0;
  const colisage = Number(adjustingTemplate.unitsPerCarton) || 12;
  const currentCartons = Math.floor(currentUnits / colisage);
  const targetCartons = currentCartons + cartonDeltaInput;
  const targetUnits = currentUnits + (cartonDeltaInput * colisage);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Ajustement Stock Carton</h3>
              <p className="text-[11px] text-slate-400">{adjustingTemplate.productName}</p>
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

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Stock Actuel :</span>
            <span className="font-bold font-mono text-white">
              {currentCartons} cartons ({currentUnits} pcs)
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Colisage :</span>
            <span className="font-bold font-mono text-amber-400">{colisage} pièces/carton</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Variation (+ ou - cartons) :
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCartonDeltaInput(prev => prev - 1)}
              className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center active:scale-95"
            >
              <Minus size={18} />
            </button>
            <input
              type="number"
              value={cartonDeltaInput}
              onChange={(e) => setCartonDeltaInput(parseInt(e.target.value) || 0)}
              className="flex-1 h-12 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-center font-mono font-black text-lg outline-none"
            />
            <button
              type="button"
              onClick={() => setCartonDeltaInput(prev => prev + 1)}
              className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center active:scale-95"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {[-5, -1, 1, 5, 10].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setCartonDeltaInput(v)}
                className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 font-bold"
              >
                {v > 0 ? `+${v}` : v}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
          <span className="text-amber-300 font-bold">Nouveau Stock Résultant :</span>
          <span className="font-mono font-black text-white text-sm">
            {targetCartons} cartons ({targetUnits} pcs)
          </span>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isAdjusting || cartonDeltaInput === 0}
            onClick={onConfirmAdjust}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            {isAdjusting ? <RefreshCw size={14} className="animate-spin" /> : null}
            <span>Appliquer (+{cartonDeltaInput * colisage} pcs)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
