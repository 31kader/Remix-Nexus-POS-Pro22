import React from 'react';
import { Copy } from 'lucide-react';
import { Modal, Button } from '../ui';

export interface MarketingPosterShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  copyImageToClipboard: () => void;
  shareToSocial: (platform: string) => void;
}

export const MarketingPosterShareModal: React.FC<MarketingPosterShareModalProps> = ({
  isOpen,
  onClose,
  copyImageToClipboard,
  shareToSocial
}) => {
  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Partager le visuel"
    >
      <div className="space-y-5 text-center print:hidden p-2">
        <p className="text-xs text-slate-400 leading-relaxed">
          Sélectionnez une plateforme pour exporter ou copier l'affiche directement.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={copyImageToClipboard}
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold uppercase text-xs flex flex-col items-center gap-2 cursor-pointer"
          >
            <Copy size={18} />
            Copier (WhatsApp/Clip)
          </button>
          <button 
            onClick={() => shareToSocial('whatsapp')}
            className="p-3.5 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20 transition-all font-bold uppercase text-xs flex flex-col items-center gap-2 cursor-pointer"
          >
            <span className="text-lg">💬</span>
            WhatsApp
          </button>
          <button 
            onClick={() => shareToSocial('facebook')}
            className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all font-bold uppercase text-xs flex flex-col items-center gap-2 cursor-pointer"
          >
            <span className="text-lg">🔵</span>
            Facebook
          </button>
          <button 
            onClick={() => shareToSocial('twitter')}
            className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-all font-bold uppercase text-xs flex flex-col items-center gap-2 cursor-pointer"
          >
            <span className="text-lg">⚫</span>
            Twitter / X
          </button>
        </div>
        <Button onClick={onClose} className="w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl">
          Fermer
        </Button>
      </div>
    </Modal>
  );
};
