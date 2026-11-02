import React from 'react';
import { Scissors } from 'lucide-react';
import { EnhancementPreset } from '../../lib/image-enhancer';

interface ImageEnhancerAdjustmentsProps {
  preset: EnhancementPreset;
  scaleFactor: 1 | 2 | 4;
  setScaleFactor: (scale: 1 | 2 | 4) => void;
  unsharpAmount: number;
  setUnsharpAmount: (amount: number) => void;
  binaryThreshold: number;
  setBinaryThreshold: (threshold: number) => void;
  autoThreshold: boolean;
  setAutoThreshold: (auto: boolean) => void;
  invertMonochrome: boolean;
  setInvertMonochrome: (invert: boolean) => void;
  removeBackground: boolean;
  setRemoveBackground: (remove: boolean) => void;
  backgroundTolerance: number;
  setBackgroundTolerance: (tolerance: number) => void;
}

export const ImageEnhancerAdjustments: React.FC<ImageEnhancerAdjustmentsProps> = ({
  preset,
  scaleFactor,
  setScaleFactor,
  unsharpAmount,
  setUnsharpAmount,
  binaryThreshold,
  setBinaryThreshold,
  autoThreshold,
  setAutoThreshold,
  invertMonochrome,
  setInvertMonochrome,
  removeBackground,
  setRemoveBackground,
  backgroundTolerance,
  setBackgroundTolerance
}) => {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-800">
      {/* Scale factor for HD Photo */}
      {preset === 'hd-photo' && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-medium">
            <span>Facteur d'agrandissement</span>
            <span className="font-mono text-indigo-400 font-bold">{scaleFactor}x</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 4] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setScaleFactor(sc)}
                className={`py-1.5 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                  scaleFactor === sc 
                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {sc}x HD
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sharpness slider */}
      {preset === 'hd-photo' && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-medium">
            <span>Netteté Unsharp Mask</span>
            <span className="font-mono text-indigo-400 font-bold">{unsharpAmount.toFixed(1)}</span>
          </div>
          <input 
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={unsharpAmount}
            onChange={(e) => setUnsharpAmount(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      )}

      {/* Threshold slider for Thermal / Vector */}
      {(preset === 'thermal-escpos' || preset === 'vector-trace') && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-medium">
            <span>Seuil de contraste</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoThreshold(!autoThreshold)}
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase transition-colors cursor-pointer ${
                  autoThreshold ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Auto Otsu
              </button>
              {!autoThreshold && (
                <span className="font-mono text-indigo-400 font-bold">{binaryThreshold}</span>
              )}
            </div>
          </div>
          <input 
            type="range"
            min="10"
            max="245"
            step="1"
            disabled={autoThreshold}
            value={binaryThreshold}
            onChange={(e) => setBinaryThreshold(parseInt(e.target.value, 10))}
            className={`w-full accent-indigo-500 cursor-pointer ${autoThreshold ? 'opacity-40' : ''}`}
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-slate-300">
            <input 
              type="checkbox"
              checked={invertMonochrome}
              onChange={(e) => setInvertMonochrome(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
            />
            Inverser noir et blanc
          </label>
        </div>
      )}

      {/* Remove Background Option */}
      <div className="pt-2">
        <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300 mb-2">
          <span className="font-bold flex items-center gap-2">
            <Scissors size={14} className="text-amber-400" />
            Détourer fond blanc / clair
          </span>
          <input 
            type="checkbox"
            checked={removeBackground || preset === 'knockout-bg'}
            onChange={(e) => setRemoveBackground(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
          />
        </label>
        {(removeBackground || preset === 'knockout-bg') && (
          <div className="pl-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Tolérance de couleur</span>
              <span className="font-mono text-indigo-400 font-bold">{backgroundTolerance}%</span>
            </div>
            <input 
              type="range"
              min="5"
              max="60"
              step="1"
              value={backgroundTolerance}
              onChange={(e) => setBackgroundTolerance(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
};
