import React from 'react';
import { 
  Plus, 
  ArrowRight, 
  Activity, 
  Gift 
} from 'lucide-react';
import { CompanySettings } from '../../types';
import { cn } from '../../lib/utils';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function LoyaltySection({ formData, setFormData }: SectionProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-slate-900 border border-white/5 rounded-3xl aspect-[1.8/1] flex flex-col justify-between group hover:border-rose-500/30 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Plus size={14} className="text-rose-500" />
              Accumulation
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Points par unité monétaire dépensée</p>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <input 
              type="number"
              value={formData.loyaltyPointsPerCurrencyUnit ?? ''}
              onChange={e => setFormData({ ...formData, loyaltyPointsPerCurrencyUnit: parseFloat(e.target.value) || 0 })}
              className="text-4xl font-black text-white bg-transparent outline-none w-24 border-b-2 border-white/5 focus:border-rose-500 transition-all font-sans"
            />
            <span className="text-rose-500/40 font-black uppercase text-xs mb-2">PTS / {formData.currency}</span>
          </div>
        </div>

        <div className="p-6 bg-slate-900 border border-white/5 rounded-3xl aspect-[1.8/1] flex flex-col justify-between group hover:border-emerald-500/30 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ArrowRight size={14} className="text-emerald-500" />
              Valeur Réelle
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Équivalent monétaire d'1 point</p>
          </div>
          <div className="mt-4 flex items-end gap-2 text-emerald-500">
            <span className="text-emerald-500/40 font-black uppercase text-xs mb-2">1 PT =</span>
            <input 
              type="number"
              step="0.01"
              value={formData.loyaltyPointValue ?? ''}
              onChange={e => setFormData({ ...formData, loyaltyPointValue: parseFloat(e.target.value) || 0 })}
              className="text-4xl font-black text-white bg-transparent outline-none w-32 border-b-2 border-white/5 focus:border-emerald-500 transition-all font-sans"
            />
            <span className="text-emerald-500/40 font-black uppercase text-xs mb-2">{formData.currency}</span>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5">
        <h4 className="text-sm font-bold text-white mb-6 ml-1 flex items-center gap-2">
          <Activity size={18} className="text-rose-500" />
          Paliers de Fidélité (Loyalty Tiers)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Argent', 'Or', 'Platine'].map((tier, i) => (
            <div key={tier} className="bg-slate-900 border border-white/5 p-6 rounded-3xl hover:translate-y-[-4px] transition-all cursor-default group">
              <div className={cn(
                "w-12 h-12 rounded-2xl mb-4 flex items-center justify-center shadow-lg",
                i === 0 ? "bg-slate-500/20 text-slate-400" : 
                i === 1 ? "bg-amber-500/20 text-amber-500" : "bg-purple-500/20 text-purple-500"
              )}>
                <Gift size={24} />
              </div>
              <p className="text-lg font-black text-white uppercase">{tier}</p>
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1">Multiplicateur x{i + 1}.{i*2}</p>
              
              <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase">Seuil d'entrée (Points)</p>
                  <div className="text-xl font-black text-white">{[500, 2500, 10000][i]} PTS</div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase">Remise Fixe Auto</p>
                  <div className="text-xl font-black text-white">{[2, 5, 10][i]}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
