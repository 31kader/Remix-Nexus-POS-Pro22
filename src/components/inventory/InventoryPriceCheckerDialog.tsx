import React from 'react';
import { Package } from 'lucide-react';
import { Modal, Button, SafeImage } from '../ui';
import { Product } from '../../types';

interface InventoryPriceCheckerDialogProps {
  priceCheckResult: Product | null;
  onClose: () => void;
  onEditProduct: (product: Product) => void;
  currency: string;
}

export const InventoryPriceCheckerDialog: React.FC<InventoryPriceCheckerDialogProps> = ({
  priceCheckResult,
  onClose,
  onEditProduct,
  currency,
}) => {
  if (!priceCheckResult) return null;

  return (
    <Modal 
      isOpen={!!priceCheckResult} 
      onClose={onClose} 
      title="Vérificateur de Prix"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden">
            {priceCheckResult.imageUrl ? (
              <SafeImage 
                src={priceCheckResult.imageUrl} 
                alt={priceCheckResult.name} 
                className="w-full h-full object-cover" 
                fallback={<Package className="text-slate-400 dark:text-slate-500" size={28} />}
              />
            ) : (
              <Package className="text-slate-400 dark:text-slate-500" size={28} />
            )}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">{priceCheckResult.name}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              SKU: {priceCheckResult.sku || 'N/A'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-center shadow-sm">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold block">Prix Final</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {Number(priceCheckResult.price || 0).toFixed(2)} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{currency}</span>
            </span>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-center shadow-sm">
            <span className="text-xs text-indigo-700 dark:text-indigo-400 font-bold block">Stock Disponible</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {(priceCheckResult as any).trackStock ?? true ? priceCheckResult.stock : '∞'}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => onEditProduct(priceCheckResult)} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Modifier
          </Button>
          <Button 
            onClick={onClose} 
            variant="secondary" 
            className="flex-1"
          >
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
