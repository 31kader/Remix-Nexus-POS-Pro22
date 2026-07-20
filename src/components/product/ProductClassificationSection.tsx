import React from 'react';
import { cn } from '../../lib/utils';
import { Brand, Category } from '../../types';
import { SearchableBrandSelect } from './SearchableBrandSelect';
import { ChevronDown, MapPin, Link2 } from 'lucide-react';

interface ProductClassificationSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  brands: Brand[];
  categories: Category[];
  parentCatId: string;
  setParentCatId: (v: string) => void;
  subCatId: string;
  setSubCatId: (v: string) => void;
  setActiveTab?: (tab: string) => void;
  onClose: () => void;
}

export function ProductClassificationSection({
  formData,
  setFormData,
  brands,
  categories,
  parentCatId,
  setParentCatId,
  subCatId,
  setSubCatId,
  setActiveTab,
  onClose
}: ProductClassificationSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic flex justify-between items-center group ml-1">
            MARQUE CORPORATE
            {setActiveTab && (
              <button 
                type="button" 
                onClick={() => { onClose(); setActiveTab('inventory_settings'); }} 
                className="text-indigo-400 hover:text-indigo-300 transition-colors font-black text-[8px] tracking-widest border-b border-indigo-400/20"
              >
                + GESTION
              </button>
            )}
          </label>
          <SearchableBrandSelect 
            value={formData.brandId} 
            onChange={(val) => setFormData({...formData, brandId: val})} 
            brands={brands}
            onManage={setActiveTab ? () => { onClose(); setActiveTab('inventory_settings'); } : undefined}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic flex justify-between items-center ml-1">
            CATÉGORIE MAÎTRE
            {setActiveTab && (
              <button 
                type="button" 
                onClick={() => { onClose(); setActiveTab('inventory_settings'); }} 
                className="text-indigo-400 hover:text-indigo-300 transition-colors font-black text-[8px] tracking-widest border-b border-indigo-400/20"
              >
                + GESTION
              </button>
            )}
          </label>
          <div className="relative group">
            <select
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-[10px] font-black uppercase tracking-[0.15em] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner cursor-pointer appearance-none italic"
              value={parentCatId}
              onChange={e => { setParentCatId(e.target.value); setSubCatId(''); }}
            >
              <option value="" className="bg-[#0a0c10] text-slate-700 italic">AUCUNE SÉLECTION</option>
              {categories.filter(c => !c.parentId).map((c: any) => (
                <option key={c.id} value={c.id} className="bg-[#0a0c10] text-white">
                  {c.name.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-indigo-400/60 uppercase tracking-[0.2em] italic ml-1 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
            RAMIFICATION / SOUS-CATÉGORIE *
          </label>
          <div className="relative group">
            <select
              className={cn(
                "w-full bg-black/40 border rounded-xl py-2.5 px-4 text-white text-[10px] font-black uppercase tracking-[0.15em] outline-none focus:ring-4 transition-all shadow-inner cursor-pointer appearance-none italic",
                parentCatId ? "border-indigo-500/40 focus:ring-indigo-500/10" : "border-white/5 opacity-30 cursor-not-allowed"
              )}
              value={subCatId}
              disabled={!parentCatId}
              onChange={e => setSubCatId(e.target.value)}
            >
              <option value="" className="bg-[#0a0c10] text-slate-700 italic">SÉLECTIONNER RAMIFICATION</option>
              {categories.filter(c => c.parentId === parentCatId).map((c: any) => (
                <option key={c.id} value={c.id} className="bg-[#0a0c10] text-white">
                  {c.name.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">ÉTAT OPÉRATIONNEL</label>
          <div className="relative group">
            <select
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-[10px] font-black uppercase tracking-[0.15em] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner cursor-pointer appearance-none italic"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as any})}
            >
              <option value="active" className="bg-[#0a0c10] text-emerald-400">ACTIF / OPÉRATIONNEL</option>
              <option value="inactive" className="bg-[#0a0c10] text-slate-500">INACTIF / ARCHIVÉ</option>
              <option value="discontinued" className="bg-[#0a0c10] text-rose-500">ARRÊT DÉFINITIF</option>
            </select>
            <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-6 rounded-2xl border border-white/5 ring-1 ring-white/5">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] italic ml-1 flex items-center gap-2">
            <MapPin size={10} /> EMPLACEMENT LOGISTIQUE
          </label>
          <input 
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-xs font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner group-hover:border-white/20 uppercase tracking-widest italic"
            placeholder="RAYON, STOCK..."
            value={formData.location} 
            onChange={e => setFormData({...formData, location: e.target.value.toUpperCase()})} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] italic ml-1 flex items-center gap-2">
            <Link2 size={10} /> CODE MODÈLE / RÉF INTERNE
          </label>
          <input 
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-xs font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner group-hover:border-white/20 uppercase tracking-widest italic"
            placeholder="RÉF INTERNE..."
            value={formData.reference} 
            onChange={e => setFormData({...formData, reference: e.target.value})} 
          />
        </div>
      </div>
    </div>
  );
}
