import React from 'react';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Product, CompanySettings } from '../../../types';

export interface ProductPriceHistoryTabProps {
  product: Product;
  settings: CompanySettings;
}

export const ProductPriceHistoryTab: React.FC<ProductPriceHistoryTabProps> = ({
  product,
  settings
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Prix d'Achat Actuel</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums font-mono">
            {(product.costPrice || 0).toFixed(2)} <span className="text-xs">{settings.currency}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Prix de Gros Actuel</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums font-mono">
            {(product.wholesalePrice || 0).toFixed(2)} <span className="text-xs">{settings.currency}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Prix Détail Actuel</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
            {(product.price || 0).toFixed(2)} <span className="text-xs">{settings.currency}</span>
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {product.priceHistory && product.priceHistory.length > 0 ? (
          product.priceHistory.map((entry: any, idx: number) => (
            <div key={`price-history-${idx}`} className="p-3.5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20">
                  <History size={16} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-slate-900 dark:text-white text-xs">
                      Vente : {(entry.price || 0).toFixed(2)} {settings.currency}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      Achat : {(entry.costPrice || 0).toFixed(2)} {settings.currency}
                    </span>
                    {entry.invoiceNumber && (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold rounded">
                        Bon : {entry.invoiceNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {format(new Date(entry.date || Date.now()), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    {entry.supplierName ? ` • Fournisseur : ${entry.supplierName}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <History size={28} className="mx-auto mb-2 text-slate-400" />
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">Aucun historique de variation de prix</p>
          </div>
        )}
      </div>
    </div>
  );
};
