import React from 'react';
import { ArrowRight, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { cn } from '../../lib/utils';

interface UpdatePricesItemProps {
  item: any;
  product: Product;
  settings: CompanySettings;
  updateData: { price: number; active: boolean };
  setUpdates: React.Dispatch<React.SetStateAction<Record<string, { price: number; active: boolean }>>>;
}

export function UpdatePricesItem({ item, product, settings, updateData, setUpdates }: UpdatePricesItemProps) {
  const currentCost = product.costPrice || 0;
  const newCost = item.costPrice || 0;
  const currentPrice = product.price || 0;
  
  const oldMargin = currentPrice - currentCost;
  const oldMarginPercent = currentPrice > 0 ? (oldMargin / currentPrice) * 100 : 0;

  const isCostIncreased = newCost > currentCost;
  const profitDropPercent = currentPrice > 0 ? ((newCost - currentCost) / currentPrice) * 100 : 0;

  const selectedPrice = updateData?.price || 0;
  const newMargin = selectedPrice - newCost;
  const newMarginPercent = selectedPrice > 0 ? (newMargin / selectedPrice) * 100 : 0;
  
  const isItemActive = updateData?.active || false;

  return (
    <div 
      className={cn(
        "group p-5 bg-industrial-900/40 rounded-2xl border transition-all duration-300 shadow-sm space-y-4 flex flex-col",
        isItemActive 
          ? "border-industrial-700 hover:border-indigo-500/30 bg-industrial-900/65" 
          : "border-industrial-900 bg-industrial-950/40 opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-black text-white text-base tracking-tight uppercase group-hover:text-indigo-300 transition-colors">
            {product.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              Ancien Coût: <strong className="text-slate-300">{currentCost.toFixed(2)}</strong>
            </span>
            <ArrowRight size={10} className="text-industrial-600" />
            <span className="flex items-center gap-1 bg-industrial-950 px-2 py-0.5 rounded border border-industrial-800">
              Nouveau Coût: <strong className="text-indigo-400 font-bold">{newCost.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setUpdates(prev => ({
            ...prev,
            [item.productId]: { ...prev[item.productId], active: !isItemActive }
          }))}
          className={cn(
            "w-11 h-6 rounded-full relative transition-all duration-200 shadow-inner shrink-0",
            isItemActive ? "bg-indigo-600" : "bg-industrial-800"
          )}
        >
          <div className={cn(
            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md flex items-center justify-center text-[8px] font-bold text-indigo-600",
            isItemActive ? "left-6" : "left-1"
          )} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div className="p-3 bg-industrial-950 border border-industrial-900 rounded-xl space-y-1.5 font-mono text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Marge Précédente :</span>
            <span className="text-slate-300 font-semibold">{oldMargin.toFixed(2)} {settings.currency}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span>Taux de marque :</span>
            <span className="text-slate-400 font-bold">{oldMarginPercent.toFixed(1)}%</span>
          </div>
          {isCostIncreased && (
            <div className="pt-1.5 border-t border-industrial-900/80 flex justify-between items-center text-rose-400 text-[10px] font-bold">
              <span className="flex items-center gap-1">
                <AlertTriangle size={12} /> Baisse de Marge
              </span>
              <span>-{profitDropPercent.toFixed(1)}%</span>
            </div>
          )}
        </div>

        <div className={cn(
          "p-3 border rounded-xl space-y-1.5 font-mono text-xs transition-colors",
          isItemActive ? "bg-indigo-950/20 border-indigo-500/10" : "bg-industrial-950 border-industrial-900"
        )}>
          <div className="flex justify-between text-slate-400">
            <span>Nouvelle Marge :</span>
            <span className={cn("font-bold", newMargin >= oldMargin ? "text-emerald-400" : "text-amber-400")}>
              {newMargin.toFixed(2)} {settings.currency}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span>Nouveau Taux :</span>
            <span className={cn("font-extrabold", newMarginPercent >= oldMarginPercent ? "text-emerald-400" : "text-amber-400")}>
              {newMarginPercent.toFixed(1)}%
            </span>
          </div>
          <div className="pt-1.5 border-t border-industrial-900/80 flex justify-between items-center text-[10px] uppercase font-black">
            <span className="text-slate-500">Impact Global :</span>
            {newMargin >= oldMargin ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <TrendingUp size={12} /> Stabilisé
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-0.5">
                <TrendingDown size={12} /> Réduit
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-industrial-900/50">
        <div className="text-left font-mono">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Prix de vente actuel</p>
          <p className="font-extrabold text-white mt-0.5 text-sm">
            {currentPrice.toFixed(2)} {settings.currency}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Ajuster Prix :</span>
          <div className="relative flex items-center">
            <input 
              type="number"
              step="any"
              disabled={!isItemActive}
              className={cn(
                "w-36 pl-3 pr-10 py-2.5 bg-industrial-950 border text-white rounded-xl text-right font-mono font-black outline-none select-all transition-all text-sm",
                isItemActive 
                  ? "border-indigo-500/30 hover:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                  : "border-industrial-900 opacity-50 cursor-not-allowed"
              )}
              value={updateData?.price || 0}
              onChange={(e) => setUpdates(prev => ({ 
                ...prev, 
                [item.productId]: { ...prev[item.productId], price: parseFloat(e.target.value) || 0 } 
              }))}
            />
            <span className="absolute right-3.5 text-[10px] font-black text-indigo-400 pointer-events-none font-mono tracking-tight">{settings.currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
