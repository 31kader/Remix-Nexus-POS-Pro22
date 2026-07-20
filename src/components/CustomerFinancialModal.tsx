import React from 'react';
import { CreditCard } from 'lucide-react';
import { Modal } from './ui';
import { cn } from '../lib/utils';
import { CompanySettings, Customer } from '../types';

interface CustomerFinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  settings: CompanySettings;
  financialOpType: 'encaissement' | 'decaissement';
  setFinancialOpType: (type: 'encaissement' | 'decaissement') => void;
  financialMethod: 'cash' | 'card' | 'bank' | 'other';
  setFinancialMethod: (method: 'cash' | 'card' | 'bank' | 'other') => void;
  financialNote: string;
  setFinancialNote: (note: string) => void;
  topUpAmount: string;
  setTopUpAmount: (amount: string) => void;
  isProcessingTopUp: boolean;
  handleTopUp: (e: React.FormEvent) => void;
}

export function CustomerFinancialModal({
  isOpen,
  onClose,
  selectedCustomer,
  settings,
  financialOpType,
  setFinancialOpType,
  financialMethod,
  setFinancialMethod,
  financialNote,
  setFinancialNote,
  topUpAmount,
  setTopUpAmount,
  isProcessingTopUp,
  handleTopUp
}: CustomerFinancialModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Règlement, Crédit & Mouvements de Caisse"
    >
      <form onSubmit={handleTopUp} className="space-y-5 py-2">
        {/* Client summary */}
        <div className={cn(
          "flex items-center gap-4 p-4 rounded-2xl border transition-colors",
          selectedCustomer && (selectedCustomer.balance || 0) < 0 
            ? "bg-rose-500/5 border-rose-500/20" 
            : "bg-emerald-500/5 border-emerald-500/20"
        )}>
          <div className={cn(
             "w-12 h-12 rounded-xl flex items-center justify-center font-black shadow-sm",
             selectedCustomer && (selectedCustomer.balance || 0) < 0 
               ? "bg-rose-500/10 text-rose-400" 
               : "bg-emerald-500/10 text-emerald-400"
          )}>
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-tight">{selectedCustomer?.name}</p>
            <p className={cn(
              "text-xs font-black uppercase mt-0.5",
              selectedCustomer && (selectedCustomer.balance || 0) < 0 ? "text-rose-400" : "text-emerald-400"
            )}>
              {selectedCustomer && (selectedCustomer.balance || 0) < 0 
                ? `Dette Actuelle: ${Math.abs(selectedCustomer.balance || 0).toFixed(2)} ${settings.currency}`
                : `Solde Disponible: ${(selectedCustomer?.balance || 0).toFixed(2)} ${settings.currency}`
              }
            </p>
          </div>
        </div>

        {/* Operation type picker */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold font-sans">Type d'opération</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFinancialOpType('encaissement')}
              className={cn(
                "p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all",
                financialOpType === 'encaissement'
                  ? "bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20"
                  : "bg-slate-900/30 border-white/5 opacity-60 hover:opacity-100"
              )}
            >
              <span className="text-emerald-400 text-xs font-black uppercase tracking-wider">Encaissement (+)</span>
              <span className="text-[9px] text-slate-400 font-bold leading-normal">Le client règle une partie ou totalité de sa dette, ou recharge son solde.</span>
            </button>
            <button
              type="button"
              onClick={() => setFinancialOpType('decaissement')}
              className={cn(
                "p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all",
                financialOpType === 'decaissement'
                  ? "bg-rose-500/10 border-rose-500/30 ring-2 ring-rose-500/20"
                  : "bg-slate-900/30 border-white/5 opacity-60 hover:opacity-100"
              )}
            >
              <span className="text-rose-400 text-xs font-black uppercase tracking-wider">Décaissement (-)</span>
              <span className="text-[9px] text-slate-400 font-bold leading-normal">Vous sortez de l'argent pour rembourser le client, ou enregistrez un crédit d'achat.</span>
            </button>
          </div>
        </div>

        {/* Amount and quick actions */}
        <div className="space-y-2 font-mono">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Montant ({settings.currency})</label>
          <div className="relative">
            <input 
              type="number"
              step="any"
              required
              autoFocus
              className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 px-5 text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
              placeholder="0.00"
              value={topUpAmount}
              onChange={e => setTopUpAmount(e.target.value)}
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 font-black">
              {settings.currency}
            </div>
          </div>

          {/* Quick amount buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {/* If there's a debt, offer to clear it completely */}
            {selectedCustomer && (selectedCustomer.balance || 0) < 0 && (
              <button
                type="button"
                onClick={() => setTopUpAmount(Math.abs(selectedCustomer.balance || 0).toFixed(2))}
                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-400 font-mono text-[9px] font-black rounded-lg border border-rose-500/10 transition-all uppercase tracking-wider"
              >
                Régler toute la dette ({Math.abs(selectedCustomer.balance || 0).toFixed(2)})
              </button>
            )}
            {[10, 20, 50, 100, 200, 505].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  const currentVal = parseFloat(topUpAmount) || 0;
                  setTopUpAmount((currentVal + val).toString());
                }}
                className="px-2.5 py-1.5 bg-slate-800/40 hover:bg-slate-800/80 active:scale-95 text-[9px] text-slate-300 font-mono font-bold rounded-lg border border-white/5 transition-all"
              >
                +{val}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTopUpAmount('')}
              className="px-2.5 py-1.5 bg-rose-500/5 hover:bg-rose-500/15 active:scale-95 text-[9px] text-rose-400 font-mono font-bold rounded-lg border border-rose-500/10 transition-all"
            >
              Vider
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold font-sans">Mode de règlement</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'cash', label: 'Espèces' },
              { id: 'card', label: 'Carte' },
              { id: 'bank', label: 'Virement' },
              { id: 'other', label: 'Autre' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFinancialMethod(m.id as any)}
                className={cn(
                  "py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider text-center transition-all",
                  financialMethod === m.id
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400 font-black shadow-neon-indigo/10"
                    : "bg-slate-900 text-slate-400 border-white/5 hover:text-white"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comment/Note */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold font-sans">Note / Motif (Facultatif)</label>
          <input 
            type="text"
            placeholder="Ex: Règlement ardoise, Remboursement espèces..."
            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3.5 px-4 text-xs font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            value={financialNote}
            onChange={e => setFinancialNote(e.target.value)}
          />
        </div>

        {/* Projected outcome */}
        {(() => {
          const val = parseFloat(topUpAmount) || 0;
          if (val > 0 && selectedCustomer) {
            const currentBalance = selectedCustomer.balance || 0;
            const change = financialOpType === 'encaissement' ? val : -val;
            const newBalance = currentBalance + change;

            return (
              <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex justify-between items-center mt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Nouveau Solde</span>
                <span className={cn("text-lg font-black font-mono tracking-tighter", newBalance >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {newBalance.toFixed(2)} {settings.currency}
                </span>
              </div>
            );
          }
          return null;
        })()}
        
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 text-white font-extrabold uppercase tracking-widest text-[11px] py-4 rounded-2xl hover:bg-slate-700 transition-all font-sans"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isProcessingTopUp || !topUpAmount || parseFloat(topUpAmount) <= 0}
            className="flex-1 bg-indigo-500 text-white font-extrabold uppercase tracking-widest text-[11px] py-4 rounded-2xl hover:bg-indigo-400 transition-all shadow-neon-indigo/30 font-sans disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingTopUp ? 'Traitement...' : 'Valider'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
