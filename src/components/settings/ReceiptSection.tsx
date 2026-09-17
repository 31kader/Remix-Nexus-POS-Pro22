import React, { useState } from 'react';
import { Printer, QrCode, FileText, Sparkles, Image, Monitor, Play, Check, Save } from 'lucide-react';
import { CompanySettings } from '../../types';
import { getTerminalId, getTerminalName, setTerminalInfo } from '../../services/terminalService';
import { isAutoDrawerEnabled, setAutoDrawerEnabled, testCashDrawer } from '../../services/hardwareService';
import { toast } from 'sonner';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function ReceiptSection({ formData, setFormData }: SectionProps) {
  const [terminalId, setLocalTerminalId] = useState(getTerminalId());
  const [terminalName, setLocalTerminalName] = useState(getTerminalName());
  const [autoDrawer, setAutoDrawer] = useState(isAutoDrawerEnabled());
  const [isTestingDrawer, setIsTestingDrawer] = useState(false);

  const handleSaveTerminal = () => {
    setTerminalInfo(terminalId, terminalName);
    toast.success(`Poste de caisse configuré : ${terminalId} (${terminalName})`);
  };

  const handleToggleAutoDrawer = (enabled: boolean) => {
    setAutoDrawer(enabled);
    setAutoDrawerEnabled(enabled);
    toast.success(enabled ? 'Ouverture automatique du tiroir activée' : 'Ouverture automatique du tiroir désactivée');
  };

  const handleTestDrawer = async () => {
    setIsTestingDrawer(true);
    try {
      const res = await testCashDrawer();
      toast.success(res.message || 'Impulsion tiroir-caisse émise');
    } catch (err: any) {
      toast.error('Erreur impulsion tiroir: ' + (err?.message || 'Inconnue'));
    } finally {
      setTimeout(() => setIsTestingDrawer(false), 500);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 🖥️ Isolation Multi-Postes (Terminal ID) */}
      <div className="p-6 bg-slate-900/90 border border-indigo-500/20 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Monitor size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">Identification du Poste / Terminal (Multi-Caisses)</p>
              <p className="text-[10px] text-slate-400">Permet d'isoler les sessions de caisse et les ventes pour cet appareil</p>
            </div>
          </div>
          <button
            onClick={handleSaveTerminal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            <Save size={14} />
            Enregistrer ce poste
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identifiant Machine (Terminal ID)</label>
            <input 
              type="text"
              value={terminalId}
              onChange={e => setLocalTerminalId(e.target.value)}
              placeholder="Ex: POS-01, CAISSE-2"
              className="w-full h-12 bg-slate-850 border border-white/10 rounded-xl px-4 text-white uppercase font-mono font-bold outline-none focus:border-indigo-500 transition-all text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Convivial de la Caisse</label>
            <input 
              type="text"
              value={terminalName}
              onChange={e => setLocalTerminalName(e.target.value)}
              placeholder="Ex: Caisse Principale, Comptoir Étage"
              className="w-full h-12 bg-slate-850 border border-white/10 rounded-xl px-4 text-white font-medium outline-none focus:border-indigo-500 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* 🖨️ Configuration Principale du Ticket */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Modèle Visuel de Ticket</label>
          <select 
            value={formData.receiptTemplate || 'standard'}
            onChange={e => setFormData({ ...formData, receiptTemplate: e.target.value as any })}
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-indigo-500/50 transition-all font-medium"
          >
            <option value="standard">Standard NEXUS (Recommandé)</option>
            <option value="minimal">Compact Éco (Moins de papier)</option>
            <option value="modern">Détaillé Premium</option>
            <option value="classic">Classique</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Format Papier Thermique</label>
          <select 
            value={formData.paperFormat || '80mm'}
            onChange={e => setFormData({ ...formData, paperFormat: e.target.value as any })}
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-indigo-500/50 transition-all font-medium"
          >
            <option value="80mm">Standard 80mm (Grande imprimante caisse)</option>
            <option value="60mm">Compact 58mm / 60mm (Mini imprimante mobile)</option>
            <option value="A4">Format Facture A4 (Imprimante bureautique)</option>
          </select>
        </div>
      </div>

      {/* Conditions & QR Code Réseaux Sociaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <FileText size={14} className="text-indigo-400" />
            Conditions de Retour / Message de Pied
          </label>
          <input 
            type="text"
            value={formData.customReceiptMessage ?? 'Les articles soldés ne sont ni repris ni échangés.'}
            onChange={e => setFormData({ ...formData, customReceiptMessage: e.target.value })}
            placeholder="Ex: Échange possible sous 48h avec ticket"
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-indigo-500/50 transition-all font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <QrCode size={14} className="text-indigo-400" />
            Lien QR Code (Facebook / Instagram / Maps)
          </label>
          <input 
            type="text"
            value={formData.receiptSocialQrUrl ?? ''}
            onChange={e => setFormData({ ...formData, receiptSocialQrUrl: e.target.value })}
            placeholder="https://facebook.com/votrepage ou lien Google Maps"
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-indigo-500/50 transition-all font-medium"
          />
        </div>
      </div>

      {/* Pilotage Tiroir-Caisse & Options d'Impression */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tiroir-Caisse ESC/POS */}
        <div className="flex items-center justify-between p-5 bg-slate-900 border border-white/5 rounded-3xl group hover:border-emerald-500/30 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-bold text-white uppercase">Tiroir-Caisse Automatique</p>
            <p className="text-[10px] text-slate-400">Ouvre le tiroir sur règlement espèces</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestDrawer}
                disabled={isTestingDrawer}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Play size={12} />
                {isTestingDrawer ? 'Test en cours...' : 'Tester le tiroir'}
              </button>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={autoDrawer}
              onChange={e => handleToggleAutoDrawer(e.target.checked)}
            />
            <div className="w-12 h-6 bg-slate-850 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Impression Silencieuse */}
        <div className="flex items-center justify-between p-5 bg-slate-900 border border-white/5 rounded-3xl group hover:border-amber-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Printer size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase">Impression Silencieuse</p>
              <p className="text-[10px] text-slate-500">Sans boîte de dialogue système</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={formData.silentPrinting ?? false}
              onChange={e => setFormData({ ...formData, silentPrinting: e.target.checked })}
            />
            <div className="w-12 h-6 bg-slate-850 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>

      {/* Options d'Affichage Logo & Économies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center justify-between p-5 bg-slate-900 border border-white/5 rounded-3xl group hover:border-indigo-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Image size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase">Logo sur le ticket</p>
              <p className="text-[9px] text-slate-500">Imprime le logo en en-tête</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={formData.showLogoOnReceipt !== false}
              onChange={e => setFormData({ ...formData, showLogoOnReceipt: e.target.checked })}
            />
            <div className="w-12 h-6 bg-slate-850 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-5 bg-slate-900 border border-white/5 rounded-3xl group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase">Économies Réalisées</p>
              <p className="text-[9px] text-slate-500">Affiche « Économisé X DA »</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={formData.showSavingsOnReceipt !== false}
              onChange={e => setFormData({ ...formData, showSavingsOnReceipt: e.target.checked })}
            />
            <div className="w-12 h-6 bg-slate-850 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
