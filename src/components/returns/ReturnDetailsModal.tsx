import React from 'react';
import { X, Clock } from 'lucide-react';
import { formatSafe, formatPrice } from '../../lib/utils';
import { CompanySettings, Product } from '../../types';

interface ReturnDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRecord: any;
  settings: CompanySettings;
  products?: Product[];
}

export function ReturnDetailsModal({
  isOpen,
  onClose,
  returnRecord,
  settings,
  products = []
}: ReturnDetailsModalProps) {
  if (!isOpen || !returnRecord) return null;

  const dateVal = returnRecord.timestamp || returnRecord.date || returnRecord.created_at || returnRecord.updated_at;
  const refundVal = typeof returnRecord.totalRefund === 'number' 
    ? returnRecord.totalRefund 
    : (typeof returnRecord.refundAmount === 'number' 
        ? returnRecord.refundAmount 
        : (parseFloat(returnRecord.refundAmount || returnRecord.totalRefund || returnRecord.refund_amount || returnRecord.total_refund || '0') || 0));
  const returnTypeMapped = returnRecord.type || 'refund';
  
  let rawItems = returnRecord.items;
  if (typeof rawItems === 'string') {
    try {
      rawItems = JSON.parse(rawItems);
    } catch (_) {
      rawItems = [];
    }
  }

  const items = Array.isArray(rawItems) 
    ? rawItems 
    : (returnRecord.productId || returnRecord.product_id ? (() => {
        const pId = returnRecord.productId || returnRecord.product_id;
        const matchedProduct = products.find((p: any) => p.id === pId);
        return [{
          productId: pId,
          name: matchedProduct?.name || 'Produit',
          quantity: returnRecord.quantity || 1,
          price: refundVal
        }];
      })() : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Détails du Retour</h4>
            <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">#{String(returnRecord.id || '').slice(-8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800/60 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold">Date & Heure</span>
              <strong className="text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                <Clock size={12} className="text-indigo-500 shrink-0" />
                {dateVal ? formatSafe(dateVal, 'dd/MM/yyyy à HH:mm:ss') : '—'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold">Transaction Liée</span>
              <strong className="text-indigo-600 dark:text-indigo-400 mt-0.5 block">#{String(returnRecord.transactionId || '').slice(-8).toUpperCase() || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold">Type</span>
              <strong className="text-amber-600 dark:text-amber-400 uppercase mt-0.5 block">{returnTypeMapped === 'refund' ? 'Remboursement' : 'Note de Crédit'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold">Montant Remboursé</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-black mt-0.5 block">{formatPrice(refundVal)} {settings?.currency || 'DA'}</strong>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Articles Retournés</span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{item.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{item.quantity} x {formatPrice(item.price)} {settings?.currency || 'DA'}</p>
                  </div>
                  <strong className="text-slate-900 dark:text-white font-mono">{formatPrice((item.quantity || 1) * (item.price || 0))} {settings?.currency || 'DA'}</strong>
                </div>
              ))}
              {items.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 italic">
                  Aucun article spécifique détaillé dans ce retour
                </div>
              )}
            </div>
          </div>

          {returnRecord.reason && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Motif</span>
              <p className="text-slate-700 dark:text-slate-300">"{returnRecord.reason}"</p>
            </div>
          )}
        </div>

        <button 
          onClick={onClose} 
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
