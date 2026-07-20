import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { CompanySettings, Transaction } from '../../types';

interface ReturnModalItemsListProps {
  transaction: Transaction | null;
  returnItems: any[];
  setReturnItems: (items: any[]) => void;
  settings: CompanySettings;
}

export function ReturnModalItemsList({
  transaction,
  returnItems,
  setReturnItems,
  settings
}: ReturnModalItemsListProps) {
  return (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/50">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction #{transaction?.id?.slice(-8).toUpperCase()}</p>
      <div className="space-y-3">
        {returnItems.map((item, idx) => (
          <div key={`return-item-${item.productId}-${idx}`} className={`flex items-center justify-between gap-4 p-2 rounded-lg ${item.availableToReturn === 0 ? 'opacity-40 grayscale bg-slate-950/40' : ''}`}>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{item.name}</p>
              <p className="text-xs text-slate-400 font-medium">
                {item.price.toFixed(2)} {settings.currency} x {item.quantity} 
                {item.alreadyReturned > 0 && <span className="ml-2 text-rose-400 font-bold">(Déjà retourné: {item.alreadyReturned})</span>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  const newItems = [...returnItems];
                  newItems[idx].returnQuantity = Math.max(0, newItems[idx].returnQuantity - 1);
                  setReturnItems(newItems);
                }}
                disabled={item.availableToReturn === 0}
                className="p-1.5 hover:bg-slate-850 bg-slate-900 border border-slate-800/60 text-slate-300 rounded-lg disabled:opacity-0 transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center font-black text-slate-200 text-sm font-mono">{item.returnQuantity}</span>
              <button 
                onClick={() => {
                  const newItems = [...returnItems];
                  newItems[idx].returnQuantity = Math.min(item.availableToReturn, newItems[idx].returnQuantity + 1);
                  setReturnItems(newItems);
                }}
                disabled={item.availableToReturn === 0 || item.returnQuantity >= item.availableToReturn}
                className="p-1.5 hover:bg-slate-850 bg-slate-900 border border-slate-800/60 text-slate-300 rounded-lg disabled:opacity-0 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
