import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { SafeImage } from '../ui';

interface ImageZoomModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ImageZoomModal({ imageUrl, onClose }: ImageZoomModalProps) {
  return (
    <AnimatePresence>
      {imageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-4xl max-h-full"
          >
            <div onClick={(e) => e.stopPropagation()}>
              <SafeImage 
                src={imageUrl} 
                alt="Aperçu agrandi"
                className="max-w-full max-h-[90vh] rounded-xl shadow-md object-contain" 
              />
            </div>
            <button 
              type="button"
              onClick={onClose}
              aria-label="Fermer l'aperçu"
              className="absolute -top-12 right-0 p-2 text-white hover:text-slate-300 transition-colors"
            >
              <X size={32} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
