import React from 'react';
import { Mic, Camera, RefreshCw, Loader2 } from 'lucide-react';
import { cn, generateUniqueId } from '../../lib/utils';

interface ProductBasicInfoSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  startVoiceEntry: () => void;
  isVoiceScanning: boolean;
  skuError: string | null;
  isGlobalLoading: boolean;
  setIsScannerOpen: (val: boolean) => void;
}

export function ProductBasicInfoSection({
  formData,
  setFormData,
  startVoiceEntry,
  isVoiceScanning,
  skuError,
  isGlobalLoading,
  setIsScannerOpen
}: ProductBasicInfoSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1">DÉSIGNATION ARTICLE *</label>
        <div className="relative group">
          <input
            required
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner group-hover:border-white/20 uppercase italic"
            placeholder="NOM DU PRODUIT..."
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={startVoiceEntry}
              disabled={isVoiceScanning}
              className={cn(
                "p-2 rounded-lg transition-all active:scale-90",
                isVoiceScanning ? "text-rose-500 animate-pulse bg-rose-500/10" : "text-slate-700 hover:text-indigo-400 hover:bg-white/5"
              )}
              title="Saisie vocale intelligente"
            >
              <Mic size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1">RÉFÉRENCE / SKU</label>
        <div className="relative group">
          <input 
            className={cn(
              "w-full bg-black/40 border rounded-xl py-3 pl-4 pr-24 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 transition-all shadow-inner group-hover:border-white/20 uppercase tracking-widest",
              skuError ? 'border-rose-500 ring-rose-500/10 focus:ring-rose-500/5' : 'border-white/10 focus:ring-indigo-500/5 focus:border-indigo-500/40'
            )}
            placeholder="SCANNER..."
            value={formData.sku} 
            onChange={e => setFormData({...formData, sku: e.target.value})} 
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isGlobalLoading && <Loader2 size={14} className="text-indigo-500 animate-spin mr-1" />}
            <button 
              type="button" 
              onClick={() => setFormData({...formData, sku: `SKU-${generateUniqueId().toUpperCase()}`})}
              className="p-1.5 text-slate-700 hover:text-indigo-400 transition-colors active:scale-90"
              title="GÉNÉRER SKU"
            >
              <RefreshCw size={14} />
            </button>
            <button 
              type="button" 
              onClick={() => setIsScannerOpen(true)}
              className="p-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white rounded-lg transition-all shadow-2xl active:scale-90"
              title="OUVRIR SCANNER"
            >
              <Camera size={16} />
            </button>
          </div>
        </div>
        {skuError && <p className="text-[9px] font-black text-rose-500 animate-pulse tracking-widest mt-1 ml-2 italic">{skuError.toUpperCase()}</p>}
      </div>
    </div>
  );
}
