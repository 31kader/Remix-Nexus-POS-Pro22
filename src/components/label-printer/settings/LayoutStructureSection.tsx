import React from 'react';
import { LabelPrinterState } from '../types';

interface LayoutStructureSectionProps {
  state: LabelPrinterState;
}

export function LayoutStructureSection({ state }: LayoutStructureSectionProps) {
  return (
    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
      <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">Organisation de Mise en Page</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => state.setLayoutStructure('classic')}
          className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between h-[64px] cursor-pointer ${state.layoutStructure === 'classic' ? 'border-indigo-500 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
        >
          <span className="text-[11px] font-bold block uppercase">Empilement</span>
          <span className="text-[9px] opacity-75">Centré classique</span>
        </button>
        <button
          type="button"
          onClick={() => state.setLayoutStructure('split')}
          className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between h-[64px] cursor-pointer ${state.layoutStructure === 'split' ? 'border-indigo-500 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
        >
          <span className="text-[11px] font-bold block uppercase">Scindé (Split)</span>
          <span className="text-[9px] opacity-75">Infos à gauche, Code à droite</span>
        </button>
        <button
          type="button"
          onClick={() => state.setLayoutStructure('price-heavy')}
          className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between h-[64px] cursor-pointer ${state.layoutStructure === 'price-heavy' ? 'border-indigo-500 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
        >
          <span className="text-[11px] font-bold block uppercase">Focus Prix</span>
          <span className="text-[9px] opacity-75">Prix XXL</span>
        </button>
        <button
          type="button"
          onClick={() => state.setLayoutStructure('barcode-centric')}
          className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between h-[64px] cursor-pointer ${state.layoutStructure === 'barcode-centric' ? 'border-indigo-500 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
        >
          <span className="text-[11px] font-bold block uppercase">Master Code</span>
          <span className="text-[9px] opacity-75">Surlignage code-barres</span>
        </button>
      </div>

      {state.layoutStructure === 'classic' && (
        <div className="space-y-1.5 pt-1 border-t border-slate-900">
          <span className="text-[10px] text-slate-400 block flex justify-between">
            <span>Alignement horizontal de l'étiquette</span>
            <span className="uppercase text-indigo-400 font-semibold">{state.contentAlignment === 'left' ? 'À Gauche' : state.contentAlignment === 'right' ? 'À Droite' : 'Centré'}</span>
          </span>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => state.setContentAlignment('left')}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${state.contentAlignment === 'left' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
            >
              À Gauche
            </button>
            <button 
              type="button"
              onClick={() => state.setContentAlignment('center')}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${state.contentAlignment === 'center' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
            >
              Centré
            </button>
            <button 
              type="button"
              onClick={() => state.setContentAlignment('right')}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${state.contentAlignment === 'right' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
            >
              À Droite
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
