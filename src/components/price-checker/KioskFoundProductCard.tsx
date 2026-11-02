import React from 'react';
import { motion } from 'motion/react';
import { Package, Tag } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { SafeImage } from '../ui/SafeImage';

interface KioskFoundProductCardProps {
  foundProduct: Product;
  settings: CompanySettings;
  resetCountdown: number;
  handleAddToRemoteQueue: (p: Product, qty: number, silent?: boolean) => void;
}

export const KioskFoundProductCard: React.FC<KioskFoundProductCardProps> = ({
  foundProduct,
  settings,
  resetCountdown,
  handleAddToRemoteQueue
}) => {
  return (
    <motion.div
      key={foundProduct.id}
      initial={{ opacity: 0, scale: 0.92, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-4xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border-2 border-emerald-500/60 rounded-3xl p-6 md:p-10 shadow-[0_0_80px_rgba(16,185,129,0.25)] backdrop-blur-xl z-10 relative flex flex-col md:flex-row items-center gap-8"
    >
      <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
        <SafeImage 
          src={foundProduct.imageUrl} 
          alt={foundProduct.name} 
          className="w-full h-full object-contain drop-shadow-xl" 
          fallback={<Package size={80} className="text-emerald-400/60" />} 
        />
      </div>

      <div className="flex-1 w-full text-center md:text-left space-y-4">
        <div>
          <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-widest mb-2">
            ✅ Article Vérifié • En Rayon
          </span>
          <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight leading-snug">
            {foundProduct.name}
          </h3>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Code: {foundProduct.barcode || foundProduct.sku || 'N/A'}
          </p>
        </div>

        <div className="py-4 px-6 md:px-8 bg-emerald-500/10 border-2 border-emerald-500/50 rounded-2xl flex items-baseline justify-center md:justify-start gap-3 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
          <span className="text-6xl md:text-8xl font-black text-emerald-400 font-mono tracking-tight">
            {Number(foundProduct.price || 0).toFixed(2)}
          </span>
          <span className="text-3xl md:text-4xl font-black text-emerald-300 uppercase">
            {settings?.currency || 'DA'}
          </span>
        </div>

        <div className="pt-2">
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-400 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(resetCountdown / 5) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium flex items-center justify-between">
            <span>Prochain article à tout moment...</span>
            <span className="text-emerald-400 font-mono font-bold">Retour accueil dans {resetCountdown}s</span>
          </p>
        </div>
      </div>

      <div className="absolute top-4 right-4 md:bottom-4 md:right-4 md:top-auto z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleAddToRemoteQueue(foundProduct, 1, true);
          }}
          className="opacity-30 hover:opacity-100 transition-opacity duration-300 px-3 py-2 bg-slate-900/90 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-400 text-slate-400 hover:text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
          title="Réservé Personnel : Ajouter à la file d'étiquettes à imprimer sur le poste principal"
        >
          <Tag size={13} className="text-indigo-400" />
          <span>+1 File Étiquette</span>
        </button>
      </div>
    </motion.div>
  );
};
