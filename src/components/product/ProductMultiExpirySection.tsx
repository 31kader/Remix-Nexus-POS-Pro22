import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn, generateUniqueId } from '../../lib/utils';

interface Batch {
  id?: string;
  batchNumber: string;
  expirationDate: string;
  stock: number;
}

interface ProductMultiExpirySectionProps {
  formData: {
    useMultiExpiry: boolean;
    batches: Batch[];
    stock: string;
    expirationDate?: string;
    batchNumber?: string;
    unit?: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  newBatchNumber: string;
  setNewBatchNumber: (v: string) => void;
  newBatchExpiry: string;
  setNewBatchExpiry: (v: string) => void;
  newBatchStock: string;
  setNewBatchStock: (v: string) => void;
}

export function ProductMultiExpirySection({
  formData,
  setFormData,
  newBatchNumber,
  setNewBatchNumber,
  newBatchExpiry,
  setNewBatchExpiry,
  newBatchStock,
  setNewBatchStock
}: ProductMultiExpirySectionProps) {
  return (
    <div className="border border-white/5 bg-white/[0.02] p-6 rounded-[2rem] space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.15em] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Gérer plusieurs Lots & Dates d'Expiring (Multi-DLC)
          </h4>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Activer si un produit possède plusieurs dates de péremption ou numéros de lots différents.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const nextVal = !formData.useMultiExpiry;
            setFormData((prev: any) => {
              const updated = { ...prev, useMultiExpiry: nextVal };
              if (nextVal) {
                // Sum existing batch stocks or auto-seed with the first entered date/lot
                let currentBatches = prev.batches ? [...prev.batches] : [];
                if (currentBatches.length === 0 && prev.expirationDate) {
                  currentBatches.push({
                    id: Math.random().toString(36).substring(2, 9),
                    batchNumber: prev.batchNumber?.trim().toUpperCase() || 'LOT-1',
                    expirationDate: prev.expirationDate,
                    stock: parseFloat(prev.stock || '0') || 0
                  });
                }
                const totalBatchStock = currentBatches.reduce((sum: number, b: any) => sum + b.stock, 0);
                updated.batches = currentBatches;
                updated.stock = totalBatchStock > 0 ? totalBatchStock.toString() : prev.stock;
              } else {
                // Moving from multi back to single: populate parent values with the earliest batch if available
                if (prev.batches && prev.batches.length > 0) {
                  const sorted = [...prev.batches].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
                  updated.expirationDate = sorted[0].expirationDate;
                  updated.batchNumber = sorted[0].batchNumber;
                  updated.stock = prev.batches.reduce((sum: number, b: any) => sum + b.stock, 0).toString();
                }
              }
              return updated;
            });
          }}
          className={cn(
            "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            formData.useMultiExpiry 
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
              : "bg-white/5 text-white/40 border border-white/10 hover:text-white"
          )}
        >
          {formData.useMultiExpiry ? "DÉSACTIVER" : "ACTIVER"}
        </button>
      </div>

      {formData.useMultiExpiry && (
        <div className="space-y-5 animate-fadeIn border-t border-white/5 pt-4">
          {/* Inputs for adding new batch */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-black/30 p-4 rounded-2xl border border-white/5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">N° de Lot</label>
              <input 
                type="text" 
                placeholder="LOT-2026A"
                className="industrial-input w-full font-mono text-center uppercase"
                value={newBatchNumber}
                onChange={e => setNewBatchNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Péremption</label>
              <input 
                type="date" 
                className="industrial-input w-full font-mono text-center cursor-pointer"
                value={newBatchExpiry}
                onChange={e => setNewBatchExpiry(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Stock du Lot</label>
              <input 
                type="number" 
                placeholder="0"
                className="industrial-input w-full text-center font-mono"
                value={newBatchStock}
                onChange={e => setNewBatchStock(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newBatchExpiry) {
                  alert("Veuillez sélectionner une date de péremption.");
                  return;
                }
                const stockVal = parseFloat(newBatchStock || '0');
                if (isNaN(stockVal) || stockVal <= 0) {
                  alert("Veuillez indiquer un stock positif à ce lot.");
                  return;
                }

                const generatedLot = newBatchNumber.trim().toUpperCase() || `LOT-${generateUniqueId().toUpperCase().substring(0, 5)}`;
                const newBatch = {
                  id: Math.random().toString(36).substring(2, 9),
                  batchNumber: generatedLot,
                  expirationDate: newBatchExpiry,
                  stock: stockVal
                };

                setFormData((prev: any) => {
                  const updatedBatches = [...prev.batches, newBatch];
                  const totalStock = updatedBatches.reduce((sum, b) => sum + b.stock, 0);
                  return {
                    ...prev,
                    batches: updatedBatches,
                    stock: totalStock.toString()
                  };
                });

                // Reset inputs
                setNewBatchNumber('');
                setNewBatchExpiry('');
                setNewBatchStock('');
              }}
              className="w-full py-3 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all gap-1 flex items-center justify-center shadow-lg"
            >
              <Plus size={14} /> Ajouter le Lot
            </button>
          </div>

          {/* Batches Table List */}
          {formData.batches.length === 0 ? (
            <div className="p-8 text-center text-white/20 italic border border-dashed border-white/5 rounded-2xl">
              Aucun lot enregistré. Renseignez un lot pour démarrer le suivi multi-DLC.
            </div>
          ) : (
            <div className="overflow-hidden border border-white/5 rounded-2xl">
              <table className="w-full text-left text-xs text-white">
                <thead>
                  <tr className="bg-white/5 text-white/40 uppercase tracking-wider text-[9px] font-black">
                    <th className="py-2.5 px-4 font-black">N° de Lot</th>
                    <th className="py-2.5 px-4 font-black">Date d'Expiration</th>
                    <th className="py-2.5 px-4 font-black text-center">Quantité</th>
                    <th className="py-2.5 px-4 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {formData.batches.map((b, index) => (
                    <tr key={b.id || index} className="hover:bg-white/[0.01]">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{b.batchNumber}</td>
                      <td className="py-3 px-4 text-white/80">
                        {new Date(b.expirationDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">{b.stock} {formData.unit}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev: any) => {
                              const filtered = prev.batches.filter((_: any, idx: number) => idx !== index);
                              const totalStock = filtered.reduce((sum: number, item: any) => sum + item.stock, 0);
                              return {
                                ...prev,
                                batches: filtered,
                                stock: totalStock.toString()
                              };
                            });
                          }}
                          className="p-1.5 text-white/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Supprimer le lot"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
