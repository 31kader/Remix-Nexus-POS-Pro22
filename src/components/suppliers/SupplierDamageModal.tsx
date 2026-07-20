import React from 'react';
import { Modal, Button } from '../ui';
import { Product } from '../../types';

interface SupplierDamageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductForDamage: Product | null;
  damageData: any;
  setDamageData: (d: any) => void;
  handleDamageSubmit: () => void;
  isProcessingDamage: boolean;
}

export function SupplierDamageModal({
  isOpen,
  onClose,
  selectedProductForDamage,
  damageData,
  setDamageData,
  handleDamageSubmit,
  isProcessingDamage
}: SupplierDamageModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Signaler un article endommagé" 
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-left">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/10">
          <p className="text-sm font-bold text-rose-800 dark:text-rose-200">{selectedProductForDamage?.name}</p>
          <p className="text-xs text-rose-600 dark:text-rose-400">Stock actuel: {selectedProductForDamage?.stock} {selectedProductForDamage?.unit}</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Quantité endommagée</label>
          <input 
            type="number" 
            min="1" 
            max={selectedProductForDamage?.stock}
            className="w-full p-2 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm" 
            value={damageData.quantity} 
            onChange={e => setDamageData({ ...damageData, quantity: parseInt(e.target.value) || 0 })} 
          />
        </div>

        <div className="space-y-1 text-left">
          <label className="text-xs font-bold text-slate-500 uppercase">Raison / Motif</label>
          <textarea 
            className="w-full p-2 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] text-sm dark:text-white" 
            placeholder="Ex: Cassé pendant le transport, Date périmée, Defectueux..."
            value={damageData.reason} 
            onChange={e => setDamageData({ ...damageData, reason: e.target.value })} 
          />
        </div>

        <div className="pt-4 flex gap-2">
          <Button variant="secondary" className="flex-1 cursor-pointer" onClick={onClose}>Annuler</Button>
          <Button 
            className="flex-1 bg-rose-600 hover:bg-rose-700 cursor-pointer" 
            onClick={handleDamageSubmit} 
            disabled={damageData.quantity <= 0 || damageData.quantity > (selectedProductForDamage?.stock || 0) || !damageData.reason || isProcessingDamage}
          >
            {isProcessingDamage ? 'Traitement...' : 'Déduire du stock'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
