import React from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpiryQuickDateModalProps {
  quickDateProduct: any | null;
  onClose: () => void;
  modalDate: string;
  setModalDate: (d: string) => void;
  modalBatch: string;
  setModalBatch: (b: string) => void;
  onSaveQuickDate: (product: any, date: string, batchNumber?: string) => Promise<void>;
}

export function ExpiryQuickDateModal({
  quickDateProduct,
  onClose,
  modalDate,
  setModalDate,
  modalBatch,
  setModalBatch,
  onSaveQuickDate
}: ExpiryQuickDateModalProps) {
  return (
    <AnimatePresence>
      {quickDateProduct && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="relative max-w-md w-full bg-slate-900 border border-white/20 rounded-xl shadow-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                <CalendarPlus className="text-indigo-400" size={20} /> Définir la Date
              </h3>
              <button 
                onClick={onClose}
                className="p-1 text-white/40 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/50 uppercase font-bold tracking-wider">Article :</p>
                <p className="text-sm font-extrabold text-white uppercase">{quickDateProduct.name}</p>
              </div>

              <div>
                <label className="block text-xs font-black text-white/60 uppercase tracking-widest mb-1.5">
                  Date de Péremption (JJ/MM/AAAA)
                </label>
                <input 
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-white/60 uppercase tracking-widest mb-1.5">
                  Numéro de Lot / Batch (Optionnel)
                </label>
                <input 
                  type="text"
                  placeholder="Ex: LOT-2026-A1"
                  value={modalBatch}
                  onChange={(e) => setModalBatch(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-white/60 transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (modalDate) {
                    onSaveQuickDate(quickDateProduct, modalDate, modalBatch.trim() || undefined);
                  }
                }}
                className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
