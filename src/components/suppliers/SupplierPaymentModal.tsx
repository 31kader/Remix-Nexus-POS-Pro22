import React from 'react';
import { Modal, Button } from '../ui';
import { Supplier, CompanySettings } from '../../types';

interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingDetailsSupplier: Supplier | null;
  settings: CompanySettings;
  paymentData: any;
  setPaymentData: (p: any) => void;
  editingPayment: any;
  setEditingPayment: (p: any) => void;
  handlePaymentSubmit: () => void;
  isProcessingPayment: boolean;
}

export function SupplierPaymentModal({
  isOpen,
  onClose,
  viewingDetailsSupplier,
  settings,
  paymentData,
  setPaymentData,
  editingPayment,
  setEditingPayment,
  handlePaymentSubmit,
  isProcessingPayment
}: SupplierPaymentModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingPayment ? "Modifier le Versement" : "Effectuer un Versement"} 
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-left">
        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl space-y-2 border border-slate-100 dark:border-white/5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-white/40">Fournisseur</span>
            <span className="font-bold text-slate-800 dark:text-white">{viewingDetailsSupplier?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-white/40">Dette Actuelle</span>
            <span className="font-bold text-rose-600">{Number(viewingDetailsSupplier?.balance || 0).toFixed(2)} {settings.currency}</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Date du versement</label>
          <input 
            type="datetime-local" 
            className="w-full p-2 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm" 
            value={paymentData.date ? paymentData.date.slice(0, 16) : ''} 
            onChange={(e) => {
              const val = e.target.value;
              let dateIso = new Date().toISOString();
              try {
                if (val) {
                  dateIso = new Date(val).toISOString();
                }
              } catch(err) {}
              setPaymentData({ ...paymentData, date: dateIso });
            }} 
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Montant du versement</label>
          <input 
            type="number" 
            step="0.01" 
            className="w-full p-2 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold font-mono text-lg" 
            value={paymentData.amount || ''} 
            onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })} 
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Mode de paiement</label>
          <select 
            className="w-full p-2 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white" 
            value={paymentData.method} 
            onChange={e => setPaymentData({ ...paymentData, method: e.target.value as any })}
          >
            <option value="cash" className="text-black">Espèces</option>
            <option value="card" className="text-black">Carte Bancaire</option>
            <option value="transfer" className="text-black">Virement</option>
            <option value="check" className="text-black">Chèque</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Note / Référence (Optionnel)</label>
          <input 
            className="w-full p-2 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white" 
            placeholder="Ex: Chèque N° 123456" 
            value={paymentData.note} 
            onChange={e => setPaymentData({ ...paymentData, note: e.target.value })} 
          />
        </div>

        <div className="pt-4 flex gap-2">
          <Button variant="secondary" className="flex-1 cursor-pointer" onClick={onClose}>Annuler</Button>
          <Button 
            className="flex-1 cursor-pointer" 
            onClick={handlePaymentSubmit} 
            disabled={paymentData.amount <= 0 || (editingPayment ? false : paymentData.amount > (Number(viewingDetailsSupplier?.balance) || 0)) || isProcessingPayment}
          >
            {isProcessingPayment ? 'Traitement...' : 'Valider'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
