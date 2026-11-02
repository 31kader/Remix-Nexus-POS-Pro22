import React from 'react';
import { RotateCw } from 'lucide-react';
import { LabelPrinterState } from '../types';

interface DimensionsConfigSectionProps {
  state: LabelPrinterState;
  handlePaddingBaseChange: (val: number) => void;
}

export function DimensionsConfigSection({ state, handlePaddingBaseChange }: DimensionsConfigSectionProps) {
  return (
    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-bold text-indigo-400 uppercase">Dimensions & Orientation</span>
        <span className="text-[10px] font-mono text-slate-400">
          {state.customOrientation === 'portrait' 
            ? `${state.customHeight}mm × ${state.customWidth}mm [Vertical]` 
            : `${state.customWidth}mm × ${state.customHeight}mm [Horizontal]`
          }
        </span>
      </div>

      {/* Paramètre Orientation (Vertical / Horizontal) + Rotation */}
      <div className="grid grid-cols-2 gap-2.5 p-2 bg-slate-900/80 rounded-xl border border-slate-800">
        {/* Orientation */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">
            Orientation
          </span>
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => state.setCustomOrientation('landscape')}
              className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                state.customOrientation === 'landscape'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Format Horizontal / Paysage"
            >
              ↔️ Horizontal
            </button>
            <button
              type="button"
              onClick={() => state.setCustomOrientation('portrait')}
              className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                state.customOrientation === 'portrait'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Format Vertical / Portrait"
            >
              ↕️ Vertical
            </button>
          </div>
        </div>

        {/* Rotation */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block flex items-center gap-1">
            <RotateCw size={11} className="text-indigo-400" />
            Rotation
          </span>
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {(['0', '90', '180', '270'] as const).map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => state.setCustomRotation(deg)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  state.customRotation === deg
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Pivoter le contenu de ${deg}°`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Largeur (20 - 150 mm)</span>
          <span className="text-white font-mono font-semibold">{state.customWidth} mm</span>
        </div>
        <input 
          type="range" 
          min={20} 
          max={150} 
          value={state.customWidth} 
          onChange={(e) => {
            state.setCustomWidth(Number(e.target.value));
            state.setActivePreset('preset-custom');
          }}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Hauteur (15 - 100 mm)</span>
          <span className="text-white font-mono font-semibold">{state.customHeight} mm</span>
        </div>
        <input 
          type="range" 
          min={15} 
          max={100} 
          value={state.customHeight} 
          onChange={(e) => {
            state.setCustomHeight(Number(e.target.value));
            state.setActivePreset('preset-custom');
          }}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Marges internes (Général : {state.customPadding} mm)</span>
          <button 
            type="button"
            onClick={() => state.setShowDetailedPadding(!state.showDetailedPadding)}
            className="text-[10px] text-indigo-400 font-bold hover:underline cursor-pointer"
          >
            {state.showDetailedPadding ? "Marge Simple" : "Régler Haut/Bas/Gauche/Droite ↓"}
          </button>
        </div>
        {!state.showDetailedPadding ? (
          <input 
            type="range" 
            min={0} 
            max={15} 
            value={state.customPadding} 
            onChange={(e) => handlePaddingBaseChange(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 mt-1">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block">En Haut (Top)</span>
              <div className="flex items-center gap-1">
                <input 
                  type="range" 
                  min={0} 
                  max={15} 
                  value={state.paddingTop} 
                  onChange={(e) => state.setPaddingTop(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[10px] text-white font-mono">{state.paddingTop}mm</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block">En Bas (Bottom)</span>
              <div className="flex items-center gap-1">
                <input 
                  type="range" 
                  min={0} 
                  max={15} 
                  value={state.paddingBottom} 
                  onChange={(e) => state.setPaddingBottom(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[10px] text-white font-mono">{state.paddingBottom}mm</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block">À Gauche (Left)</span>
              <div className="flex items-center gap-1">
                <input 
                  type="range" 
                  min={0} 
                  max={15} 
                  value={state.paddingLeft} 
                  onChange={(e) => state.setPaddingLeft(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[10px] text-white font-mono">{state.paddingLeft}mm</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block">À Droite (Right)</span>
              <div className="flex items-center gap-1">
                <input 
                  type="range" 
                  min={0} 
                  max={15} 
                  value={state.paddingRight} 
                  onChange={(e) => state.setPaddingRight(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[10px] text-white font-mono">{state.paddingRight}mm</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
