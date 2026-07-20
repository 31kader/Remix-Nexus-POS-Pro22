import React from 'react';
import { 
  DollarSign, 
  Trash2, 
  Plus 
} from 'lucide-react';
import { CompanySettings } from '../../types';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function AccountingSection({ formData, setFormData }: SectionProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Devise du Magasin</label>
          <input 
            type="text" 
            value={formData.currency || ''}
            onChange={e => setFormData({ ...formData, currency: e.target.value })}
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-emerald-500/50 transition-all font-medium"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">TVA par Défaut (%)</label>
          <input 
            type="number" 
            value={formData.taxRate ?? 19}
            onChange={e => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-emerald-500/50 transition-all font-medium"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Format de sortie Compta</label>
          <select 
            value={formData.accountingFormat}
            onChange={e => setFormData({ ...formData, accountingFormat: e.target.value as any })}
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-emerald-500/50 transition-all"
          >
            <option value="csv">Standard CSV</option>
            <option value="pdf">Document PDF</option>
            <option value="json">JSON API Stream</option>
          </select>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-500" />
            Taxes & Fiscalité
          </h4>
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Afficher Prix HT</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={formData.displayPriceHT}
                onChange={e => setFormData({ ...formData, displayPriceHT: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-800 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          {formData.availableTaxes?.map((tax, idx) => (
            <div key={idx} className="group flex items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all">
              <input 
                className="flex-1 bg-transparent px-3 py-2 text-white outline-none text-sm font-bold placeholder:text-slate-700" 
                placeholder="Nom de la taxe (ex: TVA 19%)"
                value={tax.name}
                onChange={e => {
                  const newTaxes = [...(formData.availableTaxes || [])];
                  newTaxes[idx].name = e.target.value;
                  setFormData({...formData, availableTaxes: newTaxes});
                }}
              />
              <div className="flex items-center h-10 bg-slate-950 rounded-xl px-4 border border-white/5 group-focus-within:border-emerald-500/50 transition-all">
                <input 
                  type="number" 
                  className="w-12 bg-transparent text-center text-emerald-400 font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={tax.rate}
                  onChange={e => {
                    const newTaxes = [...(formData.availableTaxes || [])];
                    newTaxes[idx].rate = parseFloat(e.target.value) || 0;
                    setFormData({...formData, availableTaxes: newTaxes});
                  }}
                />
                <span className="text-emerald-500/40 font-black text-[10px] ml-1">%</span>
              </div>
              <button 
                onClick={() => setFormData({...formData, availableTaxes: formData.availableTaxes?.filter((_, i) => i !== idx)})}
                className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          
          <button 
            type="button"
            onClick={() => setFormData({...formData, availableTaxes: [...(formData.availableTaxes || []), { name: '', rate: 0 }]})}
            className="w-full h-12 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-2 text-slate-500 hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-[10px] font-black uppercase tracking-widest mt-2"
          >
            <Plus size={16} />
            Ajouter un taux de taxe
          </button>
        </div>
      </div>
    </div>
  );
}
