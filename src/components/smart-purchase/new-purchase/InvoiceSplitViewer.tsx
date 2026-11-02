import React, { useState } from 'react';
import { Camera, ZoomIn, ZoomOut, RotateCw, Columns } from 'lucide-react';
import { SafeImage } from '../../ui';
import { cn } from '../../../lib/utils';

interface InvoiceSplitViewerProps {
  localPreviewUrl: string;
  showInlineScanViewer: boolean;
  viewerLayout: 'split' | 'top';
  setViewerLayout: (l: 'split' | 'top') => void;
}

export const InvoiceSplitViewer: React.FC<InvoiceSplitViewerProps> = ({
  localPreviewUrl,
  showInlineScanViewer,
  viewerLayout,
  setViewerLayout
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(150);
  const [rotation, setRotation] = useState<number>(0);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  if (!localPreviewUrl || !showInlineScanViewer) return null;

  return (
    <div className={cn(
      "bg-industrial-950/90 flex flex-col border-b border-industrial-800",
      viewerLayout === 'split' ? "xl:col-span-5 xl:border-b-0" : "w-full"
    )}>
      {/* Barre d'outils Zoom & Inspection sur place */}
      <div className="p-3 bg-industrial-900/90 border-b border-industrial-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
            <Camera size={13} /> Visionneuse Facture sur Place
          </span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-black">
            {zoomLevel}%
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setZoomLevel(z => Math.max(50, z - 25))}
            className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-white border border-industrial-700 cursor-pointer"
            title="Zoom Arrière (-25%)"
          >
            <ZoomOut size={14} />
          </button>
          {[100, 150, 200, 300].map(pct => (
            <button
              key={pct}
              type="button"
              onClick={() => setZoomLevel(pct)}
              className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-mono font-black border cursor-pointer transition-all",
                zoomLevel === pct
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-industrial-800 text-industrial-300 border-industrial-700 hover:text-white"
              )}
            >
              {pct}%
            </button>
          ))}
          <button
            type="button"
            onClick={() => setZoomLevel(z => Math.min(400, z + 25))}
            className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-white border border-industrial-700 cursor-pointer"
            title="Zoom Avant (+25%)"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-amber-400 border border-industrial-700 cursor-pointer"
            title="Pivoter l'image de 90°"
          >
            <RotateCw size={14} />
          </button>
          <button
            type="button"
            onClick={() => setHighContrast(!highContrast)}
            className={cn(
              "px-2 py-1 rounded-lg text-[9px] font-black uppercase border cursor-pointer transition-all",
              highContrast
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-industrial-800 text-industrial-400 border-industrial-700 hover:text-white"
            )}
            title="Accentuer la netteté des chiffres, points et virgules"
          >
            Netteté N&B
          </button>
          <button
            type="button"
            onClick={() => setViewerLayout(viewerLayout === 'split' ? 'top' : 'split')}
            className="px-2 py-1 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-indigo-300 border border-industrial-700 text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer"
            title="Basculer entre affichage Côte-à-Côte et Pleine Largeur"
          >
            <Columns size={12} />
            {viewerLayout === 'split' ? 'Pleine Largeur' : 'Côte-à-Côte'}
          </button>
        </div>
      </div>

      {/* Zone scrollable avec Zoom haute précision */}
      <div
        className="overflow-auto bg-black/90 p-3 relative select-none"
        style={{ maxHeight: viewerLayout === 'split' ? '640px' : '480px', minHeight: '340px' }}
        onWheel={(e) => {
          if (e.ctrlKey) {
            e.preventDefault();
            setZoomLevel(z => Math.min(400, Math.max(50, z + (e.deltaY < 0 ? 20 : -20))));
          }
        }}
      >
        <div className="inline-block min-w-full text-center">
          <SafeImage
            src={localPreviewUrl}
            alt="Bon d'achat scanné"
            style={{
              width: `${zoomLevel}%`,
              maxWidth: 'none',
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              filter: highContrast ? 'grayscale(100%) contrast(185%) brightness(108%)' : 'none',
              transition: 'width 0.15s ease-out, filter 0.15s ease'
            }}
            className="mx-auto rounded-lg shadow-2xl border border-industrial-800"
          />
        </div>
      </div>
      <div className="px-3 py-1.5 bg-industrial-900/60 border-t border-industrial-800 text-[10px] text-industrial-400 flex items-center justify-between">
        <span>💡 Astuce : Utilisez les boutons <strong>150% / 200% / 300%</strong> ou <strong>Ctrl + Molette</strong> pour zoomer sur les prix et virgules.</span>
        <span className="text-emerald-400 font-bold">🧠 Liaisons articles mémorisées auto.</span>
      </div>
    </div>
  );
};
