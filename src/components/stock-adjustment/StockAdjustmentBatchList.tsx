import React from 'react';

interface StockAdjustmentBatchListProps {
  localBatches: any[];
  onBatchStockChange: (index: number, value: string) => void;
}

export const StockAdjustmentBatchList: React.FC<StockAdjustmentBatchListProps> = ({
  localBatches,
  onBatchStockChange
}) => {
  if (!localBatches || localBatches.length === 0) return null;

  return (
    <div className="space-y-5 bg-white/[0.02] border border-white/5 p-6 rounded-xl ring-1 ring-white/5 shadow-md">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-normal">
          DÉTAIL DES STOCKS PAR LOTS (DLC)
        </span>
      </div>
      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-3 custom-scrollbar">
        {localBatches.map((batch, index) => (
          <div key={batch.id || index} className="flex items-center justify-between gap-4 bg-black/40 p-5 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all group/item shadow-inner">
            <div className="flex-1">
              <span className="font-mono text-xs font-black text-indigo-400 block tracking-widest uppercase">{batch.batchNumber}</span>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-normal mt-1 block opacity-60">
                EXP: {new Date(batch.expirationDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
              </span>
            </div>
            <div className="w-28 relative group/inp">
              <input 
                type="number"
                step="0.01"
                value={batch.stock}
                onChange={e => onBatchStockChange(index, e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl py-3 px-3 text-center text-sm font-black font-mono text-emerald-400 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/40 transition-all shadow-inner"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
