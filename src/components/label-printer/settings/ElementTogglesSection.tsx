import React from 'react';
import { QrCode } from 'lucide-react';
import { LabelPrinterState } from '../types';

interface ElementTogglesSectionProps {
  state: LabelPrinterState;
}

export function ElementTogglesSection({ state }: ElementTogglesSectionProps) {
  return (
    <div className="space-y-3">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Éléments de l'Étiquette</label>
      
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white font-semibold">Afficher le Nom du produit</span>
          <input 
            type="checkbox" 
            checked={state.showName} 
            onChange={(e) => state.setShowName(e.target.checked)}
            className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900 cursor-pointer"
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
            className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900 cursor-pointer"
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
            className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900 disabled:opacity-30 cursor-pointer"
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
          className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900 disabled:opacity-30 cursor-pointer"
        />
      </div>

      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
        <span className="text-xs text-white font-semibold">Afficher l'Image / Photo du produit</span>
        <input 
          type="checkbox" 
          checked={state.showImage} 
          onChange={(e) => state.setShowImage(e.target.checked)}
          className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900 cursor-pointer"
        />
      </div>

      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
        <span className="text-xs text-white font-semibold">Tracer une bordure de délimitation</span>
        <input 
          type="checkbox" 
          checked={state.showBorder} 
          onChange={(e) => state.setShowBorder(e.target.checked)}
          className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:bg-indigo-600 focus:ring-offset-slate-900 cursor-pointer"
        />
      </div>
    </div>
  );
}
