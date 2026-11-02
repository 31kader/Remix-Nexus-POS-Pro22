import React from 'react';
import { Printer, Download, Share2 } from 'lucide-react';
import { Button } from '../ui';
import { Product } from '../../types';
import { PosterFormat } from './marketingTypes';

interface PosterActionButtonsProps {
  selectedProduct: Product | null;
  isGenerating: boolean;
  posterFormat: PosterFormat;
  handlePrint: () => void;
  handleDownload: () => void;
  handleShare: () => void;
}

export const PosterActionButtons: React.FC<PosterActionButtonsProps> = ({
  selectedProduct,
  isGenerating,
  posterFormat,
  handlePrint,
  handleDownload,
  handleShare
}) => {
  return (
    <div className="space-y-2 pt-2 border-t border-slate-800">
      <Button 
        className="w-full py-3 text-sm font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white"
        disabled={!selectedProduct || isGenerating}
        onClick={handlePrint}
      >
        <Printer size={16} className="mr-2" /> Imprimer l'Affiche ({posterFormat.toUpperCase()})
      </Button>
      
      {selectedProduct && (
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleDownload}
            disabled={isGenerating}
            variant="secondary"
            className="py-2.5 text-xs font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 border border-slate-700 hover:bg-slate-700 rounded-xl"
          >
            <Download size={14} className="mr-1.5" /> Télécharger PNG
          </Button>
          <Button 
            onClick={handleShare}
            disabled={isGenerating}
            variant="secondary"
            className="py-2.5 text-xs font-bold uppercase tracking-wider bg-slate-800 text-indigo-400 border border-slate-700 hover:bg-slate-700 rounded-xl"
          >
            <Share2 size={14} className="mr-1.5" /> Partager
          </Button>
        </div>
      )}
    </div>
  );
};
