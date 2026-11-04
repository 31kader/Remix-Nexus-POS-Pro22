import React, { useState } from 'react';
import { Landmark, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { CompanySettings } from '../../../types';
import {
  getSavedBaridiMobConfig,
  saveBaridiMobConfig,
  validateAlgerianRip,
  formatAlgerianRip
} from '../../../services/fintech/baridiMobService';
import { toast } from 'sonner';

interface AlgerianFiscalConfigCardProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export const AlgerianFiscalConfigCard: React.FC<AlgerianFiscalConfigCardProps> = ({
  formData,
  setFormData
}) => {
  const initialBaridi = getSavedBaridiMobConfig();
  const [rip, setRip] = useState(initialBaridi.rip);
  const [merchantName, setMerchantName] = useState(initialBaridi.merchantName);
  const [aiNumber, setAiNumber] = useState(localStorage.getItem('nexus_fiscal_ai') || '');
  const [rcNumber, setRcNumber] = useState(localStorage.getItem('nexus_fiscal_rc') || '');
  const [nisNumber, setNisNumber] = useState(localStorage.getItem('nexus_fiscal_nis') || '');

  const isRipValid = rip ? validateAlgerianRip(rip) : true;

  const handleSave = () => {
    if (rip && !validateAlgerianRip(rip)) {
      toast.error('Le numéro RIP BaridiMob est invalide (clé de contrôle incorrecte).');
      return;
    }
    saveBaridiMobConfig(rip, merchantName);
    localStorage.setItem('nexus_fiscal_ai', aiNumber.trim());
    localStorage.setItem('nexus_fiscal_rc', rcNumber.trim());
    localStorage.setItem('nexus_fiscal_nis', nisNumber.trim());
    toast.success('Paramètres fiscaux & BaridiMob enregistrés avec succès');
  };

  return (
    <div className="p-6 bg-slate-900/90 border border-indigo-500/20 rounded-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
            <Landmark size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">Mentions Fiscales Algériennes & BaridiMob</p>
            <p className="text-[10px] text-slate-400">Pour factures A4 légales, bordereaux G50 et paiements QR Code</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
        >
          <Save size={14} />
          Enregistrer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NIF */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIF (Identifiant Fiscal - 15 chiffres)</label>
          <input
            type="text"
            value={formData.taxNumber || ''}
            onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
            placeholder="Ex: 001216012345678"
            className="w-full h-11 bg-slate-850 border border-white/10 rounded-xl px-4 text-white font-mono text-sm outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {/* NIS */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIS (Identifiant Statistique)</label>
          <input
            type="text"
            value={nisNumber}
            onChange={e => setNisNumber(e.target.value)}
            placeholder="Ex: 099816010000000"
            className="w-full h-11 bg-slate-850 border border-white/10 rounded-xl px-4 text-white font-mono text-sm outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Registre de Commerce (RC) */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registre de Commerce (RC)</label>
          <input
            type="text"
            value={rcNumber}
            onChange={e => setRcNumber(e.target.value)}
            placeholder="Ex: 16/00-0123456B22"
            className="w-full h-11 bg-slate-850 border border-white/10 rounded-xl px-4 text-white font-mono text-sm outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Article d'Imposition (AI) */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Article d'Imposition (AI)</label>
          <input
            type="text"
            value={aiNumber}
            onChange={e => setAiNumber(e.target.value)}
            placeholder="Ex: 16011234567"
            className="w-full h-11 bg-slate-850 border border-white/10 rounded-xl px-4 text-white font-mono text-sm outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Bloc RIP BaridiMob */}
      <div className="p-4 bg-slate-850/80 border border-amber-500/20 rounded-xl space-y-3">
        <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Compte BaridiMob / CCP Commerçant (QR Code)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Numéro RIP (20 chiffres)</label>
            <input
              type="text"
              value={rip}
              onChange={e => setRip(e.target.value.replace(/\D/g, '').slice(0, 20))}
              placeholder="00799999000000000012"
              className={`w-full h-11 bg-slate-900 border rounded-xl px-4 text-white font-mono text-sm outline-none transition-all ${
                rip && !isRipValid ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-amber-500'
              }`}
            />
            {rip && (
              <p className="text-[10px] flex items-center gap-1 mt-1 font-mono">
                {isRipValid ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {formatAlgerianRip(rip)} (RIP Valide)
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertCircle size={12} /> Clé RIP incorrecte (20 chiffres requis)
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom Affiché au Client</label>
            <input
              type="text"
              value={merchantName}
              onChange={e => setMerchantName(e.target.value)}
              placeholder="Ex: Superette El Bahia"
              className="w-full h-11 bg-slate-900 border border-white/10 rounded-xl px-4 text-white text-sm outline-none focus:border-amber-500 transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
