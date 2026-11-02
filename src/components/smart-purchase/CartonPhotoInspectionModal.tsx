import React from 'react';
import { Camera, X } from 'lucide-react';

interface CartonPhotoInspectionModalProps {
  photoUrl: string | null;
  onClose: () => void;
}

export const CartonPhotoInspectionModal: React.FC<CartonPhotoInspectionModalProps> = ({
  photoUrl,
  onClose
}) => {
  if (!photoUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="relative max-w-lg w-full bg-industrial-900 border border-industrial-700 rounded-2xl overflow-hidden shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 bg-industrial-950 border-b border-industrial-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Camera size={14} /> Photo du Carton Réceptionné
          </span>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-industrial-400 hover:text-white p-1 rounded-lg hover:bg-industrial-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-2 bg-black flex items-center justify-center">
          <img src={photoUrl} alt="Carton" className="max-h-[70vh] w-auto object-contain rounded-lg" />
        </div>
      </div>
    </div>
  );
};
