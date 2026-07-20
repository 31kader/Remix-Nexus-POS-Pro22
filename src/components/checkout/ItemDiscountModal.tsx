import React from 'react';
import { Modal, Button, SafeImage } from '../ui';
import { Package } from 'lucide-react';
import { CartItem } from '../../types';
import { cn } from '../../lib/utils';

interface ItemDiscountModalProps {
  discountingItemId: string | null;
  onClose: () => void;
  cart: CartItem[];
  settings: any;
  lineDiscountType: 'percentage' | 'fixed';
  setLineDiscountType: (type: 'percentage' | 'fixed') => void;
  lineDiscountValue: string;
  setLineDiscountValue: (val: string) => void;
  setLineDiscount: (cartItemId: string, discount: { type: 'percentage' | 'fixed'; value: number } | null) => void;
}

export function ItemDiscountModal({
  discountingItemId,
  onClose,
  cart,
  settings,
  lineDiscountType,
  setLineDiscountType,
  lineDiscountValue,
  setLineDiscountValue,
  setLineDiscount
}: ItemDiscountModalProps) {
  if (!discountingItemId) return null;
  const item = cart.find(i => i.cartItemId === discountingItemId);
  if (!item) return null;

  return (
    <Modal
      isOpen={!!discountingItemId}
      onClose={onClose}
      title="Remise sur l'article"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-slate-900/60 rounded-[2rem] border border-slate-800/40 shadow-inner">
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700/50 overflow-hidden shadow-2xl">
            <SafeImage 
              src={item.imageUrl} 
              className="w-full h-full object-cover" 
              fallback={<Package size={20} className="text-slate-600" />}
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-white uppercase tracking-tight">{item.name}</p>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Prix unitaire: {item.price.toFixed(2)} {settings.currency}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLineDiscountType('percentage')}
            className={cn(
              "py-4 px-4 rounded-[1.5rem] border transition-all font-black text-[10px] uppercase tracking-[0.2em]",
              lineDiscountType === 'percentage' ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-400 shadow-neon-indigo" : "border-slate-800/40 bg-slate-900/40 text-slate-500"
            )}
          >
            Pourcentage (%)
          </button>
          <button
            onClick={() => setLineDiscountType('fixed')}
            className={cn(
              "py-4 px-4 rounded-[1.5rem] border transition-all font-black text-[10px] uppercase tracking-[0.2em]",
              lineDiscountType === 'fixed' ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-400 shadow-neon-indigo" : "border-slate-800/40 bg-slate-900/40 text-slate-500"
            )}
          >
            Montant fixe ({settings.currency})
          </button>
        </div>

        <div className="space-y-2 text-left">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Valeur de la remise</label>
          <div className="relative group">
            <input
              type="number"
              autoFocus
              value={lineDiscountValue}
              onChange={(e) => setLineDiscountValue(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800/50 rounded-[2rem] py-5 px-8 text-2xl font-black text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all outline-none text-center shadow-inner"
            />
            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">
              {lineDiscountType === 'percentage' ? '%' : settings.currency}
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            className="flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-widest border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[10px]"
            onClick={() => {
              setLineDiscount(item.cartItemId, null);
              onClose();
            }}
          >
            Supprimer
          </Button>
          <Button
            className="flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-widest bg-indigo-600 shadow-neon-indigo text-[10px]"
            onClick={() => {
              const val = parseFloat(lineDiscountValue);
              if (!isNaN(val) && val > 0) {
                setLineDiscount(item.cartItemId, { type: lineDiscountType, value: val });
              } else {
                setLineDiscount(item.cartItemId, null);
              }
              onClose();
            }}
          >
            Appliquer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
