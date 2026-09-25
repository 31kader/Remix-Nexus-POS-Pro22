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
  const currentBalance = Number(viewingDetailsSupplier?.balance || 0);
  const opType = paymentData.opType || 'decaissement';
  const amountVal = parseFloat(paymentData.amount || 0) || 0;
  const projectedBalance = opType === 'decaissement' ? currentBalance - amountVal : currentBalance + amountVal;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingPayment ? "Modifier l'Opération Fournisseur" : "Règlement & Mouvements Fournisseur"} 
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-left py-1">
        {/* Supplier summary */}
        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl space-y-2 border border-slate-100 dark:border-white/5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-white/40">Fournisseur</span>
            <span className="font-bold text-slate-800 dark:text-white uppercase">{viewingDetailsSupplier?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-white/40">Dette / Solde Actuel</span>
            <span className={`font-black font-mono ${currentBalance > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
              {currentBalance > 0 ? `Dû : ${currentBalance.toFixed(2)}` : `Avance : ${Math.abs(currentBalance).toFixed(2)}`} {settings.currency}
            </span>
          </div>
        </div>

        {/* Operation Type Switcher */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Type d'opération</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentData({ ...paymentData, opType: 'decaissement' })}
              className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                opType === 'decaissement' 
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 ring-1 ring-rose-500/30' 
                  : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xs font-black uppercase tracking-wider">Décaissement (-)</span>
              <span className="text-[9px] opacity-70">Paiement / Acompte versé au fournisseur</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentData({ ...paymentData, opType: 'encaissement' })}
              className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                opType === 'encaissement' 
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 ring-1 ring-emerald-500/30' 
                  : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xs font-black uppercase tracking-wider">Encaissement (+)</span>
              <span className="text-[9px] opacity-70">Remboursement / Avoir reçu du fournisseur</span>
            </button>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Date de l'opération</label>
          <input 
            type="datetime-local" 
            className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm" 
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

        <div className="space-y-1.5 font-mono">
          <label className="text-xs font-bold text-slate-500 uppercase font-sans">Montant ({settings.currency})</label>
          <input 
            type="number" 
            step="0.01" 
            autoFocus
            className="w-full p-3 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-black font-mono text-xl" 
            value={paymentData.amount || ''} 
            placeholder="0.00"
            onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })} 
          />

          {/* Quick Clear Debt Button */}
          {currentBalance > 0 && opType === 'decaissement' && (
            <div className="flex gap-2 pt-1 font-sans">
              <button
                type="button"
                onClick={() => setPaymentData({ ...paymentData, amount: currentBalance })}
                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[10px] rounded-lg border border-rose-500/20 transition-all uppercase"
              >
                Régler toute la dette ({currentBalance.toFixed(2)} {settings.currency})
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Mode de paiement</label>
          <select 
            className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white" 
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
            className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white" 
            placeholder="Ex: Chèque N° 123456, Acompte commande..." 
            value={paymentData.note || ''} 
            onChange={e => setPaymentData({ ...paymentData, note: e.target.value })} 
          />
        </div>

        {/* Projected Outcome */}
        {amountVal > 0 && (
          <div className="p-3 bg-slate-900 rounded-xl border border-white/5 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Nouveau solde estimé</span>
            <span className={`font-black font-mono text-sm ${projectedBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {projectedBalance > 0 ? `Dû : ${projectedBalance.toFixed(2)}` : `Avance : ${Math.abs(projectedBalance).toFixed(2)}`} {settings.currency}
            </span>
          </div>
        )}

        <div className="pt-3 flex gap-2">
          <Button variant="secondary" className="flex-1 cursor-pointer rounded-xl py-3 text-xs font-bold uppercase" onClick={onClose}>Annuler</Button>
          <Button 
            className="flex-1 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-xs font-black uppercase tracking-wider" 
            onClick={handlePaymentSubmit} 
            disabled={paymentData.amount <= 0 || isProcessingPayment}
          >
            {isProcessingPayment ? 'Traitement...' : 'Valider'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
