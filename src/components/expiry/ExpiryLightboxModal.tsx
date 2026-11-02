import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SafeImage } from '../ui';

interface ExpiryLightboxModalProps {
  previewImage: { url: string; title: string; sku?: string } | null;
  onClose: () => void;
}

export function ExpiryLightboxModal({
  previewImage,
  onClose
}: ExpiryLightboxModalProps) {
  return (
    <AnimatePresence>
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 border border-white/15 rounded-xl overflow-hidden shadow-md shadow-black p-6 flex flex-col items-center"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shadow-lg cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="w-full max-h-[65vh] flex items-center justify-center rounded-xl overflow-hidden bg-black/50 p-2 border border-white/5">
              <SafeImage 
                src={previewImage.url} 
                alt={previewImage.title}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md" 
              />
            </div>

            <div className="w-full mt-4 text-center">
              <h3 className="text-lg font-extrabold text-white uppercase tracking-tight">{previewImage.title}</h3>
              {previewImage.sku && (
                <p className="text-xs font-mono font-bold text-indigo-400 mt-1 uppercase tracking-widest">
                  SKU / Réf : {previewImage.sku}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
