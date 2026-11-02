import React, { useRef } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { EnhancementResult } from '../../lib/image-enhancer';

interface ImageEnhancerVisualizerProps {
  imageUrl: string;
  result: EnhancementResult | null;
  isProcessing: boolean;
  sliderPos: number;
  onSliderChange: (pos: number) => void;
}

export const ImageEnhancerVisualizer: React.FC<ImageEnhancerVisualizerProps> = ({
  imageUrl,
  result,
  isProcessing,
  sliderPos,
  onSliderChange
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const handlePointerDown = () => {
    isDraggingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = Math.round((x / rect.width) * 100);
    onSliderChange(percent);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div 
      className="lg:col-span-8 p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950/40 relative"
      onPointerUp={handlePointerUp}
    >
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative w-full aspect-square sm:aspect-[4/3] max-h-[440px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 cursor-ew-resize group shadow-inner"
      >
        {/* Background Checkerboard for Transparency */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(circle, #475569 1px, transparent 1px)`,
            backgroundSize: '12px 12px'
          }}
        />

        {/* Enhanced Image (Right Layer / Full) */}
        {result?.previewUrl && (
          <img 
            src={result.previewUrl} 
            alt="Améliorée"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Original Image (Left Layer / Clipped by sliderPos) */}
        <div 
          className="absolute inset-0 overflow-hidden pointer-events-none border-r border-indigo-500/80 shadow-2xl"
          style={{ width: `${sliderPos}%` }}
        >
          <img 
            src={imageUrl} 
            alt="Originale"
            className="absolute inset-0 w-full h-full object-contain max-w-none"
            style={{ width: containerRef.current?.clientWidth || '100%' }}
          />
          {/* Badge Avant */}
          <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-slate-300 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md border border-white/10">
            AVANT (Brut)
          </span>
        </div>

        {/* Badge Après */}
        <span className="absolute top-3 right-3 bg-indigo-600/90 backdrop-blur-sm text-white text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md shadow border border-indigo-400/30 pointer-events-none">
          APRÈS (Dépixélisé)
        </span>

        {/* Vertical Divider Line with Grab Handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 via-white to-violet-500 shadow-[0_0_12px_rgba(99,102,241,0.8)] pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-indigo-400 shadow-xl flex items-center justify-center text-indigo-300 text-xs">
            ↔
          </div>
        </div>

        {/* Loading Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
            <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-700 shadow-xl text-indigo-400 text-xs font-bold">
              <RefreshCw size={16} className="animate-spin" />
              Traitement Canvas HD...
            </div>
          </div>
        )}
      </div>

      {/* Resolution Metrics Bar */}
      {result && (
        <div className="flex items-center justify-between w-full mt-3 px-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Source:</span>
            <span>{result.originalWidth} × {result.originalHeight} px</span>
            <ArrowRight size={12} className="text-indigo-400" />
            <span className="text-indigo-300 font-bold">{result.enhancedWidth} × {result.enhancedHeight} px</span>
          </div>
          <span className="text-emerald-400 font-medium">⚡ {result.executionTimeMs} ms (100% Hors-Ligne)</span>
        </div>
      )}
    </div>
  );
};
