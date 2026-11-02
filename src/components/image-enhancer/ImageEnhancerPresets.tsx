import React from 'react';
import { Sparkles, Printer, Layers, Scissors } from 'lucide-react';
import { EnhancementPreset } from '../../lib/image-enhancer';

interface ImageEnhancerPresetsProps {
  preset: EnhancementPreset;
  onSelectPreset: (preset: EnhancementPreset) => void;
  onScaleChange: (scale: 1 | 2 | 4) => void;
  onRemoveBackgroundChange: (remove: boolean) => void;
}

export const ImageEnhancerPresets: React.FC<ImageEnhancerPresetsProps> = ({
  preset,
  onSelectPreset,
  onScaleChange,
  onRemoveBackgroundChange
}) => {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 block">
        Préréglage Métier
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { onSelectPreset('hd-photo'); onScaleChange(2); }}
          className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
            preset === 'hd-photo' 
              ? 'bg-indigo-600/20 border-indigo-500 text-white' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <Sparkles size={14} className="text-indigo-400" />
            HD Photo
          </div>
          <span className="text-[10px] text-slate-400 leading-tight">Netteté & Lissage 2x</span>
        </button>

        <button
          type="button"
          onClick={() => { onSelectPreset('thermal-escpos'); onScaleChange(1); }}
          className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
            preset === 'thermal-escpos' 
              ? 'bg-indigo-600/20 border-indigo-500 text-white' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <Printer size={14} className="text-emerald-400" />
            Ticket ESC/POS
          </div>
          <span className="text-[10px] text-slate-400 leading-tight">1-Bit Net 203 DPI</span>
        </button>

        <button
          type="button"
          onClick={() => { onSelectPreset('vector-trace'); onScaleChange(1); }}
          className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
            preset === 'vector-trace' 
              ? 'bg-indigo-600/20 border-indigo-500 text-white' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <Layers size={14} className="text-violet-400" />
            Vecteur SVG
          </div>
          <span className="text-[10px] text-slate-400 leading-tight">Tracés Illustrator</span>
        </button>

        <button
          type="button"
          onClick={() => { onSelectPreset('knockout-bg'); onRemoveBackgroundChange(true); }}
          className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
            preset === 'knockout-bg' 
              ? 'bg-indigo-600/20 border-indigo-500 text-white' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <Scissors size={14} className="text-amber-400" />
            Détourage
          </div>
          <span className="text-[10px] text-slate-400 leading-tight">Fond Transparent</span>
        </button>
      </div>
    </div>
  );
};
