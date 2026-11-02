import React from 'react';
import { Check, Download } from 'lucide-react';
import { EnhancementResult } from '../../lib/image-enhancer';
import { toast } from 'sonner';

interface ImageEnhancerActionsProps {
  result: EnhancementResult | null;
  isProcessing: boolean;
  onApply: (result: EnhancementResult) => void;
  onClose: () => void;
}

export const ImageEnhancerActions: React.FC<ImageEnhancerActionsProps> = ({
  result,
  isProcessing,
  onApply,
  onClose
}) => {
  const handleApply = () => {
    if (result) {
      onApply(result);
      toast.success("Image HD appliquée avec succès !");
      onClose();
    }
  };

  const handleDownloadSvg = () => {
    if (!result?.svgString) return;
    const blob = new Blob([result.svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector-trace-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fichier SVG téléchargé !");
  };

  return (
    <div className="mt-auto pt-4 border-t border-slate-800 flex flex-col gap-2">
      <button
        type="button"
        disabled={!result || isProcessing}
        onClick={handleApply}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-98 cursor-pointer"
      >
        <Check size={16} />
        Appliquer l'amélioration
      </button>

      {result?.svgString && (
        <button
          type="button"
          onClick={handleDownloadSvg}
          className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Download size={14} />
          Télécharger en SVG pur
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full py-2 px-3 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
      >
        Annuler
      </button>
    </div>
  );
};
