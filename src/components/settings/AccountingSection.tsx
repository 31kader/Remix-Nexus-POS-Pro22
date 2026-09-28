import React from 'react';
import { DollarSign, Trash2, Plus, Percent, TrendingUp } from 'lucide-react';
import { CompanySettings } from '../../types';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function AccountingSection({ formData, setFormData }: SectionProps) {
  const anyData = formData as any;
  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Bloc 1 : Devise, TVA & Export Comptable */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Devise, TVA & Comptabilité</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Paramètres monétaires (Dinar Algérien DA) et fiscalité par défaut</p>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700">
            <span className="text-[10px] font-black text-slate-600 dark:text-zinc-300 uppercase">Afficher Prix HT</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={Boolean(formData.displayPriceHT)}
                onChange={e => updateField('displayPriceHT', e.target.checked)}
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">Devise du Magasin</label>
            <input
              type="text"
              value={formData.currency || 'DA'}
              onChange={e => updateField('currency', e.target.value)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">Taux TVA par Défaut (%)</label>
            <input
              type="number"
              value={formData.taxRate ?? 19}
              onChange={e => updateField('taxRate', parseFloat(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">Format d'Export Comptable</label>
            <select
              value={formData.accountingFormat || 'csv'}
              onChange={e => updateField('accountingFormat', e.target.value)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-emerald-500"
            >
              <option value="csv">Tableur CSV / Excel</option>
              <option value="pdf">Rapport PDF Imprimable</option>
              <option value="json">Archive JSON Structurée</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bloc 2 : Règles de Marges Automatiques (Détail / Gros / En Ligne) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
          <TrendingUp size={17} className="text-indigo-500" />
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Règles de Marges par Défaut (Détail, Gros & En Ligne)</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Taux suggérés automatiquement lors de la création ou de la réception d'un nouvel article</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1">
              <Percent size={12} className="text-emerald-500" /> Marge Détail Cible (%)
            </label>
            <input
              type="number"
              value={anyData.defaultRetailMarginPercent ?? 30}
              onChange={e => updateField('defaultRetailMarginPercent', parseFloat(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1">
              <Percent size={12} className="text-amber-500" /> Marge Prix de Gros (%)
            </label>
            <input
              type="number"
              value={anyData.defaultWholesaleMarginPercent ?? 15}
              onChange={e => updateField('defaultWholesaleMarginPercent', parseFloat(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1">
              <Percent size={12} className="text-blue-500" /> Marge Prix En Ligne (%)
            </label>
            <input
              type="number"
              value={anyData.defaultOnlineMarginPercent ?? 25}
              onChange={e => updateField('defaultOnlineMarginPercent', parseFloat(e.target.value) || 0)}
              className="w-full h-11 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Bloc 3 : Taux de Taxes Multiples */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign size={17} className="text-emerald-500" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Grille des Taxes Additionnelles (TVA 19%, TVA 9%, Timbre...)</h4>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                availableTaxes: [...(formData.availableTaxes || []), { name: 'TVA 9%', rate: 9 }]
              })
            }
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Ajouter une taxe
          </button>
        </div>

        <div className="space-y-2.5">
          {(formData.availableTaxes || []).length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-zinc-500 py-3 text-center">
               seule la TVA par défaut ({formData.taxRate ?? 19}%) est active.
            </p>
          ) : (
            formData.availableTaxes?.map((tax, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700"
              >
                <input
                  className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none text-xs font-bold"
                  placeholder="Nom de la taxe (ex: TVA Réduite 9%)"
                  value={tax.name}
                  onChange={e => {
                    const newTaxes = [...(formData.availableTaxes || [])];
                    newTaxes[idx].name = e.target.value;
                    setFormData({ ...formData, availableTaxes: newTaxes });
                  }}
                />
                <div className="flex items-center bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-slate-200 dark:border-zinc-700">
                  <input
                    type="number"
                    className="w-14 bg-transparent text-center text-emerald-600 dark:text-emerald-400 text-xs font-black outline-none"
                    value={tax.rate}
                    onChange={e => {
                      const newTaxes = [...(formData.availableTaxes || [])];
                      newTaxes[idx].rate = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, availableTaxes: newTaxes });
                    }}
                  />
                  <span className="text-slate-400 font-black text-xs ml-1">%</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      availableTaxes: formData.availableTaxes?.filter((_, i) => i !== idx)
                    })
                  }
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
