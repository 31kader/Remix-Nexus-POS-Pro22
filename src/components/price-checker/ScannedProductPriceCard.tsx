import React from 'react';
import { Package, Printer } from 'lucide-react';
import { Product, CompanySettings } from '../../types';
import { SafeImage } from '../ui/SafeImage';

interface ScannedProductPriceCardProps {
  foundProduct: Product;
  settings: CompanySettings;
  labelQty: number;
  handleAddToRemoteQueue: (prod: Product, qty?: number, isDiscreet?: boolean) => Promise<void>;
}

export const ScannedProductPriceCard: React.FC<ScannedProductPriceCardProps> = ({
  foundProduct,
  settings,
  labelQty,
  handleAddToRemoteQueue
}) => {
  return (
    <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-2 border-emerald-500/60 rounded-2xl shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-150">
      <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
        <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-2 shrink-0 overflow-hidden">
          <SafeImage src={foundProduct.imageUrl} alt={foundProduct.name} className="w-full h-full object-contain" fallback={<Package size={40} className="text-emerald-400" />} />
        </div>
        <div className="min-w-0 text-left">
          <span className="inline-block px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-black uppercase tracking-widest mb-1">
            ✅ Article Scanné • Stock: {foundProduct.stock} {foundProduct.unit || 'u.'}
          </span>
          <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight truncate">
            {foundProduct.name}
          </h3>
          <p className="text-xs font-mono text-indigo-300 mt-0.5">
            Code-barres: {foundProduct.barcode || 'N/A'} • SKU: {foundProduct.sku || 'N/A'}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end justify-center bg-emerald-500/15 border border-emerald-400/40 px-6 py-3 rounded-2xl shrink-0 w-full md:w-auto text-right">
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">PRIX DE VENTE TTC</span>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl md:text-6xl font-black text-emerald-400 tracking-tighter font-mono">
            {Number(foundProduct.price || 0).toFixed(2)}
          </span>
          <span className="text-2xl font-black text-emerald-300 uppercase">{settings?.currency || 'DA'}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              handleAddToRemoteQueue(foundProduct, labelQty, false);
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={12} /> + Ajouter Étiquette (x{labelQty})
          </button>
        </div>
      </div>
    </div>
  );
};
