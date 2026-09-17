import React from 'react';
import { Keyboard, Volume2, Mic, Coins, Zap } from 'lucide-react';
import { CompanySettings } from '../../types';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function ShortcutsSection({ formData, setFormData }: SectionProps) {
  const shortcutsList = [
    { key: 'F1', label: 'Barre de Recherche / Code-barres', desc: 'Place instantanément le curseur dans la recherche produit' },
    { key: 'F2', label: 'Paiement Espèces Direct', desc: 'Valide la vente en espèces au montant exact' },
    { key: 'F3', label: 'Vente à Crédit (Dette)', desc: 'Impute le montant sur le compte du client débiteur' },
    { key: 'F4', label: 'Réimprimer Reçu', desc: 'Réimprime le dernier ticket de caisse validé' },
    { key: 'F8', label: 'Mettre en Attente', desc: 'Suspend le panier actuel pour encaisser un autre client' },
    { key: 'Échap', label: 'Vider le Panier', desc: 'Réinitialise les articles en cours' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Touches Rapides */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase flex items-center gap-2">
              <Keyboard size={18} className="text-indigo-400" />
              Raccourcis Clavier Caisse (Touches F1 - F8)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Permet d'encaisser 3x plus vite sans toucher la souris.</p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={formData.enableKeyboardShortcuts !== false}
              onChange={e => setFormData({ ...formData, enableKeyboardShortcuts: e.target.checked })}
            />
            <div className="w-12 h-6 bg-slate-850 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {shortcutsList.map((s) => (
            <div key={s.key} className="p-4 bg-slate-900 border border-white/5 rounded-2xl flex items-center gap-3">
              <span className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono font-black text-xs rounded-xl shadow-md">
                {s.key}
              </span>
              <div>
                <p className="text-xs font-bold text-white">{s.label}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sons & Synthèse Vocale */}
      <div className="pt-6 border-t border-white/5">
        <h4 className="text-sm font-extrabold text-white uppercase flex items-center gap-2 mb-4">
          <Volume2 size={18} className="text-amber-400" />
          Sons & Alertes Vocales
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type de Bip Scanner</label>
            <select 
              value={formData.scannerSoundType || 'modern'}
              onChange={e => setFormData({ ...formData, scannerSoundType: e.target.value as any })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-amber-500/50 transition-all font-medium"
            >
              <option value="modern">Bip Moderne Aigu (Défaut)</option>
              <option value="classic">Bip Classique Supermarché</option>
              <option value="soft">Bip Doux Discret</option>
              <option value="silent">Muet (Sans bip)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Coins size={14} className="text-amber-400" />
              Arrondi Automatique des Espèces
            </label>
            <select 
              value={formData.cashRoundingStep ?? 0}
              onChange={e => setFormData({ ...formData, cashRoundingStep: parseInt(e.target.value) || 0 })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-amber-500/50 transition-all font-medium"
            >
              <option value={0}>Pas d'arrondi (Au centime près)</option>
              <option value={5}>Arrondi aux 5 DA les plus proches</option>
              <option value={10}>Arrondi aux 10 DA les plus proches</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-5 bg-slate-900 border border-white/5 rounded-3xl group hover:border-amber-500/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                <Mic size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase">Annonce Vocale du Prix</p>
                <p className="text-[9px] text-slate-500">Énonce le montant du total</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={formData.enableVoiceAnnouncement ?? false}
                onChange={e => setFormData({ ...formData, enableVoiceAnnouncement: e.target.checked })}
              />
              <div className="w-12 h-6 bg-slate-850 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
