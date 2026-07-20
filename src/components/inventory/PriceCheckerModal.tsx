import React from 'react';
import { Package, ShoppingCart } from 'lucide-react';
import { Button, Modal } from '../ui';
import { Product, CompanySettings } from '../../types';

interface PriceCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  settings: CompanySettings;
  onEdit: (product: Product) => void;
}

export function PriceCheckerModal({
  isOpen,
  onClose,
  product,
  settings,
  onEdit
}: PriceCheckerModalProps) {
  if (!product) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Vérificateur de Prix"
      className="max-w-md"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-6 bg-white/5 rounded-3xl border border-white/10 shadow-2xl">
          <div className="w-20 h-20 bg-black/40 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden shadow-inner">
            {product.imageUrl ? (
              <img src={product.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={product.name} />
            ) : (
              <Package className="text-white/10" size={32} />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-white text-lg truncate uppercase tracking-widest leading-tight">{product.name}</h4>
            <p className="text-[10px] font-black font-mono text-indigo-400 mt-1 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block">SKU: {product.sku}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
               <ShoppingCart size={12} /> Vente
            </p>
            <p className="text-3xl font-black text-white tracking-tighter tabular-nums text-nowrap" style={{ fontSize: "clamp(1rem, 6vw, 1.875rem)" }}>
              {product.price.toFixed(2)} <span className="text-xs text-emerald-400 uppercase tracking-widest ml-1">{settings.currency}</span>
            </p>
          </div>
          <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
               <Package size={12} /> Stock
            </p>
            <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{product.stock} <span className="text-xs text-indigo-400 uppercase tracking-widest ml-1">{product.unit}</span></p>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button 
            onClick={() => {
              onEdit(product);
              onClose();
            }}
            className="flex-1 py-5 industrial-button-primary rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] active:scale-95"
          >
            Modifier
          </Button>
          <Button 
            onClick={onClose}
            variant="secondary"
            className="flex-1 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] active:scale-95"
          >
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
