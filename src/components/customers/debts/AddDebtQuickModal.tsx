import React from 'react';
import { Customer, CompanySettings } from '../../../types';
import { CreditCard, X } from 'lucide-react';

export interface AddDebtQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtTargetType: 'existing' | 'new';
  setDebtTargetType: (v: 'existing' | 'new') => void;
  selectedCustomerId: string;
  setSelectedCustomerId: (v: string) => void;
  newCustomerName: string;
  setNewCustomerName: (v: string) => void;
  newCustomerPhone: string;
  setNewCustomerPhone: (v: string) => void;
  debtAmount: string;
  setDebtAmount: (v: string) => void;
  debtNote: string;
  setDebtNote: (v: string) => void;
  isSavingDebt: boolean;
  handleSaveNewDebt: (e: React.FormEvent) => Promise<void>;
  allCustomers: Customer[];
  settings: CompanySettings;
}

export function AddDebtQuickModal({
  isOpen,
  onClose,
  debtTargetType,
  setDebtTargetType,
  selectedCustomerId,
  setSelectedCustomerId,
  newCustomerName,
  setNewCustomerName,
  newCustomerPhone,
  setNewCustomerPhone,
  debtAmount,
  setDebtAmount,
  debtNote,
  setDebtNote,
  isSavingDebt,
  handleSaveNewDebt,
  allCustomers,
  settings
}: AddDebtQuickModalProps) {
  if (!isOpen) return null;

  const currency = settings.currency || 'DA';

  return (
    <div className="fixed inset-0 z-50 bg-[#06080e]/90 flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-slate-800 shadow-md rounded-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">Ajouter une Dette Client</h3>
              <p className="text-[11px] text-slate-400">Enregistrez un crédit ou un achat impayé sur le carnet.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveNewDebt} className="space-y-4">
          {/* Choice: Existing vs New Customer */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setDebtTargetType('existing')}
              className={`py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                debtTargetType === 'existing' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Client Existant
            </button>
            <button
              type="button"
              onClick={() => setDebtTargetType('new')}
              className={`py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                debtTargetType === 'new' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              + Nouveau Client
            </button>
          </div>

          {/* Target Customer Picker or Inputs */}
          {debtTargetType === 'existing' ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Sélectionner le Client :</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Choisir un client dans la liste --</option>
                {allCustomers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} - Solde actuel : {(Number(c.balance) || 0).toFixed(2)} {currency}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Nom & Prénom du Client :</label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Ex: Mourad Bouzid"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">N° Téléphone (Optionnel, pour WhatsApp) :</label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Ex: 0550 12 34 56"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          {/* Debt Amount */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-rose-400">Montant de la Dette ({currency}) :</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="1"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-slate-950 border border-rose-500/40 rounded-xl p-3.5 text-lg font-mono font-black text-rose-300 focus:outline-none focus:border-rose-500 pr-14 shadow-inner"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {currency}
              </span>
            </div>
          </div>

          {/* Debt Note */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Motif / Commentaire (Optionnel) :</label>
            <input
              type="text"
              value={debtNote}
              onChange={(e) => setDebtNote(e.target.value)}
              placeholder="Ex: Achat épicerie à crédit"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSavingDebt}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isSavingDebt ? 'Enregistrement...' : 'Enregistrer la Dette'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
