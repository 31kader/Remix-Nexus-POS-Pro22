import React, { useState } from 'react';
import { Warehouse, StockTransferItem } from '../../types/warehouseTypes';
import { useCoreStore } from '../../store/useCoreStore';
import { ArrowRight, Plus, Trash2, X, Send } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  onConfirm: (dto: {
    sourceWarehouseId: string;
    sourceWarehouseName: string;
    destinationWarehouseId: string;
    destinationWarehouseName: string;
    items: Omit<StockTransferItem, 'quantityReceived'>[];
    carrierName?: string;
    notes?: string;
  }) => void;
}

export const CreateTransferModal: React.FC<Props> = ({ isOpen, onClose, warehouses, onConfirm }) => {
  const products = useCoreStore((s) => s.products);
  const [sourceId, setSourceId] = useState(warehouses[0]?.id || '');
  const [destId, setDestId] = useState(warehouses[1]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [carrier, setCarrier] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Omit<StockTransferItem, 'quantityReceived'>[]>([]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!selectedProductId || quantity <= 0) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === prod.id ? { ...i, quantitySent: i.quantitySent + quantity } : i
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          barcode: prod.barcode || '',
          quantitySent: quantity,
          unitCostPrice: prod.cost_price || prod.costPrice || 0
        }
      ];
    });

    setSelectedProductId('');
    setQuantity(1);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !destId || sourceId === destId || items.length === 0) return;

    const source = warehouses.find((w) => w.id === sourceId);
    const dest = warehouses.find((w) => w.id === destId);
    if (!source || !dest) return;

    onConfirm({
      sourceWarehouseId: source.id,
      sourceWarehouseName: source.name,
      destinationWarehouseId: dest.id,
      destinationWarehouseName: dest.name,
      items,
      carrierName: carrier,
      notes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Nouveau Bon de Transfert (BLT)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Dépôt Expéditeur (Source)</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm font-semibold dark:text-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Dépôt Destinataire (Cible)</label>
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm font-semibold dark:text-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id} disabled={w.id === sourceId}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Articles à transférer</label>
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm dark:text-white"
              >
                <option value="">-- Sélectionner un article --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stock ?? 0})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-center font-bold dark:text-white"
                placeholder="Qté"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400 italic">Aucun article dans ce transfert</p>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5">Article</th>
                      <th className="p-2.5 text-center">Qté</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((it) => (
                      <tr key={it.productId} className="dark:text-slate-200">
                        <td className="p-2.5 font-medium">{it.productName}</td>
                        <td className="p-2.5 text-center font-bold text-indigo-600 dark:text-indigo-400">{it.quantitySent}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.productId)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Transporteur / Chauffeur</label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Ex: Chauffeur interne / Véhicule Master"
                className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Notes / Motif de transfert</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Réassort hebdomadaire"
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
              Annuler
            </button>
            <button
              type="submit"
              disabled={items.length === 0 || sourceId === destId}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
            >
              Expédier le Transfert <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
