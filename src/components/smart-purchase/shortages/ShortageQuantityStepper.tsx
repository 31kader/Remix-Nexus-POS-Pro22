import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface ShortageQuantityStepperProps {
  quantityNeeded: number;
  onUpdateQuantity: (qty: number) => void;
}

export const ShortageQuantityStepper: React.FC<ShortageQuantityStepperProps> = ({
  quantityNeeded,
  onUpdateQuantity,
}) => {
  const handleStepQty = (delta: number) => {
    const next = Math.max(1, quantityNeeded + delta);
    onUpdateQuantity(next);
  };

  const handleQuickAdd = (amount: number) => {
    onUpdateQuantity(quantityNeeded + amount);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={quantityNeeded <= 1}
          onClick={() => handleStepQty(-1)}
          className="w-7 h-7 rounded-lg bg-industrial-950 border border-industrial-800 hover:border-industrial-700 text-industrial-400 hover:text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Diminuer"
        >
          <Minus size={13} />
        </button>

        <input
          type="number"
          min={1}
          value={quantityNeeded}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 1) {
              onUpdateQuantity(val);
            }
          }}
          className="w-14 text-center bg-industrial-950 border border-industrial-800 rounded-lg py-1 text-sm font-black font-mono text-white focus:outline-none focus:border-indigo-500"
        />

        <button
          type="button"
          onClick={() => handleStepQty(1)}
          className="w-7 h-7 rounded-lg bg-industrial-950 border border-industrial-800 hover:border-industrial-700 text-industrial-400 hover:text-white flex items-center justify-center transition-all"
          title="Augmenter"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Raccourcis conditionnement rapide (+6, +12, +24) */}
      <div className="flex items-center gap-1">
        {[6, 12, 24].map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => handleQuickAdd(step)}
            className="px-1.5 py-0.5 rounded bg-industrial-950/80 hover:bg-indigo-950/60 border border-industrial-800/80 hover:border-indigo-500/40 text-[9px] font-mono font-bold text-industrial-400 hover:text-indigo-300 transition-all"
            title={`Ajouter un carton de ${step}`}
          >
            +{step}
          </button>
        ))}
      </div>
    </div>
  );
};
