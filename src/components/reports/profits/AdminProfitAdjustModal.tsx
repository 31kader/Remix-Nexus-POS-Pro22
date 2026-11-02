import React from 'react';
// @ts-ignore
import { createPortal } from 'react-dom';
import { ShieldCheck, TrendingUp, Calculator, Save, X } from 'lucide-react';

export interface AdminProfitAdjustModalProps {
  selectedProduct: any | null;
  onClose: () => void;
  currency: string;
  editPrice: string;
  setEditPrice: (v: string) => void;
  editCostPrice: string;
  setEditCostPrice: (v: string) => void;
  desiredProfit: string;
  desiredMargin: string;
  currentProfitVal: number;
  currentMarginVal: string;
  isSaving: boolean;
  handleDesiredProfitChange: (val: string) => void;
  handleDesiredMarginChange: (val: string) => void;
  handleApplyPresetMargin: (marginPct: number) => void;
  handleApplyPresetProfit: (profitAmount: number) => void;
  handleSaveProfit: () => Promise<void>;
}

export const AdminProfitAdjustModal: React.FC<AdminProfitAdjustModalProps> = ({
  selectedProduct,
  onClose,
  currency,
  editPrice,
  setEditPrice,
  editCostPrice,
  setEditCostPrice,
  desiredProfit,
  desiredMargin,
  currentProfitVal,
  currentMarginVal,
  isSaving,
  handleDesiredProfitChange,
  handleDesiredMarginChange,
  handleApplyPresetMargin,
  handleApplyPresetProfit,
  handleSaveProfit
}) => {
  if (!selectedProduct || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
      <div className="bg-[#0f1117] border border-indigo-500/30 rounded-xl max-w-lg w-full p-6 shadow-md space-y-6 relative overflow-hidden ring-1 ring-indigo-500/20 max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                Ajustement de Bénéfice Admin
              </h3>
              <p className="text-xs text-indigo-300 font-bold truncate max-w-[280px]">
                {selectedProduct.name} <span className="text-[10px] text-slate-500 font-mono">({selectedProduct.sku})</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Profit Banner */}
        <div className="p-4 bg-slate-900/80 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-emerald-400" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bénéfice Net Estimé / Unité</p>
              <p className="text-base font-black font-mono text-emerald-400">
                {currentProfitVal >= 0 ? '+' : ''}{currentProfitVal.toFixed(2)} {currency}
                <span className="text-xs text-slate-400 font-bold ml-2">({currentMarginVal}%)</span>
              </p>
            </div>
          </div>
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
                +{amt} {currency}
              </button>
            ))}
          </div>
        </div>

        {/* Form Fields: Cost Price & Price */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Prix d'Achat ({currency})</label>
            <input
              type="number"
              step="0.01"
              value={editCostPrice}
              onChange={e => setEditCostPrice(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm font-bold outline-none focus:border-amber-400 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Prix de Vente ({currency})</label>
            <input
              type="number"
              step="0.01"
              value={editPrice}
              onChange={e => setEditPrice(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm font-bold outline-none focus:border-emerald-400 transition-all"
            />
          </div>
        </div>

        {/* Admin Calculators */}
        <div className="p-4 bg-indigo-950/30 rounded-xl border border-indigo-500/20 space-y-3">
          <h5 className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calculator size={14} /> Calculateur Direct (Mise à jour en temps réel)
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Option A: Bénéfice Fixe (DA)</span>
              <input
                type="number"
                step="0.01"
                placeholder="Saisissez ex: 50"
                value={desiredProfit}
                onChange={e => handleDesiredProfitChange(e.target.value)}
                className="w-full bg-black/60 border border-indigo-500/30 rounded-lg px-2.5 py-2 text-white font-mono text-xs outline-none focus:border-indigo-400 transition-all"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Option B: Marge Cible (%)</span>
              <input
                type="number"
                step="0.1"
                placeholder="Saisissez ex: 30"
                value={desiredMargin}
                onChange={e => handleDesiredMarginChange(e.target.value)}
                className="w-full bg-black/60 border border-emerald-500/30 rounded-lg px-2.5 py-2 text-white font-mono text-xs outline-none focus:border-emerald-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveProfit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save size={14} />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer le Bénéfice'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
