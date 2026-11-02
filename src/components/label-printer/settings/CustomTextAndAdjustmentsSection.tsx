import React from 'react';
import { Type, Sliders, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import { LabelPrinterState } from '../types';

interface CustomTextAndAdjustmentsSectionProps {
  state: LabelPrinterState;
}

export function CustomTextAndAdjustmentsSection({ state }: CustomTextAndAdjustmentsSectionProps) {
  return (
    <>
      <div className="p-3.5 bg-slate-950 rounded-xl border border-indigo-500/10 space-y-3">
        <div className="flex items-center gap-2">
          <Type size={15} className="text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase">Insérer un Texte Personnalisé</span>
        </div>
        <p className="text-[11px] text-slate-400">Saisissez un sous-titre libre ou label marketing à intégrer sur l'étiquette.</p>
        
        <input 
          type="text"
          placeholder="Ex : Exclusivité Rayon, Garantie 2 ans, Promo..."
          value={state.customText}
          onChange={(e) => state.setCustomText(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
        />

        {state.customText && (
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-900">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block">Taille Police</span>
              <div className="flex items-center gap-1.5">
                <input 
                  type="range" 
                  min={6} max={20} 
                  value={state.customTextSize} 
                  onChange={(e) => state.setCustomTextSize(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[10px] text-white font-mono w-5">{state.customTextSize}px</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block">Alignement</span>
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg overflow-hidden h-[22px]">
                <button type="button" onClick={() => state.setCustomTextAlign('left')} className={`flex-1 flex justify-center items-center cursor-pointer ${state.customTextAlign === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><AlignLeft size={11}/></button>
                <button type="button" onClick={() => state.setCustomTextAlign('center')} className={`flex-1 flex border-l border-slate-800 justify-center items-center cursor-pointer ${state.customTextAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><AlignCenter size={11}/></button>
                <button type="button" onClick={() => state.setCustomTextAlign('right')} className={`flex-1 flex border-l border-slate-800 justify-center items-center cursor-pointer ${state.customTextAlign === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><AlignRight size={11}/></button>
              </div>
            </div>
            <div className="space-y-1 col-span-full">
              <span className="text-[10px] text-slate-400 block">Style</span>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => state.setCustomTextBold(!state.customTextBold)}
                  className={`flex items-center justify-center gap-1.5 py-1 px-3 text-[10px] rounded-lg border flex-1 cursor-pointer ${state.customTextBold ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  <Bold size={11}/> Gras
                </button>
                <button 
                  type="button"
                  onClick={() => state.setCustomTextItalic(!state.customTextItalic)}
                  className={`flex items-center justify-center gap-1.5 py-1 px-3 text-[10px] rounded-lg border flex-1 cursor-pointer ${state.customTextItalic ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  <Italic size={11}/> Italique
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 bg-slate-950 rounded-xl border border-indigo-500/10 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders size={15} className="text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase">Ajustements Fins (Anti-Débordement)</span>
        </div>
        <p className="text-[11px] text-slate-400">Optimisez l'espace pour empêcher le texte de déborder de l'étiquette.</p>
        
        <div className="space-y-3 pt-1">
          {/* Barcode Width Slider */}
          {state.showBarcode && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Épaisseur barres (Code-barres)</span>
                <span className="text-white font-mono font-semibold">{state.barcodeWidth}x</span>
              </div>
              <input 
                type="range" 
                min={0.8} 
                max={2.5} 
                step={0.1}
                value={state.barcodeWidth} 
                onChange={(e) => state.setBarcodeWidth(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}

          {/* Vertical Element Spacing (Gap) */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Espacement vertical (Gap)</span>
              <span className="text-white font-mono font-semibold">{state.customGap} px</span>
            </div>
            <input 
              type="range" 
              min={0} 
              max={12} 
              step={1}
              value={state.customGap} 
              onChange={(e) => state.setCustomGap(Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Letter Spacing Slider */}
          {state.showName && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Espacement des lettres (Titre)</span>
                <span className="text-white font-mono font-semibold">{state.customLetterSpacing} px</span>
              </div>
              <input 
                type="range" 
                min={-1} 
                max={2} 
                step={0.5}
                value={state.customLetterSpacing} 
                onChange={(e) => state.setCustomLetterSpacing(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}

          {/* Name Line Clamp Toggle */}
          {state.showName && (
            <div className="flex items-center justify-between text-[10px] bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Limite lignes (Nom produit)</span>
              <div className="flex bg-slate-950 rounded-md p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => state.setNameLineClamp(1)}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${state.nameLineClamp === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  1 ligne
                </button>
                <button
                  type="button"
                  onClick={() => state.setNameLineClamp(2)}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${state.nameLineClamp === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  2 lignes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
