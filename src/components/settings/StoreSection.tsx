import React from 'react';
import { 
  Store, 
  ImageIcon, 
  MapPin, 
  Hash, 
  Phone, 
  Mail, 
  Printer, 
  Trash2, 
  Plus 
} from 'lucide-react';
import { CompanySettings } from '../../types';
import { generateUniqueId } from '../../lib/utils';
import { useTranslation } from '../../translations';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function StoreSection({ formData, setFormData }: SectionProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom de l'établissement</label>
          <div className="relative group">
            <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
              placeholder="Ex: Nexus Store Central"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Logo URL</label>
          <div className="relative group">
            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              value={formData.logoUrl || ''}
              onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
              placeholder="https://..."
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Adresse physique</label>
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              value={formData.address || ''}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro fiscal (NIF / AI)</label>
          <div className="relative group">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              value={formData.taxNumber || ''}
              onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Téléphone de contact</label>
          <div className="relative group">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail professionnel</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="email" 
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <MapPin size={18} className="text-blue-500" />
          Gestion Multi-Sites (Magasins & Dépôts)
        </h4>
        <div className="space-y-3">
          {formData.siteLocations?.map((site, idx) => (
            <div key={site.id} className="group flex items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
              <input 
                className="flex-1 bg-transparent px-3 py-2 text-white outline-none text-sm font-bold placeholder:text-slate-700" 
                placeholder="Nom du site (ex: Dépôt Nord)"
                value={site.name}
                onChange={e => {
                  const newSites = [...(formData.siteLocations || [])];
                  newSites[idx].name = e.target.value;
                  setFormData({ ...formData, siteLocations: newSites });
                }}
              />
              <select 
                value={site.type}
                onChange={e => {
                  const newSites = [...(formData.siteLocations || [])];
                  newSites[idx].type = e.target.value as 'warehouse' | 'store';
                  setFormData({ ...formData, siteLocations: newSites });
                }}
                className="bg-slate-950 border border-white/5 rounded-xl px-3 py-1.5 text-[10px] font-black text-blue-500 uppercase outline-none"
              >
                <option value="store">Magasin</option>
                <option value="warehouse">Entrepôt</option>
              </select>
              <button 
                onClick={() => setFormData({ ...formData, siteLocations: formData.siteLocations?.filter((_, i) => i !== idx) })}
                className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button 
            type="button"
            onClick={() => setFormData({ 
              ...formData, 
              siteLocations: [...(formData.siteLocations || []), { id: generateUniqueId(), name: '', address: '', type: 'store' }] 
            })}
            className="w-full h-12 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-2 text-slate-500 hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-[10px] font-black uppercase tracking-widest mt-2"
          >
            <Plus size={16} />
            Ajouter un établissement
          </button>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Printer size={18} className="text-blue-500" />
          Sortie & Impression
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Format de papier</label>
            <select 
              value={formData.paperFormat}
              onChange={e => setFormData({ ...formData, paperFormat: e.target.value as any })}
              className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-4 text-white outline-none focus:border-blue-500/50 transition-all"
            >
              <option value="80mm">Thermique 80mm</option>
              <option value="60mm">Thermique 60mm</option>
              <option value="A4">Standard A4</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-900 border border-white/5 rounded-2xl">
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Impression Silencieuse</p>
              <p className="text-[9px] text-slate-500 uppercase mt-0.5">Éviter d'ouvrir la boîte de dialogue système</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={formData.silentPrinting}
                onChange={e => setFormData({ ...formData, silentPrinting: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-800 border-2 border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
