import React from 'react';
import { Sparkles } from 'lucide-react';

interface PosterVisualElementsControlsProps {
  showImage: boolean;
  setShowImage: (show: boolean) => void;
  showQrCode: boolean;
  setShowQrCode: (show: boolean) => void;
  qrContent: string;
  setQrContent: (c: string) => void;
  customBadge: string;
  setCustomBadge: (b: string) => void;
  customText: string;
  setCustomText: (t: string) => void;
  productImage: string;
  onOpenEnhancer: () => void;
}

export const PosterVisualElementsControls: React.FC<PosterVisualElementsControlsProps> = ({
  showImage,
  setShowImage,
  showQrCode,
  setShowQrCode,
  qrContent,
  setQrContent,
  customBadge,
  setCustomBadge,
  customText,
  setCustomText,
  productImage,
  onOpenEnhancer
}) => {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-800">
      <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
        5. Éléments Visuels
      </label>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
        <label className="flex items-center gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
          <input 
            type="checkbox" 
            checked={showImage} 
            onChange={(e) => setShowImage(e.target.checked)} 
            className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" 
          />
          <span>Photo Produit HD</span>
        </label>

        <label className="flex items-center gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
          <input 
            type="checkbox" 
            checked={showQrCode} 
            onChange={(e) => setShowQrCode(e.target.checked)} 
            className="w-3.5 h-3.5 text-indigo-600 bg-slate-900 border-slate-800 rounded" 
          />
          <span>QR Code Contact</span>
        </label>
      </div>

      {showImage && productImage && (
        <button
          type="button"
          onClick={onOpenEnhancer}
          className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600/20 to-violet-600/20 hover:from-indigo-600/30 hover:to-violet-600/30 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles size={14} className="text-indigo-400" />
          Dépixéliser l'image de l'affiche (HD)
        </button>
      )}

      {showQrCode && (
        <div className="space-y-1">
          <input 
            type="text"
            placeholder="Lien ou N° WhatsApp (ex: https://wa.me/213...)"
            value={qrContent}
            onChange={(e) => setQrContent(e.target.value)}
            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input 
          type="text"
          placeholder="Texte du badge (défaut : auto)"
          value={customBadge}
          onChange={(e) => setCustomBadge(e.target.value)}
          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
        />
        <input 
          type="text"
          placeholder="Texte promo (ex: Qualité garantie...)"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
        />
      </div>
    </div>
  );
};
