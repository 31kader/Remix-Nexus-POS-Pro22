import React, { useState } from 'react';

interface ShortageCostPriceCellProps {
  costPrice?: number;
  onUpdateCostPrice: (cost: number) => void;
}

export const ShortageCostPriceCell: React.FC<ShortageCostPriceCellProps> = ({
  costPrice = 0,
  onUpdateCostPrice,
}) => {
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [costInput, setCostInput] = useState(String(costPrice));

  const handleCostSubmit = () => {
    setIsEditingCost(false);
    const parsed = parseFloat(costInput.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateCostPrice(parsed);
    } else {
      setCostInput(String(costPrice));
    }
  };

  if (isEditingCost) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={costInput}
          autoFocus
          onChange={(e) => setCostInput(e.target.value)}
          onBlur={handleCostSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCostSubmit();
            if (e.key === 'Escape') {
              setCostInput(String(costPrice));
              setIsEditingCost(false);
            }
          }}
          className="w-20 bg-industrial-950 border border-indigo-500 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
        />
        <span className="text-[10px] font-mono text-indigo-400 font-bold">DA</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        setCostInput(String(costPrice));
        setIsEditingCost(true);
      }}
      title="Cliquer pour modifier le prix d'achat"
      className="cursor-pointer group/cost flex items-baseline gap-1 font-mono text-xs text-industrial-300 hover:text-white transition-colors"
    >
      <span className="font-bold underline decoration-dotted decoration-industrial-600 underline-offset-2">
        {Number(costPrice).toLocaleString('fr-DZ', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
      </span>
      <span className="text-[10px] text-industrial-500 group-hover/cost:text-indigo-400">DA</span>
    </div>
  );
};
