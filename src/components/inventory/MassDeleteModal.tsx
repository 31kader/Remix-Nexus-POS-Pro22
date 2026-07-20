import React from 'react';
import { motion } from 'motion/react';
import { Modal, Button } from '../ui';

interface MassDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDeleting: boolean;
  progress: number;
  onConfirm: () => void;
}

export function MassDeleteModal({ isOpen, onClose, isDeleting, progress, onConfirm }: MassDeleteModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { if (!isDeleting) onClose(); }} 
      title="Confirmation de Suppression Totale"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed font-medium">
          Êtes-vous sûr de vouloir supprimer <span className="font-black text-rose-600 underline">TOUS</span> les produits ? Cette action est irréversible.
        </p>
        
        {isDeleting && (
          <div className="space-y-2 p-4 bg-rose-50 border border-rose-100 rounded-xl">
            <div className="flex justify-between text-[10px] font-black text-rose-600 uppercase tracking-widest">
              <span>Suppression massive...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-rose-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-rose-600"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" disabled={isDeleting} onClick={onClose}>Annuler</Button>
          <Button 
            variant="danger" 
            disabled={isDeleting} 
            onClick={onConfirm}
            className="px-6 font-bold"
          >
            {isDeleting ? "Suppression en cours..." : "Oui, Tout Supprimer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
