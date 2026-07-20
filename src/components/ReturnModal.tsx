import React from 'react';
import { Product, CompanySettings, Transaction, ProductReturn, Customer } from '../types';
import { cn } from '../lib/utils';
import { Modal, Button } from './ui';
import { ReturnModalItemsList } from './returns/ReturnModalItemsList';
import { useReturnModalLogic } from './useReturnModalLogic';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  user: any;
  products: Product[];
  customers: Customer[];
  settings: CompanySettings;
  allReturns: ProductReturn[];
}

export function ReturnModal(props: ReturnModalProps) {
  const { isOpen, onClose, transaction, settings } = props;

  const {
    returnItems,
    setReturnItems,
    reason,
    setReason,
    returnType,
    setReturnType,
    returnDate,
    setReturnDate,
    isProcessing,
    showConfirmation,
    setShowConfirmation,
    restockItems,
    setRestockItems,
    totalRefund,
    handleReturn
  } = useReturnModalLogic(props);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enregistrer un retour">
      <div className="space-y-6 text-slate-100">
        <ReturnModalItemsList
          transaction={transaction}
          returnItems={returnItems}
          setReturnItems={setReturnItems}
          settings={settings}
        />

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date du retour</label>
            <input 
              type="date"
              required
              className="w-full p-3 bg-slate-950/60 border border-slate-850 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm text-white font-mono transition-all"
              value={returnDate}
              onChange={e => setReturnDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raison du retour</label>
            <textarea 
              className="w-full p-3 bg-slate-950/60 border border-slate-850 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 h-20 text-sm text-white placeholder:text-white/20 transition-all"
              placeholder="Ex: Article défectueux, erreur de taille..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Action sur le Stock</label>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setRestockItems(!restockItems)}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex justify-center items-center gap-2",
                  restockItems 
                    ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/50" 
                    : "bg-slate-900/60 text-slate-400 border-slate-850 hover:bg-slate-850 hover:text-white"
                )}
              >
                <div className={cn("w-3 h-3 rounded-full border", restockItems ? "bg-emerald-500 border-emerald-400" : "border-slate-600")} />
                Remettre en Stock
              </button>
              <button 
                onClick={() => setRestockItems(!restockItems)}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex justify-center items-center gap-2",
                  !restockItems 
                    ? "bg-rose-600/20 text-rose-400 border-rose-500/50" 
                    : "bg-slate-900/60 text-slate-400 border-slate-850 hover:bg-slate-850 hover:text-white"
                )}
              >
                <div className={cn("w-3 h-3 rounded-full border", !restockItems ? "bg-rose-500 border-rose-400" : "border-slate-600")} />
                Article Perte / Défectueux
              </button>
            </div>
            {!restockItems && <p className="text-[10px] text-rose-400/80 mt-2">Le produit ne sera pas rajouté à l'inventaire.</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Type de remboursement</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setReturnType('refund')}
                className={cn(
                  "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  returnType === 'refund' 
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20" 
                    : "bg-slate-900/60 text-slate-400 border-slate-850 hover:bg-slate-850 hover:text-white"
                )}
              >
                Remboursement
              </button>
              <button 
                onClick={() => setReturnType('credit_note')}
                className={cn(
                  "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  returnType === 'credit_note' 
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20" 
                    : "bg-slate-900/60 text-slate-400 border-slate-850 hover:bg-slate-850 hover:text-white"
                )}
              >
                Note de Crédit
              </button>
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-850 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total à rembourser</p>
            <p className="text-xl font-black text-indigo-400 font-mono tracking-tighter">{totalRefund.toFixed(2)} {settings.currency}</p>
          </div>
          <div className="flex items-center gap-3">
            {showConfirmation && (
              <Button 
                variant="ghost" 
                onClick={() => setShowConfirmation(false)}
                disabled={isProcessing}
                className="text-slate-400 uppercase text-[10px] tracking-widest font-black"
              >
                Annuler
              </Button>
            )}
            <Button 
              onClick={() => {
                if (!showConfirmation) {
                  setShowConfirmation(true);
                } else {
                  handleReturn();
                }
              }} 
              disabled={totalRefund === 0 || isProcessing}
              className={cn("px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", showConfirmation ? "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20" : "")}
            >
              {isProcessing ? "Traitement..." : showConfirmation ? "Confirmer le retour" : "Valider le retour"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
