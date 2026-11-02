import React from 'react';
import { TrendingUp, ShieldCheck, Calculator } from 'lucide-react';
import { CompanySettings } from '../../../types';

interface PricingMarginAnalysisBarProps {
  currentProfit: number;
  currentMargin: string;
  wholesalePrice: number;
  wholesaleProfit: number;
  wholesaleMargin: string;
  settings: CompanySettings;
  isAdmin: boolean;
  showAdminCalc: boolean;
  setShowAdminCalc: (show: boolean) => void;
}

export const PricingMarginAnalysisBar: React.FC<PricingMarginAnalysisBarProps> = ({
  currentProfit,
  currentMargin,
  wholesalePrice,
  wholesaleProfit,
  wholesaleMargin,
  settings,
  isAdmin,
  showAdminCalc,
  setShowAdminCalc
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 rounded-xl border border-white/5">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marge Détail estimée</p>
            <p className="text-sm font-black font-mono text-emerald-400">
              {currentProfit >= 0 ? '+' : ''}{currentProfit.toFixed(2)} {settings?.currency || 'DA'}
              <span className="text-xs text-slate-400 font-bold ml-2">({currentMargin}%)</span>
            </p>
          </div>
        </div>

        {wholesalePrice > 0 && (
          <div className="flex items-center gap-3 border-l border-white/10 pl-5">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marge Gros estimée</p>
              <p className="text-sm font-black font-mono text-sky-400">
                {wholesaleProfit >= 0 ? '+' : ''}{wholesaleProfit.toFixed(2)} {settings?.currency || 'DA'}
                <span className="text-xs text-slate-400 font-bold ml-2">({wholesaleMargin}%)</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <button
          type="button"
          onClick={() => setShowAdminCalc(!showAdminCalc)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          <ShieldCheck size={16} className="text-indigo-400" />
          <Calculator size={14} />
          <span>Régler le Bénéfice (Admin)</span>
        </button>
      )}
    </div>
  );
};
