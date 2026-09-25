import React from 'react';
import { Mic, Camera, RefreshCw, Loader2, Star, Eye, EyeOff, Barcode } from 'lucide-react';
import { cn, generateUniqueId } from '../../lib/utils';

interface ProductBasicInfoSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  startVoiceEntry: () => void;
  isVoiceScanning: boolean;
  skuError: string | null;
  isGlobalLoading: boolean;
  setIsScannerOpen: (val: boolean) => void;
  setScannerTarget?: (target: 'barcode' | 'sku') => void;
}

export function ProductBasicInfoSection({
  formData,
  setFormData,
  startVoiceEntry,
  isVoiceScanning,
  skuError,
  isGlobalLoading,
  setIsScannerOpen,
  setScannerTarget
}: ProductBasicInfoSectionProps) {
  const generateEan13 = () => {
    const prefix = "613";
    let body = "";
    for (let i = 0; i < 9; i++) {
      body += Math.floor(Math.random() * 10).toString();
    }
    const raw12 = prefix + body;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(raw12[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checksum = (10 - (sum % 10)) % 10;
    const barcode = raw12 + checksum.toString();
    setFormData((prev: any) => ({ ...prev, barcode }));
  };

  const openScanner = (target: 'barcode' | 'sku') => {
    if (setScannerTarget) setScannerTarget(target);
    setIsScannerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Ligne 1 : Désignation de l'article */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal  ml-1">
          DÉSIGNATION ARTICLE *
        </label>
        <div className="relative group">
          <input
            required
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-black placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner group-hover:border-white/20 uppercase "
            placeholder="NOM DU PRODUIT..."
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={startVoiceEntry}
              disabled={isVoiceScanning}
              className={cn(
                "p-2 rounded-lg transition-all active:scale-90 cursor-pointer",
                isVoiceScanning ? "text-rose-500 animate-pulse bg-rose-500/10" : "text-slate-700 hover:text-indigo-400 hover:bg-white/5"
              )}
              title="Saisie vocale intelligente"
            >
              <Mic size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Ligne 2 : Code-barres EAN & Référence / SKU */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Code-barres EAN */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal  ml-1 flex items-center gap-1.5">
            <Barcode size={13} className="text-indigo-400" />
            CODE-BARRES EAN (SCANNER)
          </label>
          <div className="relative group">
            <input 
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-24 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner group-hover:border-white/20 tracking-widest"
              placeholder="SCANNER CODE EAN..."
              value={formData.barcode || ''} 
              onChange={e => setFormData({...formData, barcode: e.target.value})} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button 
                type="button" 
                onClick={generateEan13}
                className="p-1.5 text-slate-600 hover:text-indigo-400 transition-colors active:scale-90 cursor-pointer"
                title="Générer code-barres EAN-13 automatique"
              >
                <RefreshCw size={14} />
              </button>
              <button 
                type="button" 
                onClick={() => openScanner('barcode')}
                className="p-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white rounded-lg transition-all shadow-2xl active:scale-90 cursor-pointer"
                title="Scanner avec caméra"
              >
                <Camera size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Référence interne / SKU */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal  ml-1">
            RÉFÉRENCE / SKU INTERNE
          </label>
          <div className="relative group">
            <input 
              className={cn(
                "w-full bg-black/40 border rounded-xl py-3 pl-4 pr-24 text-white text-sm font-black font-mono placeholder:text-slate-800 focus:outline-none focus:ring-4 transition-all shadow-inner group-hover:border-white/20 uppercase tracking-widest",
                skuError ? 'border-rose-500 ring-rose-500/10 focus:ring-rose-500/5' : 'border-white/10 focus:ring-indigo-500/5 focus:border-indigo-500/40'
              )}
              placeholder="SKU-..."
              value={formData.sku || ''} 
              onChange={e => setFormData({...formData, sku: e.target.value})} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isGlobalLoading && <Loader2 size={14} className="text-indigo-500 animate-spin mr-1" />}
              <button 
                type="button" 
                onClick={() => setFormData({...formData, sku: `SKU-${generateUniqueId().toUpperCase()}`})}
                className="p-1.5 text-slate-600 hover:text-indigo-400 transition-colors active:scale-90 cursor-pointer"
                title="Générer SKU interne"
              >
                <RefreshCw size={14} />
              </button>
              <button 
                type="button" 
                onClick={() => openScanner('sku')}
                className="p-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white rounded-lg transition-all shadow-2xl active:scale-90 cursor-pointer"
                title="Scanner SKU"
              >
                <Camera size={16} />
              </button>
            </div>
          </div>
          {skuError && <p className="text-[9px] font-black text-rose-500 animate-pulse tracking-widest mt-1 ml-2 ">{skuError.toUpperCase()}</p>}
        </div>
      </div>

      {/* Ligne 3 : Toggles POS Caisse & Favori Rapide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Afficher en Caisse */}
        <label 
          className={cn(
            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
            formData.showInPos !== false 
              ? "bg-indigo-950/20 border-indigo-500/30 text-white" 
              : "bg-black/20 border-white/5 text-slate-500"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              formData.showInPos !== false ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-600"
            )}>
              {formData.showInPos !== false ? <Eye size={16} /> : <EyeOff size={16} />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Visible en Caisse (POS)</p>
              <p className="text-[10px] text-slate-400">Afficher ce produit sur le terminal de vente</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={formData.showInPos !== false}
            onChange={e => setFormData({ ...formData, showInPos: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-black/40 border-white/20 cursor-pointer"
          />
        </label>

        {/* Favori POS / Sélection Rapide */}
        <label 
          className={cn(
            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
            formData.isQuickSelect 
              ? "bg-amber-950/20 border-amber-500/30 text-white" 
              : "bg-black/20 border-white/5 text-slate-500"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              formData.isQuickSelect ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-slate-600"
            )}>
              <Star size={16} className={formData.isQuickSelect ? "fill-amber-400 text-amber-400" : ""} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Favori Caisse (Grille Rapide)</p>
              <p className="text-[10px] text-slate-400">Épingler en raccourci tactile sur le POS</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={!!formData.isQuickSelect}
            onChange={e => setFormData({ ...formData, isQuickSelect: e.target.checked })}
            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-black/40 border-white/20 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
