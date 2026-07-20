import React from 'react';
import { CompanySettings } from '../../types';

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
  return (
    <div className="bg-black/20 p-6 rounded-2xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shadow-xl ring-1 ring-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/20 via-indigo-500/20 to-emerald-500/20"></div>

      <div className="space-y-2 group">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">PRIX DE VENTE *</label>
        <div className="relative">
          <input
            required
            type="number"
            step="0.01"
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/40 transition-all shadow-inner group-hover:border-white/20 italic"
            value={formData.price}
            onChange={e => setFormData({...formData, price: e.target.value})}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">{settings?.currency}</span>
        </div>
      </div>

      <div className="space-y-2 group">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">TARIF EN LIGNE</label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner group-hover:border-white/20 italic"
            value={formData.onlinePrice}
            onChange={e => setFormData({...formData, onlinePrice: e.target.value})}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-500/60 uppercase tracking-widest">{settings?.currency}</span>
        </div>
      </div>

      <div className="space-y-2 group">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">PRIX D'ACHAT</label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500/40 transition-all shadow-inner group-hover:border-white/20 italic"
            value={formData.costPrice}
            onChange={e => setFormData({...formData, costPrice: e.target.value})}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-500/60 uppercase tracking-widest">{settings?.currency}</span>
        </div>
      </div>

      <div className="space-y-2 group">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">TAXE / TVA</label>
        <div className="relative">
          <input
            type="number"
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500/40 transition-all shadow-inner group-hover:border-white/20 italic"
            value={formData.taxRate}
            onChange={e => setFormData({...formData, taxRate: e.target.value})}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-purple-500/60">%</span>
        </div>
      </div>
    </div>
  );
}
