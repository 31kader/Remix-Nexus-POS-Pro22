import React from 'react';
import { 
  AlertTriangle, 
  Globe, 
  MessageCircle, 
  Database, 
  Shield, 
  Lock 
} from 'lucide-react';
import { CompanySettings } from '../../types';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function SecuritySection({ formData, setFormData }: SectionProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-6">
        <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl flex items-center gap-4 text-amber-500">
          <AlertTriangle size={24} className="shrink-0" />
          <p className="text-[10px] font-bold uppercase leading-relaxed tracking-wider">Les clés d'API et les secrets système sont encryptés au repos. Ne partagez jamais ces identifiants publiquement.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Clé API Google Maps (Grounding)</label>
            <div className="relative group">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-100 transition-colors" size={18} />
              <input 
                type="password" 
                value={formData.apiKeys?.googleMapsKey || ''}
                onChange={e => setFormData({ ...formData, apiKeys: { ...formData.apiKeys!, googleMapsKey: e.target.value } })}
                className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white outline-none focus:border-white/20 transition-all font-mono text-sm"
                placeholder="AIza..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Twilio Account SID (WhatsApp)</label>
            <div className="relative group">
              <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-100 transition-colors" size={18} />
              <input 
                type="text" 
                value={formData.apiKeys?.twilioSid || ''}
                onChange={e => setFormData({ ...formData, apiKeys: { ...formData.apiKeys!, twilioSid: e.target.value } })}
                className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white outline-none focus:border-white/20 transition-all font-mono text-sm"
                placeholder="AC..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5">
        <h4 className="text-sm font-bold text-white mb-6 ml-1 flex items-center gap-2">
          <Lock size={18} className="text-slate-500" />
          Rétention & Gouvernance des données
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rétention Audit Logs (Jours)</label>
            <div className="relative group">
              <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="number" 
                value={formData.auditLogRetentionDays ?? ''}
                onChange={e => setFormData({ ...formData, auditLogRetentionDays: parseInt(e.target.value) || 0 })}
                className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white outline-none focus:border-white/20 transition-all font-medium"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Verrouillage Modifications (Jours)</label>
            <div className="relative group">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="number" 
                value={formData.lockingPeriodDays ?? ''}
                onChange={e => setFormData({ ...formData, lockingPeriodDays: parseInt(e.target.value) || 0 })}
                className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white outline-none focus:border-white/20 transition-all font-medium"
              />
            </div>
            <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 leading-tight tracking-tighter">Période après laquelle une transaction devient immuable</p>
          </div>
        </div>
      </div>
    </div>
  );
}
