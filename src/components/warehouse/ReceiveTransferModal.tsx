import React, { useState } from 'react';
import { StockTransfer, ReceiveStockTransferDto } from '../../types/warehouseTypes';
import { CheckCircle2, AlertTriangle, X, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockTransfer | null;
  onConfirm: (dto: ReceiveStockTransferDto) => void;
}

export const ReceiveTransferModal: React.FC<Props> = ({ isOpen, onClose, transfer, onConfirm }) => {
  if (!isOpen || !transfer) return null;

  const [receivedBy, setReceivedBy] = useState('Responsable Dépôt');
  const [notes, setNotes] = useState('');
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    transfer.items.forEach((it) => {
      init[it.productId] = it.quantitySent;
    });
    return init;
  });
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const handleQtyChange = (productId: string, val: number) => {
    setItemQuantities((prev) => ({ ...prev, [productId]: Math.max(0, val) }));
  };

  const handleReasonChange = (productId: string, val: string) => {
    setReasons((prev) => ({ ...prev, [productId]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const receivedItems = transfer.items.map((it) => ({
      productId: it.productId,
      quantityReceived: itemQuantities[it.productId] ?? it.quantitySent,
      discrepancyReason: reasons[it.productId] || undefined
    }));

    onConfirm({
      transferId: transfer.id,
      receivedBy,
      receivedItems,
      notes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Réceptionner le Transfert {transfer.transferNumber}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Vérifiez physiquement les quantités. Le stock du dépôt <strong>{transfer.destinationWarehouseName}</strong> sera automatiquement crédité dès validation.
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-2.5">Article</th>
                  <th className="p-2.5 text-center">Qté Envoyée</th>
                  <th className="p-2.5 text-center w-28">Qté Reçue</th>
                  <th className="p-2.5">Motif si écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transfer.items.map((it) => {
                  const qtyRec = itemQuantities[it.productId] ?? it.quantitySent;
                  const hasDiscrepancy = qtyRec !== it.quantitySent;
                  return (
                    <tr key={it.productId} className={`dark:text-slate-200 ${hasDiscrepancy ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}`}>
                      <td className="p-2.5 font-medium">
                        {it.productName}
                        <div className="text-[10px] text-slate-400 font-mono">{it.barcode}</div>
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-500 dark:text-slate-400">
                        {it.quantitySent}
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={qtyRec}
                          onChange={(e) => handleQtyChange(it.productId, parseInt(e.target.value) || 0)}
                          className={`w-20 border rounded-lg p-1.5 text-center font-bold text-xs ${
                            hasDiscrepancy
                              ? 'border-rose-400 text-rose-600 dark:text-rose-400'
                              : 'border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                          }`}
                        />
                      </td>
                      <td className="p-2.5">
                        {hasDiscrepancy && (
                          <input
                            type="text"
                            placeholder="Casse, manquant..."
                            value={reasons[it.productId] || ''}
                            onChange={(e) => handleReasonChange(it.productId, e.target.value)}
                            className="w-full border border-rose-300 dark:border-rose-800 dark:bg-slate-900 rounded p-1 text-[11px] text-rose-700 dark:text-rose-300"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Réceptionné par</label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Observations / Décharge</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Reçu conforme"
                className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Fermer
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Valider la Réception en Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
