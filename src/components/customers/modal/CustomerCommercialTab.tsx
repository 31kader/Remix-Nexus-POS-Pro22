import React from 'react';
import { Award, Sparkles } from 'lucide-react';

interface CustomerCommercialTabProps {
  formData: any;
  setFormData: (data: any) => void;
  generateFidelityCard: () => void;
}

export const CustomerCommercialTab: React.FC<CustomerCommercialTabProps> = ({
  formData,
  setFormData,
  generateFidelityCard,
}) => {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Award size={14} className="text-amber-500" />
          Numéro de Carte de Fidélité
        </label>
        <div className="relative">
          <input 
            placeholder="Code barre ou identifiant de carte..."
            className="w-full p-3 pr-28 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-sm text-slate-900 dark:text-white tracking-wider" 
            value={formData.loyaltyCardNumber || ''} 
            onChange={e => setFormData({ ...formData, loyaltyCardNumber: e.target.value })} 
          />
          <button
            type="button"
            onClick={generateFidelityCard}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg transition-all flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
          >
            <Sparkles size={12} /> Auto
          </button>
        </div>
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Tarif Client Grossiste
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Appliquer automatiquement les prix de gros lors des ventes en caisse
            </p>
          </div>
          <input 
            type="checkbox" 
            className="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
            checked={!!formData.isWholesale}
            onChange={e => setFormData({ ...formData, isWholesale: e.target.checked })}
          />
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60">
          <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            Plafond de Crédit Autorisé (DA)
          </label>
          <input 
            type="number" 
            min="0"
            step="100"
            placeholder="0 = Pas de limite"
            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-sm text-slate-900 dark:text-white"
            value={formData.creditLimit || ''}
            onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
          />
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Alerte en caisse si la dette du client dépasse ce seuil.
          </p>
        </div>
      </div>
    </div>
  );
};
