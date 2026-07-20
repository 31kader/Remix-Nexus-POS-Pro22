import React from 'react';
import { Modal, Button } from '../ui';

interface ConfirmAction {
  title: string;
  message: string;
  onConfirm: () => void;
}

interface InventoryConfirmModalProps {
  confirmAction: ConfirmAction | null;
  onClose: () => void;
}

export function InventoryConfirmModal({ confirmAction, onClose }: InventoryConfirmModalProps) {
  return (
    <Modal 
      isOpen={!!confirmAction} 
      onClose={onClose} 
      title={confirmAction?.title || "Confirmation"}
    >
      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-600 leading-relaxed text-center py-4">
          {confirmAction?.message}
        </p>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            className="flex-1 rounded-xl h-12 text-sm font-bold" 
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button 
            className="flex-1 rounded-xl h-12 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100" 
            onClick={() => confirmAction?.onConfirm()}
          >
            Continuer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
