import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { formatSafe } from '../../../lib/utils';
import { Button, Modal } from '../../ui';
import { StockAdjustment, Product } from '../../../types';

interface StockHistoryModalsProps {
  isEditModalOpen: boolean;
  setIsEditModalOpen: (val: boolean) => void;
  selectedAdjustment: StockAdjustment | null;
  editedReason: string;
  setEditedReason: (val: string) => void;
  editedAdjustmentValue: number | '';
  setEditedAdjustmentValue: (val: number | '') => void;
  isSaving: boolean;
  handleSaveEdit: (e: React.FormEvent) => void;
  
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (val: boolean) => void;
  revertProductStock: boolean;
  setRevertProductStock: (val: boolean) => void;
  isDeleting: boolean;
  handleConfirmDelete: () => void;
  
  activeProduct: Product | null;
  livePreviewStock: number;
}

export function StockHistoryModals({
  isEditModalOpen,
  setIsEditModalOpen,
  selectedAdjustment,
  editedReason,
  setEditedReason,
  editedAdjustmentValue,
  setEditedAdjustmentValue,
  isSaving,
  handleSaveEdit,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  revertProductStock,
  setRevertProductStock,
  isDeleting,
  handleConfirmDelete,
  activeProduct,
  livePreviewStock
}: StockHistoryModalsProps) {
  return (
    <>
      {/* Edit stock adjustment modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifier l'Ajustement" className="max-w-md">
        {selectedAdjustment && (
          <form onSubmit={handleSaveEdit} className="space-y-6 pt-4">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-black/40 rounded-2xl shadow-inner flex items-center justify-center border border-white/10 text-indigo-400">
                <Package size={24} />
              </div>
              <div>
                <h4 className="font-black text-white uppercase tracking-widest leading-tight">{selectedAdjustment.productName}</h4>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">
                  Stock Actuel: <span className="text-indigo-400">{(activeProduct?.stock || 0)} {activeProduct?.unit || 'unité'}</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Ajustement Initial</p>
                  <p className="text-lg font-black text-white mt-1">
                    {selectedAdjustment.adjustment > 0 ? '+' : ''}{selectedAdjustment.adjustment}
                  </p>
                </div>
                <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Nouveau Stock Recalculé</p>
                  <p className="text-lg font-black text-indigo-300 mt-1">
                    {livePreviewStock} <span className="text-xs font-normal text-indigo-400/70">{activeProduct?.unit || 'U'}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] pl-2">Nouvel Ajustement Quantité</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  value={editedAdjustmentValue}
                  onChange={e => setEditedAdjustmentValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-xl font-black text-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-center shadow-inner"
                />
                <p className="text-[10px] text-slate-400 pl-2">Saisir une valeur négative (ex: -5) pour réduire ou positive (ex: 5) pour augmenter le stock.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] pl-2">Motif de l'ajustement</label>
                <textarea 
                  rows={2}
                  value={editedReason}
                  onChange={e => setEditedReason(e.target.value)}
                  placeholder="Ex: Inventaire périodique, casse, etc."
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner placeholder:text-white/10"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setIsEditModalOpen(false)} variant="ghost" className="flex-1 py-4">
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving} className="flex-1 py-4 uppercase text-xs tracking-wider">
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete stock adjustment confirmation */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Annuler l'Ajustement de Stock" className="max-w-md">
        {selectedAdjustment && (
          <div className="space-y-6 pt-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-rose-300">Action irréversible</h4>
                <p className="text-xs text-rose-400/80 mt-1">Vous êtes sur le point de supprimer cet enregistrement d'ajustement de stock.</p>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
              <p className="text-xs text-slate-400">Détails de l'élément :</p>
              <p className="text-sm font-bold text-white">{selectedAdjustment.productName}</p>
              <p className="text-xs text-slate-300">Date : {formatSafe(selectedAdjustment.timestamp, 'dd/MM/yyyy HH:mm')}</p>
              <p className="text-xs text-slate-300">Valeur : <span className="font-bold">{selectedAdjustment.adjustment > 0 ? '+' : ''}{selectedAdjustment.adjustment}</span></p>
              <p className="text-xs text-slate-300">Motif : "{selectedAdjustment.reason}"</p>
            </div>

            {activeProduct && (
              <div className="space-y-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={revertProductStock}
                    onChange={e => setRevertProductStock(e.target.checked)}
                    className="mt-1 accent-indigo-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-white">Rétablir également le stock du produit ?</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Si coché, le stock de {activeProduct.name} passera de <span className="text-white font-bold">{activeProduct.stock || 0}</span> à <span className="text-indigo-400 font-bold">{(activeProduct.stock || 0) - (selectedAdjustment.adjustment || 0)}</span> (retrait de l'ajustement).
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setIsDeleteModalOpen(false)} variant="ghost" className="flex-1 py-4">
                Fermer
              </Button>
              <Button onClick={handleConfirmDelete} disabled={isDeleting} variant="danger" className="flex-1 py-4 uppercase text-xs tracking-wider">
                {isDeleting ? "Suppression..." : "Confirmer"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
