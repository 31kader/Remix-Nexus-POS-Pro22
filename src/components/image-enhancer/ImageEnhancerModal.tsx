import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { 
  EnhancementPreset, 
  EnhancementOptions, 
  EnhancementResult, 
  enhanceImagePipeline 
} from '../../lib/image-enhancer';
import { toast } from 'sonner';
import { ImageEnhancerVisualizer } from './ImageEnhancerVisualizer';
import { ImageEnhancerPresets } from './ImageEnhancerPresets';
import { ImageEnhancerAdjustments } from './ImageEnhancerAdjustments';
import { ImageEnhancerActions } from './ImageEnhancerActions';

interface ImageEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onApply: (result: EnhancementResult) => void;
  title?: string;
  defaultPreset?: EnhancementPreset;
}

export function ImageEnhancerModal({
  isOpen,
  onClose,
  imageUrl,
  onApply,
  title = "Studio de Dépixélisation & Vectorisation HD",
  defaultPreset = 'hd-photo'
}: ImageEnhancerModalProps) {
  const [preset, setPreset] = useState<EnhancementPreset>(defaultPreset);
  const [scaleFactor, setScaleFactor] = useState<1 | 2 | 4>(2);
  const [unsharpAmount, setUnsharpAmount] = useState<number>(1.6);
  const [binaryThreshold, setBinaryThreshold] = useState<number>(128);
  const [autoThreshold, setAutoThreshold] = useState<boolean>(true);
  const [invertMonochrome, setInvertMonochrome] = useState<boolean>(false);
  const [removeBackground, setRemoveBackground] = useState<boolean>(false);
  const [backgroundTolerance, setBackgroundTolerance] = useState<number>(25);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50);

  // Run pipeline when settings change
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    let isMounted = true;
    setIsProcessing(true);

    const options: EnhancementOptions = {
      preset,
      scaleFactor,
      unsharpAmount,
      binaryThreshold: autoThreshold ? 'auto' : binaryThreshold,
      invertMonochrome,
      removeBackground: removeBackground || preset === 'knockout-bg',
      backgroundTolerance
    };

    const timer = setTimeout(() => {
      enhanceImagePipeline(imageUrl, options)
        .then((res) => {
          if (isMounted) {
            setResult(res);
            setIsProcessing(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setIsProcessing(false);
            toast.error(err.message || 'Erreur d\'amélioration');
          }
        });
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    isOpen, imageUrl, preset, scaleFactor, unsharpAmount, 
    binaryThreshold, autoThreshold, invertMonochrome, 
    removeBackground, backgroundTolerance
  ]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[94vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-950/70 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">{title}</h3>
                <p className="text-xs text-slate-400">Restauration nette, vectorisation et préparation d'impression</p>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
            {/* Visualizer Area (Before / After Split-Screen) */}
            <ImageEnhancerVisualizer
              imageUrl={imageUrl}
              result={result}
              isProcessing={isProcessing}
              sliderPos={sliderPos}
              onSliderChange={setSliderPos}
            />

            {/* Sidebar Controls */}
            <div className="lg:col-span-4 p-5 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col gap-5 overflow-y-auto">
              <ImageEnhancerPresets
                preset={preset}
                onSelectPreset={setPreset}
                onScaleChange={setScaleFactor}
                onRemoveBackgroundChange={setRemoveBackground}
              />

              <ImageEnhancerAdjustments
                preset={preset}
                scaleFactor={scaleFactor}
                setScaleFactor={setScaleFactor}
                unsharpAmount={unsharpAmount}
                setUnsharpAmount={setUnsharpAmount}
                binaryThreshold={binaryThreshold}
                setBinaryThreshold={setBinaryThreshold}
                autoThreshold={autoThreshold}
                setAutoThreshold={setAutoThreshold}
                invertMonochrome={invertMonochrome}
                setInvertMonochrome={setInvertMonochrome}
                removeBackground={removeBackground}
                setRemoveBackground={setRemoveBackground}
                backgroundTolerance={backgroundTolerance}
                setBackgroundTolerance={setBackgroundTolerance}
              />

              <ImageEnhancerActions
                result={result}
                isProcessing={isProcessing}
                onApply={onApply}
                onClose={onClose}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
