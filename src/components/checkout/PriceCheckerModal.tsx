import React from 'react';
import { Modal, Button, SafeImage } from '../ui';
import { Package, Printer } from 'lucide-react';
import { formatProductStock } from '../../lib/utils';
import { Product } from '../../types';
import { addProductToRemoteLabelQueue } from '../../services/remoteLabelQueueService';
import { toast } from 'sonner';

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
        <div className="flex items-center gap-4 p-4 bg-slate-900/60 rounded-xl border border-slate-800/40 shadow-inner">
          <div className="w-20 h-20 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700/50 overflow-hidden shadow-md">
            {priceCheckResult.imageUrl ? (
              <SafeImage 
                src={priceCheckResult.imageUrl} 
                alt={priceCheckResult.name} 
                className="w-full h-full object-cover" 
                fallback={<Package className="text-slate-600" size={32} />}
              />
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
          <div className="p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center shadow-xs animate-pulse-subtle">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Prix Final</p>
            <p className="text-3xl font-black text-emerald-400 tracking-tighter">{Number(priceCheckResult?.price || 0).toFixed(2)} <span className="text-xs uppercase tracking-widest opacity-60">{settings?.currency || 'DA'}</span></p>
          </div>
          <div className="p-6 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-center shadow-xs">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Stock Dispo</p>
            <p className="text-3xl font-black text-indigo-400 tracking-tighter">{formatProductStock(priceCheckResult, products)}</p>
          </div>
        </div>
        <Button
          onClick={async () => {
            await addProductToRemoteLabelQueue(priceCheckResult, 1, 'Vérificateur Caisse');
            toast.success(`"${priceCheckResult.name}" envoyé à la file d'étiquettes (Autre Poste) !`);
          }}
          className="w-full py-4 rounded-xl font-black uppercase bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center justify-center gap-2"
        >
          <Printer size={15} />
          Enregistrer pour Impression Étiquette (Autre Poste)
        </Button>
        <div className="flex gap-4 pt-1">
          <Button onClick={() => { addToCart(priceCheckResult); onClose(); }} className="flex-1 py-5 rounded-xl font-black uppercase tracking-normal bg-indigo-600 hover:bg-indigo-500 shadow-xs text-xs">AJOUTER AU PANIER</Button>
          <Button onClick={onClose} variant="secondary" className="flex-1 py-5 rounded-xl font-black uppercase tracking-normal text-xs border-none bg-white/10 hover:bg-white/20 text-white">ANNULER</Button>
        </div>
      </div>
    </Modal>
  );
}
