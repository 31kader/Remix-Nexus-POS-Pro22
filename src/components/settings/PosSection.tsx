import React from 'react';
import {
  Zap,
  Database,
  Timer,
  AlertTriangle,
  Settings as SettingsIcon,
  Volume2,
  Percent,
  Coins,
  Tag,
  ShieldCheck
} from 'lucide-react';
import { CompanySettings } from '../../types';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function PosSection({ formData, setFormData }: SectionProps) {
  const anyData = formData as any;
  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleItems = [
    {
      key: 'fastModeEnabled',
      title: 'Mode Caisse Haute Densité (Fast POS)',
      desc: 'Tableau compact (15-20 articles visibles sans défilement) et raccourcis F1/F2/F4 agrandis.',
      icon: Zap,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      checked: Boolean(formData.fastModeEnabled),
    },
    {
      key: 'allowNegativeStock',
      title: 'Autoriser la vente hors stock (Stock ≤ 0)',
      desc: "Permet d'encaisser un article même si son stock théorique est à 0.",
      icon: Database,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      checked: Boolean(formData.allowNegativeStock),
    },
    {
      key: 'enablePosSound',
      title: 'Sons & Bips du Scanner en Caisse',
      desc: 'Émet un signal sonore lors du scan code-barres et de la validation du ticket.',
      icon: Volume2,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      checked: anyData.enablePosSound !== false,
    },
    {
      key: 'enableWholesaleInPos',
      title: 'Activer le Basculement Prix Détail / Prix de Gros en Caisse',
      desc: 'Permet au caissier de passer un panier ou un client en tarif Grossiste en 1 clic.',
      icon: Tag,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      checked: anyData.enableWholesaleInPos !== false,
    },
    {
      key: 'confirmClearCart',
      title: 'Demander confirmation avant de vider le panier',
      desc: 'Évite la perte accidentelle d’un panier rempli lors d’un faux clic.',
      icon: ShieldCheck,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      checked: anyData.confirmClearCart !== false,
    },
    {
      key: 'enableTimeClock',
      title: 'Activer la Pointeuse Horaire du Personnel',
      desc: 'Enregistre automatiquement les heures de début et de fin de service des caissiers.',
      icon: Timer,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      checked: Boolean(formData.enableTimeClock),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Interrupteurs de Comportement Caisse */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Comportement du Terminal de Caisse (POS)</h4>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">Activez ou désactivez les fonctionnalités opérationnelles au comptoir</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {toggleItems.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 hover:border-indigo-500/40 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${item.color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{item.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={item.checked}
                    onChange={e => updateField(item.key, e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seuils Numériques, Plafond de Remise & Arrondi */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Seuils de Contrôle, Remises & Arrondis</h4>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">Règles de sécurité caisse et alertes de réapprovisionnement</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-500" /> Seuil d'alerte stock global
            </label>
            <input
              type="number"
              value={formData.globalStockAlertThreshold ?? 10}
              onChange={e => updateField('globalStockAlertThreshold', parseInt(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1.5">
              <Percent size={12} className="text-rose-500" /> Remise Max Caissier (%)
            </label>
            <input
              type="number"
              value={anyData.maxCashierDiscountPercent ?? 15}
              onChange={e => updateField('maxCashierDiscountPercent', parseInt(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1.5">
              <Coins size={12} className="text-emerald-500" /> Arrondi Espèces (DA)
            </label>
            <select
              value={anyData.cashRoundingStep ?? 0}
              onChange={e => updateField('cashRoundingStep', parseInt(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            >
              <option value={0}>Aucun arrondi (Montant exact)</option>
              <option value={1}>Arrondi au Dinar (1 DA)</option>
              <option value={5}>Arrondi à 5 DA</option>
              <option value={10}>Arrondi à 10 DA</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1.5">
              <Timer size={12} className="text-indigo-500" /> Veille Session (Minutes)
            </label>
            <input
              type="number"
              value={formData.sessionTimeoutMinutes ?? 30}
              onChange={e => updateField('sessionTimeoutMinutes', parseInt(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Modèles de documents par défaut */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
          <SettingsIcon size={16} className="text-indigo-500" />
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Modèles par Défaut (Ticket & Étiquette)</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">Modèle de Ticket de Caisse</label>
            <select
              value={formData.receiptTemplate}
              onChange={e => updateField('receiptTemplate', e.target.value)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            >
              <option value="standard">Standard NEXUS (Complet & Clair)</option>
              <option value="minimal">Compact Économique (Moins de papier)</option>
              <option value="modern">Détaillé Premium (Avec TVA & Économies)</option>
              <option value="classic">Classique Commercial</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">Modèle d'Étiquette Code-Barres</label>
            <select
              value={formData.labelTemplate}
              onChange={e => updateField('labelTemplate', e.target.value)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            >
              <option value="standard">Standard (40×20mm / 50×30mm)</option>
              <option value="shelf-standard">Étiquette Gondole / Rayon</option>
              <option value="barcode-only">Code-barres + Réf uniquement</option>
              <option value="price-only">Grand Prix Promo uniquement</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
