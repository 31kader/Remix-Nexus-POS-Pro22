import React from 'react';
import { Settings, AlignLeft, AlignCenter, AlignRight, Bold, Italic, QrCode, Type, Sliders } from 'lucide-react';
import { LabelPrinterState } from './types';
import { PRESETS } from './useLabelPrinter';

interface SettingsPanelProps {
  state: LabelPrinterState;
  handlePresetChange: (id: string) => void;
  handlePaddingBaseChange: (val: number) => void;
}

export function SettingsPanel({ state, handlePresetChange, handlePaddingBaseChange }: SettingsPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl h-[580px] overflow-y-auto custom-scrollbar space-y-5">
      <div>
        <h3 className="font-bold text-white text-sm uppercase mb-1 flex items-center gap-2">
          <Settings size={15} className="text-indigo-400" /> 2. Configurer le Layout (100% Libre)
        </h3>
        <p className="text-xs text-slate-400">Réglez l'étiquette au millimètre près en temps réel.</p>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Format Prédéfini</label>
        <select 
          value={state.activePreset} 
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
        >
          {PRESETS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
        <div className="flex justify-between">
          <span className="text-[11px] font-bold text-indigo-400 uppercase">Dimensions Étiquette</span>
          <span className="text-[10px] font-mono text-slate-400">{state.customWidth}mm × {state.customHeight}mm</span>
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
              className="text-[10px] text-indigo-400 font-bold hover:underline"
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

      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
        <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">Organisation de Mise en Page</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => state.setLayoutStructure('classic')}
            className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between h-[64px] ${state.layoutStructure === 'classic' ? 'border-indigo-500 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
          >
            <span className="text-[11px] font-bold block uppercase">Empilement</span>
            <span className="text-[9px] opacity-75">Centré classique</span>
          </button>
          <button
            type="button"
            onClick={() => state.setLayoutStructure('split')}
            className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between h-[64px] ${state.layoutStructure === 'split' ? 'border-indigo-500 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
          >
            <span className="text-[11px] font-bold block uppercase">Scindé (Split)</span>
            <span className="text-[9px] opacity-75">Infos à gauche, Code à droite</span>
          </button>
          <button
            type="button"
            onClick={() => state.setLayoutStructure('price-heavy')}
            className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between h-[64px] ${state.layoutStructure === 'price-heavy' ? 'border-indigo-500 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
          >
            <span className="text-[11px] font-bold block uppercase">Focus Prix</span>
            <span className="text-[9px] opacity-75">Prix XXL</span>
          </button>
          <button
            type="button"
            onClick={() => state.setLayoutStructure('barcode-centric')}
            className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between h-[64px] ${state.layoutStructure === 'barcode-centric' ? 'border-indigo-500 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
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
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${state.contentAlignment === 'left' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                À Gauche
              </button>
              <button 
                type="button"
                onClick={() => state.setContentAlignment('center')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${state.contentAlignment === 'center' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                Centré
              </button>
              <button 
                type="button"
                onClick={() => state.setContentAlignment('right')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${state.contentAlignment === 'right' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                À Droite
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Éléments de l'Étiquette</label>
        
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white font-semibold">Afficher le Nom du produit</span>
            <input 
              type="checkbox" 
              checked={state.showName} 
              onChange={(e) => state.setShowName(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900"
            />
          </div>
          {state.showName && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800 pt-1">
              <span className="text-[10px] text-slate-400 whitespace-nowrap">Taille police :</span>
              <input 
                type="range" 
                min={6} 
                max={24} 
                value={state.nameFontSize} 
                onChange={(e) => state.setNameFontSize(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[10px] text-white font-mono w-6 text-right">{state.nameFontSize}px</span>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white font-semibold flex items-center gap-1.5">Afficher le Prix</span>
            <input 
              type="checkbox" 
              checked={state.showPrice} 
              onChange={(e) => state.setShowPrice(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900"
            />
          </div>
          {state.showPrice && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800 pt-1">
              <span className="text-[10px] text-slate-400 whitespace-nowrap">Taille Prix :</span>
              <input 
                type="range" 
                min={8} 
                max={36} 
                value={state.priceFontSize} 
                onChange={(e) => state.setPriceFontSize(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[10px] text-white font-mono w-6 text-right">{state.priceFontSize}px</span>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white font-semibold">Afficher le Code-barres</span>
            <input 
              type="checkbox" 
              disabled={state.showQr}
              checked={state.showBarcode} 
              onChange={(e) => {
                state.setShowBarcode(e.target.checked);
                if (e.target.checked) state.setShowQr(false);
              }}
              className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900 disabled:opacity-30"
            />
          </div>
          {state.showBarcode && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800 pt-1">
              <span className="text-[10px] text-slate-400 whitespace-nowrap">Hauteur :</span>
              <input 
                type="range" 
                min={10} 
                max={60} 
                value={state.barcodeHeight} 
                onChange={(e) => state.setBarcodeHeight(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[10px] text-white font-mono w-6 text-right">{state.barcodeHeight}px</span>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-white font-semibold flex items-center gap-1.5">
            <QrCode size={13} className="text-slate-400" /> Afficher l'emplacement QR Code (SKU)
          </span>
          <input 
            type="checkbox" 
            disabled={state.showBarcode}
            checked={state.showQr} 
            onChange={(e) => {
              state.setShowQr(e.target.checked);
              if (e.target.checked) state.setShowBarcode(false);
            }}
            className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900 disabled:opacity-30"
          />
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-white font-semibold">Afficher l'Image / Photo du produit</span>
          <input 
            type="checkbox" 
            checked={state.showImage} 
            onChange={(e) => state.setShowImage(e.target.checked)}
            className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900"
          />
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-white font-semibold">Tracer une bordure de délimitation</span>
          <input 
            type="checkbox" 
            checked={state.showBorder} 
            onChange={(e) => state.setShowBorder(e.target.checked)}
            className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900"
          />
        </div>
      </div>

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
                <button onClick={() => state.setCustomTextAlign('left')} className={`flex-1 flex justify-center items-center ${state.customTextAlign === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><AlignLeft size={11}/></button>
                <button onClick={() => state.setCustomTextAlign('center')} className={`flex-1 flex border-l border-slate-800 justify-center items-center ${state.customTextAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><AlignCenter size={11}/></button>
                <button onClick={() => state.setCustomTextAlign('right')} className={`flex-1 flex border-l border-slate-800 justify-center items-center ${state.customTextAlign === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><AlignRight size={11}/></button>
              </div>
            </div>
            <div className="space-y-1 col-span-full">
              <span className="text-[10px] text-slate-400 block">Style</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => state.setCustomTextBold(!state.customTextBold)}
                  className={`flex items-center justify-center gap-1.5 py-1 px-3 text-[10px] rounded-lg border flex-1 ${state.customTextBold ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  <Bold size={11}/> Gras
                </button>
                <button 
                  onClick={() => state.setCustomTextItalic(!state.customTextItalic)}
                  className={`flex items-center justify-center gap-1.5 py-1 px-3 text-[10px] rounded-lg border flex-1 ${state.customTextItalic ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
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
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${state.nameLineClamp === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  1 ligne
                </button>
                <button
                  type="button"
                  onClick={() => state.setNameLineClamp(2)}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${state.nameLineClamp === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  2 lignes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
