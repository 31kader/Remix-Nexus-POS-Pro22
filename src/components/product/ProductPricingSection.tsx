import React, { useState } from 'react';
import { CompanySettings } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { PricingMarginAnalysisBar } from './pricing/PricingMarginAnalysisBar';
import { AdminProfitCalculatorPanel } from './pricing/AdminProfitCalculatorPanel';

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

  const [showAdminCalc, setShowAdminCalc] = useState<boolean>(false);

  const price = parseFloat(formData.price || '0');
  const costPrice = parseFloat(formData.costPrice || '0');
  const currentProfit = price - costPrice;
  const currentMargin = costPrice > 0 ? ((currentProfit / costPrice) * 100).toFixed(1) : '0';

  const wholesalePrice = parseFloat(formData.wholesalePrice || '0');
  const wholesaleProfit = wholesalePrice > 0 ? wholesalePrice - costPrice : 0;
  const wholesaleMargin = costPrice > 0 && wholesalePrice > 0 ? ((wholesaleProfit / costPrice) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      <div className="bg-black/20 p-6 rounded-xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shadow-xl ring-1 ring-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/20 via-indigo-500/20 to-emerald-500/20"></div>

        {/* Prix de vente détail */}
        <div className="space-y-2 group">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal ml-1">PRIX DE VENTE (DÉTAIL) *</label>
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
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal ml-1">PRIX DE GROS</label>
            <div className="flex items-center gap-1">
              {costPrice > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, wholesalePrice: (costPrice * 1.10).toFixed(2) })}
                  className="text-[8px] font-black uppercase text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-1.5 py-0.5 rounded border border-sky-500/20 transition-all active:scale-95 cursor-pointer"
                  title="Calculer Prix d'Achat + 10%"
                >
                  Achat+10%
                </button>
              )}
              {price > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, wholesalePrice: (price * 0.90).toFixed(2) })}
                  className="text-[8px] font-black uppercase text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                  title="Calculer Prix Détail - 10%"
                >
                  Détail-10%
                </button>
              )}
            </div>
          </div>
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal ml-1">PRIX D'ACHAT</label>
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
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal ml-1">TARIF EN LIGNE</label>
            <div className="flex items-center gap-1">
              {price > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, onlinePrice: price.toFixed(2) })}
                  className="text-[8px] font-black uppercase text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-1.5 py-0.5 rounded border border-violet-500/20 transition-all active:scale-95 cursor-pointer"
                  title="Aligner sur le prix détail"
                >
                  =Détail
                </button>
              )}
              {price > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, onlinePrice: (price * 0.95).toFixed(2) })}
                  className="text-[8px] font-black uppercase text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/20 transition-all active:scale-95 cursor-pointer"
                  title="Calculer Prix Détail - 5%"
                >
                  -5%
                </button>
              )}
              {costPrice > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, onlinePrice: (costPrice * 1.15).toFixed(2) })}
                  className="text-[8px] font-black uppercase text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/20 transition-all active:scale-95 cursor-pointer"
                  title="Calculer Prix d'Achat + 15%"
                >
                  +15%
                </button>
              )}
            </div>
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal ml-1">TAXE / TVA</label>
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
      <PricingMarginAnalysisBar
        currentProfit={currentProfit}
        currentMargin={currentMargin}
        wholesalePrice={wholesalePrice}
        wholesaleProfit={wholesaleProfit}
        wholesaleMargin={wholesaleMargin}
        settings={settings}
        isAdmin={isAdmin}
        showAdminCalc={showAdminCalc}
        setShowAdminCalc={setShowAdminCalc}
      />

      {/* Panneau Réglage Bénéfice Admin */}
      {isAdmin && showAdminCalc && (
        <AdminProfitCalculatorPanel
          formData={formData}
          setFormData={setFormData}
          costPrice={costPrice}
          price={price}
          settings={settings}
        />
      )}
    </div>
  );
}
