import React from 'react';
import { Customer, CompanySettings } from '../../../types';
import { CreditCard, Clock, Phone, DollarSign, Send, Printer, Plus } from 'lucide-react';
import { DebtorCustomerItem } from './debtsTypes';

export interface DebtorsTableProps {
  displayList: (DebtorCustomerItem | any)[];
  tabView: 'debtors' | 'all';
  settings: CompanySettings;
  onOpenFinancialModal?: (customer: Customer) => void;
  handleSendWhatsAppReminder: (customer: any) => void;
  handlePrintStatement: (customer: any) => void;
  setIsAddDebtModalOpen: (v: boolean) => void;
}

export function DebtorsTable({
  displayList,
  tabView,
  settings,
  onOpenFinancialModal,
  handleSendWhatsAppReminder,
  handlePrintStatement,
  setIsAddDebtModalOpen
}: DebtorsTableProps) {
  const currency = settings.currency || 'DA';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-md">
      {displayList.length > 0 ? (
        <div className="divide-y divide-slate-800/80">
          {displayList.map((c: any) => {
            const isDebtor = (Number(c.balance) || 0) < 0;
            const debtVal = Math.abs(Number(c.balance) || 0);

            return (
              <div key={c.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/50 transition-colors">
                
                {/* Left Info */}
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                    isDebtor 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {(c.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <h4 className="font-bold text-white text-base">{c.name}</h4>
                      {isDebtor && (
                        <>
                          <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black rounded-lg uppercase tracking-wider">
                            Débiteur
                          </span>
                          <span className={`px-2 py-0.5 border text-[9px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 ${c.debtBadgeClass || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            <Clock size={10} />
                            {c.debtLabel} ({c.debtAgeDays}j)
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1"><Phone size={12} className="text-indigo-400" /> {c.phone || 'Pas de numéro'}</span>
                      {c.address && <span>• {c.address}</span>}
                      <span>• Points : <strong className="text-amber-400">{c.loyaltyPoints || 0}</strong></span>
                      {c.lastVisit && (
                        <span className="text-[10px] text-slate-500">
                          • Dernier mouvement : {new Date(c.lastVisit).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right Financial Balance & Actions */}
                <div className="flex items-center gap-6 justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {isDebtor ? 'Montant Dette Restante' : 'Solde Prépayé'}
                    </p>
                    <p className={`text-2xl font-black font-mono tracking-tight ${isDebtor ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {debtVal.toFixed(2)} <span className="text-xs font-sans font-bold">{currency}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Règlement Modal Button */}
                    {onOpenFinancialModal && (
                      <button
                        type="button"
                        onClick={() => onOpenFinancialModal(c)}
                        className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
                        title="Enregistrer un versement / règlement"
                      >
                        <DollarSign size={15} />
                        Régler
                      </button>
                    )}

                    {/* WhatsApp Reminder */}
                    {isDebtor && (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppReminder(c)}
                        className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all active:scale-95 cursor-pointer"
                        title="Envoyer rappel WhatsApp avec le montant dû"
                      >
                        <Send size={16} />
                      </button>
                    )}

                    {/* Print Statement */}
                    {isDebtor && (
                      <button
                        type="button"
                        onClick={() => handlePrintStatement(c)}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all active:scale-95 cursor-pointer"
                        title="Imprimer Relevé de Dette"
                      >
                        <Printer size={16} />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center text-slate-400 space-y-4">
          <div className="w-16 h-16 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <CreditCard size={32} />
          </div>
          <div>
            <p className="text-lg font-bold text-white uppercase tracking-tight">Aucun compte trouvé</p>
            <p className="text-xs text-slate-400 mt-1">
              {tabView === 'debtors' 
                ? "Vous n'avez aucun client débiteur enregistré actuellement. Vous pouvez ajouter une dette avec le bouton ci-dessous."
                : "Aucun client ne correspond à votre recherche."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddDebtModalOpen(true)}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
          >
            <Plus size={16} />
            Créer une Dette Immédiate
          </button>
        </div>
      )}
    </div>
  );
}
