import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Product, Transaction, CompanySettings } from '../../../types';
import { getRecordItems, isMatchingProductItem } from './productHistoryHelpers';

export interface ProductSalesHistoryTabProps {
  product: Product;
  productSales: Transaction[];
  settings: CompanySettings;
  purchasesCount: number;
  onGoToPurchases: () => void;
}

export const ProductSalesHistoryTab: React.FC<ProductSalesHistoryTabProps> = ({
  product,
  productSales,
  settings,
  purchasesCount,
  onGoToPurchases
}) => {
  return (
    <div className="space-y-3">
      {productSales.length > 0 ? (
        productSales
          .sort((a, b) => new Date(b.timestamp || (b as any).created_at || 0).getTime() - new Date(a.timestamp || (a as any).created_at || 0).getTime())
          .map((t) => {
            const items = getRecordItems(t);
            const item = items.find(i => isMatchingProductItem(i, product));
            return (
              <div key={t.id} className="p-4 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-indigo-500/40 transition-all shadow-xs">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <p className="font-black text-slate-900 dark:text-white uppercase text-xs">Vente #{String(t.id || "").slice(-8).toUpperCase()}</p>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded border border-emerald-500/20">Payé</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {format(new Date(t.timestamp || (t as any).created_at || Date.now()), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </p>
                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mt-1">
                      Client : {t.customerName || 'Client de passage'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {item?.quantity || 1} <span className="text-[10px] text-slate-400 uppercase">{product.unit}</span>
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    P.U : {(item?.price || 0).toFixed(2)} {settings.currency}
                  </p>
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 px-2.5 py-0.5 bg-emerald-500/10 rounded-lg inline-block">
                    Total : {((item?.quantity || 1) * (item?.price || 0)).toFixed(2)} {settings.currency}
                  </p>
                </div>
              </div>
            );
          })
      ) : (
        <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <ShoppingCart size={32} className="mx-auto mb-3 text-slate-400" />
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">Aucune vente enregistrée pour ce produit</p>
          {purchasesCount > 0 && (
            <button
              type="button"
              onClick={onGoToPurchases}
              className="mt-3 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-black uppercase cursor-pointer"
            >
              👉 Voir les {purchasesCount} Bon(s) d'Achat de ce produit
            </button>
          )}
        </div>
      )}
    </div>
  );
};
