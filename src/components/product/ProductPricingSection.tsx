import React, { useState } from 'react';
import { CompanySettings } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { Calculator, TrendingUp, ShieldCheck } from 'lucide-react';

interface ProductPricingSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  settings: CompanySettings;
}

export function ProductPricingSection({
  formData,
  setFormData,
  settings
}: ProductPricingSectionProps) {
  const profile = useAuthStore(s => s.profile);
  const userRole = useAuthStore(s => (s as any).role) || profile?.role || 'admin';
  const isAdmin = userRole === 'admin' || userRole === 'owner' || profile?.role === 'admin';

  const [desiredProfit, setDesiredProfit] = useState<string>('');
  const [desiredMargin, setDesiredMargin] = useState<string>('');
  const [showAdminCalc, setShowAdminCalc] = useState<boolean>(false);

  const price = parseFloat(formData.price || '0');
  const costPrice = parseFloat(formData.costPrice || '0');
  const currentProfit = price - costPrice;
  const currentMargin = costPrice > 0 ? ((currentProfit / costPrice) * 100).toFixed(1) : '0';

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

  const wholesalePrice = parseFloat(formData.wholesalePrice || '0');
  const wholesaleProfit = wholesalePrice > 0 ? wholesalePrice - costPrice : 0;
  const wholesaleMargin = costPrice > 0 && wholesalePrice > 0 ? ((wholesaleProfit / costPrice) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      <div className="bg-black/20 p-6 rounded-2xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shadow-xl ring-1 ring-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/20 via-indigo-500/20 to-emerald-500/20"></div>

        {/* Prix de vente détail */}
        <div className="space-y-2 group">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal  ml-1">PRIX DE VENTE (DÉTAIL) *</label>
          <div className="relative">
            <input
              required
              type="number"
              step="0.01"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/40 transition-all shadow-inner group-hover:border-white/20 "
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">{settings?.currency}</span>
          </div>
        </div>

        {/* Prix de gros */}
        <div className="space-y-2 group">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal  ml-1">PRIX DE GROS</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-500/5 focus:border-sky-500/40 transition-all shadow-inner group-hover:border-white/20 "
              value={formData.wholesalePrice}
              onChange={e => setFormData({...formData, wholesalePrice: e.target.value})}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-sky-500/60 uppercase tracking-widest">{settings?.currency}</span>
          </div>
        </div>

        {/* Prix d'achat */}
        <div className="space-y-2 group">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal  ml-1">PRIX D'ACHAT</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500/40 transition-all shadow-inner group-hover:border-white/20 "
              value={formData.costPrice}
              onChange={e => {
                const newCost = e.target.value;
                const costVal = parseFloat(newCost);
                const currentOnline = parseFloat(formData.onlinePrice || '0');
                const prevCost = parseFloat(formData.costPrice || '0');
                const wasAuto = !formData.onlinePrice || (prevCost > 0 && Math.abs(currentOnline - prevCost * 1.05) < 0.05);

                setFormData({
                  ...formData,
                  costPrice: newCost,
                  ...(wasAuto && !isNaN(costVal) && costVal > 0 ? { onlinePrice: (costVal * 1.05).toFixed(2) } : {})
                });
              }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-500/60 uppercase tracking-widest">{settings?.currency}</span>
          </div>
        </div>

        {/* Tarif en ligne */}
        <div className="space-y-2 group">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal  ml-1">TARIF EN LIGNE</label>
            {costPrice > 0 && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, onlinePrice: (costPrice * 1.05).toFixed(2) })}
                className="text-[8px] font-black uppercase text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/20 transition-all active:scale-95 cursor-pointer"
                title="Générer automatiquement +5% du prix d'achat"
              >
                +5%
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner group-hover:border-white/20 "
              value={formData.onlinePrice}
              onChange={e => setFormData({...formData, onlinePrice: e.target.value})}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-500/60 uppercase tracking-widest">{settings?.currency}</span>
          </div>
        </div>

        {/* Taxe / TVA */}
        <div className="space-y-2 group">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal  ml-1">TAXE / TVA</label>
          <div className="relative">
            <input
              type="number"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500/40 transition-all shadow-inner group-hover:border-white/20 "
              value={formData.taxRate}
              onChange={e => setFormData({...formData, taxRate: e.target.value})}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-purple-500/60">%</span>
          </div>
        </div>
      </div>

      {/* Barre d'analyse de marge & Bouton Admin */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 rounded-2xl border border-white/5">
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

      {/* Panneau Réglage Bénéfice Admin */}
      {isAdmin && showAdminCalc && (
        <div className="p-5 bg-indigo-950/40 rounded-2xl border border-indigo-500/30 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-indigo-200 flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-400" />
              Calculateur de Bénéfice Administrateur
            </h5>
            <span className="text-[10px] text-indigo-400/80 font-mono font-bold">Prix d'achat actuel: {costPrice.toFixed(2)} {settings?.currency}</span>
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
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Option A : Bénéfice fixe (Mise à jour directe)</label>
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
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Option B : Marge Cible % (Mise à jour directe)</label>
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
        </div>
      )}
    </div>
  );
}
