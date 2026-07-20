import React from 'react';
import { Modal, Button } from '../ui';
import { Package } from 'lucide-react';
import { formatProductStock } from '../../lib/utils';
import { Product } from '../../types';

interface PriceCheckerModalProps {
  priceCheckResult: Product | null;
  onClose: () => void;
  products: Product[];
  settings: any;
  addToCart: (product: Product) => void;
}

export function PriceCheckerModal({
  priceCheckResult,
  onClose,
  products,
  settings,
  addToCart
}: PriceCheckerModalProps) {
  if (!priceCheckResult) return null;

  return (
    <Modal 
      isOpen={!!priceCheckResult} 
      onClose={onClose} 
      title="Vérificateur de Prix"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-slate-900/60 rounded-[2rem] border border-slate-800/40 shadow-inner">
          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700/50 overflow-hidden shadow-2xl">
            {priceCheckResult.imageUrl ? (
              <img src={priceCheckResult.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Package className="text-slate-600" size={32} />
            )}
          </div>
          <div className="text-left">
            <h4 className="font-black text-white text-lg tracking-tight uppercase tracking-widest">{priceCheckResult.name}</h4>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">SKU: {priceCheckResult.sku}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 text-center shadow-neon-cyan animate-pulse-subtle">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Prix Final</p>
            <p className="text-3xl font-black text-emerald-400 tracking-tighter">{priceCheckResult.price.toFixed(2)} <span className="text-xs uppercase tracking-widest opacity-60">{settings.currency}</span></p>
          </div>
          <div className="p-6 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 text-center shadow-neon-indigo">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Stock Dispo</p>
            <p className="text-3xl font-black text-indigo-400 tracking-tighter">{formatProductStock(priceCheckResult, products)}</p>
          </div>
        </div>
        <div className="flex gap-4 pt-2">
          <Button onClick={() => { addToCart(priceCheckResult); onClose(); }} className="flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] bg-indigo-600 hover:bg-indigo-500 shadow-neon-cyan text-xs">AJOUTER AU PANIER</Button>
          <Button onClick={onClose} variant="secondary" className="flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs border-none bg-white/10 hover:bg-white/20 text-white">ANNULER</Button>
        </div>
      </div>
    </Modal>
  );
}
