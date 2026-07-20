import React from 'react';
import { Package, Trash2, RefreshCw, Plus, Camera, ShoppingCart } from 'lucide-react';
import { SafeImage } from '../ui';

interface ProductMediaSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  removeImage: (idx: number) => void;
  isUploadingImage: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProductMediaSection({
  formData,
  setFormData,
  removeImage,
  isUploadingImage,
  handleImageUpload
}: ProductMediaSectionProps) {
  return (
    <div className="space-y-8 bg-black/40 p-8 rounded-[3rem] border border-white/5 shadow-2xl ring-1 ring-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1 flex items-center gap-3">
          <Camera size={14} className="text-indigo-400" /> GALERIE MÉDIA / ASSETS (MAX 5)
        </label>
        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{formData.imageUrls.length} / 5</span>
      </div>

      <div className="flex flex-wrap gap-6">
        {formData.imageUrls.map((url: string, idx: number) => (
          <div key={`product-img-${idx}`} className="relative group w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] bg-black/60 border border-white/10 overflow-hidden shadow-2xl transition-all duration-500 hover:border-indigo-500/50 ring-1 ring-white/5">
            <SafeImage 
              src={url} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              fallback={<Package size={32} className="text-slate-800" />}
            />
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-md">
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="p-4 bg-rose-600/20 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-600 hover:text-white transition-all active:scale-90 shadow-2xl"
                title="SUPPRIMER IMAGE"
              >
                <Trash2 size={22} />
              </button>
            </div>
            {idx === 0 && (
              <div className="absolute top-3 left-3 bg-indigo-600 text-white text-[7px] font-black px-2.5 py-1 rounded-lg uppercase tracking-[0.2em] shadow-2xl border border-indigo-400 ring-1 ring-white/20 italic">
                PRIMARY
              </div>
            )}
          </div>
        ))}
        
        {isUploadingImage && (
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] bg-indigo-600/5 border-2 border-dashed border-indigo-500/30 flex flex-col items-center justify-center animate-pulse text-indigo-400 shadow-inner">
            <RefreshCw size={28} className="animate-spin mb-3" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-center px-4 leading-tight italic">ENCRYPTED UPLOAD...</span>
          </div>
        )}
        
        {formData.imageUrls.length < 5 && !isUploadingImage && (
          <label className="w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-600/5 transition-all duration-500 text-slate-700 hover:text-indigo-400 group shadow-inner">
            <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-600/20 transition-all">
              <Plus size={24} strokeWidth={3} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">AJOUTER</span>
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e)} />
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="cursor-pointer group relative overflow-hidden">
          <div className="flex items-center justify-center w-full gap-4 py-5 px-6 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-[10px] font-black text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-[0.2em] shadow-2xl active:scale-95 italic">
            <Camera size={20} className="group-hover:rotate-12 transition-transform" />
            <span>CAPTURE OPTIQUE</span>
          </div>
          <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e)} />
        </label>
        
        <button 
          type="button"
          onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(formData.name)}&tbm=shop`, '_blank')}
          className="flex items-center justify-center gap-4 py-5 px-6 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-500 hover:bg-white/10 hover:text-white transition-all uppercase tracking-[0.2em] shadow-2xl active:scale-95 italic group"
        >
          <ShoppingCart size={20} className="text-rose-500/60 group-hover:text-rose-500 transition-colors" />
          <span>SOURCE GOOGLE SHOPPING</span>
        </button>
      </div>
      
      <div className="space-y-4 pt-4 border-t border-white/5">
        <label className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] italic ml-1 flex items-center gap-2">
           <div className="w-1 h-1 rounded-full bg-slate-700" /> IMPORTATION PAR URL DIRECTE
        </label>
        <div className="flex gap-4">
          <div className="relative flex-1 group">
            <input
              placeholder="HTTPS://ASSETS.NEXUS.CLOUD/IMAGE..."
              className="w-full py-5 px-6 bg-black/40 border border-white/10 rounded-2xl text-xs font-black text-white italic outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 placeholder:text-slate-800 transition-all shadow-inner group-hover:border-white/20"
              value={formData.imageUrl || ''}
              onChange={e => setFormData({...formData, imageUrl: e.target.value})}
            />
          </div>
          <button 
            type="button" 
            onClick={() => {
              if (formData.imageUrl && !formData.imageUrls.includes(formData.imageUrl) && formData.imageUrls.length < 5) {
                setFormData({...formData, imageUrls: [...formData.imageUrls, formData.imageUrl], imageUrl: ''});
              }
            }}
            className="px-8 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 disabled:opacity-20 transition-all shadow-neon-indigo active:scale-90 border border-indigo-400"
            disabled={!formData.imageUrl || formData.imageUrls.length >= 5}
          >
            <Plus size={24} strokeWidth={4} />
          </button>
        </div>
      </div>
    </div>
  );
}
