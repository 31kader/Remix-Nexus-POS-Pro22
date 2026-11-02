import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { CompanySettings } from '../../../types';

interface AdminProfitCalculatorPanelProps {
  formData: any;
  setFormData: (data: any) => void;
  costPrice: number;
  price: number;
  settings: CompanySettings;
}

export const AdminProfitCalculatorPanel: React.FC<AdminProfitCalculatorPanelProps> = ({
  formData,
  setFormData,
  costPrice,
  price,
  settings
}) => {
  const [desiredProfit, setDesiredProfit] = useState<string>('');
  const [desiredMargin, setDesiredMargin] = useState<string>('');

  const handleDesiredProfitChange = (valStr: string) => {
    setDesiredProfit(valStr);
    setDesiredMargin('');
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      setFormData({ ...formData, price: Math.max(0, costPrice + val).toFixed(2) });
    }
  };

  const handleDesiredMarginChange = (valStr: string) => {
    setDesiredMargin(valStr);
    setDesiredProfit('');
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      setFormData({ ...formData, price: Math.max(0, costPrice * (1 + val / 100)).toFixed(2) });
    }
  };

  const handleApplyPresetMargin = (marginPct: number) => {
    setDesiredMargin(marginPct.toString());
    setDesiredProfit('');
    setFormData({ ...formData, price: Math.max(0, costPrice * (1 + marginPct / 100)).toFixed(2) });
  };

  const handleApplyPresetProfit = (profitAmount: number) => {
    setDesiredProfit(profitAmount.toString());
    setDesiredMargin('');
    setFormData({ ...formData, price: Math.max(0, costPrice + profitAmount).toFixed(2) });
  };

  return (
    <div className="p-5 bg-indigo-950/40 rounded-xl border border-indigo-500/30 space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
        <h5 className="text-xs font-black uppercase tracking-wider text-indigo-200 flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-400" />
          Calculateur de Bénéfice Administrateur
        </h5>
        <span className="text-[10px] text-indigo-400/80 font-mono font-bold">
          Prix d'achat actuel: {costPrice.toFixed(2)} {settings?.currency}
        </span>
      </div>

      {/* Presets rapides */}
      <div className="space-y-1.5">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Raccourcis Marge Rapide :</span>
        <div className="flex flex-wrap gap-2">
          {[10, 15, 20, 25, 30, 40, 50].map(pct => (
            <button
              key={pct}
              type="button"
              onClick={() => handleApplyPresetMargin(pct)}
              className="px-2.5 py-1 bg-white/5 hover:bg-emerald-500/20 text-white hover:text-emerald-300 border border-white/10 hover:border-emerald-500/40 rounded-lg text-xs font-bold font-mono transition-all active:scale-95"
            >
              +{pct}%
            </button>
          ))}
          {[50, 100, 200, 500].map(amt => (
            <button
              key={'da-' + amt}
              type="button"
              onClick={() => handleApplyPresetProfit(amt)}
              className="px-2.5 py-1 bg-white/5 hover:bg-indigo-500/20 text-white hover:text-indigo-300 border border-white/10 hover:border-indigo-500/40 rounded-lg text-xs font-bold font-mono transition-all active:scale-95"
            >
              +{amt} {settings?.currency || 'DA'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Option A : Bénéfice Détail fixe (DA)</label>
          <input
            type="number"
            step="0.01"
            placeholder="Saisissez ex: 50"
            value={desiredProfit}
            onChange={(e) => handleDesiredProfitChange(e.target.value)}
            className="w-full bg-black/50 border border-indigo-500/30 rounded-xl px-3 py-2 text-white font-mono text-sm outline-none focus:border-indigo-400 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Option B : Marge Détail Cible % (sur Achat)</label>
          <input
            type="number"
            step="0.1"
            placeholder="Saisissez ex: 30"
            value={desiredMargin}
            onChange={(e) => handleDesiredMarginChange(e.target.value)}
            className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-3 py-2 text-white font-mono text-sm outline-none focus:border-emerald-400 transition-all"
          />
        </div>
      </div>

      {/* Réglage rapide par % pour Prix de Gros et Tarif en Ligne */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-indigo-500/20">
        <div className="space-y-2 bg-sky-500/5 border border-sky-500/20 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-sky-300 uppercase tracking-wider">📦 Régler Prix de Gros par %</label>
            <span className="text-[9px] font-mono text-sky-400 font-bold">{formData.wholesalePrice || '0.00'} {settings?.currency}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[5, 8, 10, 12, 15, 20].map(pct => (
              <button
                key={'ws-cost-' + pct}
                type="button"
                onClick={() => setFormData({ ...formData, wholesalePrice: Math.max(0, costPrice * (1 + pct / 100)).toFixed(2) })}
                className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
              >
                Achat +{pct}%
              </button>
            ))}
            {[5, 10, 15, 20].map(pct => (
              <button
                key={'ws-ret-' + pct}
                type="button"
                onClick={() => setFormData({ ...formData, wholesalePrice: Math.max(0, price * (1 - pct / 100)).toFixed(2) })}
                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
              >
                Détail -{pct}%
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 bg-violet-500/5 border border-violet-500/20 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-violet-300 uppercase tracking-wider">🌐 Régler Tarif en Ligne par %</label>
            <span className="text-[9px] font-mono text-violet-400 font-bold">{formData.onlinePrice || '0.00'} {settings?.currency}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, onlinePrice: price.toFixed(2) })}
              className="px-2 py-1 bg-violet-500/20 hover:bg-violet-500/35 text-violet-200 border border-violet-500/40 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
            >
              = Prix Détail
            </button>
            {[-10, -5, 5, 10].map(pct => (
              <button
                key={'on-ret-' + pct}
                type="button"
                onClick={() => setFormData({ ...formData, onlinePrice: Math.max(0, price * (1 + pct / 100)).toFixed(2) })}
                className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
              >
                Détail {pct > 0 ? `+${pct}%` : `${pct}%`}
              </button>
            ))}
            {[10, 15, 20, 25].map(pct => (
              <button
                key={'on-cost-' + pct}
                type="button"
                onClick={() => setFormData({ ...formData, onlinePrice: Math.max(0, costPrice * (1 + pct / 100)).toFixed(2) })}
                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
              >
                Achat +{pct}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
