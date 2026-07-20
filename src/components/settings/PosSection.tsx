import React from 'react';
import { 
  Zap, 
  Database, 
  Timer, 
  AlertTriangle, 
  Settings as SettingsIcon 
} from 'lucide-react';
import { CompanySettings } from '../../types';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function PosSection({ formData, setFormData }: SectionProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center justify-between p-6 bg-slate-900 border border-white/5 rounded-3xl group hover:border-amber-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">Mode POS Rapide</p>
              <p className="text-[9px] text-slate-500 uppercase mt-0.5 tracking-widest">Optimisé pour les débits élevés</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={formData.fastModeEnabled}
              onChange={e => setFormData({ ...formData, fastModeEnabled: e.target.checked })}
            />
            <div className="w-14 h-7 bg-slate-850 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-6 bg-slate-900 border border-white/5 rounded-3xl group hover:border-amber-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 group-hover:scale-110 transition-transform">
              <Database size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">Autoriser la vente hors stock</p>
              <p className="text-[9px] text-slate-500 uppercase mt-0.5 tracking-widest">Permet de vendre des produits dont le stock est épuisé (≤ 0)</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={formData.allowNegativeStock}
              onChange={e => setFormData({ ...formData, allowNegativeStock: e.target.checked })}
            />
            <div className="w-14 h-7 bg-slate-850 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <Timer size={12} className="text-amber-500" />
            Timeout de Session (Minutes)
          </label>
          <input 
            type="number" 
            value={formData.sessionTimeoutMinutes ?? ''}
            onChange={e => setFormData({ ...formData, sessionTimeoutMinutes: parseInt(e.target.value) || 0 })}
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-amber-500/50 transition-all font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-500" />
            Seuil d'alerte stock global
          </label>
          <input 
            type="number" 
            value={formData.globalStockAlertThreshold ?? ''}
            onChange={e => setFormData({ ...formData, globalStockAlertThreshold: parseInt(e.target.value) || 0 })}
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-amber-500/50 transition-all font-medium"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 space-y-6">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <SettingsIcon size={18} className="text-amber-500" />
          Modèles de documents
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 uppercase mt-0.5 tracking-widest">Modèle de Ticket (Receipt)</label>
            <select 
              value={formData.receiptTemplate}
              onChange={e => setFormData({ ...formData, receiptTemplate: e.target.value as any })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-amber-500/50 transition-all"
            >
              <option value="standard">Standard NEXUS</option>
              <option value="minimal">Compact Minimal</option>
              <option value="modern">Détaillé Premium</option>
              <option value="classic">Classique</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 uppercase mt-0.5 tracking-widest">Modèle d'Étiquette (Label)</label>
            <select 
              value={formData.labelTemplate}
              onChange={e => setFormData({ ...formData, labelTemplate: e.target.value as any })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-amber-500/50 transition-all"
            >
              <option value="standard">Standard (60x40)</option>
              <option value="barcode-only">Code-barre uniquement</option>
              <option value="price-only">Prix uniquement</option>
              <option value="shelf-standard">Standard Étagère</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
