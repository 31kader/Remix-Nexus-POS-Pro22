import React from 'react';
import { RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Product, CompanySettings } from '../../../types';
import { getRecordItems, isMatchingProductItem } from './productHistoryHelpers';

export interface ProductReturnsHistoryTabProps {
  product: Product;
  productReturns: any[];
  settings: CompanySettings;
}

export const ProductReturnsHistoryTab: React.FC<ProductReturnsHistoryTabProps> = ({
  product,
  productReturns,
  settings
}) => {
  return (
    <div className="space-y-3">
      {productReturns.length > 0 ? (
        productReturns
          .sort((a, b) => new Date(b.timestamp || b.date || 0).getTime() - new Date(a.timestamp || a.date || 0).getTime())
          .map((r) => {
            const items = getRecordItems(r);
            const item = items.find(i => isMatchingProductItem(i, product));
            const itemPrice = item?.price || 0;
            const itemQty = item?.quantity || 0;
            const returnDate = r.timestamp || r.date || new Date().toISOString();
            return (
              <div key={r.id} className="p-4 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-rose-500/40 transition-all shadow-xs">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <p className="font-black text-slate-900 dark:text-white uppercase text-xs">Retour #{String(r.id || "").slice(-8).toUpperCase()}</p>
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase rounded border border-rose-500/20">Retourné</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{format(new Date(returnDate), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                    {r.reason && <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase mt-1">Motif : {r.reason}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">-{itemQty} <span className="text-[10px] text-slate-400 uppercase">{product.unit}</span></p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">P.U : {itemPrice.toFixed(2)} {settings.currency}</p>
                  <p className="text-xs font-black text-rose-600 dark:text-rose-400 mt-1 px-2.5 py-0.5 bg-rose-500/10 rounded-lg inline-block">Remboursé : {(itemQty * itemPrice).toFixed(2)} {settings.currency}</p>
                </div>
              </div>
            );
          })
      ) : (
        <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <RotateCcw size={32} className="mx-auto mb-3 text-slate-400" />
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">Aucun retour enregistré pour ce produit</p>
        </div>
      )}
    </div>
  );
};
