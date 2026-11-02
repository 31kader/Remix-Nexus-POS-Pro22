import React from 'react';

interface CustomShortageQuantityPriceInputsProps {
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  costPrice: string;
  setCostPrice: React.Dispatch<React.SetStateAction<string>>;
}

export const CustomShortageQuantityPriceInputs: React.FC<CustomShortageQuantityPriceInputsProps> = ({
  quantity,
  setQuantity,
  costPrice,
  setCostPrice
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1">
          Quantité souhaitée <span className="text-rose-400">*</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={quantity <= 1}
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-9 h-9 rounded-xl bg-industrial-900 border border-industrial-700 text-industrial-300 hover:text-white flex items-center justify-center text-sm font-bold disabled:opacity-40"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-20 text-center bg-industrial-900 border border-industrial-700 rounded-xl py-2 text-sm font-black font-mono text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => setQuantity(q => q + 1)}
            className="w-9 h-9 rounded-xl bg-industrial-900 border border-industrial-700 text-industrial-300 hover:text-white flex items-center justify-center text-sm font-bold"
          >
            +
          </button>
          <div className="flex items-center gap-1 ml-auto">
            {[6, 12, 24].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setQuantity(q => q + step)}
                className="px-2 py-1.5 rounded-lg bg-industrial-900 border border-industrial-800 text-[10px] font-mono font-bold text-industrial-400 hover:text-indigo-300 hover:border-indigo-500/40"
              >
                +{step}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-mono text-industrial-400 uppercase tracking-wider mb-1">
          Prix d'achat estimé (DA)
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-industrial-900 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-industrial-600 focus:outline-none focus:border-indigo-500"
          />
          <span className="absolute right-3 text-xs font-mono text-industrial-500 font-bold">
            DA
          </span>
        </div>
      </div>
    </div>
  );
};
