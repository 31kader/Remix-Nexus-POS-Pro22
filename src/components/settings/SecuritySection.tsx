import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Globe, 
  MessageCircle, 
  Database, 
  Shield, 
  Lock 
} from 'lucide-react';
import { CompanySettings } from '../../types';
import { sanitizePlainPasswords } from '../../scripts/sanitizePlainPasswords';
import { toast } from 'sonner';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function SecuritySection({ formData, setFormData }: SectionProps) {
  const [isSanitizing, setIsSanitizing] = useState(false);

  const handleSanitizePasswords = async () => {
    setIsSanitizing(true);
    try {
      const stats = await sanitizePlainPasswords();
      const totalUpdated = stats.reduce((acc, curr) => acc + curr.updated, 0);
      toast.success(`Hachage des mots de passe terminé. ${totalUpdated} comptes mis à jour.`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur de hachage: ${err.message || err}`);
    } finally {
      setIsSanitizing(false);
    }
  };

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

      <div className="pt-6 border-t border-white/5">
        <h4 className="text-sm font-bold text-white mb-6 ml-1 flex items-center gap-2">
          <Shield size={18} className="text-slate-500" />
          Sécurité des Comptes
        </h4>
        <div className="p-6 bg-slate-900/50 border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-slate-300">Hachage des mots de passe en clair</p>
            <p className="text-[10px] text-slate-500 mt-1">Recherche tous les mots de passe stockés en clair dans la base de données locale (utilisateurs, clients, fournisseurs) pour les chiffrer avec bcrypt.</p>
          </div>
          <button
            type="button"
            disabled={isSanitizing}
            onClick={handleSanitizePasswords}
            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-bold tracking-wider transition-colors shrink-0"
          >
            {isSanitizing ? 'Sécurisation...' : 'Sécuriser les Comptes'}
          </button>
        </div>
      </div>
    </div>
  );
}
