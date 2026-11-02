import React from 'react';
import { Zap } from 'lucide-react';
import { Button } from '../../../ui';

interface BulkCostBannerProps {
  bulkCost: string;
  setBulkCost: (val: string) => void;
  onApplyBulkCost: () => void;
  isProcessingBulk: boolean;
}

export const BulkCostBanner: React.FC<BulkCostBannerProps> = ({
  bulkCost,
  setBulkCost,
  onApplyBulkCost,
  isProcessingBulk,
}) => {
  return (
    <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Zap className="text-indigo-400 shrink-0" size={20} />
        <div>
          <p className="text-xs font-black text-indigo-200 uppercase tracking-wider">Régulariser le Prix d'Achat en Lot</p>
          <p className="text-[10px] text-slate-300">Si l'article avait un coût d'achat erroné (ex: 0 DA), appliquez le coût correct sur toutes ses ventes passées en 1 clic.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          step="0.01"
          placeholder="Coût d'achat"
          value={bulkCost}
          onChange={e => setBulkCost(e.target.value)}
          className="w-28 bg-black/60 border border-indigo-500/40 rounded-xl px-3 py-2 text-white font-mono text-xs font-bold outline-none focus:border-indigo-400"
        />
        <Button
          onClick={onApplyBulkCost}
          disabled={isProcessingBulk || !bulkCost}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-wider py-2 px-4 rounded-xl cursor-pointer shadow-xs/30"
        >
          {isProcessingBulk ? "Application..." : "Appliquer à tout"}
        </Button>
      </div>
    </div>
  );
};
