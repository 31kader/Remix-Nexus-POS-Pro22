import React from 'react';
import { Printer } from 'lucide-react';
import { fr } from 'date-fns/locale';
import { Purchase, CompanySettings } from '../../types';
import { formatSafe, safeGetItems } from '../../lib/utils';
import { Modal, Button, SafeImage } from '../ui';
import { printPurchaseVoucher } from '../../services/printService';

export interface PurchaseVoucherViewerModalProps {
  voucher: Purchase | null;
  onClose: () => void;
  settings?: CompanySettings;
}

export const PurchaseVoucherViewerModal: React.FC<PurchaseVoucherViewerModalProps> = ({
  voucher,
  onClose,
  settings
}) => {
  if (!voucher) return null;

  const v: any = voucher;
  let scannedPhotoUrl = v.invoiceImageUrl || '';
  if (!scannedPhotoUrl && Array.isArray(v.documents) && v.documents.length > 0) {
    scannedPhotoUrl = v.documents.find((d: any) => d?.url)?.url || '';
  }
  if (!scannedPhotoUrl) {
    try {
      const rawCache = localStorage.getItem('nexus_scanned_vouchers_v1');
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        scannedPhotoUrl = (v.id && parsed[v.id]) || (v.invoiceNumber && parsed[v.invoiceNumber]) || '';
      }
    } catch (_) {}
  }

  return (
    <Modal 
      isOpen={!!voucher} 
      onClose={onClose} 
      title={`Bon de Réception - ${v.invoiceNumber || String(v.id || "").slice(-6).toUpperCase()}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5 print:p-0 text-left">
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fournisseur</p>
            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase">{v.supplierName || 'Fournisseur Standard'}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatSafe(v.date, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">N° Document</p>
            <p className="text-base font-mono font-black text-indigo-600 dark:text-indigo-400">{v.invoiceNumber || 'REC-' + String(v.id || "").slice(-6).toUpperCase()}</p>
            <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${v.status === 'completed' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
              {v.status === 'completed' ? 'Réceptionné' : 'En attente'}
            </span>
          </div>
        </div>

        {scannedPhotoUrl && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/25 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                📸 Photo Originale du Bon d'Achat Scanné
              </span>
              <a
                href={scannedPhotoUrl}
                download={`Bon_${v.invoiceNumber || v.id}.jpg`}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Télécharger la photo
              </a>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 p-2 text-center">
              <SafeImage
                src={scannedPhotoUrl}
                alt="Photo du bon d'achat"
                className="max-w-full h-auto mx-auto rounded"
              />
            </div>
          </div>
        )}

        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">Article</th>
                <th className="p-3 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase text-center">Qté</th>
                <th className="p-3 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase text-right">Prix Achat</th>
                <th className="p-3 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {safeGetItems(v).map((item: any, idx: number) => (
                <tr key={`purchase-item-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{item.name || item.productName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Réf: {item.productId ? String(item.productId).slice(-6).toUpperCase() : 'CATALOG'}</p>
                  </td>
                  <td className="p-3 text-xs text-slate-700 dark:text-slate-300 text-center font-black">{item.quantity}</td>
                  <td className="p-3 text-xs text-slate-700 dark:text-slate-300 text-right font-mono">{Number(item.costPrice ?? item.price ?? 0).toFixed(2)} {settings?.currency}</td>
                  <td className="p-3 text-xs font-black text-slate-900 dark:text-white text-right font-mono">{(Number(item.quantity || 0) * Number(item.costPrice ?? item.price ?? 0)).toFixed(2)} {settings?.currency}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-800">
              <tr>
                <td colSpan={3} className="p-3.5 text-right text-slate-600 dark:text-slate-400 uppercase text-xs font-black">Total Général</td>
                <td className="p-3.5 text-right text-base text-indigo-600 dark:text-indigo-400 font-black font-mono">{Number(v.total ?? v.totalAmount ?? 0).toFixed(2)} {settings?.currency}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={() => printPurchaseVoucher(v, settings!)} variant="secondary" className="flex-1 gap-2">
            <Printer size={16} /> Imprimer le Bon
          </Button>
          <Button onClick={onClose} className="flex-1">
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
