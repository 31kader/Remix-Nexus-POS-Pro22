import React from 'react';
import { ShoppingBag, FileText, ImageIcon, ZoomIn } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SafeImage } from '../../ui/SafeImage';
import { Product, Purchase, CompanySettings } from '../../../types';
import { getRecordItems, isMatchingProductItem, getPurchaseScannedImage } from './productHistoryHelpers';

export interface ProductPurchasesHistoryTabProps {
  product: Product;
  productPurchases: Purchase[];
  settings: CompanySettings;
  onOpenVoucher: (p: Purchase) => void;
  onZoomImage: (url: string) => void;
}

export const ProductPurchasesHistoryTab: React.FC<ProductPurchasesHistoryTabProps> = ({
  product,
  productPurchases,
  settings,
  onOpenVoucher,
  onZoomImage
}) => {
  return (
    <div className="space-y-3">
      {productPurchases.length > 0 ? (
        productPurchases.map((p) => {
          const items = getRecordItems(p);
          const item = items.find(i => isMatchingProductItem(i, product));
          const scannedImg = getPurchaseScannedImage(p);
          const qty = Number(item?.quantity || 1);
          const cost = Number(item?.costPrice ?? item?.price ?? product.costPrice ?? 0);

          return (
            <div
              key={p.id}
              className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-500/50 transition-all shadow-xs"
            >
              <div className="flex items-start sm:items-center gap-4">
                {/* Miniature Photo Bon Scanné ou Icône */}
                {scannedImg ? (
                  <button
                    type="button"
                    onClick={() => onZoomImage(scannedImg)}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-500/40 shrink-0 group/img cursor-pointer shadow-sm"
                    title="Cliquer pour agrandir la photo scannée du bon d'achat"
                  >
                    <SafeImage src={scannedImg} alt="Bon scanné" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                      <ZoomIn size={18} className="text-white" />
                    </div>
                  </button>
                ) : (
                  <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20 shrink-0">
                    <ShoppingBag size={22} />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-900 dark:text-white uppercase text-xs">
                      {p.supplierName || 'Fournisseur Standard'}
                    </p>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold rounded border border-indigo-500/20">
                      N° {p.invoiceNumber || `BON-${String(p.id).slice(-6).toUpperCase()}`}
                    </span>
                    {scannedImg && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded border border-emerald-500/20 flex items-center gap-1">
                        <ImageIcon size={11} /> Photo Bon Scanné
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Date de réception : {format(new Date(p.date || (p as any).created_at || Date.now()), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenVoucher(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                    >
                      <FileText size={12} /> Ouvrir le Bon Complet ({items.length} art.)
                    </button>
                    {scannedImg && (
                      <button
                        type="button"
                        onClick={() => onZoomImage(scannedImg)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <ZoomIn size={12} /> Voir Photo Scannée
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{qty} <span className="text-[10px] text-slate-400 uppercase">{product.unit}</span>
                </p>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  P.A Unitaire : <span className="font-mono font-black">{cost.toFixed(2)} {settings.currency}</span>
                </p>
                <p className="text-xs font-black text-amber-600 dark:text-amber-400 mt-1 px-2.5 py-0.5 bg-amber-500/10 rounded-lg inline-block font-mono">
                  Total Ligne : {(qty * cost).toFixed(2)} {settings.currency}
                </p>
              </div>
            </div>
          );
        })
      ) : (
        <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <ShoppingBag size={32} className="mx-auto mb-3 text-slate-400" />
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
            Aucun bon d'achat enregistré pour ce produit
          </p>
        </div>
      )}
    </div>
  );
};
