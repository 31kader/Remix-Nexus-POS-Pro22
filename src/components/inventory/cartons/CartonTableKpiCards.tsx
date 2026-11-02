import React from 'react';
import { Boxes, DollarSign, AlertTriangle } from 'lucide-react';

export interface CartonTableKpiCardsProps {
  totals: {
    totalCartons: number;
    totalCost: number;
    totalRetail: number;
  };
  outOfStockCount: number;
}

export const CartonTableKpiCards: React.FC<CartonTableKpiCardsProps> = ({
  totals,
  outOfStockCount
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold">Cartons Disponibles</span>
          <Boxes size={16} className="text-amber-400" />
        </div>
        <div className="text-xl font-black text-amber-400">
          {totals.totalCartons} <span className="text-xs font-bold text-slate-400">cartons</span>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold">Valeur Stock (Achat)</span>
          <DollarSign size={16} className="text-blue-400" />
        </div>
        <div className="text-xl font-black text-white">
          {totals.totalCost.toLocaleString()} <span className="text-xs font-bold text-slate-400">DA</span>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold">Valeur Détail Est.</span>
          <DollarSign size={16} className="text-emerald-400" />
        </div>
        <div className="text-xl font-black text-emerald-400">
          {totals.totalRetail.toLocaleString()} <span className="text-xs font-bold text-slate-400">DA</span>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold">Ruptures Cartons</span>
          <AlertTriangle size={16} className={outOfStockCount > 0 ? "text-rose-400" : "text-slate-500"} />
        </div>
        <div className={`text-xl font-black ${outOfStockCount > 0 ? "text-rose-400" : "text-slate-400"}`}>
          {outOfStockCount}
        </div>
      </div>
    </div>
  );
};
